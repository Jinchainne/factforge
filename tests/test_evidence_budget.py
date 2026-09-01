import importlib.util
import pathlib
import sys
import types
import unittest


ROOT = pathlib.Path(__file__).resolve().parents[1]
CONTRACT_PATH = ROOT / "contracts" / "fact_forge.py"


class _Decorator:
    def __call__(self, value):
        return value

    @property
    def payable(self):
        return self


class _GenericList(list):
    @classmethod
    def __class_getitem__(cls, _item):
        return cls


class _GenericMap(dict):
    @classmethod
    def __class_getitem__(cls, _item):
        return cls


def _load_contract():
    render = lambda _url, mode="text": ""
    gl = types.SimpleNamespace(
        Contract=object,
        evm=types.SimpleNamespace(contract_interface=_Decorator()),
        public=types.SimpleNamespace(write=_Decorator(), view=_Decorator()),
        nondet=types.SimpleNamespace(web=types.SimpleNamespace(render=render)),
        vm=types.SimpleNamespace(
            UserError=RuntimeError,
            Result=object,
            Return=type("Return", (), {}),
            run_nondet_unsafe=lambda leader, _validator: leader(),
        ),
        message_raw={"datetime": "2026-08-27T00:00:00Z"},
        message=types.SimpleNamespace(sender_address="0x" + "1" * 40, value=0),
    )
    module_stub = types.ModuleType("genlayer")
    module_stub.gl = gl
    module_stub.allow_storage = _Decorator()
    module_stub.u256 = int
    module_stub.Address = str
    module_stub.DynArray = _GenericList
    module_stub.TreeMap = _GenericMap
    previous = sys.modules.get("genlayer")
    sys.modules["genlayer"] = module_stub
    try:
        spec = importlib.util.spec_from_file_location("fact_forge_budget_test", CONTRACT_PATH)
        contract_module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(contract_module)
        return contract_module
    finally:
        if previous is None:
            del sys.modules["genlayer"]
        else:
            sys.modules["genlayer"] = previous


class EvidenceBudgetBehaviorTest(unittest.TestCase):
    def test_proposer_pages_cannot_crow_out_challenger_evidence(self):
        contract_module = _load_contract()
        proposer_url = "https://proposer.example/oversized"
        challenger_url = "https://challenger.example/decisive"
        bodies = {
            proposer_url: "~" * 20_000,
            challenger_url: "^" * 12_000,
        }
        contract_module.gl.nondet.web.render = lambda url, mode="text": bodies[url]
        challenge = types.SimpleNamespace(
            proposer_urls=[proposer_url],
            challenger_urls=[challenger_url],
        )

        contract = object.__new__(contract_module.FactForge)
        packet = contract._packet(challenge)

        budget = contract_module.EVIDENCE_BUDGET_PER_SIDE
        self.assertEqual(budget, 9_000)
        self.assertEqual(packet.count("~"), budget)
        self.assertEqual(packet.count("^"), budget)
        self.assertIn(f"CHALLENGER SOURCE {challenger_url}", packet)


class WagerLifecycleBehaviorTest(unittest.TestCase):
    def setUp(self):
        self.contract_module = _load_contract()
        self.contract = object.__new__(self.contract_module.FactForge)
        self.contract.challenges = {}

    def challenge(self, **overrides):
        values = {
            "id": 1,
            "proposer": "0x" + "1" * 40,
            "challenger": "0x" + "2" * 40,
            "proposer_stake": 100,
            "challenger_stake": 0,
            "status": self.contract_module.ChallengeStatus.OPEN,
            "settled": False,
            "verdict": "",
            "reasoning": "",
            "deadline": 200,
            "proposer_urls": [],
            "challenger_urls": [],
        }
        values.update(overrides)
        return types.SimpleNamespace(**values)

    def test_challenger_must_match_proposer_stake_exactly(self):
        challenge = self.challenge()
        self.contract.challenges[1] = challenge
        self.contract._now = lambda: 100
        self.contract_module.gl.message.sender_address = challenge.challenger
        self.contract_module.gl.message.value = 1

        with self.assertRaisesRegex(RuntimeError, "exactly match"):
            self.contract.accept_challenge(1)

        self.contract_module.gl.message.value = 100
        self.contract.accept_challenge(1)
        self.assertEqual(challenge.challenger_stake, 100)
        self.assertEqual(challenge.status, self.contract_module.ChallengeStatus.ACCEPTED)

    def test_challenger_win_receives_symmetric_two_stake_pot(self):
        challenge = self.challenge(challenger_stake=100)
        self.contract.challenges[1] = challenge
        transfers = []
        self.contract._transfer = lambda recipient, amount: transfers.append((recipient, amount))

        self.contract._settle(challenge, "challenger_won")

        self.assertEqual(transfers, [(challenge.challenger, 200)])
        self.assertEqual(challenge.status, self.contract_module.ChallengeStatus.CHALLENGER_WON)
        self.assertEqual(challenge.proposer_stake, 0)
        self.assertEqual(challenge.challenger_stake, 0)

    def test_resolution_cannot_cut_off_the_evidence_window(self):
        challenge = self.challenge(
            status=self.contract_module.ChallengeStatus.EVIDENCE_SUBMITTED,
            challenger_stake=100,
            proposer_urls=["https://proposer.example/evidence"],
            challenger_urls=["https://challenger.example/evidence"],
        )
        self.contract.challenges[1] = challenge
        self.contract._now = lambda: challenge.deadline

        with self.assertRaisesRegex(RuntimeError, "Evidence window is still open"):
            self.contract.resolve_challenge(1)

    def test_incomplete_evidence_refunds_both_stakes_after_deadline(self):
        challenge = self.challenge(
            status=self.contract_module.ChallengeStatus.EVIDENCE_SUBMITTED,
            challenger_stake=100,
            proposer_urls=["https://proposer.example/evidence"],
        )
        self.contract.challenges[1] = challenge
        self.contract._now = lambda: challenge.deadline + 1
        self.contract_module.gl.message.sender_address = challenge.proposer
        transfers = []
        self.contract._transfer = lambda recipient, amount: transfers.append((recipient, amount))

        self.contract.refund_incomplete(1)

        self.assertEqual(transfers, [(challenge.proposer, 100), (challenge.challenger, 100)])
        self.assertEqual(challenge.status, self.contract_module.ChallengeStatus.REFUNDED)
        self.assertEqual(challenge.verdict, "incomplete_evidence_refund")

    def test_prompt_and_parser_share_the_exact_challenger_outcome(self):
        source = CONTRACT_PATH.read_text(encoding="utf-8")
        self.assertNotIn("ohallenger_won", source)
        self.assertIn('"challenger_won"', source)
        self.assertEqual(
            self.contract_module.VALID_OUTCOMES,
            ("proposer_won", "challenger_won", "undetermined"),
        )


if __name__ == "__main__":
    unittest.main()

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


if __name__ == "__main__":
    unittest.main()

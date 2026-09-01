# Rejection Fix: Outcome Integrity And Symmetric Wagers

## Corrected issues

1. The deployed prompt and parser now use the exact same `challenger_won` outcome, backed by a regression test that rejects `ohallenger_won` anywhere in contract source.
2. A challenger must exactly match the proposer stake. A dust wager can no longer win a larger opposing deposit.
3. Resolution waits until the evidence deadline, preserving both parties' full submission window.
4. An accepted challenge missing either side's evidence after the deadline can refund both original stakes instead of locking funds.

## Verification

- Behavioral tests execute contract methods for mismatched and matched stake acceptance.
- Payout test proves a challenger win receives exactly the two-equal-stake pot.
- Lifecycle tests reject early resolution and prove two-sided incomplete-evidence refunds.
- The corrected contract is redeployed because prompt and settlement logic are on-chain.

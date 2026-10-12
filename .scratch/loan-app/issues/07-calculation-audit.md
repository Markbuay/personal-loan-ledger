# Audit money calculations

Status: resolved
Blocked by: none

User asks to verify money calculations using debug-mantra. Audit the real ledger read-only at the requested Bangkok date, compare with an independent interval-based arithmetic oracle, and exercise payment, final payoff, cancellation, adjustment, monthly cutoff, leap-year and scheduled-rate paths. No authorization to rewrite real financial records.

## Experiment ledger

- Browser inspection: visible port 4311 shows `TypeError: Failed to fetch`. This is a former QA address; calculation audit is the user's clarified scope.
- Read-only health differential: 4311 times out, while 4310 is reachable. Launcher/source defaults to 4310 and the previous UI ticket confirms QA cleanup. Browser moved to the live address; login is required, so no authenticated UI balances are claimed as verified this session.
- Source trace: modal receipt allocations and exact payoff preview → HTTP chronological replay → shared ledger → forecasts and per-person grouping by borrower ID. Existing tests cover event ties, invalid allocations and cancellation effects.
- Independent oracle: enumerate dated calendar intervals and derive the principal base from balances at charge-start dates. Round with quotient/remainder arithmetic. Do not reuse production date, proration, chronology or calculation functions.
- Real-data comparison: each stored loan snapshot and calendar-month forecast matches the independent oracle. Live ledger hash unchanged. Private per-person reports are written only to ignored `.data/audits/`.
- Stress differential: 180 deterministic histories, 9 observation dates each; compare 1,620 snapshots and 1,620 month forecasts, including partial repayment, interest-only receipts, unpaid-interest final principal repayment, canceled payments, signed adjustments, future rates, February/leap-year and 31st anchors. No mismatch reproduced.
- Display semantics: per-person `ดอกถึงวันนี้` explicitly covers current cycles. Completed-cycle interest is posted to arrears and remains in payoff interest, so it may differ from cumulative gross interest in the private audit report. This is not missing money.

No production arithmetic fix is proposed without a failing reproduction. Do not alter unrelated project skill files or lock files.

Final validation: all 44 tests across 4 suites passed, including the 180-history oracle comparison. Type checking passed. All real ledger amounts and projections matched at 2026-10-13; the read-only audit confirmed no data change. No production calculation code or owner credentials were modified. Reports remain private under `.data/audits/`; rerun with `node --disable-warning=ExperimentalWarning scripts/audit-ledger.mjs YYYY-MM-DD` after a production build. Review verdict: no arithmetic fix required for the verified cases. Authenticated live UI totals remain outside this session's proof because the live page requires owner login.

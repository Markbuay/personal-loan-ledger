# Calculation of principal, interest and payoff
Status: implemented
Blocked by: none

Implement src/domain/ledger.ts and tests/ledger.test.ts from docs/implementation-contract.md, APP-SPEC.md, GLOSSARY.md and both ADRs. TDD one observed behavior at a time. Verify approved month snapshot, partial import, actual-day payoff, canceled transactions, rate changes, adjustments, zero interest and invalid payment behavior. Own only domain implementation and its tests, not shared types.

## Result

Implemented public ledger and payment validation with 16 behavioral tests. Confirmed red failures before the cycle, payoff, adjustment, interest-credit, validation, principal-finalization, initial-rate, unsafe-money and scheduled-rate slices. `npm test -- tests/ledger.test.ts` and `npm run typecheck` pass.

Cycle-boundary interest posts before same-day payments. Principal paid on a boundary affects the newly starting cycle. Same-day payment validation includes earlier createdAt entries and excludes the candidate id. Full principal return finalizes actual-day interest, even when its remaining interest is paid later; cancellation resumes calculation from active history. A principal-finalized loan requires cancellation of its final principal payment before adjustment. Next-cycle projection includes a scheduled effective rate.

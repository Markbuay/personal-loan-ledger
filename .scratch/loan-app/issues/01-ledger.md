# Calculation of principal, interest and payoff
Status: ready
Blocked by: none

Implement src/domain/ledger.ts and tests/ledger.test.ts from docs/implementation-contract.md, APP-SPEC.md, GLOSSARY.md and both ADRs. TDD one observed behavior at a time. Verify approved month snapshot, partial import, actual-day payoff, canceled transactions, rate changes, adjustments, zero interest and invalid payment behavior. Own only domain implementation and its tests, not shared types.

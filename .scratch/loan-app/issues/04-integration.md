# Review, real browser QA and Windows handoff
Status: resolved
Blocked by: none

Root integrates via merger agents, runs appropriate tests and two-axis code-review from scaffold baseline, fixes review findings in an implementer worktree, and verifies browser public workflows in isolated QA data. Native browser first; Playwright only on documented fallback. Create Windows launch scripts and Thai README. Preserve pristine production data. Document iPhone/SMTP limitations accurately and clean up implementer worktrees.

## Standards

Review baseline e743c579d93f55359d9979148347dadc99d45662. Two documented findings fixed: strict same-day chronology now shares date/createdAt/id comparator; adjustment cancellation on finalized principal requires canceling the final principal payment first. Three heuristic observations considered: comparator duplication removed, modal/common controls separated and code formatted, CSV generation separated from HTTP coordination. The remaining single local HTTP coordinator is a deliberate small-app choice, not a correctness violation.

## Spec

All three findings fixed: Excel CSV contains individually dated receipt allocations and cancellations; each payment has an evidence attachment action; loan-specific and payment-specific evidence does not appear in other loans of the borrower. No substantiated scope creep was found. Local PC first overrides the earlier iPhone/cloud design.

## Verification and handoff

29 tests pass, including 17 ledger and 12 real HTTP tests. Production build passes. Only nonfatal lucide use-client bundler warnings remain. Browser page identity, meaningful content, no framework overlay, no relevant console errors and interaction proofs pass. Authenticated upload, complete backup with base64 evidence and CSV rows inspected through the real HTTP server. The native file chooser automation stalled, so that picker itself is not certified by automation.

Additional browser corrections: submitted payment date reads actual form value and payoff recalculates for that date; audit timestamps use Bangkok timezone; initial financial data loads before showing the dashboard. Reproduced September 25 principal receipt now stores September 25 correctly. Copying text does not create a contact record; explicit owner confirmation does.

Compared concept and final desktop screenshot through view_image: white sidebar and selected green navigation, pale gray canvas, green action buttons, four metric strip, contract table plus reminder column, and contact panel preserve the design. Intentional differences are live date/records, imported-history scope labels and owner logout. Mobile 390x844 has no document horizontal overflow; the table scrolls within its panel.

Windows launch/stop/relaunch checked on 127.0.0.1:4310; health identity matches and auth reports setupRequired=true, no real owner or borrowers seeded. iPhone Push and actual SMTP delivery remain outside this PC-first acceptance. No borrower messages or emails were sent. Review worker usage limit interrupted final structural cleanup; root preserved its completed changes, ran tests/build, committed and merged them. Original skills were untouched.

# Local loan ledger implementation

Source of truth: ../../../APP-SPEC.md and ../../../docs/implementation-contract.md. User approved implementation and later explicitly selected local PC storage, PC-first usage, iPhone later. Baseline review is the initial scaffold commit, confirmed with the user in the testing-scope response.

Integration branch: integration/loan-app. Worktree per implementer. Use TDD at the approved seams: public calculation interface and real authenticated HTTP workflows. Tickets form a dependency graph, not an ordered checklist.

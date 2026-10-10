# Show interest per borrower

Status: resolved
Blocked by: none

User clarification: each person needs an immediately visible daily-interest and month-end forecast view. Group multiple loans by borrower ID, show only that person's amounts, and expose each underlying loan's formula and cutoff. Keep all-person totals collapsed and support name search.

No changes to accounting rules or persisted loan records. Validate grouped totals and loan membership in the rendered app, search results, navigation to loan details, desktop/mobile layout, and production build.

Validation: production build and type checking passed. An isolated local QA server used a read-only copy of the ledger with a separate test owner, preserving live credentials and records. Browser confirmed 13 borrower cards, 19 underlying loans, correct totals across cards, a single-person search result with four loan details, navigation to the selected loan, and a mobile viewport with no horizontal document overflow or warning/error logs. QA server/database removed after verification. Live server relaunched because it was stopped; owner needs to sign in again.

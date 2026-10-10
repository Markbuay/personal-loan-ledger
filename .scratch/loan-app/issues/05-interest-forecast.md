# Daily interest and month-end forecast

Status: resolved
Blocked by: none

Show gross interest earned to date, nominal full-cycle interest, current-cycle forecast, and calendar-month forecast using actual days. Preserve imported partial periods, receipt allocations, next-cycle principal reductions, scheduled rates, cancellations, and final principal repayment. Do not save forecasts as financial events.

Implementation: extend the ledger snapshot with gross earned interest and cycle calculation context; project confirmed history through the exclusive next-month boundary; show overview metrics, expandable per-loan breakdown, and dated formulas in loan details.

Validation: calculation cases include the 3,000/30×10 example; 28/29/31-day months; partial imported periods; interest-only receipts; principal reduction; scheduled rates; ignored future payments; interest adjustments; cancellation; immediate principal repayment; and the 31st anchor after February. Real browser verification uses existing records read-only and covers desktop/mobile layout and console errors.

Completed checks: production build/type check passed; all 43 tests across three suites passed with file parallelism disabled outside the Windows sandbox temporary-file isolation. In-app browser confirmed the overview totals, all 19 breakdown rows, loan detail formula, and a 390×844 viewport with no horizontal document overflow. No warning/error logs. Owner session and live ledger records were preserved; mobile layout testing does not claim a physical iPhone connection.

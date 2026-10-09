# Implementation contract

Approved product spec: APP-SPEC.md. Local-PC phase supersedes cloud storage: the user's PC stores SQLite database and attachments, email/password login, desktop browser first. iPhone connection and live iPhone Push are deferred explicitly by the user. No Supabase project or cloud site is to be created. Owner notifications are in-app and optional desktop browser notifications at 13:00 Asia/Bangkok while the PC/server runs. Password reset supports a setup-time recovery code and optional SMTP email; never claim email was sent when unconfigured.

Shared models: src/domain/types.ts. All money is integer satang. Rate basis points: 100 = 1% monthly, 1000 = 10%. New loans and new rate changes on new loans must not exceed 125 bps monthly under the general 15% annual rule; historical loans may retain documented rates. New zero-interest loans are allowed.

## Calculation interface

src/domain/ledger.ts exports calculateLedger({ loan, payments, rateChanges, adjustments, asOf }): LedgerSnapshot; validatePayment({ loan, payments, rateChanges, adjustments, payment }): void; addMonths(date, count, anchorDay?): string; daysBetween(start,end): number; todayBangkok(): string. Each calculation filters its own loan id. Business rejection throws Error with useful Thai message. New payment validation sees existing events strictly BEFORE this new payment, rejects negative, unsafe money, future dates, overpayments, allocation mismatch, dates before opening, and incorrect payoff totals. Allow payment of accrued interest up to payoffInterestCents. A payoff finalizes partial period once, stops accrual, cancellation resumes it. Any canceled entries are excluded. Round halfway up in integer satang.

Imported first partial cycle: loan.cycleStartDate is the previous full cycle boundary, startDate is the opening/as-of date, firstCycleEndDate is the next boundary. OpeningInterestCents covers all interest BEFORE startDate. First period's charge uses remaining days startDate..firstCycleEndDate divided by full cycle days. Opening principal is the period base for this imported cycle. Future cycles use anchorDay, preserving 31 after February.

## HTTP interface

Node server exports createApp({ dataDir, staticDir?, clock? }) -> { server, close } without listening, for real HTTP tests; index.ts starts on 127.0.0.1:4310. SQLite data directory default .data, override LOAN_DATA_DIR for isolated QA. Express not required. Session is HttpOnly SameSite=Strict, credentials same-origin. CSRF/origin protection on mutations. Only loopback may create initial owner. Session required for all data and attachment routes. Validate at server boundary.

- GET /api/auth/status -> { setupRequired, user: { email } | null, csrfToken?: string, smtpConfigured: boolean }
- POST /api/auth/setup { email,password } -> { email,recoveryCode,csrfToken }, sets session
- POST /api/auth/login { email,password } -> { email,csrfToken }, sets session
- POST /api/auth/logout -> { ok:true }
- POST /api/auth/forgot { email } -> { message }, email delivery only if SMTP configured, otherwise useful configuration error
- POST /api/auth/reset { email, token?, recoveryCode?, password } -> { ok:true }, revoke existing sessions
- GET /api/data -> LedgerData
- POST /api/borrowers -> Borrower (omit id/createdAt)
- PATCH /api/borrowers/:id -> Borrower
- POST /api/loans -> Loan (omit id/createdAt)
- PATCH /api/loans/:id { dueDate, notes?, reason } -> Loan; only due/notes, audit
- POST /api/payments -> Payment (omit generated/cancellation fields), validate real ledger
- POST /api/payments/:id/cancel { reason } -> { ok:true }
- POST /api/rate-changes -> RateChange (omit generated fields); effectiveDate must be a cycle start, no silent retroactive rewrite
- POST /api/adjustments -> Adjustment (omit generated/cancellation fields), require reason and nonnegative resulting balances
- POST /api/adjustments/:id/cancel { reason } -> { ok:true }
- POST /api/contacts { loanId,channel,message } -> Contact
- POST /api/attachments?borrowerId=...&loanId=...&paymentId=... with raw File body and X-Filename encodedURIComponent(name), Content-Type approved image/pdf -> Attachment; 10MB max
- GET /api/attachments/:id -> authenticated attachment download
- GET /api/backup -> complete versioned JSON with ledger history AND base64 attachments, excludes auth passwords/session secrets
- GET /api/export -> BOM CSV safe against spreadsheet formula injection
- GET /api/reminders -> { items: [{loanId,borrowerName,dueDate,kind:'tomorrow'|'today'|'overdue'}], serverTime }
- GET /api/health -> {ok:true,app:'personal-loan-ledger'} no data

Use X-CSRF-Token header for authenticated writes, frontend obtains token from auth/status or login response. Auth requests need same-origin Origin check without csrf. API errors {error:string}, non-2xx. Do not swallow failed writes.

After any proposed payment/cancellation/adjustment mutation revalidate all active payments for the affected loan chronologically against the candidate history before committing, because a backdated mutation may invalidate later exact payoff allocations. Reject operations on finalized loans unless final principal/payment is canceled first. Loan source enum must be validated, never silently coerce arbitrary strings to existing. Rate changes must be future cycle boundaries (or explicitly justified adjustment, separate API). Index loads optional .env with process.loadEnvFile, and no secret is exposed in backup. Server public export createApp should support API-driven integration tests with clock; if ledger validator todayBangkok uses real clock tests use past fixed dates.

No seeded borrowers or real-looking fake balances in production. Browser QA uses a separate LOAN_DATA_DIR; remove QA data before handoff.

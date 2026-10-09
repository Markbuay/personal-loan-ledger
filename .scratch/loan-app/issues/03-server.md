# Local persistence, owner auth and HTTP actions
Status: resolved
Blocked by: none

Implement server/ and tests/server.test.ts. Contract docs/implementation-contract.md. Node SQLite actual persistence, strong password hashing, owner-only setup, session+CSRF, transaction-safe validated actions, authenticated private attachments, full backup and formula-safe CSV, reset with recovery code and optional real SMTP, reminders. Real HTTP TDD with temp database. Do not expose secrets in exports. Own server and server tests only.

## Result

Implemented all authenticated HTTP endpoints with transaction-safe SQLite ledger and receipt BLOB storage. Owner bootstrap and writes are atomic; password scrypt, strict sessions, CSRF/origin/Host validation, recovery reset and optional SMTP delivery are implemented. All financial changes replay active payments and adjustments before commit. Backup includes ledger history and attachment bytes without authentication secrets. Export is BOM CSV with formula protection. Index loads optional .env and serves the built app on loopback.

Validation: 10 real HTTP tests plus 16 ledger tests pass; frontend typecheck and NodeNext server typecheck pass. HTTP fixtures use isolated temporary SQLite databases and cleanup. No production owner or borrower is seeded. Live SMTP delivery is implemented but requires user configuration; unconfigured recovery path is verified, no mail was sent during tests.

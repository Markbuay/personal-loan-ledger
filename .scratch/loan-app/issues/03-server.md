# Local persistence, owner auth and HTTP actions
Status: blocked
Blocked by: 01

Implement server/ and tests/server.test.ts. Contract docs/implementation-contract.md. Node SQLite actual persistence, strong password hashing, owner-only setup, session+CSRF, transaction-safe validated actions, authenticated private attachments, full backup and formula-safe CSV, reset with recovery code and optional real SMTP, reminders. Real HTTP TDD with temp database. Do not expose secrets in exports. Own server and server tests only.

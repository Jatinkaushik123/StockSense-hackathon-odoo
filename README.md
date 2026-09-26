# StockSense — Enterprise Inventory Management System

Double-entry stock ledger IMS inspired by Odoo, built as a **single monolith**: Next.js 15
App Router + **Server Actions** (zero REST API surface) over **pure PostgreSQL** through the
native `node-postgres` driver. **No ORM, no query builder, no cloud services, no microservices.**

---

## 1. Quick start

```bash
npm install          # also fetches the embedded PostgreSQL binaries
npm run dev          # bootstraps the DB, then serves http://localhost:3000
```

`npm run dev` performs the whole bootstrap automatically:

1. Reuses any reachable PostgreSQL (`DATABASE_URL` / localhost:5440), otherwise starts an
   **embedded PostgreSQL 17** cluster in `data/pgdata` — no Docker, no cloud, no admin rights.
2. Applies `db/schema.sql` and `db/seed.sql` (both idempotent).
3. Seeds demo accounts with real bcrypt hashes (salt rounds 12).

### Demo accounts

| Role | Email | Password |
| --- | --- | --- |
| Inventory Manager | `manager@stocksense.dev` | `Manager@123` |
| Warehouse Staff | `staff@stocksense.dev` | `Staff@123` |

Other commands: `npm run setup` (bootstrap the DB only) · `npm test` (63-assertion suite).

---

## 2. Architecture

```
server.js                     Monolith entry: DB bootstrap → Next.js server
db/
  custom-client.js            Native pg Pool + query() + runInTransaction() engine
  config.js                   Single source of truth for connection settings
  schema.sql                  Mandated schema (+ support tables/indexes, idempotent)
  seed.sql                    Demo locations, catalog, opening balances, skeleton docs
  init.sql                    psql helper (schema then seed)
modules/
  auth/       service.js      Signup, login, OTP reset, bcrypt hashing
              session.js      AES-256-GCM encrypted session tokens + cookie handling
              rbac.js         requireUser / manager-vs-staff authorization guard
              rateLimiter.js  In-memory sliding-window counters
  security/   sanitize.js     Zod schemas + sanitizing form/JSON parsers
              errorHandler.js Error taxonomy, pg error mapping, withAction wrapper
  products/   catalog.js      Product master CRUD
              locations.js    Physical + virtual location catalog
              stock.js        Real-time stock levels / zone summaries
  engine/     shared.js       Locks, quant mutations, ledger writes, status transitions
              receiptEngine.js     REC-XXXX inbound receipts
              deliveryEngine.js    DEL-XXXX outbound deliveries (picking/packing)
              transferEngine.js    TRF-XXXX internal transfers
              adjustmentEngine.js  ADJ-XXXX physical count reconciliation
  operations/ dashboard.js    Aggregate KPI queries
              moveHistory.js  Paginated, filterable immutable audit log
app/
  actions/    auth.js products.js operations.js   Server Actions (the only entry points)
  _lib/       forms.js page-auth.js format.js     Form parsing, page guard, formatting
  (pages)     /  /login  /stock  /products  /locations  /receipts  /deliveries
              /transfers  /adjustments  /history
components/    AppShell, KPI grid, low-stock table, status badges, operation board,
               action form (useActionState), dynamic line-item form, login tabs
scripts/       bootstrap-db.js  Embedded PostgreSQL lifecycle + schema/seed apply
               seed-users.js    bcrypt-hashed demo accounts
               setup-db.js      CLI wrapper
               test-engines.js  End-to-end + concurrency test suite
bugsreport.txt Mandated bug log (documentation only, never imported by the runtime)
```

### Data model

| Table | Role |
| --- | --- |
| `users` | Accounts, roles, OTP reset fields |
| `locations` | Internal zones + virtual parties (`vendor`, `customer`, `inventory_loss`) |
| `products` | Catalog with minimum alert threshold |
| `stock_quants` | Balance cache per product × location (upsert target) |
| `operations` | Document header + workflow status |
| `stock_moves` | **Immutable double-entry ledger** (source → destination, quantity, timestamp) |
| `operation_lines` | *Supporting table*: staged line items while a document is Draft/Waiting/Ready |

The ledger is only ever appended at validation time, so `stock_moves` can never contain
draft or speculative rows. Reference numbers come from per-type PostgreSQL sequences
(`REC-`, `DEL-`, `TRF-`, `ADJ-`), which is race-free by construction.

---

## 3. Security model

| Control | Implementation |
| --- | --- |
| Password storage | bcrypt, salt rounds **12** (≥ 10 required) |
| Sessions | AES-256-GCM **encrypted** token in an **HttpOnly, SameSite=Strict** cookie (`Secure` in production); revalidated against the DB on every request so role changes and deletions take effect immediately |
| SQL injection | Every statement is hand-written parameterized SQL (`$1…$n`); no string interpolation of values anywhere (verified by inspection across all modules) |
| Input validation | Zod schemas on every Server Action; negative values rejected, fractional values rejected wherever integer counts are expected; free text is sanitized (angle brackets/control chars stripped, length capped) |
| Rate limiting | In-memory sliding-window counters: login (per IP and per email), signup, OTP request, password reset |
| Account enumeration | Generic "Invalid email or password"; unknown emails still perform a bcrypt comparison (dummy hash) to equalize timing |
| OTP reset | 6-digit code, 10-minute expiry, **single-use** — verification, expiry check and password update happen in one atomic statement |
| RBAC | Enforced in Server Actions (`requireUser`) **and** re-asserted inside the engines, so direct module callers cannot bypass it |
| Cookie/CSRF | SameSite=Strict cookies plus Next.js Server Action origin checks — no CSRF token plumbing required |

### RBAC matrix

| Action | Warehouse Staff | Inventory Manager |
| --- | :---: | :---: |
| View dashboard, stock, catalog, ledger | ✅ | ✅ |
| Create receipt / delivery / transfer drafts | ✅ | ✅ |
| Advance Draft → Waiting → Ready | ✅ | ✅ |
| **Validate to Done (posts stock + ledger)** | ❌ | ✅ |
| Create / validate stock adjustments | ❌ | ✅ |
| Cancel a document | ❌ | ✅ |
| Product & location CRUD | ❌ | ✅ |

Public signup can only create `staff` accounts; the manager role is granted automatically
only to the first account of an empty database.

---

## 4. Data-integrity guarantees

* **Atomic units of work** — every posting runs inside `runInTransaction()`
  (`BEGIN` → work → `COMMIT`, `ROLLBACK` on any error), using one checked-out client.
* **Row-level locking** — outbound and internal movements lock quant rows with
  `SELECT … FOR UPDATE`. Concurrent multi-line transfers lock in a deterministic
  `(location_id, product_id)` order to eliminate deadlocks.
* **No negative stock** — the availability check is backed by a guarded
  `UPDATE … WHERE quantity >= $n`, so a balance cannot go negative even if a code path
  ever skipped the pre-check.
* **No double posting** — validation locks the document row and requires status `Ready`;
  a second concurrent validate sees `Done` and is rejected.
* **Absolute reconciliation** — adjustments compute `Δ = Counted − Recorded`, set the quant
  to the counted value and post a compensating move against `Scrap/Loss` (no movement is
  written when Δ = 0).

### Proven by the test suite

```
CONCURRENCY: 8 parallel deliveries of 10 units against stock = 50
  PASS  exactly 5 of 8 deliveries succeeded (50 units / 10 each)
  PASS  remaining 3 rejected as insufficient (no oversell)
  PASS  final balance exactly 0 after 5 x 10 sold
  PASS  no negative balances anywhere
  PASS  opposite-direction transfers both complete without deadlock
  PASS  failed delivery fully rolled back (no moves, status Ready, stock intact)
  === RESULT: 63 passed, 0 failed ===
```

### Live browser verification (end-to-end)

* Receipt `REC-2000` created → Waiting → Ready → **Done** by the manager:
  balance `42 → 52`, exactly one ledger row (`Vendors → Main Store`, 10 units).
* Delivery `DEL-3000` requesting 99,999 units against 52 in stock: inline error
  *"Insufficient stock — Cordless Drill 18V (SKU-DRILL-002): required 99999, available 52"*,
  status unchanged, **zero** ledger rows written.
* Staff session: no validate/cancel controls, read-only catalog, adjustments blocked.
* Layout verified at 390 px (bottom navigation, card tables) and 1280 px (sidebar).

---

## 5. Server Actions (no REST endpoints)

| Action | Purpose |
| --- | --- |
| `loginAction` / `signupAction` / `logoutAction` | Session lifecycle |
| `requestOtpAction` / `resetPasswordAction` | OTP password reset |
| `createProductAction` / `updateProductAction` / `deleteProductAction` | Product CRUD (manager) |
| `createLocationAction` | Location catalog (manager) |
| `createReceiptAction` / `validateReceiptAction` | Inbound receipts |
| `createDeliveryAction` / `validateDeliveryAction` | Outbound deliveries |
| `createTransferAction` / `validateTransferAction` | Internal transfers |
| `createAdjustmentAction` / `validateAdjustmentAction` | Stock adjustments |
| `advanceOperationAction` | Draft → Waiting → Ready, Cancel |

---

## 6. Configuration

Copy `.env.example` to `.env` to override defaults:

| Variable | Default | Notes |
| --- | --- | --- |
| `DATABASE_URL` | embedded cluster URL | Point at any PostgreSQL 13+ to skip the embedded instance |
| `PG_PORT` / `PG_HOST` / `PG_USER` / `PG_PASSWORD` / `PG_DATABASE` | 5440 / localhost / postgres / stocksense / stocksense | Used when `DATABASE_URL` is absent |
| `PORT` | 3000 | Invalid values fall back to 3000 |
| `AUTH_SECRET` | generated into `data/.auth-secret` | Session encryption key |
| `SHOW_OTP_IN_UI` | `1` in development | Returns the OTP in the UI because no mail provider is used (zero third-party services); set `0` to hide it |

---

## 7. Suggested git commit mapping (modular by design)

| Commit | Files |
| --- | --- |
| `feat(db): native pg pool + transaction engine` | `db/custom-client.js`, `db/config.js` |
| `feat(db): schema, seed and bootstrap` | `db/schema.sql`, `db/seed.sql`, `scripts/bootstrap-db.js`, `scripts/seed-users.js` |
| `feat(auth): bcrypt auth, OTP reset, encrypted sessions, RBAC` | `modules/auth/*` |
| `feat(security): validation, error handling, rate limiting` | `modules/security/*` |
| `feat(catalog): products, locations, stock queries` | `modules/products/*` |
| `feat(engine): receipt/delivery/transfer/adjustment posting` | `modules/engine/*` |
| `feat(operations): dashboard KPIs and move history` | `modules/operations/*` |
| `feat(ui): server actions + responsive pages` | `app/*`, `components/*` |
| `docs: bug log` | `bugsreport.txt` |
| `test: end-to-end and concurrency suite` | `scripts/test-engines.js` |

---

## 8. Known limitations / next steps

* OTP codes cannot be emailed (no third-party services), so development returns them in the UI;
  production would plug in an SMTP relay and set `SHOW_OTP_IN_UI=0`.
* Sessions are stateless encrypted cookies, so revocation relies on the DB revalidation done
  on every request rather than a server-side session store.
* Line items are fixed once a draft is created; an edit-lines action for Draft documents is a
  natural next increment, as is partial picking for deliveries.
* The embedded PostgreSQL instance is intended for local/demo use; point `DATABASE_URL` at a
  managed server for multi-user deployments.

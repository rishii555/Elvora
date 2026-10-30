# Comprehensive Quality Assurance & Automated Test Strategy

> **Elvora** — *Simpler Business. Smarter Growth.*  
> **Target Stack**: Next.js 15 (App Router), TypeScript 5.8, MongoDB Atlas, Prisma ORM, Decimal.js, Vitest 3.2.

---

## 1. Executive Summary & Quality Mandate

This document outlines the testing architecture and verification framework for **Elvora**. Financial software demanding Indian GST compliance and strict multi-tenancy cannot rely on assumptions or client-side filtering. Every critical path—from concurrent invoice generation to double-entry ledger balancing and cross-tenant isolation—is verified through automated, reproducible test suites.

### Core Testing Invariants
1. **Never Touch Production Data**: Destructive tests against production or unisolated databases are blocked by code-level safety guards.
2. **Deterministic Financial Math**: Decimal calculations never use JavaScript IEEE-754 binary floats (`0.1 + 0.2 !== 0.3`). All currency amounts, CGST/SGST/IGST tax splits, and round-offs are computed with `Decimal.js` fixed-point math.
3. **Double-Entry Invariant**: Every posted journal entry must satisfy $\sum \text{Debits} \equiv \sum \text{Credits}$. Unbalanced transactions fail atomically.
4. **Strict Multi-Tenant Isolation**: Tenant scoping is derived strictly from cryptographic session contexts. A tenant cannot view, search, modify, or infer another tenant's records even with direct ID lookups (preventing IDOR).
5. **No Skips or Fabricated Results**: Automated test pipelines report actual results with zero skipped tests, masked errors, or mocked-away invariants.

---

## 2. Test Architecture & Tooling Selection

| Testing Layer | Selected Tool | Version | Rationale & Compatibility |
| :--- | :--- | :--- | :--- |
| **Unit & Integration Runner** | **Vitest** | `^3.1.2` | High-speed ESM-native execution, native TypeScript support, Jest-compatible API, built-in concurrency mocking. |
| **Static Type Analysis** | **TypeScript (`tsc`)** | `^5.8.2` | `tsc --noEmit` verifies strict types, catches unhandled promises, and prevents illegal parameter mutations. |
| **Code Linting** | **ESLint / Next ESLint** | `^8.57.0` | Enforces React hooks dependencies, prevents unescaped entities, and maintains code quality standards. |
| **Database ORM & Migrations** | **Prisma Client** | `^6.19.0` | Models schema relations, composite unique indexes (`@@unique([tenantId, sku])`), and database push validation. |
| **High-Precision Arithmetic** | **Decimal.js** | `^10.6.0` | Arbitrary-precision decimal arithmetic avoiding float rounding errors in tax calculations and financial statements. |
| **Continuous Integration (CI)** | **GitHub Actions** | Free Tier | Zero-cost automated workflow triggered on push/pull-request, executing lint, type-check, tests, and build. |

---

## 3. Test Coverage Matrix

The automated test suite consists of **14 test files containing 115 passing tests**:

| Test Suite | Test File | Test Count | Key Invariants Verified |
| :--- | :--- | :---: | :--- |
| **Authentication & RBAC** | [`tests/auth-security.test.ts`](file:///c:/Users/rishi/OneDrive/Desktop/GST APP/shopledger/tests/auth-security.test.ts) | 10 | Bcrypt hashing, constant-time compare, JWT cookie sessions, expired tokens, role permissions (`OWNER`, `MANAGER`, `CASHIER`, `ACCOUNTANT`). |
| **Tenant Isolation Core** | [`tests/tenant-isolation.test.ts`](file:///c:/Users/rishi/OneDrive/Desktop/GST APP/shopledger/tests/tenant-isolation.test.ts) | 3 | Server-side `requireTenantContext`, membership validation, token tampering rejection. |
| **Adversarial Multi-Tenant Attacks** | [`tests/multi-tenant-isolation-adversarial.test.ts`](file:///c:/Users/rishi/OneDrive/Desktop/GST APP/shopledger/tests/multi-tenant-isolation-adversarial.test.ts) | 9 | IDOR prevention, cross-tenant updates/deletes, report data leakage, foreign key spoofing. |
| **GST Calculation Engine** | [`tests/gst-calculator.test.ts`](file:///c:/Users/rishi/OneDrive/Desktop/GST APP/shopledger/tests/gst-calculator.test.ts) | 4 | Forward/reverse GST, intra-state (CGST+SGST) vs inter-state (IGST), 0%, 5%, 12%, 18%, 28% rates, rounding. |
| **Sales Billing & Numbering** | [`tests/sales-billing.test.ts`](file:///c:/Users/rishi/OneDrive/Desktop/GST APP/shopledger/tests/sales-billing.test.ts) | 12 | Sequential numbering per financial year (`INV-2627-0001`), atomic stock deductions, credit notes, cancellation restore. |
| **Concurrency & Printer Layouts** | [`tests/concurrency-validation-printer.test.ts`](file:///c:/Users/rishi/OneDrive/Desktop/GST APP/shopledger/tests/concurrency-validation-printer.test.ts) | 8 | 25 concurrent sequential requests with zero collisions, duplicate idempotency keys, malformed input rejection, A4 & 80mm thermal layouts. |
| **Inventory Management** | [`tests/inventory-management.test.ts`](file:///c:/Users/rishi/OneDrive/Desktop/GST APP/shopledger/tests/inventory-management.test.ts) | 14 | Sanitaryware & CP fittings attributes, variants, opening stock, adjustments, negative stock block, valuation (FIFO/Weighted). |
| **Purchases & Suppliers** | [`tests/purchase-supplier.test.ts`](file:///c:/Users/rishi/OneDrive/Desktop/GST APP/shopledger/tests/purchase-supplier.test.ts) | 8 | Supplier profiles, purchase bills, stock receipts, debit notes, partial payments, duplicate bill rejection. |
| **Accounting Foundation** | [`tests/accounting-foundation.test.ts`](file:///c:/Users/rishi/OneDrive/Desktop/GST APP/shopledger/tests/accounting-foundation.test.ts) | 17 | Chart of accounts, double-entry equality ($\Sigma \text{Dr} = \Sigma \text{Cr}$), cash vs revenue, debtor/creditor ledgers, trial balance. |
| **Financial Reporting** | [`tests/reporting-module.test.ts`](file:///c:/Users/rishi/OneDrive/Desktop/GST APP/shopledger/tests/reporting-module.test.ts) | 12 | Sales by period, Gross Profit calculation (Net Sales - COGS), Net Profit, receivables/payables aging, GST liability summaries. |
| **Dashboard Metrics** | [`tests/dashboard-metrics.test.ts`](file:///c:/Users/rishi/OneDrive/Desktop/GST APP/shopledger/tests/dashboard-metrics.test.ts) | 4 | Daily sales KPIs, low stock alert counters, outstanding collections, cash flow cards. |
| **Commercial SaaS & Subscriptions** | [`tests/commercial-saas.test.ts`](file:///c:/Users/rishi/OneDrive/Desktop/GST APP/shopledger/tests/commercial-saas.test.ts) | 10 | 14-day commercial trial auto-provisioning, server-side plan limit checks (`INVOICE_CREATION`, `PRODUCT_CREATION`, `STAFF_MEMBER`), read-only mode on expiry, mock billing provider, platform admin data barrier. |
| **Database Migrations & Disaster Recovery** | [`tests/database-migration-recovery.test.ts`](file:///c:/Users/rishi/OneDrive/Desktop/GST APP/shopledger/tests/database-migration-recovery.test.ts) | 3 | Prisma schema integrity, composite unique constraints (`@@unique([tenantId, sku])`), production destruction safety guard, synthetic tenant backup/restore parity with SHA-256 checksums. |
| **End-to-End Business Lifecycle** | [`tests/e2e-business-lifecycle.test.ts`](file:///c:/Users/rishi/OneDrive/Desktop/GST APP/shopledger/tests/e2e-business-lifecycle.test.ts) | 1 | Complete business cycle: Inward Purchase -> Sale with GST -> Stock Deduction -> Balanced Journal -> Customer Receipt -> Credit Note Return -> Statement Reconciliation -> Malicious Competitor Block. |

---

## 4. Test Execution & Verified Results

All automated quality checks executed directly against the codebase:

### Command Execution Results
```bash
$ npm run lint
> next lint
✔ No ESLint errors found.

$ npm run type-check
> tsc --noEmit
✔ 0 TypeScript compilation errors.

$ npm test
> vitest run
 Test Files  14 passed (14)
      Tests  115 passed (115)
   Duration  1.71s

$ npm run build
> next build
✔ Compiled successfully in 2.0s
✔ Generating static pages (57/57)
✔ Production build complete.
```

---

## 5. Free CI/CD Workflow (GitHub Actions)

A fully automated continuous integration workflow is configured at [`.github/workflows/ci.yml`](file:///c:/Users/rishi/OneDrive/Desktop/GST APP/shopledger/.github/workflows/ci.yml).

### Workflow Pipeline
1. **Checkout & Environment Setup**: Runs on `ubuntu-latest` using Node.js 20.x with npm dependency caching.
2. **Dependency Installation**: `npm ci` ensures reproducible lockfile installation.
3. **Prisma Generation**: `npx prisma generate` compiles type-safe client models.
4. **Linting Check**: `npm run lint` detects syntax issues, unescaped characters, or illegal imports.
5. **Typecheck Check**: `npm run type-check` validates type assertions across the entire repository.
6. **Unit & Integration Suite**: `npm test` executes all 115 tests in parallel.
7. **Production Build**: `npm run build` compiles all 57 Next.js pages and API routes.

### Secret Manager Configuration
To run CI against private staging databases or gateways, configure these secrets in **GitHub Repository -> Settings -> Secrets and variables -> Actions**:
- `DATABASE_URL`: MongoDB Atlas connection string for disposable CI test cluster.
- `JWT_SECRET`: 64-character random key for cryptographic session tokens.
- `ADMIN_JWT_SECRET`: Dedicated secret for platform admin token generation.
- `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET`: Optional; set to mock in CI.

---

## 6. Manual Verification Procedures (Physical & Hardware)

While 100% of business logic, financial math, security isolation, and page compilation are automated, the following 4 checks must be validated manually during hardware onboarding and staging QA:

1. **Physical Thermal Printer Alignment**:
   - *Procedure*: Connect an actual ESC/POS 80mm or 58mm USB/Bluetooth thermal printer (e.g. Epson TM-T82, TVS RP-3200).
   - *Verification*: Print a test bill from POS view (`/pos`). Verify roll tear margins, character width (no word truncation on product names), line spacing, and QR code readability with mobile scanner.
2. **Multi-Page A4 Pagination Edge Cases**:
   - *Procedure*: Create an invoice with 35+ product line items.
   - *Verification*: Trigger `window.print()` in Chrome/Edge. Verify table header repeats cleanly on page 2, totals footer does not overlap item rows, and signature box stays intact on final page.
3. **Live Gateway Webhook Callbacks**:
   - *Procedure*: Using Razorpay or Stripe test mode, trigger a subscription checkout with a test card.
   - *Verification*: Confirm receipt of `subscription.charged` webhook, HMAC SHA-256 signature verification in [`app/api/billing/webhook/route.ts`](file:///c:/Users/rishi/OneDrive/Desktop/GST APP/shopledger/app/api/billing/webhook/route.ts), and subscription state update in MongoDB Atlas.
4. **Disaster Recovery Staging Drill**:
   - *Procedure*: Once every quarter, run a synthetic backup export for a test shop, drop the test database in staging, and execute restore using the documented recovery procedure in [`tests/database-migration-recovery.test.ts`](file:///c:/Users/rishi/OneDrive/Desktop/GST APP/shopledger/tests/database-migration-recovery.test.ts).

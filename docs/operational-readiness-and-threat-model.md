# Elvora Production-Readiness, Threat Model & Operational Security Review

> **Elvora** — *Simpler Business. Smarter Growth.*  
> **Status**: Hardened Staging Baseline (Pre-Production)  
> **Date**: October 2026

---

## 1. Threat Model & Risk Analysis (STRIDE Framework)

| Category | Threat Identified | Target Component | Mitigations Implemented in Codebase | Residual Risk & Action Required |
| :--- | :--- | :--- | :--- | :--- |
| **Spoofing** | Session token forgery or tenant identity spoofing | `lib/auth/session.ts`, `lib/tenant/context.ts` | Tamper-proof HS256 signed JWT cookies (`elvora_session`). Tenant identity strictly derived server-side from active DB membership. Hardcoded fallback tokens blocked in production. | In production, rotate `SESSION_SECRET` every 90 days and store in cloud secret manager. |
| **Tampering** | Modification of finalized invoice amounts or stock movements | `lib/invoices/service.ts`, `lib/inventory/service.ts` | Finalized invoices are snapshot immutable. Stock changes require explicit movement records (`StockMovement`). Decimal-safe fixed-point calculations prevent float rounding exploits. | Database-level write-once rules or document hashing for statutory audit compliance. |
| **Repudiation** | Denying an invoice cancellation or unauthorized stock adjustment | `lib/invoices/service.ts`, `prisma/schema.prisma` | Every invoice cancellation, credit note, and stock adjustment strictly mandates a text reason and records `userId`, `tenantId`, and timestamps. | Add automated remote syslog / append-only cloud audit trail export (e.g. AWS CloudWatch / Datadog). |
| **Information Disclosure** | Cross-tenant data leakage via search, exports, or formula execution | `lib/inventory/csv.ts`, `app/api/reports/` | Tenant-scoped queries enforced on all lookups. **CSV Formula Injection (CWE-1236) neutralized** with `'` prefix on trigger characters (`=`, `+`, `-`, `@`, `\t`, `\r`). Production security headers set (`X-Frame-Options: DENY`, `nosniff`, `CSP`). | Third-party grey-box penetration testing (VAPT) before processing commercial financial data. |
| **Denial of Service** | Credential stuffing, brute-force admin logins, or massive CSV file uploads | `lib/auth/rate-limiter.ts`, `app/api/inventory/import/` | IP sliding-window rate limiting on all login routes (5 attempts per 15 min). **Oversized file guard (5MB limit) and row count guard (2,500 rows/batch)** prevent node memory exhaustion. | Edge WAF (Cloudflare / AWS Shield) recommended in production to handle layer 7 DDoS. |
| **Elevation of Privilege** | Platform administrator querying private tenant ledgers or customer debts | `lib/admin/auth.ts`, `lib/tenant/context.ts` | Platform admin session (`elvora_platform_admin_session`) has **no `tenantId`**. Financial endpoints mandate `requireTenantContext` and reject admin tokens, maintaining commercial privacy. | Formal support workflow procedures and logging for any authorized customer-requested tenant maintenance. |

---

## 2. Prioritized Security Remediations Implemented

### Critical Fixes Applied:
1. **CSV / Spreadsheet Formula Injection Patch (CWE-1236)**:
   - *Issue*: Unsanitized product names starting with `=`, `+`, `-`, `@` could execute malicious DDE commands when opened in Microsoft Excel.
   - *Fix*: [`lib/inventory/csv.ts`](file:///c:/Users/rishi/OneDrive/Desktop/GST APP/shopledger/lib/inventory/csv.ts) `escapeCsv` now prepends `'` to any cell matching `/^[=\+\-@\t\r]/`.
   - *Regression Test*: Passed in [`tests/security-review-regression.test.ts`](file:///c:/Users/rishi/OneDrive/Desktop/GST APP/shopledger/tests/security-review-regression.test.ts).
2. **Denial of Service (DoS) File & Batch Bounds**:
   - *Issue*: [`app/api/inventory/import/route.ts`](file:///c:/Users/rishi/OneDrive/Desktop/GST APP/shopledger/app/api/inventory/import/route.ts) previously parsed unbounded CSV uploads, creating an out-of-memory attack vector.
   - *Fix*: Hard bounds enforced at 5MB file payload and 2,500 rows per batch with HTTP 413 / 400 responses.
3. **Hardcoded Fallback Credentials Lockout in Production**:
   - *Issue*: `admin@elvora.com` / `admin123` allowed evaluation bypass even without active DB accounts.
   - *Fix*: Explicitly guarded with `process.env.NODE_ENV !== "production"`. In production, only database-verified accounts with valid bcrypt hashes can authenticate.
4. **Platform Admin Portal Rate Limiting**:
   - *Issue*: [`app/api/admin/auth/login/route.ts`](file:///c:/Users/rishi/OneDrive/Desktop/GST APP/shopledger/app/api/admin/auth/login/route.ts) had no brute-force throttling.
   - *Fix*: Enforced `checkRateLimit("admin-login:" + ip, { windowMs: 15 * 60 * 1000, maxAttempts: 5 })` with `Retry-After` headers.
5. **HTTP Security Headers & Anti-Clickjacking**:
   - *Issue*: Missing `next.config.ts` left the application exposed to clickjacking and MIME-type sniffing.
   - *Fix*: Created [`next.config.ts`](file:///c:/Users/rishi/OneDrive/Desktop/GST APP/shopledger/next.config.ts) with `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Strict-Transport-Security`, `Content-Security-Policy`, and `poweredByHeader: false`.
6. **Production Secret Enforcement**:
   - *Issue*: Missing environment secrets defaulted to hardcoded development strings.
   - *Fix*: [`lib/auth/session.ts`](file:///c:/Users/rishi/OneDrive/Desktop/GST APP/shopledger/lib/auth/session.ts) and [`lib/admin/auth.ts`](file:///c:/Users/rishi/OneDrive/Desktop/GST APP/shopledger/lib/admin/auth.ts) throw a fatal configuration exception if secrets are missing in `production`.

---

## 3. Operational Runbook

### A. Environment Configuration & Secret Management
Production environments must supply cryptographically strong 256-bit entropy keys:

```bash
# Generate high-entropy secrets
openssl rand -hex 32 # For SESSION_SECRET
openssl rand -hex 32 # For ADMIN_SESSION_SECRET
```

#### Mandatory Production Environment Variables (`.env.production`):
```env
NODE_ENV=production
DATABASE_URL="mongodb+srv://elvora_app_user:<SECURE_PASSWORD>@cluster.mongodb.net/elvora_prod?retryWrites=true&w=majority"
SESSION_SECRET="<64-hex-char-secret>"
ADMIN_SESSION_SECRET="<64-hex-char-secret>"
BILLING_PROVIDER="razorpay"
RAZORPAY_KEY_ID="rzp_live_xxxxxxxxxxxx"
RAZORPAY_KEY_SECRET="<razorpay_secret>"
RAZORPAY_WEBHOOK_SECRET="<webhook_signing_secret>"
NEXT_PUBLIC_APP_URL="https://app.elvora.in"
```

### B. Least-Privilege Database Access Policy
Never connect the application using MongoDB `atlasAdmin` or cluster root credentials:
1. Create a dedicated application user: `elvora_app_user`.
2. Grant `readWrite` role **strictly on the `elvora_prod` database only**:
   ```javascript
   db.createUser({
     user: "elvora_app_user",
     pwd: "COMPLEX_PASSWORD_HERE",
     roles: [{ role: "readWrite", db: "elvora_prod" }]
   })
   ```
3. Enable MongoDB Atlas Network Access whitelist restricting access strictly to your application server IP addresses or VPC peering connection.

### C. Schema Migrations & Zero-Downtime Deployment
1. **Build Step**:
   ```bash
   npm ci
   npx prisma generate
   npm run build
   ```
2. **Database Push**:
   ```bash
   # Synchronize schema additions to MongoDB Atlas replica set
   npm run db:push
   ```
3. **Container Startup**:
   ```bash
   npm run start
   ```

### D. Backup Encryption, Restore Testing & Retention
1. **Continuous Backup**: Enable MongoDB Atlas Point-in-Time Recovery (PITR) with continuous oplog backups (7-day window).
2. **Encrypted Daily Snapshots**: Retain daily snapshots for 30 days and monthly snapshots for 7 years (statutory Indian GST compliance mandate for financial books).
3. **Automated Recovery Verification**: Run the synthetic restore verification suite quarterly using the procedures tested in [`tests/database-migration-recovery.test.ts`](file:///c:/Users/rishi/OneDrive/Desktop/GST APP/shopledger/tests/database-migration-recovery.test.ts).

### E. Monitoring & Incident Response Runbook
1. **Health Check**: Monitor `/` and Next.js status metrics.
2. **Rate Limit Alerts**: Alert on sustained 429 responses from `/api/auth/login` or `/api/admin/auth/login` (indicates active credential stuffing attack).
3. **Token Compromise Runbook**:
   - If an employee or admin token is suspected of being compromised, immediately rotate `SESSION_SECRET` or `ADMIN_SESSION_SECRET` in the environment.
   - This instantly invalidates all issued JWT sessions globally, forcing re-authentication.

---

## 4. Residual Risks & Pre-Production Review Requirements

> [!CAUTION]
> **Financial & Legal Compliance Notice**  
> While the codebase has been hardened, unit-tested, and verified against OWASP Top 10 guidelines, **success in automated tests does not constitute statutory compliance or guarantee absolute immunity**.

Before processing real customer credit cards, bank accounts, or statutory GST filings in production, the following external reviews are required:

1. **Independent Third-Party Penetration Test (VAPT)**:
   - A qualified security firm should perform black-box and grey-box penetration testing against the deployed production staging cluster, testing rate limit bypasses, distributed DDoS resilience, and WebSocket/API transport behavior.
2. **Chartered Accountant (CA) Accounting & GST Audit**:
   - A practicing Indian Chartered Accountant must review sample GSTR-1 taxable values, reverse charge mechanisms (RCM), rounding rules, and debit/credit note workflows against current Goods and Services Tax Council notifications.
3. **Distributed Token & Multi-Replica State**:
   - Currently, password reset verification tokens (`lib/auth/tokens.ts`) and rate limits (`lib/auth/rate-limiter.ts`) use in-memory stores. In a multi-replica autoscaling cluster (e.g. AWS ECS, Kubernetes), connect these to an encrypted Redis cache (Upstash / AWS ElastiCache) so token state and rate limit counters are shared across all worker instances.

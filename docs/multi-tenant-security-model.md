# Elvora — Multi-Tenant Isolation Security Model & Residual Risk Assessment

**Document Version:** 1.0  
**Target Platform:** Elvora (*Simpler Business. Smarter Growth.*)  
**ORM / Data Layer:** Prisma Client with MySQL / MongoDB Atlas  
**Architecture:** Shared Database, Shared Process, Strict Tenant Scoping

---

## 1. Executive Summary

Elvora implements a **strict tenant-isolated multi-tenant SaaS architecture**. In this model, multiple business accounts (tenants) reside within a unified data store, while cryptographic session derivation, centralized data-access helpers, server-enforced scoping, and database-level unique constraints strictly prevent cross-tenant data leakage, insecure direct object references (IDOR), and privilege escalation.

Frontend filtering is treated strictly as a user interface convenience and **never as a security boundary**.

---

## 2. Tenant Ownership Strategy

Every business-owned entity in the application includes an immutable `tenantId` field and enforced foreign key relationship:

| Domain Module | Business Entities | Scoping Mechanism |
| :--- | :--- | :--- |
| **Catalog & Inventory** | `Product`, `ProductVariant`, `Brand`, `Category`, `StockMovement` | Scoped by `tenantId`; compound unique index on `[tenantId, code]` and `[tenantId, sku]`. |
| **Sales & Billing** | `SalesInvoice`, `SalesInvoiceItem` | Scoped by `tenantId`; compound unique index on `[tenantId, invoiceNumber]`. |
| **Purchases & Suppliers**| `Supplier`, `PurchaseInvoice`, `PurchaseInvoiceItem` | Scoped by `tenantId`; compound unique index on `[tenantId, supplierId, invoiceNumber]`. |
| **Customers & Khata** | `Customer` | Scoped by `tenantId`; indexed on `[tenantId, phone]` and `[tenantId, name]`. |
| **Accounting & Cashbook**| `LedgerAccount`, `LedgerEntry` | Scoped by `tenantId`; compound unique index on `[tenantId, code]`. |
| **Returns & Notes** | `CreditDebitNote` | Scoped by `tenantId`; compound unique index on `[tenantId, noteNumber]`. |
| **Audit Logs** | `AuditLog` | Scoped by `tenantId`; indexed on `[tenantId, entityType, entityId]`. |

---

## 3. Core Security Principles & Controls

### Control 1: Cryptographic Session & Verified Membership
- The active tenant is **never trusted from the browser URL, route parameters, or JSON request body**.
- Derived strictly on the server from an `httpOnly`, `sameSite: "lax"`, cryptographically signed JWT session cookie (`jose` HS256).
- Every request validates the active membership in the database via [`requireTenantContext(req)`](file:///c:/Users/rishi/OneDrive/Desktop/GST APP/shopledger/lib/tenant/context.ts). If the membership has been revoked or the shop account deactivated, the request is rejected immediately with HTTP 401.

### Control 2: Centralized Data-Access Helpers ([`lib/tenant/isolation.ts`](file:///c:/Users/rishi/OneDrive/Desktop/GST APP/shopledger/lib/tenant/isolation.ts))
- **`scopedUpdate(prisma, model, tenantId, id, data)`**: Pre-validates ownership before updating. Throws `CrossTenantAccessDeniedError` if the ID belongs to another tenant.
- **`scopedDelete(prisma, model, tenantId, id)`**: Pre-validates ownership before deletion.
- **`scopeToTenant(tenantId, filter)`**: Injects `tenantId` into every `findFirst`, `findMany`, and `aggregate` query.

### Control 3: Cross-Tenant Reference Prevention
- Invoicing workflows require line items to reference product variants and customers.
- **`validateVariantOwnershipBatch(tx, tenantId, variantIds)`**: Queries the database to verify that 100% of referenced items belong to `tenantId`.
- If an attacker attempts to attach Shop B's product or customer to Shop A's invoice, the transaction immediately throws `CrossTenantReferenceError` and aborts. **No stock is deducted, no stock movements are recorded, and no invoice is created.**

### Control 4: Server-Side RBAC & Privilege Separation ([`lib/auth/permissions.ts`](file:///c:/Users/rishi/OneDrive/Desktop/GST APP/shopledger/lib/auth/permissions.ts))
- Roles: `OWNER`, `MANAGER`, `BILLER`, `ACCOUNTANT`.
- Operations like `MANAGE_STAFF`, `EDIT_SHOP_PROFILE`, and `DELETE_INVOICE` require explicit `requirePermission(role, permission)`.
- Modifying client-side state or UI elements cannot bypass permission checks because every server endpoint revalidates permissions independently.

### Control 5: Sanitized Audit Logging ([`lib/tenant/isolation.ts`](file:///c:/Users/rishi/OneDrive/Desktop/GST APP/shopledger/lib/tenant/isolation.ts))
- All administrative operations record an audit trail in `AuditLog`.
- Payloads pass through `sanitizeAuditData()`, which automatically redacts passwords, session tokens, API keys, card numbers, and sensitive hashes.

---

## 4. Adversarial Test Coverage

Automated tests in [`tests/multi-tenant-isolation-adversarial.test.ts`](file:///c:/Users/rishi/OneDrive/Desktop/GST APP/shopledger/tests/multi-tenant-isolation-adversarial.test.ts) verify:

1. **IDOR Invoice Access**: User A cannot read User B's invoices even with the exact invoice ID.
2. **Product Tampering**: User A cannot modify or delete User B's products.
3. **Cross-Tenant Attachment**: User A cannot bill or attach User B's product to an invoice.
4. **Report & Export Leaks**: User A cannot access User B's financial figures via URL query tampering.
5. **Parameter Spoofing**: Injecting `tenantId` in request bodies is sanitized and overridden by session context.
6. **Privilege Escalation**: `BILLER` cannot execute `OWNER` operations.
7. **Atomic Rollback on Violation**: Failed cross-tenant invoice requests leave inventory stock and ledgers completely untouched.
8. **Sensitive Data Redaction**: Passwords and session secrets are redacted from audit logs.

---

## 5. Residual Risk Assessment & Operational Mitigations

| Residual Risk | Impact | Likelihood | Mitigation Strategy |
| :--- | :--- | :--- | :--- |
| **Compromised `SESSION_SECRET`** | High | Low | Rotate secret periodically; store secret in secure key vaults (e.g. AWS Secrets Manager, Doppler, or GCP Secret Manager). |
| **Developer Omission of Tenant Scope** | High | Low | Enforce mandatory code review; mandate usage of `scopedUpdate`, `scopedDelete`, and `scopeToTenant`; run adversarial CI test suites on every pull request. |
| **Single In-Memory Rate Limiter in Multi-Instance Cluster** | Low | Medium | In distributed production deployments (e.g. Kubernetes, AWS ECS), replace in-memory rate limiting with Redis/Upstash token bucket. |
| **Physical Data Aggregation** | Low | Low | Perform daily point-in-time automated backups with encrypted tenant export capabilities. |

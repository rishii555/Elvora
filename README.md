# Elvora — Cloud-Native Multi-Tenant GST Billing & Accounting ERP

<div align="center">

![Elvora Banner](https://img.shields.io/badge/Elvora-ERP%20%26%20Billing-2563EB?style=for-the-badge&logo=appveyor&logoColor=white)
<br />
*Simpler Business. Smarter Growth.*

[![Next.js](https://img.shields.io/badge/Next.js-15.3-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.0-61DAFB?style=flat-square&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-6.19-2D3748?style=flat-square&logo=prisma)](https://www.prisma.io/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?style=flat-square&logo=mongodb)](https://www.mongodb.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38B2AC?style=flat-square&logo=tailwind-css)](https://tailwindcss.com/)
[![Vitest](https://img.shields.io/badge/Tests-120%20Passed-4EAA25?style=flat-square&logo=vitest)](https://vitest.dev/)
[![License](https://img.shields.io/badge/License-Proprietary-blue?style=flat-square)](#)

</div>

---

## 📌 Overview

**Elvora** is a modern, high-performance, multi-tenant SaaS Enterprise Resource Planning (ERP) platform designed specifically for Indian retailers, wholesalers, distributors, and service providers. It combines lightning-fast Point of Sale (POS) counter billing, full Indian GST compliance, multi-variant inventory management, purchase & vendor accounting, automated double-entry general ledger posting, and financial intelligence reports into a unified, zero-lag web application.

---

## 🚀 Key Highlights & Architectural Features

### ⚡ Ultra-Fast, Zero-Lag Architecture (SWR Client Caching)
- **Instant Tab Transitions**: Centralized SWR state caching eliminates round-trip database queries when switching between tabs (`Customers`, `Inventory`, `POS`, `Purchases`, `Reports`). Loaded data renders in **< 1ms** from RAM with stale-while-revalidate background sync.
- **Request Deduplication**: Redundant server calls within a 4000ms window are automatically coalesced.
- **Optimistic UI & Skeleton States**: Fluid non-blocking UI with specialized skeletons (`TableSkeleton`, `CardsSkeleton`, `CatalogGridSkeleton`) ensures uninterrupted workflow during cold fetches.

### 🏢 Strict Multi-Tenant Isolation
- **Server-Derived Context**: Tenant identity is resolved strictly from encrypted HTTP-only JWT session cookies (`requireTenantContext`). Client-supplied tenant IDs in request bodies are ignored.
- **Database Scope & Compound Indexing**: Every database query is scoped to the authorized `tenantId`. Compound MongoDB indexes (e.g. `{ tenantId: 1, invoiceNumber: 1 }`, `{ tenantId: 1, sku: 1 }`) guarantee complete cross-tenant isolation and millisecond lookup times.
- **Clean Tenant Initialization**: Newly registered businesses start with a pristine workspace; no cross-tenant sample data or test accounts are ever leaked.

### 🧾 Complete Indian GST Engine (`Decimal.js`)
- **Zero Floating-Point Drift**: Exact financial calculations using Banker's rounding (`Decimal.ROUND_HALF_UP`) via Decimal.js.
- **Intra-State vs Inter-State Logic**: Automatically selects CGST + SGST (Local) or IGST (Inter-State) based on 2-digit Indian State Codes (`01` to `38`).
- **Reverse Charge & HSN/SAC**: Supports item-level HSN/SAC codes, tiered tax rates (0%, 5%, 12%, 18%, 28%), and reverse charge mechanisms.
- **GSTR-Ready Exports**: Instant export of sales, tax liabilities, and ITC breakdowns ready for GSTR-1 and GSTR-3B filings.

### 🛒 Point of Sale (POS) Counter & Invoicing
- **Fast-Paced Counter Checkout**: Barcode scanning, category filtering, instant stock lookup, hotkeys, and multi-mode settlements (Cash, UPI, Bank Transfer, Cheque, Split Payment).
- **Dual Invoice Printing**:
  - **A4 Standard Invoices**: Professional corporate layout with terms, bank details, and signature blocks.
  - **3-Inch (80mm) Thermal Receipts**: Compact, high-speed receipt format optimized for POS thermal printers.
- **Dynamic UPI QR Code**: Generates real-time NPCI-compliant UPI payment QR codes on invoices for instant scan-to-pay counter settlements.

### 📦 Multi-Variant Inventory & Stock Ledgers
- **Variant Tracking**: Track SKUs by color, size, finish, and attributes with individual cost and selling prices.
- **Valuation Methods**: Accurate real-time stock valuation with low-stock alerts, out-of-stock indicators, and negative stock prevention rules.
- **Audit-Trailed Stock Adjustments**: Every movement (Sale, Purchase receipt, Vendor return, Damage, Audit write-off) is logged with timestamp, user ID, and reason.

### 🤝 Purchases & Vendor Khata (Procurement)
- **Purchase Bills Receipting**: Inward stock reconciliation with automatic purchase price updates and GST Input Tax Credit (ITC) booking.
- **Vendor Debit Notes**: Controlled return to supplier workflow with automatic inventory and payable balance reversals.
- **Vendor Statements**: Comprehensive statement ledger tracking invoices, debit notes, settlements, and net pending dues.

### 👥 Customers & Udhar Khata (Receivables)
- **Credit Balance Management**: Real-time tracking of customer balances, credit limits, and overdue invoices.
- **Counter Collections & Receipts**: Single-click collection recording with receipt generation and automatic balance deductions.

### 📒 Automated Double-Entry General Ledger
- **Automatic Journal Entries**: Real-time posting of balanced double-entry vouchers upon transaction completion (Sales, COGS, Inventory, Cash/Bank, Accounts Receivable/Payable).
- **Trial Balance Verification**: Instant Trial Balance report with debits-equals-credits validation (`totalDebits === totalCredits`).
- **Subledger Reconciliation**: Automatic verification between General Ledger control accounts and customer/vendor subledger totals.

### 📊 Financial Intelligence & Business Reports
- **Sales Intelligence**: Turnover, profit margins, breakdowns by product, brand, category, and client.
- **Profit & Loss (P&L)**: Real-time revenue, cost of goods sold, operating expenses, and net profit calculations.
- **Tax Reports**: Output GST collected vs Input GST credit breakdown for seamless monthly tax compliance.

### 💳 Commercial SaaS & Multi-Tier Subscriptions
- **Subscription Tiers**: Built-in support for Starter, Growth, and Enterprise plans with quota enforcement (SKU limits, monthly invoice caps, staff seats).
- **Platform Administration**: Dedicated admin dashboard for tenant monitoring, subscription management, and system analytics.

---

## 🛠️ Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend Framework** | Next.js 15.3.2 (App Router), React 19.0 |
| **Language & Typing** | TypeScript 5.8 (Strict Mode) |
| **Styling & Icons** | Tailwind CSS 3.4, Lucide React |
| **State & Caching** | SWR 2.5 (Client-side stale-while-revalidate caching) |
| **Database & ORM** | MongoDB Atlas, Prisma ORM 6.19 |
| **Authentication** | Jose (Stateless JWT), Bcrypt.js, HTTP-Only Cookies |
| **Financial Calculations** | Decimal.js (Banker's precision arithmetic) |
| **Testing** | Vitest 3.2, React Testing Library (120 tests across 15 suites) |

---

## 📁 Repository Structure

```text
├── app/
│   ├── (auth)/                  # Authentication (Login, Register, Password Reset)
│   ├── (dashboard)/             # Main Authenticated Application
│   │   ├── layout.tsx           # Global SWR Config, Navigation Sidebar & Header
│   │   ├── dashboard/           # Real-Time Financial & Sales KPIs
│   │   ├── pos/                 # High-Speed POS Counter Billing
│   │   ├── invoices/            # Sales Invoices, History, Credit Notes, Printing
│   │   ├── inventory/           # Products, SKUs, Stock Movements & Adjustments
│   │   ├── purchases/           # Vendor Bills, Debit Notes & Supplier Statements
│   │   ├── customers/           # Client Directory & Udhar Khata Ledgers
│   │   ├── payments/            # Counter Receipts & Due Collections
│   │   ├── expenses/            # Cashbook & Operating Expense Vouchers
│   │   ├── reports/             # P&L, Sales, GST Filing & Trial Balance
│   │   ├── settings/            # Business Profile, Print Formats & Staff Seats
│   │   └── setup/               # New Business Onboarding Wizard
│   ├── admin/                   # Platform SaaS Administrator Console
│   └── api/                     # RESTful Serverless API Handlers (Tenant-Isolated)
├── components/
│   ├── ui/                      # Reusable Design System (Table, Modal, Skeleton, Button)
│   └── invoice/                 # A4 & Thermal 3-Inch Invoice Print Templates
├── lib/
│   ├── auth/                    # JWT Sessions, RBAC Permissions & Role Checks
│   ├── billing/                 # Subscription Tiers & Quota Middleware
│   ├── db/                      # Prisma Client Singleton with MongoDB Connection Pooling
│   ├── finance/                 # Decimal.js GST Engine & Rounding Math
│   ├── tenant/                  # Tenant Authorization & Multi-Tenant Scoping
│   └── swr-config.ts            # Centralized SWR Fetcher & Cache Rules
├── prisma/
│   ├── schema.prisma            # MongoDB Data Models, Enums & Compound Indexes
│   └── seed.ts                  # Test Seeding Utilities
└── tests/                       # 15 Vitest Suites (Security, Tenant Isolation, Accounting, GST)
```

---

## 🚦 Getting Started

### Prerequisites

- **Node.js**: v20.x or v22.x LTS (tested on v24.x)
- **npm** or **pnpm**
- **MongoDB**: A MongoDB Atlas Cluster or local MongoDB instance (v6.0+)

### 1. Clone the Repository

```bash
git clone https://github.com/rishii555/Elvora.git
cd Elvora
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create a `.env` file in the root directory:

```env
# Database Connection (MongoDB Atlas)
DATABASE_URL="mongodb+srv://<username>:<password>@cluster0.mongodb.net/elvora?retryWrites=true&w=majority"

# Authentication Secrets
JWT_SECRET="your-super-secure-32-character-secret-key"
JWT_EXPIRES_IN="7d"

# App URL Configuration
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Node Environment
NODE_ENV="development"
```

### 4. Push Prisma Schema to MongoDB

```bash
npx prisma db push
npx prisma generate
```

### 5. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to explore Elvora.

---

## 🧪 Testing & Verification

Elvora includes an extensive automated test suite covering multi-tenant isolation, adversarial security, GST precision, and double-entry reconciliation:

```bash
# Run all 120 automated tests
npm test

# Run TypeScript type verification
npm run type-check

# Run production build
npm run build
```

### Test Coverage Highlights

- ✅ **`multi-tenant-isolation-adversarial.test.ts`**: Verifies that Tenant B cannot access, read, alter, or delete Tenant A's products, invoices, or ledger records under any condition.
- ✅ **`gst-calculator.test.ts`**: Validates decimal precision on intra-state and inter-state invoices with mixed tax slabs.
- ✅ **`accounting-foundation.test.ts`**: Verifies double-entry ledger balance (`Debits === Credits`) across sales, purchases, and cancellations.
- ✅ **`inventory-management.test.ts`**: Verifies multi-variant stock movements, FIFO/Average valuation, and negative inventory guards.

---

## 🌐 Production Deployment Guide

### Vercel / Railway Deployment

1. **Database Proximity (Critical for Low Latency)**:
   - If your MongoDB Atlas cluster is hosted in **AWS Mumbai (`ap-south-1`)**, configure your Vercel or Railway deployment region to **Mumbai (ap-south-1) / Asia South**.
   - Colocating the serverless runtime with MongoDB drops database latency from ~300ms down to **~5–10ms**.

2. **Environment Variables**:
   - Set `DATABASE_URL`, `JWT_SECRET`, and `NEXT_PUBLIC_APP_URL` in your production environment settings.

3. **Build Command**:
   ```bash
   npx prisma generate && next build
   ```

---

## 🛡️ Security & Privacy

- **Stateless Encrypted Sessions**: Session tokens are signed using high-entropy HMAC-SHA256 (`HS256`) and stored in HTTP-Only, SameSite cookies.
- **Passwords**: Hashed with salted Bcrypt (`bcryptjs` with standard salt rounds).
- **Zero Cross-Tenant Leakage**: No tenant query can execute without strict server-level tenant scoping.

---

## 📄 License

This software is proprietary and confidential. Unauthorized copying, modification, distribution, or use of this software, via any medium, is strictly prohibited without the express written permission of the copyright holder.

---

<div align="center">
  <b>Built with precision for Indian Commerce.</b><br />
  <sub>Elvora ERP © 2026. All rights reserved.</sub>
</div>

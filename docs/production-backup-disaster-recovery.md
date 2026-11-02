# Elvora SaaS ERP — Production Backup, Retention & Disaster Recovery Runbook

## 1. Objectives: RPO & RTO

| Metric | Target | Rationale |
|---|---|---|
| **Recovery Point Objective (RPO)** | **< 5 minutes** | For continuous financial billing and POS operations, continuous oplog point-in-time recovery ensures minimal transaction loss. |
| **Recovery Time Objective (RTO)** | **< 1 hour** | Complete restoration of primary cluster operations, verified DNS cutover, and service resumption within 60 minutes. |

---

## 2. Backup Strategy & Scheduling

### A. Continuous Point-in-Time Recovery (PITR)
- **Mechanism**: Continuous oplog archiving (via MongoDB Atlas continuous backups or custom `mongodump --oplog` streaming).
- **Window**: 7-day granular rollback to any single second within the past week.

### B. Scheduled Snapshot Frequency
- **Hourly Incremental**: Preserved for 48 hours for fast localized rollback.
- **Daily Snapshots**: Automated at 02:00 IST (UTC 20:30) during low traffic; preserved for 30 days.
- **Monthly Snapshots**: Captured at the end of each calendar month; preserved for 12 months.
- **Annual Snapshots**: Captured on March 31 (Indian Financial Year Close); preserved for **7 years** to comply with Indian GST statutory auditing guidelines under Section 36 of the CGST Act.

---

## 3. Encryption & Storage Security

1. **In Transit**:
   - TLS 1.3 enforced for all database and backup connections.
   - Plaintext / unencrypted connections (`ssl=false` or non-TLS) strictly refused.
2. **At Rest**:
   - AES-256 server-side encryption for backup storage buckets (AWS S3 SSE-KMS / Google Cloud Storage CMEK).
   - Backup buckets configured with Object Lock (WORM - Write Once, Read Many) to prevent ransomware modification or accidental deletion.
3. **Access Control**:
   - Least privilege IAM roles with dedicated backup service accounts.
   - Dual-authorization required for any snapshot deletion before retention expiration.

---

## 4. Disaster Recovery & Restoration Procedures

### Step 1: Assess Incident & Declare DR Event
- Confirm primary cluster unrecoverability (hardware corruption, multi-zone outage).
- Freeze external ingress via Cloudflare / API Gateway maintenance mode.

### Step 2: Provision Target Cluster
- Launch warm standby replica set or trigger automated Atlas point-in-time restore to a newly provisioned cluster.

### Step 3: Restore Data
```bash
# Restore latest daily base snapshot with oplog replay
mongorestore --uri="mongodb+srv://admin:<password>@dr-cluster.internal/elvora_prod" \
  --gzip --archive=/backups/elvora_prod_snapshot_latest.gz --oplogReplay
```

### Step 4: Verification Checklist
1. Validate document counts across core collections: `tenants`, `users`, `sales_invoices`, `ledger_entries`, `stock_movements`.
2. Execute double-entry balance check: Total Debits == Total Credits across all tenant ledgers.
3. Verify latest sequence numbers (`InvoiceSequence`) match the highest issued invoice.

### Step 5: Traffic Cutover
- Update production `DATABASE_URL` secrets in deployment environment.
- Restart application containers.
- Verify `/api/health` and `/api/health/ready` report `200 OK`.
- Disable maintenance mode.

---

## 5. Local Development Backup Validation

To inspect and test backup commands in the local development environment:
```bash
# Execute local database backup guidance (Strictly validates localhost/127.0.0.1; blocks Atlas)
npx tsx scripts/backup-local-db.ts
```

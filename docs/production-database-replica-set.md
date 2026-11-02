# Elvora SaaS ERP — Production Database & MongoDB Replica Set Configuration

## 1. Overview & Architecture

Elvora multi-tenant SaaS ERP uses Prisma 6 and MongoDB for database persistence. 
To guarantee ACID transaction isolation for double-entry financial ledgers, inventory stock reservations, multi-warehouse stock transfers, and invoice creation, MongoDB requires a **Replica Set** (`replSet`). Standalone MongoDB instances do not support multi-document transactions.

---

## 2. Production Replica Set Topology

For high availability and multi-document transaction durability:
- **Minimum Nodes**: 3 voting data nodes (Primary + Secondary + Secondary).
- **Consensus**: Raft-like Paxos elections ensuring zero split-brain scenarios.
- **Hosted / Managed**: MongoDB Atlas (M10+ tier recommended for production workloads) or self-hosted MongoDB Community/Enterprise on Linux with Docker/systemd.

### Production Connection String Format

```env
DATABASE_URL="mongodb+srv://<db_user>:<db_password>@<cluster_host>/elvora_prod?retryWrites=true&w=majority&readPreference=primaryPreferred&maxPoolSize=50&minPoolSize=10"
```

### Connection Parameter Breakdown:
- `retryWrites=true`: Automatically retries single-document write errors on transient network interruptions.
- `w=majority`: Confirms writes only after acknowledgment by a majority of replica set nodes.
- `readPreference=primaryPreferred`: Routes state-changing transactional writes to the Primary node while allowing read-heavy analytics/reporting to offload to Secondaries when safe.
- `maxPoolSize=50`: Prevents connection starvation under peak billing workloads.

---

## 3. Replica Set Initialization (Self-Hosted Setup)

If running a self-hosted replica set on Linux:

1. **Configure `mongod.conf`**:
   ```yaml
   net:
     port: 27017
     bindIp: 0.0.0.0
   replication:
     replSetName: rs0
   security:
     authorization: enabled
     keyFile: /etc/mongo/replica-key
   ```

2. **Initiate the Replica Set via `mongosh`**:
   ```javascript
   rs.initiate({
     _id: "rs0",
     members: [
       { _id: 0, host: "mongo-node-1.internal:27017", priority: 2 },
       { _id: 1, host: "mongo-node-2.internal:27017", priority: 1 },
       { _id: 2, host: "mongo-node-3.internal:27017", priority: 1 }
     ]
   });
   ```

3. **Verify Health**:
   ```javascript
   rs.status();
   ```

---

## 4. Transaction Boundaries, Retries & Idempotency in Elvora

Elvora handles transactions through [`lib/db/prisma.ts`](file:///c:/Users/rishi/OneDrive/Desktop/GST%20APP/shopledger/lib/db/prisma.ts):

1. **Fail-Closed Safeguard**:
   - If a multi-document financial or stock mutation runs against a standalone MongoDB without a replica set, `runInTransaction` throws [`DatabaseTransactionUnavailableError`](file:///c:/Users/rishi/OneDrive/Desktop/GST%20APP/shopledger/lib/db/prisma.ts#L18). Partial writes and stock divergence are strictly prevented.
2. **Transient Error Retry**:
   - `runInTransactionWithRetry` catches MongoDB Error `112` (`WriteConflict`), Error `251` (`NoSuchTransaction`), Prisma `P2034`, and driver error label `TransientTransactionError`.
   - Automatically executes randomized exponential backoff (up to 3 retries) before surfacing failures.
3. **Ambiguous Commit Handling**:
   - If a commit fails with `UnknownTransactionCommitResult` (e.g. network timeout during commit acknowledgment), it throws `AmbiguousTransactionCommitError`.
   - Automatic re-runs are blocked without a verified idempotency key to prevent double invoice generation or balance inflation.
4. **Distributed Idempotency Protection**:
   - Guaranteed via [`lib/db/idempotency.ts`](file:///c:/Users/rishi/OneDrive/Desktop/GST%20APP/shopledger/lib/db/idempotency.ts) and the `IdempotencyRecord` MongoDB collection. Duplicate POST requests with the same idempotency key return the cached result.

---

## 5. Local Development Preservation

For local offline development:
- Target: `mongodb://localhost:27017/elvora_dev?directConnection=true`
- Single standalone instances run safely with atomic conditional document updates (`findFirst` + conditional `updateMany`) and in-memory transactional fallbacks, ensuring developers do not need complex multi-container replica sets just to develop features.

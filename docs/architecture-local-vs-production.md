# Elvora SaaS ERP — Architecture: Local Development vs. Production Infrastructure

This document outlines component implementations across environments, ensuring zero paid services or external dependencies are required for local development while providing production scalability.

---

## Component Matrix

| Subsystem | Local Development Mode (Default) | Production Deployment Architecture | External Service Required in Prod? |
|---|---|---|---|
| **Database** | Standalone MongoDB (`localhost:27017/elvora_dev?directConnection=true`) | 3-Node MongoDB Replica Set (`rs0`) with continuous oplog PITR | Yes (Atlas or self-hosted Replica Set) |
| **Session Revocation** | In-memory `Map` + local `RevokedToken` MongoDB collection | Persistent MongoDB TTL collection + shared Redis blocklist | Optional (MongoDB handles it natively) |
| **Rate Limiting** | `InMemoryRateLimitProvider` (sliding-window process memory) | `RedisRateLimitProvider` (Upstash / Redis atomic INCR/PEXPIRE) | Yes (Redis or Upstash) |
| **Email Dispatch** | `MockEmailProvider` / local console logger | `ResendEmailProvider` or SMTP provider via `lib/integrations/providers.ts` | Yes (Resend, AWS SES, or SMTP) |
| **SMS Dispatch** | `MockSmsProvider` (logs to console/in-memory history) | `TwilioSmsProvider` or MSG91 (for Indian DLT compliance) | Yes (Twilio or MSG91) |
| **WhatsApp Dispatch** | `MockWhatsAppProvider` (logs to console/in-memory history) | Meta WhatsApp Cloud API / Twilio WhatsApp | Yes (Meta Developer Account) |
| **Error Monitoring** | `ConsoleErrorTracker` (structured JSON errors with correlation IDs) | `SentryErrorTracker` (Sentry SDK integration via SENTRY_DSN) | Optional (Sentry recommended) |
| **Logging** | Structured JSON with correlation ID and automatic deep secret redaction | CloudWatch / Datadog / Logtail JSON log aggregator | Optional |
| **Automations & Cron** | On-demand API trigger (`POST /api/automations/run`) | Serverless cron triggers (AWS EventBridge / Cloudflare Cron / GitHub Actions) | Yes (Cron scheduler) |
| **Report Exports** | In-memory generation (RFC 4180 CSV, SpreadsheetML XML Excel, printable HTML) | Edge-streamed downloads or signed S3 temporary URLs for large multi-MB exports | Optional |

---

## Zero-Cost Local Development Guarantee

- Developers can clone the repository, run `npm install`, start local MongoDB on port 27017, and immediately run the entire application (`npm run dev`) and test suite (`npm test`).
- No external accounts, paid API keys, cloud databases, or SaaS subscriptions are required to run, build, or test Elvora locally.

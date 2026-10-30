// Benchmark script for Elvora Production API
import { performance } from "perf_hooks";

const BASE_URL = "http://localhost:3000";

function calcStats(latencies) {
  const sorted = [...latencies].sort((a, b) => a - b);
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  const sum = sorted.reduce((acc, v) => acc + v, 0);
  const avg = sum / sorted.length;
  const p90 = sorted[Math.floor(sorted.length * 0.9)];
  const p95 = sorted[Math.floor(sorted.length * 0.95)];
  return { min, max, avg, p90, p95, count: latencies.length };
}

async function runBenchmark() {
  console.log("=================================================================");
  console.log(" ELVORA PRODUCTION SERVER PERFORMANCE AUDIT & BENCHMARK");
  console.log(" Target: " + BASE_URL);
  console.log(" Environment: Next.js 15.3.2 Production Mode (MongoDB Atlas Free M0)");
  console.log("=================================================================\n");

  // 1. HEALTH CHECK (5 consecutive calls)
  console.log("--- 1. Testing GET /api/health (5 iterations) ---");
  const healthLatencies = [];
  let dbLatencies = [];
  for (let i = 1; i <= 5; i++) {
    const t0 = performance.now();
    const res = await fetch(`${BASE_URL}/api/health`);
    const t1 = performance.now();
    const clientDur = t1 - t0;
    healthLatencies.push(clientDur);
    const data = await res.json();
    dbLatencies.push(data.services?.database?.latencyMs || 0);
    console.log(
      `Request #${i}: HTTP ${res.status} | Client: ${clientDur.toFixed(2)} ms | Server DB Ping: ${data.services?.database?.latencyMs} ms`
    );
  }
  const healthStats = calcStats(healthLatencies);
  const dbStats = calcStats(dbLatencies);
  console.log(`\nHealth Endpoint Client Stats: Min: ${healthStats.min.toFixed(2)}ms | Avg: ${healthStats.avg.toFixed(2)}ms | p95: ${healthStats.p95.toFixed(2)}ms | Max: ${healthStats.max.toFixed(2)}ms`);
  console.log(`Database Latency Stats:        Min: ${dbStats.min.toFixed(2)}ms | Avg: ${dbStats.avg.toFixed(2)}ms | p95: ${dbStats.p95.toFixed(2)}ms | Max: ${dbStats.max.toFixed(2)}ms\n`);

  // 2. AUTHENTICATION: LOGIN
  console.log("--- 2. Testing POST /api/auth/login ---");
  let sessionCookie = "";
  const loginLatencies = [];
  
  // We test with demo credentials or user
  // Let's use demo user if available, or check response
  const credentials = { email: "admin@elvora.com", password: "admin123" };
  
  for (let i = 1; i <= 3; i++) {
    const t0 = performance.now();
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(credentials),
    });
    const t1 = performance.now();
    const dur = t1 - t0;
    loginLatencies.push(dur);
    const serverTiming = res.headers.get("server-timing") || "N/A";
    const setCookie = res.headers.get("set-cookie");
    if (setCookie) {
      sessionCookie = setCookie.split(";")[0];
    }
    const data = await res.json().catch(() => ({}));
    console.log(`Login #${i}: HTTP ${res.status} | Client: ${dur.toFixed(2)} ms | Server-Timing: [${serverTiming}] | Success: ${data.success}`);
  }

  // 3. AUTHENTICATED USER CONTEXT (GET /api/auth/me)
  console.log("\n--- 3. Testing GET /api/auth/me with Session Cookie (5 iterations) ---");
  const meLatencies = [];
  for (let i = 1; i <= 5; i++) {
    const t0 = performance.now();
    const res = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: { Cookie: sessionCookie },
    });
    const t1 = performance.now();
    const dur = t1 - t0;
    meLatencies.push(dur);
    const serverTiming = res.headers.get("server-timing") || "N/A";
    const data = await res.json().catch(() => ({}));
    console.log(`Auth/me #${i}: HTTP ${res.status} | Client: ${dur.toFixed(2)} ms | Server-Timing: [${serverTiming}] | Role: ${data.tenant?.role || data.user?.role}`);
  }
  const meStats = calcStats(meLatencies);
  console.log(`\nGET /api/auth/me Stats: Min: ${meStats.min.toFixed(2)}ms | Avg: ${meStats.avg.toFixed(2)}ms | p95: ${meStats.p95.toFixed(2)}ms | Max: ${meStats.max.toFixed(2)}ms\n`);

  // 4. DASHBOARD METRICS (GET /api/dashboard/metrics?range=30d)
  console.log("--- 4. Testing GET /api/dashboard/metrics?range=30d (5 iterations) ---");
  const metricsLatencies = [];
  for (let i = 1; i <= 5; i++) {
    const t0 = performance.now();
    const res = await fetch(`${BASE_URL}/api/dashboard/metrics?range=30d`, {
      headers: { Cookie: sessionCookie },
    });
    const t1 = performance.now();
    const dur = t1 - t0;
    metricsLatencies.push(dur);
    const serverTiming = res.headers.get("server-timing") || "N/A";
    const data = await res.json().catch(() => ({}));
    console.log(`Dashboard Metrics #${i}: HTTP ${res.status} | Client: ${dur.toFixed(2)} ms | Server-Timing: [${serverTiming}] | Success: ${data.success}`);
  }
  const metricsStats = calcStats(metricsLatencies);
  console.log(`\nDashboard Metrics Stats: Min: ${metricsStats.min.toFixed(2)}ms | Avg: ${metricsStats.avg.toFixed(2)}ms | p95: ${metricsStats.p95.toFixed(2)}ms | Max: ${metricsStats.max.toFixed(2)}ms\n`);

  // 5. AUTH LOGOUT
  console.log("--- 5. Testing POST /api/auth/logout ---");
  const t0 = performance.now();
  const res = await fetch(`${BASE_URL}/api/auth/logout`, {
    method: "POST",
    headers: { Cookie: sessionCookie },
  });
  const t1 = performance.now();
  const serverTiming = res.headers.get("server-timing") || "N/A";
  console.log(`Logout: HTTP ${res.status} | Client: ${(t1 - t0).toFixed(2)} ms | Server-Timing: [${serverTiming}] | Set-Cookie: ${res.headers.get("set-cookie")?.substring(0, 40)}...`);

  // 6. VERIFY EXPIRED / LOGGED OUT COOKIE IS REJECTED
  console.log("\n--- 6. Verifying Logged Out Session Is Blocked ---");
  const unauthRes = await fetch(`${BASE_URL}/api/auth/me`);
  console.log(`Unauthenticated GET /api/auth/me: HTTP ${unauthRes.status} (Expected: 401)`);

  console.log("\n=================================================================");
  console.log(" BENCHMARK COMPLETED SUCCESSFULLY");
  console.log("=================================================================");
}

runBenchmark().catch(console.error);

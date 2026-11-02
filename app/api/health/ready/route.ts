import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function GET() {
  const startTime = Date.now();
  let dbStatus = "connected";
  let dbLatencyMs = 0;

  try {
    const dbStart = Date.now();
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Healthcheck DB ping timed out after 2500ms")), 2500)
    );
    await Promise.race([
      prisma.tenant.findFirst({ select: { id: true } }),
      timeoutPromise,
    ]);
    dbLatencyMs = Date.now() - dbStart;
  } catch (error) {
    dbStatus = "disconnected";
    console.error("Readiness probe database ping failed:", error);
  }

  const isReady = dbStatus === "connected";

  return NextResponse.json(
    {
      status: isReady ? "ready" : "not_ready",
      database: dbStatus,
      latencyMs: dbLatencyMs,
      responseTimeMs: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    },
    { status: isReady ? 200 : 503 }
  );
}

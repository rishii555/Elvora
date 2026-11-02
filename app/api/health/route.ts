import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function GET(req: NextRequest): Promise<NextResponse>;
export async function GET(): Promise<NextResponse>;
export async function GET(...args: any[]): Promise<NextResponse> {
  const req = args[0] as NextRequest | undefined;
  const url = req?.url ? new URL(req.url) : null;
  const probe = url ? url.searchParams.get("probe") || url.searchParams.get("type") : null;

  // 1. Liveness Probe (Distinguishes node/app health from database availability)
  if (probe === "live" || probe === "liveness") {
    return NextResponse.json(
      {
        status: "alive",
        uptimeSeconds: Math.floor(process.uptime()),
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  }

  // 2. Readiness Probe / Full Healthcheck
  const startTime = Date.now();
  let dbStatus = "connected";
  let dbLatencyMs = 0;

  try {
    const dbStart = Date.now();
    // Lightweight query with strict 2.5s timeout safeguard
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
    console.error("Healthcheck database ping failed:", error);
  }

  const isHealthy = dbStatus === "connected";

  if (probe === "ready" || probe === "readiness") {
    return NextResponse.json(
      {
        status: isHealthy ? "ready" : "not_ready",
        database: dbStatus,
        latencyMs: dbLatencyMs,
        timestamp: new Date().toISOString(),
      },
      { status: isHealthy ? 200 : 503 }
    );
  }

  return NextResponse.json(
    {
      status: isHealthy ? "healthy" : "degraded",
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      services: {
        application: {
          status: "healthy",
          uptimeSeconds: Math.floor(process.uptime()),
        },
        database: {
          status: dbStatus,
          latencyMs: dbLatencyMs,
        },
      },
      responseTimeMs: Date.now() - startTime,
      environment: process.env.NODE_ENV || "development",
      version: "0.1.0",
    },
    { status: isHealthy ? 200 : 503 }
  );
}

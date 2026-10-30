import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function GET() {
  const startTime = Date.now();
  let dbStatus = "connected";
  let dbLatencyMs = 0;

  try {
    const dbStart = Date.now();
    // Lightweight tenant query with strict 2.5s timeout safeguard
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

  return NextResponse.json(
    {
      status: isHealthy ? "healthy" : "degraded",
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      services: {
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

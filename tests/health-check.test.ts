import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { GET } from "@/app/api/health/route";
import { prisma } from "@/lib/db/prisma";

describe("Health Check API Suite (/api/health)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns 200 healthy status with database connectivity and latency metrics", async () => {
    vi.spyOn(prisma.tenant, "findFirst").mockResolvedValueOnce({
      id: "test-tenant-id",
    } as any);

    const res = await GET();
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.status).toBe("healthy");
    expect(data.services.database.status).toBe("connected");
    expect(typeof data.services.database.latencyMs).toBe("number");
    expect(typeof data.uptimeSeconds).toBe("number");
    expect(typeof data.timestamp).toBe("string");
    expect(data.version).toBe("0.1.0");
  });

  it("returns 503 degraded status when database connectivity ping fails", async () => {
    vi.spyOn(prisma.tenant, "findFirst").mockRejectedValueOnce(
      new Error("Simulated database connection failure")
    );

    const res = await GET();
    expect(res.status).toBe(503);

    const data = await res.json();
    expect(data.status).toBe("degraded");
    expect(data.services.database.status).toBe("disconnected");
    expect(data.services.database.latencyMs).toBe(0);
  });
});

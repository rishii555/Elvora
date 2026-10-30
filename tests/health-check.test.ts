import { describe, it, expect } from "vitest";
import { GET } from "@/app/api/health/route";

describe("Health Check API Suite (/api/health)", () => {
  it("returns healthy status with database connectivity and latency metrics", async () => {
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
});

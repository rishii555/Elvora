import { describe, it, expect, vi } from "vitest";
import path from "path";
import fs from "fs";
import {
  validateLocalDatabaseUrl,
  loadLocalEnvironment,
  runMigrationWorkflow,
  MigrationSecurityError,
} from "@/scripts/migrate-quantities-to-double";

describe("Migration Script Security & Isolation Hardening", () => {
  // =========================================================================
  // 1. Database URL Validation Tests
  // =========================================================================
  describe("1. Strict Database URL Validation", () => {
    it("should accept valid localhost URL with elvora_dev database", () => {
      const url = "mongodb://localhost:27017/elvora_dev?directConnection=true";
      const target = validateLocalDatabaseUrl(url);

      expect(target.protocol).toBe("mongodb:");
      expect(target.host).toBe("localhost");
      expect(target.port).toBe(27017);
      expect(target.database).toBe("elvora_dev");
      expect(target.sanitized).toBe("mongodb://localhost:27017/elvora_dev");
    });

    it("should accept valid 127.0.0.1 URL with elvora_dev database", () => {
      const url = "mongodb://127.0.0.1:27017/elvora_dev";
      const target = validateLocalDatabaseUrl(url);

      expect(target.protocol).toBe("mongodb:");
      expect(target.host).toBe("127.0.0.1");
      expect(target.port).toBe(27017);
      expect(target.database).toBe("elvora_dev");
    });

    it("should reject MongoDB Atlas cluster hostname (mongodb.net)", () => {
      const atlasUrl = "mongodb://user:pass@elvora.cgs6fp8.mongodb.net:27017/elvora_dev";
      expect(() => validateLocalDatabaseUrl(atlasUrl)).toThrow(MigrationSecurityError);
      expect(() => validateLocalDatabaseUrl(atlasUrl)).toThrow(/Atlas/i);
    });

    it("should reject mongodb+srv protocol", () => {
      const srvUrl = "mongodb+srv://localhost:27017/elvora_dev";
      expect(() => validateLocalDatabaseUrl(srvUrl)).toThrow(MigrationSecurityError);
      expect(() => validateLocalDatabaseUrl(srvUrl)).toThrow(/mongodb\+srv/i);
    });

    it("should reject remote and private non-localhost IP addresses", () => {
      const privateIp = "mongodb://192.168.1.100:27017/elvora_dev";
      const publicIp = "mongodb://54.210.12.3:27017/elvora_dev";
      const domain = "mongodb://remote-db.corp.internal:27017/elvora_dev";

      expect(() => validateLocalDatabaseUrl(privateIp)).toThrow(MigrationSecurityError);
      expect(() => validateLocalDatabaseUrl(publicIp)).toThrow(MigrationSecurityError);
      expect(() => validateLocalDatabaseUrl(domain)).toThrow(MigrationSecurityError);
    });

    it("should reject non-default ports", () => {
      const wrongPort = "mongodb://localhost:27018/elvora_dev";
      expect(() => validateLocalDatabaseUrl(wrongPort)).toThrow(MigrationSecurityError);
      expect(() => validateLocalDatabaseUrl(wrongPort)).toThrow(/27017/);
    });

    it("should reject wrong database names (any database other than elvora_dev)", () => {
      expect(() => validateLocalDatabaseUrl("mongodb://localhost:27017/elvora_prod")).toThrow(
        MigrationSecurityError
      );
      expect(() => validateLocalDatabaseUrl("mongodb://localhost:27017/elvora")).toThrow(
        MigrationSecurityError
      );
      expect(() => validateLocalDatabaseUrl("mongodb://localhost:27017/admin")).toThrow(
        MigrationSecurityError
      );
      expect(() => validateLocalDatabaseUrl("mongodb://localhost:27017/")).toThrow(
        MigrationSecurityError
      );
    });

    it("should reject missing or empty DATABASE_URL", () => {
      expect(() => validateLocalDatabaseUrl(undefined)).toThrow(MigrationSecurityError);
      expect(() => validateLocalDatabaseUrl("")).toThrow(MigrationSecurityError);
      expect(() => validateLocalDatabaseUrl("   ")).toThrow(MigrationSecurityError);
    });

    it("should reject malformed connection strings", () => {
      expect(() => validateLocalDatabaseUrl("not-a-valid-uri")).toThrow(MigrationSecurityError);
      expect(() => validateLocalDatabaseUrl("http://localhost:27017/elvora_dev")).toThrow(
        MigrationSecurityError
      );
    });
  });

  // =========================================================================
  // 2. Explicit Environment File Loading Tests
  // =========================================================================
  describe("2. Explicit .env.local Environment Loading", () => {
    it("should throw MigrationSecurityError if .env.local does not exist", () => {
      const nonExistentPath = path.resolve(process.cwd(), "nonexistent-.env.local");
      expect(() => loadLocalEnvironment(nonExistentPath)).toThrow(MigrationSecurityError);
      expect(() => loadLocalEnvironment(nonExistentPath)).toThrow(/Required local environment file/);
    });

    it("should successfully load DATABASE_URL from existing .env.local", () => {
      const localEnvPath = path.resolve(process.cwd(), ".env.local");
      if (fs.existsSync(localEnvPath)) {
        const { databaseUrl } = loadLocalEnvironment(localEnvPath);
        expect(databaseUrl).toBeDefined();
        expect(databaseUrl.toLowerCase()).toContain("elvora");
      }
    });
  });

  // =========================================================================
  // 3. Workflow Execution Guard Tests
  // =========================================================================
  describe("3. Execution Guard & Dry-Run Guarantees", () => {
    it("should never execute database writes in dry-run mode", async () => {
      const mockRawCommand = vi.fn(async (cmd: any) => {
        if (cmd.aggregate) {
          return { cursor: { firstBatch: [] } };
        }
        if (cmd.count) {
          return { n: 0 };
        }
        if (cmd.update) {
          throw new Error("MUTATION_CALL_ATTEMPTED_IN_DRY_RUN");
        }
        return {};
      });

      const mockClient = {
        $runCommandRaw: mockRawCommand,
        $disconnect: vi.fn(),
      };

      const mockEnvPath = path.resolve(process.cwd(), "node_modules/.mock-local.env");
      fs.writeFileSync(mockEnvPath, 'DATABASE_URL="mongodb://localhost:27017/elvora_dev?directConnection=true"\n');

      let result;
      try {
        result = await runMigrationWorkflow({
          envFilePath: mockEnvPath,
          isExecute: false,
          clientFactory: () => mockClient,
        });
      } finally {
        if (fs.existsSync(mockEnvPath)) {
          fs.unlinkSync(mockEnvPath);
        }
      }

      expect(result.success).toBe(true);
      expect(result.isExecute).toBe(false);

      // Verify no update commands were executed
      const calls = mockRawCommand.mock.calls;
      const updateCalls = calls.filter(([cmd]: any) => cmd.update);
      expect(updateCalls).toHaveLength(0);
    });

    it("should abort before connecting if --execute is passed with an invalid target URL", async () => {
      // Mock an invalid remote database URL
      const tempEnvFile = path.resolve(process.cwd(), ".temp-invalid-.env.local");
      fs.writeFileSync(
        tempEnvFile,
        'DATABASE_URL="mongodb+srv://admin:pass@remote.mongodb.net/elvora_dev"'
      );

      const clientFactory = vi.fn();

      try {
        await expect(
          runMigrationWorkflow({
            envFilePath: tempEnvFile,
            isExecute: true,
            clientFactory,
          })
        ).rejects.toThrow(MigrationSecurityError);

        // Client must never even be instantiated
        expect(clientFactory).not.toHaveBeenCalled();
      } finally {
        if (fs.existsSync(tempEnvFile)) {
          fs.unlinkSync(tempEnvFile);
        }
      }
    });
  });
});

import { expect } from "chai";
import {
  selectMigrations,
  MEMBER_MIGRATION,
} from "../backend/src/db/migrationPlan";
import { databaseErrorCode } from "../backend/src/db/errors";
import { authErrorHandler } from "../backend/src/routes/authRoutes";
import {
  shareReadRequest,
  clearReadRequests,
} from "../frontend/src/lib/api/readRequests";
import { GET as favicon } from "../frontend/src/app/favicon.ico/route";

describe("Member schema upgrade without resetting a legacy database", () => {
  const files = [
    {
      tag: "0000_initial",
      hash: "initial",
      folderMillis: 100,
      sql: ["initial"],
    },
    { tag: "0001_auth", hash: "auth", folderMillis: 200, sql: ["auth"] },
    {
      tag: MEMBER_MIGRATION,
      hash: "member",
      folderMillis: 300,
      sql: ["member"],
    },
  ];
  const legacy = [{ hash: "historic-database", created_at: "50" }];
  it("applies the complete sequence to a new database", () => {
    expect(selectMigrations(files, [], false)).to.deep.equal(files);
  });
  it("refuses to replay initial/auth migrations against an unrecognized existing baseline", () => {
    expect(() => selectMigrations(files, legacy, false)).to.throw(
      "LEGACY_MIGRATION_HISTORY",
    );
    expect(selectMigrations(files, legacy, true)).to.deep.equal([files[2]]);
  });
  it("makes the targeted upgrade idempotent and permits subsequent recognized upgrades", () => {
    const applied = [...legacy, { hash: "member", created_at: "300" }];
    expect(selectMigrations(files, applied, true)).to.deep.equal([]);
    expect(selectMigrations(files, applied, false)).to.deep.equal([]);
    const future = {
      tag: "0003_next",
      hash: "next",
      folderMillis: 400,
      sql: ["next"],
    };
    expect(selectMigrations([...files, future], applied, false)).to.deep.equal([
      future,
    ]);
  });
  it("rejects a changed migration hash at the same recorded version or a downgrade", () => {
    expect(() =>
      selectMigrations(files, [{ hash: "different", created_at: 300 }], true),
    ).to.throw("MIGRATION_HISTORY_CONFLICT");
    expect(() =>
      selectMigrations(files, [{ hash: "future", created_at: 400 }], true),
    ).to.throw("MIGRATION_HISTORY_CONFLICT");
  });
});

describe("Missing member schema diagnostics", () => {
  it("reads PostgreSQL codes through wrapped causes and terminates on cycles", () => {
    expect(databaseErrorCode({ cause: { cause: { code: "42703" } } })).to.equal(
      "42703",
    );
    const cycle: any = {};
    cycle.cause = cycle;
    expect(databaseErrorCode(cycle)).to.equal(undefined);
  });
  it("responds with actionable 503 for missing columns/tables without disclosing SQL or credentials", () => {
    const original = console.error;
    console.error = () => {};
    try {
      for (const code of ["42P01", "42703"]) {
        let status: number | undefined;
        let data: any;
        const response = {
          status(value: number) {
            status = value;
            return this;
          },
          json(value: any) {
            data = value;
            return this;
          },
        };
        authErrorHandler(
          {
            message: "private database query and credential",
            cause: { cause: { code } },
          },
          {} as any,
          response as any,
          () => {},
        );
        expect(status).to.equal(503);
        expect(data.code).to.equal("DATABASE_SCHEMA_OUTDATED");
        expect(JSON.stringify(data)).not.to.include("credential");
      }
    } finally {
      console.error = original;
    }
  });
});

describe("Concurrent member GET requests", () => {
  beforeEach(clearReadRequests);
  afterEach(clearReadRequests);
  it("shares an in-flight read but performs a fresh request after completion", async () => {
    let calls = 0;
    let resolve!: (value: object) => void;
    const request = () => {
      calls++;
      return new Promise<object>((done) => {
        resolve = done;
      });
    };
    const first = shareReadRequest("/notifications", request);
    const second = shareReadRequest("/notifications", request);
    expect(first).to.equal(second);
    await Promise.resolve();
    expect(calls).to.equal(1);
    resolve({ success: true });
    await Promise.all([first, second]);
    await shareReadRequest("/notifications", async () => {
      calls++;
      return {};
    });
    expect(calls).to.equal(2);
  });
  it("does not retain rejected requests or financial responses as a cache", async () => {
    try {
      await shareReadRequest("/activity", async () => {
        throw new Error("outage");
      });
    } catch {
      /* thử lại sau lỗi */
    }
    expect(
      await shareReadRequest("/activity", async () => "recovered"),
    ).to.equal("recovered");
  });
  it("isolates a new session and prevents an older request from deleting its in-flight read", async () => {
    let finishOld!: (value: string) => void;
    let finishNew!: (value: string) => void;
    const old = shareReadRequest(
      "/activity",
      () =>
        new Promise<string>((resolve) => {
          finishOld = resolve;
        }),
    );
    await Promise.resolve();
    clearReadRequests();
    const fresh = shareReadRequest(
      "/activity",
      () =>
        new Promise<string>((resolve) => {
          finishNew = resolve;
        }),
    );
    await Promise.resolve();
    finishOld("old");
    await old;
    expect(
      shareReadRequest("/activity", async () => "unexpected duplicate"),
    ).to.equal(fresh);
    finishNew("new");
    expect(await fresh).to.equal("new");
  });
});

describe("Browser icon fallback", () => {
  it("redirects the default favicon request to the application icon", () => {
    const response = favicon();
    expect(response.status).to.equal(307);
    expect(response.headers.get("Location")).to.equal("/icon.svg");
  });
});

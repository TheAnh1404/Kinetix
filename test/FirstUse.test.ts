import { expect } from "chai";
import { firstUseSteps, FirstUseInput } from "../shared/firstUse";

describe("First-use guidance follows actual account and workspace readiness", () => {
  const baseline: FirstUseInput = {
    role: "ADMIN",
    canManageMembers: true,
    otherMembers: 0,
    deployment: "DISABLED",
    workspace: "MISSING",
    allowlisted: null,
    vaults: 0,
    fundedVaults: 0,
    tasks: 0,
  };
  const step = (input: FirstUseInput, id: string) =>
    firstUseSteps(input).find((item) => item.id === id)!;
  it("lets a fresh Admin manage the family while infrastructure is unavailable", () => {
    expect(step(baseline, "account").status).to.equal("DONE");
    expect(step(baseline, "members").action).to.equal("MANAGE_MEMBERS");
    expect(step(baseline, "deployment").status).to.equal("BLOCKED");
    expect(
      firstUseSteps(baseline).some((item) => item.action === "CREATE_VAULT"),
    ).to.equal(false);
    expect(JSON.stringify(firstUseSteps(baseline))).not.to.include("DEPLOY");
  });
  it("allows only a workspace Admin to connect a missing Hub after verification", () => {
    const configured = { ...baseline, deployment: "VERIFIED" as const };
    expect(step(configured, "workspace").action).to.equal("CONNECT_WORKSPACE");
    expect(
      step(
        { ...configured, role: "GUARDIAN", canManageMembers: false },
        "workspace",
      ).action,
    ).to.equal("WAIT");
    expect(
      step({ ...configured, workspace: "CONFLICT" }, "workspace").action,
    ).not.to.equal("CONNECT_WORKSPACE");
  });
  it("does not infer allowlist from account READY or pretend that a failed RPC revoked rights", () => {
    const unknown = {
      ...baseline,
      deployment: "UNAVAILABLE" as const,
      workspace: "MATCH" as const,
    };
    expect(step(unknown, "permission").status).to.equal("BLOCKED");
    expect(step(unknown, "deployment").description).to.include("chưa xác định");
    expect(
      step({ ...unknown, allowlisted: true }, "vault").action,
    ).not.to.equal("CREATE_VAULT");
  });
  it("keeps a Guardian invitation distinct from member-management and on-chain votes", () => {
    const invited = {
      ...baseline,
      role: "GUARDIAN" as const,
      canManageMembers: false,
    };
    expect(
      firstUseSteps(invited).some((item) => item.id === "members"),
    ).to.equal(false);
    expect(step(invited, "permission").action).not.to.equal("PROVISION");
    expect(
      firstUseSteps(invited).some((item) =>
        item.actionLabel?.includes("duyệt"),
      ),
    ).to.equal(false);
  });
  for (const role of ["ELDERLY", "CHILD"] as const) {
    it(`guides a new ${role} to assigned help rather than financial administration`, () => {
      const input = { ...baseline, role, canManageMembers: false };
      const actions = firstUseSteps(input).map((item) => item.action);
      expect(actions).to.include("CONTACT_GUARDIAN");
      for (const denied of [
        "MANAGE_MEMBERS",
        "CONNECT_WORKSPACE",
        "CREATE_VAULT",
        "PROVISION",
      ])
        expect(actions).not.to.include(denied);
      expect(step(input, "vault").title).to.include(
        role === "CHILD" ? "nhiệm vụ" : "hỗ trợ",
      );
    });
  }
  it("does not turn a funded vault into a claim that money is withdrawable or already paid", () => {
    const input = {
      ...baseline,
      deployment: "VERIFIED" as const,
      workspace: "MATCH" as const,
      allowlisted: true,
      vaults: 1,
      fundedVaults: 1,
    };
    expect(step(input, "first-use").description).to.include("hạn mức");
    expect(
      step(
        { ...input, role: "CHILD", canManageMembers: false, tasks: 0 },
        "first-use",
      ).status,
    ).to.equal("WAITING");
    expect(
      step(
        { ...input, role: "CHILD", canManageMembers: false, tasks: 1 },
        "first-use",
      ).description,
    ).to.include("thực chi");
  });
  it("recomputes progress when the workspace or server facts change without local completion flags", () => {
    const ready = {
      ...baseline,
      deployment: "VERIFIED" as const,
      workspace: "MATCH" as const,
      allowlisted: true,
      vaults: 1,
    };
    expect(step(ready, "permission").status).to.equal("DONE");
    expect(
      step({ ...ready, allowlisted: false }, "permission").status,
    ).to.equal("BLOCKED");
    expect(step({ ...ready, paused: true }, "permission").status).to.equal(
      "BLOCKED",
    );
    expect(step({ ...ready, paused: true }, "permission").action).to.equal("WAIT");
    expect(step({ ...ready, paused: true }, "vault").action).not.to.equal(
      "CREATE_VAULT",
    );
    expect(
      step({ ...ready, workspace: "MISSING" }, "permission").status,
    ).to.equal("BLOCKED");
    expect(step(baseline, "vault").status).to.equal("BLOCKED");
  });
});

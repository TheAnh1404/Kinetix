import { expect } from "chai";
import { decodeFunctionData, parseEther } from "viem";
import { FAMILY_HUB_ABI } from "../shared/abis";
import {
  buildVaultCall,
  emptyVaultForm,
  MAX_STORED_WEI,
  resolveVaultConfig,
  validateVaultForm,
  vaultForm,
  VaultForm,
} from "../shared/vaultCreation";

describe("Vault creation canonical configuration", () => {
  const ids = [1, 2, 3].map(
    (number) => `00000000-0000-4000-8000-${String(number).padStart(12, "0")}`,
  );
  const wallets = new Map(
    ids.map((id, index) => [id, `0x${String(index + 1).repeat(40)}`]),
  );
  const now = 1793898000n;
  const form = (): VaultForm => ({
    ...emptyVaultForm(),
    name: "Family fund",
    guardianIds: [ids[0]],
    beneficiaryIds: [ids[1], ids[2]],
    targetDeadline: new Date(Number(now + 86400n) * 1000).toISOString(),
    policyAccepted: true,
  });
  it("allows incomplete drafts but rejects unexpected fields, duplicate IDs and malformed values", () => {
    expect(vaultForm(emptyVaultForm()).name).to.equal("");
    expect(() => vaultForm({ ...form(), workspaceId: ids[0] })).to.throw();
    expect(() =>
      vaultForm({ ...form(), guardianIds: [ids[0], ids[0].toUpperCase()] }),
    ).to.throw();
    expect(() => vaultForm({ ...form(), requiredApprovals: 1.5 })).to.throw();
    expect(() =>
      vaultForm({ ...form(), description: "x".repeat(1001) }),
    ).to.throw();
  });
  it("builds all four ABI calls with the same order, fixed same-chain ratio and zero inactive fields", () => {
    for (const ruleTemplate of [
      "SHIELD",
      "MILESTONE",
      "ROSCA",
      "SHARED_GOAL",
    ] as const) {
      const config = resolveVaultConfig(
        { ...form(), ruleTemplate },
        wallets,
        now,
      );
      const call = buildVaultCall(config);
      const decoded = decodeFunctionData({
        abi: FAMILY_HUB_ABI,
        data: call.data,
      });
      expect(decoded.functionName).to.equal(
        ["ROSCA", "SHARED_GOAL"].includes(ruleTemplate)
          ? "createAdvancedVault"
          : "createCustomVault",
      );
      expect(decoded.args![2]).to.equal(10000n);
      expect(decoded.args![6]).to.deep.equal([
        wallets.get(ids[1]),
        wallets.get(ids[2]),
      ]);
      expect(config.fastWithdrawLimit).to.equal(
        ruleTemplate === "SHIELD" ? "0.01" : "0",
      );
      if (ruleTemplate === "ROSCA") {
        expect(decoded.args![7]).to.equal(0n);
        expect(decoded.args![8]).to.equal(0n);
      }
      if (ruleTemplate === "SHARED_GOAL") {
        expect(decoded.args![9]).to.equal(0n);
        expect(decoded.args![10]).to.equal(0n);
      }
    }
  });
  it("preserves 18-decimal amounts and rejects rounding, negatives, exponent notation and storage overflow", () => {
    const value = { ...form(), fastWithdrawLimit: "0.000000000000000001" };
    expect(
      buildVaultCall(resolveVaultConfig(value, wallets, now)).args[3],
    ).to.equal(1n);
    for (const amount of [
      "-1",
      "1e-3",
      "0.0000000000000000001",
      "1,5",
      "100000000000000000000",
    ])
      expect(
        validateVaultForm({ ...value, fastWithdrawLimit: amount }, now),
      ).to.have.property("fastWithdrawLimit");
    expect(parseEther("99999999999999999999.999999999999999999")).to.equal(
      MAX_STORED_WEI,
    );
  });
  it("checks quorum, template role separation, linked wallets and consent", () => {
    expect(
      validateVaultForm({ ...form(), requiredApprovals: 2 }, now),
    ).to.have.property("guardianIds");
    expect(
      validateVaultForm(
        { ...form(), ruleTemplate: "MILESTONE", beneficiaryIds: [ids[0]] },
        now,
      ),
    ).to.have.property("beneficiaryIds");
    expect(
      validateVaultForm({ ...form(), policyAccepted: false }, now),
    ).to.have.property("policyAccepted");
    expect(() => resolveVaultConfig(form(), new Map(), now)).to.throw();
    const bad = new Map(wallets);
    bad.set(ids[1], "0x0000000000000000000000000000000000000000");
    expect(() => resolveVaultConfig(form(), bad, now)).to.throw();
  });
  it("requires an explicit future instant and keeps equivalent timezones identical on chain", () => {
    const value = { ...form(), ruleTemplate: "SHARED_GOAL" as const };
    for (const deadline of [
      "2026-11-05",
      "2026-11-05T18:00",
      new Date(Number(now) * 1000).toISOString(),
    ])
      expect(
        validateVaultForm({ ...value, targetDeadline: deadline }, now),
      ).to.have.property("targetDeadline");
    const utc = "2026-12-01T00:00:00Z";
    const zoned = "2026-12-01T07:00:00+07:00";
    expect(
      buildVaultCall(
        resolveVaultConfig({ ...value, targetDeadline: utc }, wallets, now),
      ).data,
    ).to.equal(
      buildVaultCall(
        resolveVaultConfig({ ...value, targetDeadline: zoned }, wallets, now),
      ).data,
    );
  });
  it("validates ROSCA aggregate precision and period without reordering recipients", () => {
    const value = {
      ...form(),
      ruleTemplate: "ROSCA" as const,
      beneficiaryIds: [ids[2], ids[1]],
    };
    expect(
      resolveVaultConfig(value, wallets, now).beneficiaryWallets,
    ).to.deep.equal([wallets.get(ids[2]), wallets.get(ids[1])]);
    for (const duration of ["0", "59", "31536001", "1.5", "-1"])
      expect(
        validateVaultForm({ ...value, roscaRoundDuration: duration }, now),
      ).to.have.property("roscaRoundDuration");
    expect(
      validateVaultForm(
        { ...value, roscaRoundContribution: "60000000000000000000" },
        now,
      ),
    ).to.have.property("roscaRoundContribution");
    expect(
      validateVaultForm({ ...value, roscaRoundContribution: "0" }, now),
    ).to.have.property("roscaRoundContribution");
  });
});

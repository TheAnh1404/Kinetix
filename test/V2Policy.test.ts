import { expect } from "chai";
import { vaultCapabilities, CapabilityInput } from "../shared/vaultCapabilities";
import { syncRetryPolicy } from "../shared/transactionErrors";
import { provisioningIdentity } from "../backend/src/services/deploymentService";
import { allowedChains } from "../backend/src/auth/security";

describe("V2 financial identity and retry policies", () => {
  const member: CapabilityInput = { role: "GUARDIAN", linked: true, allowed: true, guardian: false, beneficiary: true, active: true, paused: false, rule: 0 };
  it("never grants a contract vote just because the user is ADMIN or creator", () => {
    for (const role of ["ADMIN", "GUARDIAN", "CREATOR"]) expect(vaultCapabilities({ ...member, role }).approveWithdrawal.allowed).to.equal(false);
    expect(vaultCapabilities({ ...member, role: "ADMIN", guardian: true }).approveWithdrawal.allowed).to.equal(true);
    expect(vaultCapabilities({ ...member, role: "CHILD", guardian: true }).approveWithdrawal.allowed).to.equal(false);
  });
  it("separates rule-specific actions and fails closed on revoked permission/pause", () => {
    expect(vaultCapabilities(member).fastWithdraw.allowed).to.equal(true);
    expect(vaultCapabilities({ ...member, rule: 3 }).fastWithdraw.allowed).to.equal(false);
    expect(vaultCapabilities({ ...member, rule: 2 }).depositToVault.allowed).to.equal(false);
    expect(vaultCapabilities({ ...member, rule: 2 }).contributeRoscaRound.allowed).to.equal(true);
    for (const values of [{ paused: true }, { allowed: false }, { linked: false }, { active: false }]) expect(Object.values(vaultCapabilities({ ...member, guardian: true, ...values })).every((value) => !value.allowed)).to.equal(true);
  });
  it("retries temporary finality conflicts but does not retry authorization/evidence conflicts", () => {
    expect(syncRetryPolicy(409, "RECEIPT_NOT_FINALIZED").retryable).to.equal(true);
    expect(syncRetryPolicy(409, "RECEIPT_PENDING").retryable).to.equal(true);
    expect(syncRetryPolicy(409, "VAULT_POLICY_MISMATCH").retryable).to.equal(false);
    expect(syncRetryPolicy(403, "RECEIPT_PENDING").retryable).to.equal(false);
    expect(syncRetryPolicy(503).retryable).to.equal(true);
  });
  it("uses the manifest chain for provisioning even with legacy L1 environment values", () => {
    const previous = process.env.FAMILY_L1_CHAIN_ID; process.env.FAMILY_L1_CHAIN_ID = "99999";
    try { expect(provisioningIdentity().chainId).to.equal(43113); } finally { if (previous === undefined) delete process.env.FAMILY_L1_CHAIN_ID; else process.env.FAMILY_L1_CHAIN_ID = previous; }
  });
  it("defaults SIWE to Fuji and requires explicit valid extra chains", () => {
    const previous = process.env.AUTH_SIWE_CHAIN_IDS;
    try { delete process.env.AUTH_SIWE_CHAIN_IDS; expect(allowedChains()).to.deep.equal([43113]); process.env.AUTH_SIWE_CHAIN_IDS = "43113, 43113"; expect(allowedChains()).to.deep.equal([43113]); process.env.AUTH_SIWE_CHAIN_IDS = "NaN"; expect(() => allowedChains()).to.throw("SIWE"); }
    finally { if (previous === undefined) delete process.env.AUTH_SIWE_CHAIN_IDS; else process.env.AUTH_SIWE_CHAIN_IDS = previous; }
  });
});

import { expect } from "chai";
import { ethers } from "hardhat";
import { t1Fixture } from "./support/t1";
import { validateDeployment } from "../shared/deploymentManifest";
import manifest from "../shared/deployment.json";
import {
  deploymentManifest,
  verifiedDeployment,
} from "../backend/src/services/deploymentService";
import { mkdtempSync, writeFileSync, unlinkSync, rmdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

describe("T1 deployment evidence and callback boundaries", () => {
  const configured = { ...manifest, enabled: false, status: "configured" };
  it("distinguishes configuration from enabled deployment", async () => {
    expect(validateDeployment(configured).chainId).to.equal(43113);
    const directory = mkdtempSync(join(tmpdir(), "kinetix-manifest-"));
    const file = join(directory, "manifest.json");
    const previous = process.env.DEPLOYMENT_MANIFEST;
    try {
      writeFileSync(file, JSON.stringify(configured));
      process.env.DEPLOYMENT_MANIFEST = file;
      expect(deploymentManifest().enabled).to.equal(false);
      let error: any;
      try {
        await verifiedDeployment();
      } catch (caught) {
        error = caught;
      }
      expect(error?.code).to.equal("DEPLOYMENT_NOT_ENABLED");
    } finally {
      if (previous === undefined) delete process.env.DEPLOYMENT_MANIFEST;
      else process.env.DEPLOYMENT_MANIFEST = previous;
      unlinkSync(file);
      rmdirSync(directory);
    }
  });
  it("rejects enabling incomplete manifests, unsupported features and credential URLs", () => {
    expect(() =>
      validateDeployment({
        ...configured,
        enabled: true,
        contracts: {
          hub: null,
          cashflow: null,
          forwarder: null,
          yieldVault: null,
        },
      }),
    ).to.throw("DEPLOYMENT_EVIDENCE_MISSING");
    expect(() =>
      validateDeployment({
        ...manifest,
        features: { ...manifest.features, crossChain: true },
      }),
    ).to.throw("T1_FEATURE_POLICY_INVALID");
    expect(() =>
      validateDeployment({
        ...manifest,
        features: { ...manifest.features, relayer: true },
      }),
    ).to.throw("T1_FEATURE_POLICY_INVALID");
    expect(() =>
      validateDeployment({
        ...manifest,
        rpcUrl: "https://user:password@rpc.invalid",
      }),
    ).to.throw("DEPLOYMENT_PUBLIC_URL_INVALID");
    expect(() => validateDeployment({ ...manifest, chainId: 99999 })).to.throw(
      "DEPLOYMENT_MANIFEST_INVALID",
    );
  });
  for (const modular of [true, false]) {
    it(`rejects payout reentrancy (${modular ? "treasury" : "standalone"})`, async () => {
      const f = await t1Fixture(modular);
      const receiver = await (
        await ethers.getContractFactory("WithdrawalReceiver")
      ).deploy(f.hub.target);
      const id = await f.create(0, 2, [String(receiver.target)]);
      await receiver.configure(id, false);
      await f.hub.depositToVault(id, { value: 100n });
      await receiver.withdraw(10n);
      expect(await ethers.provider.getBalance(receiver.target)).to.equal(10n);
      expect(await receiver.reentered()).to.equal(false);
      expect((await f.hub.getVault(id)).totalBalance).to.equal(90n);
    });
    it(`restores approvals and ledger if recipient rejects payment (${modular ? "treasury" : "standalone"})`, async () => {
      const f = await t1Fixture(modular);
      const receiver = await (
        await ethers.getContractFactory("WithdrawalReceiver")
      ).deploy(f.hub.target);
      const id = await f.create(0, 2, [String(receiver.target)]);
      await receiver.configure(id, true);
      await f.hub.depositToVault(id, { value: 100n });
      await receiver.request(100n);
      await f.hub.connect(f.g1).approveWithdrawal(1n);
      await expect(f.hub.connect(f.g2).approveWithdrawal(1n)).to.be.reverted;
      expect((await f.hub.withdrawalRequests(1n)).executed).to.equal(false);
      expect((await f.hub.withdrawalRequests(1n)).approvalsCount).to.equal(1n);
      expect((await f.hub.getVault(id)).totalBalance).to.equal(100n);
      await receiver.configure(id, false);
      await f.hub.connect(f.g2).approveWithdrawal(1n);
      expect(await ethers.provider.getBalance(receiver.target)).to.equal(100n);
    });
  }
});

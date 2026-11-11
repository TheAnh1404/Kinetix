import { expect } from "chai";
import { ethers } from "hardhat";
import { wireContracts } from "../scripts/wire-teleporter";
import {
  requireAddress,
  requireBlockchainId,
} from "../scripts/lib/dualChainDeployment";
import { t1Fixture } from "./support/t1";

describe("Two-chain wiring orchestration on the local EVM", () => {
  async function fixture() {
    const f = await t1Fixture();
    const messenger = await (
      await ethers.getContractFactory("MockTeleporterMessenger")
    ).deploy();
    const config = {
      familyId: ethers.id("Family-L1"),
      cChainId: ethers.id("Fuji-C-Chain"),
      fujiMessenger: await messenger.getAddress(),
      familyMessenger: await messenger.getAddress(),
      fujiOwner: f.admin.address,
      familyOwner: f.admin.address,
    };
    return { ...f, messenger, config };
  }
  it("rejects zero/malformed addresses and numeric EVM IDs in blockchain-ID configuration", () => {
    for (const value of [undefined, ethers.ZeroAddress, "bad-address"])
      expect(() => requireAddress(value, "TEST")).to.throw();
    for (const value of [undefined, "43113", ethers.ZeroHash, "0x1234"])
      expect(() => requireBlockchainId(value, "TEST")).to.throw();
    expect(requireBlockchainId(ethers.id("Family-L1"), "TEST")).to.equal(
      ethers.id("Family-L1"),
    );
  });
  it("wires both directions and cashflow, checks reserve, then reruns without transactions", async () => {
    const f = await fixture();
    await f.yieldVault.seedYieldReserve({ value: 5n });
    const steps: string[] = [];
    await wireContracts(f.yieldVault, f.hub, f.cashflow, f.config, (step) =>
      steps.push(step),
    );
    expect(steps.filter((step) => step.endsWith(":confirmed"))).to.deep.equal([
      "yieldVault:confirmed",
      "hub:confirmed",
      "cashflow:confirmed",
    ]);
    expect(await f.yieldVault.familyHubAddress()).to.equal(f.hub.target);
    expect(await f.hub.yieldVaultAddress()).to.equal(f.yieldVault.target);
    expect(await f.cashflow.yieldVaultAddress()).to.equal(f.yieldVault.target);
    expect(await f.yieldVault.familyL1BlockchainId()).to.equal(
      f.config.familyId,
    );
    expect(await f.hub.cChainBlockchainId()).to.equal(f.config.cChainId);
    await wireContracts(f.yieldVault, f.hub, f.cashflow, f.config, () => {
      throw new Error("Should not send again");
    });
  });
  it("fails preflight with no reserve or a wrong owner before changing either chain", async () => {
    const f = await fixture();
    await expect(
      wireContracts(f.yieldVault, f.hub, f.cashflow, f.config),
    ).to.be.rejectedWith("YIELD_RESERVE_EMPTY");
    expect(await f.yieldVault.familyHubAddress()).to.equal(ethers.ZeroAddress);
    await f.yieldVault.seedYieldReserve({ value: 1n });
    await expect(
      wireContracts(f.yieldVault, f.hub, f.cashflow, {
        ...f.config,
        familyOwner: f.other.address,
      }),
    ).to.be.rejectedWith("FAMILY_ADMIN_MISMATCH");
    expect(await f.yieldVault.familyHubAddress()).to.equal(ethers.ZeroAddress);
    expect(await f.hub.yieldVaultAddress()).to.equal(ethers.ZeroAddress);
  });
  it("fails preflight for an active unwired Hub before changing the Vault", async () => {
    const f = await fixture();
    await f.create();
    await f.yieldVault.seedYieldReserve({ value: 1n });
    await expect(
      wireContracts(f.yieldVault, f.hub, f.cashflow, f.config),
    ).to.be.rejectedWith("HUB_CONFIGURATION_LOCKED");
    expect(await f.yieldVault.familyHubAddress()).to.equal(ethers.ZeroAddress);
  });
  it("resumes after interruption following the first confirmed transaction", async () => {
    const f = await fixture();
    await f.yieldVault.seedYieldReserve({ value: 1n });
    await expect(
      wireContracts(f.yieldVault, f.hub, f.cashflow, f.config, (step) => {
        if (step === "yieldVault:confirmed") throw new Error("INTERRUPTED");
      }),
    ).to.be.rejectedWith("INTERRUPTED");
    const steps: string[] = [];
    await wireContracts(f.yieldVault, f.hub, f.cashflow, f.config, (step) =>
      steps.push(step),
    );
    expect(steps).not.to.include("yieldVault:submitted");
    expect(await f.hub.yieldVaultAddress()).to.equal(f.yieldVault.target);
  });
});

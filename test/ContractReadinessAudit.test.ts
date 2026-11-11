import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { t1Fixture, signedForward } from "./support/t1";
import {
  relayForwardRequest,
  relayerAccount,
} from "../backend/src/services/relayerService";

// Regression hành vi an toàn trên EVM cục bộ, không phải bằng chứng deploy Fuji.
describe("Contract readiness audit: post-upgrade T1 regressions", () => {
  it("AUD-01: nonexistent deposit reverts without changing counter or ledger", async () => {
    const f = await t1Fixture();
    await expect(
      f.hub.depositToVault(999n, { value: 1n }),
    ).to.be.revertedWithCustomError(f.hub, "VaultNotFound");
    expect(await f.hub.vaultCounter()).to.equal(0n);
    expect(await f.cashflow.totalLiabilities()).to.equal(0n);
  });
  it("AUD-02: goal cannot use native fast withdrawal", async () => {
    const f = await t1Fixture();
    const id = await f.create(3);
    await f.hub.depositToVault(id, { value: 1n });
    await expect(
      f.hub.connect(f.member).fastWithdraw(id, 1n),
    ).to.be.revertedWithCustomError(f.hub, "InvalidRuleAction");
  });
  it("AUD-03: token paths are disabled until per-asset policy exists", async () => {
    const f = await t1Fixture();
    const id = await f.create(3);
    await expect(
      f.hub.depositTokenToVault(id, f.other.address, 10n),
    ).to.be.revertedWithCustomError(f.hub, "FeatureDisabled");
    await expect(
      f.hub.connect(f.member).fastWithdrawToken(id, f.other.address, 10n),
    ).to.be.revertedWithCustomError(f.hub, "FeatureDisabled");
  });
  it("AUD-04: forwarder rejects use of existing funds without matching msg.value", async () => {
    const f = await t1Fixture();
    const id = await f.create();
    // Force native funds without requiring the forwarder to expose a payable receive().
    await ethers.provider.send("hardhat_setBalance", [
      String(f.forwarder.target),
      "0xde0b6b3a7640000",
    ]);
    const request = await signedForward(
      f,
      f.hub.interface.encodeFunctionData("depositToVault", [id]),
      { value: ethers.parseEther("1") },
    );
    await expect(f.forwarder.execute(request)).to.be.revertedWithCustomError(
      f.forwarder,
      "ERC2771ForwarderMismatchedValue",
    );
    expect(await f.forwarder.nonces(f.member.address)).to.equal(0n);
  });
  it("AUD-05: compound without reserve cannot increase principal", async () => {
    const f = await t1Fixture();
    await f.yieldVault.depositPrincipal(1n, { value: ethers.parseEther("1") });
    await time.increase(365 * 86400);
    await expect(f.yieldVault.compoundYield(1n)).to.be.revertedWithCustomError(
      f.yieldVault,
      "InsufficientReservePool",
    );
    expect(await f.yieldVault.totalPrincipal()).to.equal(
      ethers.parseEther("1"),
    );
  });
  it("AUD-06: new capital has no retroactive interest; remainder survives checkpoint", async () => {
    const f = await t1Fixture();
    await f.yieldVault.depositPrincipal(1n, { value: 1n });
    await time.increase(1000);
    await f.yieldVault.depositPrincipal(1n, {
      value: ethers.parseEther("100"),
    });
    expect(await f.yieldVault.calculateAccruedYield(1n)).to.equal(0n);
    expect(await f.yieldVault.yieldRemainder(1n)).to.be.greaterThan(0n);
  });
  it("AUD-07: withdrawal pays exactly once on the selected chain", async () => {
    const f = await t1Fixture();
    const id = await f.create();
    await f.hub.depositToVault(id, { value: ethers.parseEther("100") });
    await f.hub
      .connect(f.member)
      .requestLargeWithdrawal(id, ethers.parseEther("60"), "Expense");
    await f.hub.connect(f.g1).approveWithdrawal(1n);
    await expect(
      f.hub.connect(f.g2).approveWithdrawal(1n),
    ).to.changeEtherBalance(f.member, ethers.parseEther("60"));
    expect(await f.yieldVault.totalPrincipal()).to.equal(0n);
    expect(await f.cashflow.totalLiabilities()).to.equal(
      ethers.parseEther("40"),
    );
  });
  it("AUD-08: unfunded ICM cannot create remote principal; T1 sends no messages", async () => {
    const f = await t1Fixture();
    const id = await f.create();
    await f.hub.depositToVault(id, { value: 100n });
    expect((await f.cashflow.getVaultLedger(id)).cChainPrincipal).to.equal(0n);
    await expect(
      f.yieldVault.receiveTeleporterMessage(
        ethers.ZeroHash,
        f.cashflow.target,
        "0x",
      ),
    ).to.be.revertedWithCustomError(f.yieldVault, "OnlyTeleporterMessenger");
    expect(await f.yieldVault.totalPrincipal()).to.equal(0n);
  });
  it("receiver failures remain visible in the messenger test double", async () => {
    const f = await t1Fixture();
    const messenger = await (
      await ethers.getContractFactory("MockTeleporterMessenger")
    ).deploy();
    await expect(
      messenger.sendCrossChainMessage({
        destinationBlockchainID: ethers.ZeroHash,
        destinationAddress: f.yieldVault.target,
        feeInfo: { feeTokenAddress: ethers.ZeroAddress, amount: 0n },
        requiredGasLimit: 250000n,
        allowedRelayerAddresses: [],
        message: "0x",
      }),
    ).to.emit(messenger, "MockDeliveryFailed");
    expect(await f.yieldVault.totalPrincipal()).to.equal(0n);
  });
  it("AUD-09: duplicate guardians cannot create an impossible quorum", async () => {
    const f = await t1Fixture();
    await f.hub.setAllowlistStatus(f.g1.address, true);
    await f.hub.setAllowlistStatus(f.member.address, true);
    await expect(
      f.hub.createCustomVault(
        "Duplicate",
        0,
        10000,
        0n,
        2,
        [f.g1.address, f.g1.address],
        [f.member.address],
      ),
    ).to.be.revertedWithCustomError(f.hub, "DuplicateMember");
  });
  it("AUD-10: disabled sponsorship rejects arbitrary client requests and has no deployer-key fallback", async () => {
    let error: any;
    try {
      await relayForwardRequest(ethers.ZeroAddress, {} as any);
    } catch (caught) {
      error = caught;
    }
    expect(error?.status).to.equal(503);
    expect(error?.code).to.equal("RELAYER_DISABLED_T1");
    const previous = process.env.RELAYER_PRIVATE_KEY;
    delete process.env.RELAYER_PRIVATE_KEY;
    try {
      expect(() => relayerAccount()).to.throw("Cần khóa riêng");
    } finally {
      if (previous) process.env.RELAYER_PRIVATE_KEY = previous;
    }
  });
  it("AUD-11: funded hub cannot be attached to an empty replacement treasury", async () => {
    const f = await t1Fixture(false);
    const id = await f.create();
    await f.hub.depositToVault(id, { value: 100n });
    await expect(
      f.hub.setVaultCashflow(f.cashflow.target),
    ).to.be.revertedWithCustomError(f.hub, "ConfigurationLocked");
    expect((await f.hub.getVault(id)).totalBalance).to.equal(100n);
    expect(await ethers.provider.getBalance(f.hub.target)).to.equal(100n);
  });
  it("AUD-12: empty reserve never spends a different vault's principal", async () => {
    const f = await t1Fixture();
    await f.yieldVault.depositPrincipal(1n, { value: ethers.parseEther("1") });
    await time.increase(365 * 86400);
    await f.yieldVault.depositPrincipal(2n, { value: ethers.parseEther("1") });
    await expect(
      f.yieldVault.processVaultWithdrawal(
        1n,
        f.member.address,
        ethers.parseEther("1.08"),
      ),
    ).to.be.revertedWithCustomError(f.yieldVault, "InsufficientReservePool");
    expect(await ethers.provider.getBalance(f.yieldVault.target)).to.equal(
      await f.yieldVault.totalPrincipal(),
    );
  });
  it("AUD-13: recovery moves ROSCA membership and contribution identity before payout", async () => {
    const f = await t1Fixture();
    const id = await f.create(2, 2);
    await f.hub
      .connect(f.member)
      .contributeRoscaRound(id, { value: ethers.parseEther("1") });
    await f.hub
      .connect(f.g1)
      .recoverMemberWallet(id, f.member.address, f.replacement.address);
    await f.hub
      .connect(f.g2)
      .recoverMemberWallet(id, f.member.address, f.replacement.address);
    expect((await f.hub.getVaultBeneficiaries(id))[0]).to.equal(
      f.replacement.address,
    );
    await expect(
      f.hub
        .connect(f.replacement)
        .contributeRoscaRound(id, { value: ethers.parseEther("1") }),
    ).to.be.revertedWithCustomError(f.hub, "RoscaAlreadyContributed");
    await time.increase(61);
    await expect(f.hub.payoutRoscaRound(id)).to.changeEtherBalances(
      [f.replacement, f.member],
      [ethers.parseEther("1"), 0n],
    );
  });
  it("AUD-14: chores cannot bypass SHIELD quorum", async () => {
    const f = await t1Fixture();
    const id = await f.create();
    await f.hub.depositToVault(id, { value: 100n });
    await expect(
      f.hub.connect(f.g1).createChore(id, "Bypass", 100n, f.g1.address),
    ).to.be.revertedWithCustomError(f.hub, "InvalidRuleAction");
    expect((await f.hub.getVault(id)).totalBalance).to.equal(100n);
  });
});

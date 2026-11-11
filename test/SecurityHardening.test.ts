import { expect } from "chai";
import { ethers } from "hardhat";
import { time, setBalance } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { t1Fixture } from "./support/t1";

describe("Reserve-backed standalone yield model, excluded from T1 deployment", () => {
  async function teleporterFixture(configured = true) {
    const f = await t1Fixture();
    const messenger = await (await ethers.getContractFactory("MockTeleporterMessenger")).deploy();
    const chainId = ethers.id("Family-L1");
    const vault = await (await ethers.getContractFactory("FamilyYieldVault")).deploy(
      messenger.target, configured ? chainId : ethers.ZeroHash,
      configured ? f.hub.target : ethers.ZeroAddress,
    );
    const payload = (action = 0, amount = 100n) => ethers.AbiCoder.defaultAbiCoder().encode(
      ["uint8", "uint256", "uint256", "address"], [action, 1n, amount, f.member.address],
    );
    const deliver = (origin = chainId, sender = f.hub.target, data = payload()) =>
      messenger.deliverMockMessage(vault.target, origin, sender, data);
    return { ...f, messenger, chainId, vault, payload, deliver };
  }
  it("authenticates messenger before configuration, origin chain and origin sender", async () => {
    const f = await teleporterFixture();
    await expect(f.vault.receiveTeleporterMessage(f.chainId, f.hub.target, f.payload()))
      .to.be.revertedWithCustomError(f.vault, "OnlyTeleporterMessenger");
    await expect(f.deliver(ethers.id("wrong-chain")))
      .to.be.revertedWithCustomError(f.vault, "InvalidOriginChain");
    await expect(f.deliver(f.chainId, f.other.address))
      .to.be.revertedWithCustomError(f.vault, "UnauthorizedSender");
    const empty = await teleporterFixture(false);
    await expect(empty.deliver()).to.be.revertedWithCustomError(empty.vault, "TeleporterNotConfigured");
  });
  it("credits authenticated deposits only against funded principal, never reserve", async () => {
    const f = await teleporterFixture();
    await f.vault.seedYieldReserve({ value: 100n });
    await expect(f.deliver()).to.be.revertedWithCustomError(f.vault, "UnfundedPrincipal");
    await f.vault.fundCrossChainPrincipal({ value: 100n });
    await f.deliver();
    expect(await f.vault.vaultPrincipals(1n)).to.equal(100n);
    expect(await f.vault.yieldReservePool()).to.equal(100n);
    await expect(f.deliver()).to.be.revertedWithCustomError(f.vault, "UnfundedPrincipal");
    await expect(f.deliver(f.chainId, f.hub.target, f.payload(1, 40n)))
      .to.changeEtherBalance(f.member, 40n);
    expect(await f.vault.totalPrincipal()).to.equal(60n);
  });
  it("rejects malformed authenticated messages and pauses delivery", async () => {
    const f = await teleporterFixture();
    await expect(f.deliver(f.chainId, f.hub.target, "0x")).to.be.reverted;
    await f.vault.pause();
    await expect(f.deliver()).to.be.revertedWithCustomError(f.vault, "EnforcedPause");
    expect(await f.vault.totalPrincipal()).to.equal(0n);
  });
  it("reports actual liquidity and rolls back all accounting before a failed payout", async () => {
    const f = await teleporterFixture();
    await f.vault.depositPrincipal(1n, { value: 100n });
    const timestamp = await f.vault.lastDepositTimestamp(1n);
    await setBalance(f.vault.target as string, 39n);
    await expect(f.deliver(f.chainId, f.hub.target, f.payload(1, 40n)))
      .to.be.revertedWithCustomError(f.vault, "InsufficientContractBalance").withArgs(39n, 40n);
    expect(await f.vault.totalPrincipal()).to.equal(100n);
    expect(await f.vault.vaultPrincipals(1n)).to.equal(100n);
    expect(await f.vault.lastDepositTimestamp(1n)).to.equal(timestamp);
    await setBalance(f.vault.target as string, 100n);
    await f.deliver(f.chainId, f.hub.target, f.payload(1, 100n));
    expect(await f.vault.totalPrincipal()).to.equal(0n);
  });
  it("keeps seedYieldReserve equivalent to depositYieldReserve including zero and pause guards", async () => {
    const f = await t1Fixture();
    await expect(f.yieldVault.seedYieldReserve()).to.be.revertedWithCustomError(f.yieldVault, "ZeroAmount");
    await expect(f.yieldVault.connect(f.other).seedYieldReserve({ value: 5n }))
      .to.emit(f.yieldVault, "YieldReserveDeposited").withArgs(f.other.address, 5n);
    await f.yieldVault.pause();
    await expect(f.yieldVault.seedYieldReserve({ value: 1n }))
      .to.be.revertedWithCustomError(f.yieldVault, "EnforcedPause");
  });
  it("accepts reserve sponsorship without treating it as principal", async () => {
    const f = await t1Fixture();
    await f.yieldVault.connect(f.other).depositYieldReserve({ value: 100n });
    await f.other.sendTransaction({ to: f.yieldVault.target, value: 10n });
    expect(await f.yieldVault.yieldReservePool()).to.equal(110n);
    expect(await f.yieldVault.totalPrincipal()).to.equal(0n);
  });
  it("allows only operator-owned principal and rejects public deposits and withdrawals", async () => {
    const f = await t1Fixture();
    await expect(
      f.yieldVault.connect(f.other).depositPrincipal(1n, { value: 1n }),
    ).to.be.revertedWithCustomError(f.yieldVault, "OwnableUnauthorizedAccount");
    await expect(
      f.yieldVault
        .connect(f.other)
        .processVaultWithdrawal(1n, f.other.address, 1n),
    ).to.be.revertedWithCustomError(f.yieldVault, "OwnableUnauthorizedAccount");
    await expect(
      f.yieldVault.receiveCrossChainDeposit(1n, { value: 1n }),
    ).to.be.revertedWithCustomError(f.yieldVault, "FeatureDisabled");
  });
  it("pays principal without touching reserve or other vaults", async () => {
    const f = await t1Fixture();
    await f.yieldVault.depositPrincipal(1n, { value: 100n });
    await f.yieldVault.depositPrincipal(2n, { value: 200n });
    await expect(
      f.yieldVault.processVaultWithdrawal(1n, f.member.address, 40n),
    ).to.changeEtherBalance(f.member, 40n);
    expect(await f.yieldVault.vaultPrincipals(1n)).to.equal(60n);
    expect(await f.yieldVault.vaultPrincipals(2n)).to.equal(200n);
    expect(await ethers.provider.getBalance(f.yieldVault.target)).to.equal(
      await f.yieldVault.totalPrincipal(),
    );
  });
  it("compounds backed interest and preserves total assets", async () => {
    const f = await t1Fixture();
    await f.yieldVault.depositPrincipal(1n, {
      value: ethers.parseEther("100"),
    });
    await f.yieldVault.depositYieldReserve({ value: ethers.parseEther("10") });
    await time.increase(365 * 86400);
    expect(await f.yieldVault.getTotalValueLocked(1n)).to.equal(
      ethers.parseEther("100"),
    );
    await f.yieldVault.compoundYield(1n);
    expect(await f.yieldVault.vaultPrincipals(1n)).to.be.closeTo(
      ethers.parseEther("108"),
      ethers.parseEther("0.001"),
    );
    expect(
      (await f.yieldVault.totalPrincipal()) +
        (await f.yieldVault.yieldReservePool()),
    ).to.equal(await ethers.provider.getBalance(f.yieldVault.target));
  });
  it("pays interest exclusively from reserve and preserves a second vault", async () => {
    const f = await t1Fixture();
    await f.yieldVault.depositPrincipal(1n, { value: ethers.parseEther("1") });
    await time.increase(365 * 86400);
    await f.yieldVault.depositPrincipal(2n, { value: ethers.parseEther("1") });
    await f.yieldVault.depositYieldReserve({
      value: ethers.parseEther("0.08"),
    });
    await f.yieldVault.processVaultWithdrawal(
      1n,
      f.member.address,
      ethers.parseEther("1.08"),
    );
    expect(await f.yieldVault.yieldReservePool()).to.equal(0n);
    expect(await ethers.provider.getBalance(f.yieldVault.target)).to.equal(
      ethers.parseEther("1"),
    );
    expect(await f.yieldVault.vaultPrincipals(2n)).to.equal(
      ethers.parseEther("1"),
    );
  });
  it("does not give new deposits time accrued before their checkpoint", async () => {
    const f = await t1Fixture();
    await f.yieldVault.depositPrincipal(1n, { value: 1n });
    await time.increase(1000);
    const tx = await f.yieldVault.depositPrincipal(1n, {
      value: ethers.parseEther("100"),
    });
    const block = await ethers.provider.getBlock(
      (await tx.wait())!.blockNumber,
    );
    expect(await f.yieldVault.lastDepositTimestamp(1n)).to.equal(
      block!.timestamp,
    );
    expect(await f.yieldVault.calculateTotalYield(1n)).to.equal(0n);
    await time.increase(100);
    expect(await f.yieldVault.calculateTotalYield(1n)).to.be.lessThan(
      ethers.parseEther("0.0001"),
    );
  });
  it("reverts excessive withdrawal without changing checkpoint or balances", async () => {
    const f = await t1Fixture();
    await f.yieldVault.depositPrincipal(1n, { value: 100n });
    const timestamp = await f.yieldVault.lastDepositTimestamp(1n);
    await expect(
      f.yieldVault.processVaultWithdrawal(1n, f.member.address, 101n),
    ).to.be.revertedWithCustomError(f.yieldVault, "InsufficientBalance");
    expect(await f.yieldVault.lastDepositTimestamp(1n)).to.equal(timestamp);
    expect(await f.yieldVault.totalPrincipal()).to.equal(100n);
  });
  it("enforces pause for all principal and reserve writes", async () => {
    const f = await t1Fixture();
    await f.yieldVault.pause();
    await expect(
      f.yieldVault.depositPrincipal(1n, { value: 1n }),
    ).to.be.revertedWithCustomError(f.yieldVault, "EnforcedPause");
    await expect(
      f.yieldVault.depositYieldReserve({ value: 1n }),
    ).to.be.revertedWithCustomError(f.yieldVault, "EnforcedPause");
    await f.yieldVault.unpause();
    await f.yieldVault.depositPrincipal(1n, { value: 1n });
  });
});

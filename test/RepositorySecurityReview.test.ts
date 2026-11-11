import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { t1Fixture } from "./support/t1";

const approvalTypes = {
  WithdrawalApproval: [
    { name: "requestId", type: "uint256" },
    { name: "vaultId", type: "uint256" },
    { name: "recipient", type: "address" },
    { name: "amount", type: "uint256" },
    { name: "nonce", type: "uint256" },
  ],
};

async function approval(f: Awaited<ReturnType<typeof t1Fixture>>, signer: any, id: bigint, recipient: string) {
  return signer.signTypedData(
    { name: "FamilyHub", version: "1", chainId: (await ethers.provider.getNetwork()).chainId, verifyingContract: String(f.hub.target) },
    approvalTypes,
    { requestId: 1n, vaultId: id, recipient, amount: 100n, nonce: 1n },
  );
}

async function cloneFixture(template = 0, quorum = 1) {
  const [owner, g1, g2, member, other] = await ethers.getSigners();
  const implementation = await (await ethers.getContractFactory("KinetixVaultV1")).deploy();
  const factory = await (await ethers.getContractFactory("KinetixVaultFactoryV1")).deploy(implementation.target);
  const config = {
    template, requiredApprovals: quorum, fastWithdrawLimit: template === 0 ? 10n : 0n,
    targetGoalAmount: template === 3 ? 100n : 0n,
    targetDeadline: template === 3 ? (await time.latest()) + 7 * 86400 : 0,
    roscaRoundContribution: template === 2 ? 10n : 0n,
    roscaRoundDuration: template === 2 ? 60 : 0,
    guardians: [g1.address, g2.address], beneficiaries: [member.address],
  };
  await factory.createVault(config, ethers.ZeroHash);
  const vault = await ethers.getContractAt("KinetixVaultV1", await factory.allVaults(0));
  await vault.deposit({ value: 60n });
  return { owner, g1, g2, member, other, factory, vault, config };
}

describe("Repository security review regressions", () => {
  it("rejects an overlapping guardian-beneficiary's own approval without changing its vote count", async () => {
    const f = await t1Fixture();
    const id = await f.create(0, 1, [f.g1.address]);
    await f.hub.depositToVault(id, { value: 100n });
    await f.hub.connect(f.g1).requestLargeWithdrawal(id, 100n, "Own expense");
    await expect(f.hub.connect(f.g1).approveWithdrawal(1n)).to.be.revertedWithCustomError(f.hub, "SelfApproval");
    expect((await f.hub.withdrawalRequests(1n)).approvalsCount).to.equal(0n);
    await expect(f.hub.connect(f.g2).approveWithdrawal(1n)).to.changeEtherBalance(f.g1, 100n);
  });

  it("excludes self-benefiting EIP-712 signatures and rolls back an insufficient signature batch", async () => {
    const f = await t1Fixture();
    const id = await f.create(0, 1, [f.g1.address]);
    await f.hub.depositToVault(id, { value: 100n });
    await f.hub.connect(f.g1).requestLargeWithdrawal(id, 100n, "Own expense");
    const self = await approval(f, f.g1, id, f.g1.address);
    await expect(f.hub.executeWithdrawalWithSignatures(1n, [self, self])).to.be.revertedWithCustomError(f.hub, "InvalidApprovalThreshold");
    expect(await f.hub.hasApprovedRequest(1n, f.g1.address)).to.equal(false);
    const independent = await approval(f, f.g2, id, f.g1.address);
    await expect(f.hub.executeWithdrawalWithSignatures(1n, [self, independent])).to.changeEtherBalance(f.g1, 100n);
    await expect(f.hub.executeWithdrawalWithSignatures(1n, [independent])).to.be.revertedWithCustomError(f.hub, "RequestAlreadyExecuted");
  });

  it("rejects expired withdrawals through both approval paths and preserves the vault balance", async () => {
    const f = await t1Fixture();
    const id = await f.create(0, 1);
    await f.hub.depositToVault(id, { value: 100n });
    await f.hub.connect(f.member).requestLargeWithdrawal(id, 100n, "Expense");
    const signature = await approval(f, f.g1, id, f.member.address);
    await time.increaseTo((await f.hub.withdrawalRequests(1n)).deadline + 1n);
    await expect(f.hub.connect(f.g1).approveWithdrawal(1n)).to.be.revertedWithCustomError(f.hub, "RequestExpired");
    await expect(f.hub.executeWithdrawalWithSignatures(1n, [signature])).to.be.revertedWithCustomError(f.hub, "RequestExpired");
    expect((await f.hub.getVault(id)).totalBalance).to.equal(100n);
  });

  it("requires distinct authorized guardians for recovery and removes the old identity only at quorum", async () => {
    const f = await t1Fixture();
    const id = await f.create();
    await f.hub.setAllowlistStatus(f.other.address, true);
    await expect(f.hub.connect(f.other).recoverMemberWallet(id, f.member.address, f.replacement.address)).to.be.revertedWithCustomError(f.hub, "NotVaultGuardian");
    await f.hub.connect(f.g1).recoverMemberWallet(id, f.member.address, f.replacement.address);
    await expect(f.hub.connect(f.g1).recoverMemberWallet(id, f.member.address, f.replacement.address)).to.be.revertedWithCustomError(f.hub, "AlreadyApproved");
    expect(await f.hub.isVaultBeneficiary(id, f.member.address)).to.equal(true);
    expect(await f.hub.isVaultBeneficiary(id, f.replacement.address)).to.equal(false);
    await f.hub.connect(f.g2).recoverMemberWallet(id, f.member.address, f.replacement.address);
    expect(await f.hub.isVaultBeneficiary(id, f.member.address)).to.equal(false);
    expect(await f.hub.isVaultBeneficiary(id, f.replacement.address)).to.equal(true);
  });

  it("does not auto-approve or accept a V1 guardian's withdrawal to itself", async () => {
    const f = await cloneFixture();
    await f.vault.connect(f.g1).requestWithdrawal(20n, f.g1.address, ethers.ZeroHash);
    expect((await f.vault.getWithdrawalRequest(1n)).approvalsCount).to.equal(0n);
    await expect(f.vault.connect(f.g1).approveWithdrawal(1n)).to.be.revertedWithCustomError(f.vault, "Unauthorized");
    await f.vault.connect(f.g2).approveWithdrawal(1n);
    await expect(f.vault.executeWithdrawal(1n)).to.changeEtherBalance(f.g1, 20n);
  });

  it("enforces shared goals on both V1 execution methods without counting reservations twice", async () => {
    const f = await cloneFixture(3);
    await f.vault.connect(f.g1).requestWithdrawal(50n, f.member.address, ethers.ZeroHash);
    for (const method of ["executeWithdrawal", "executeGoalWithdrawal"] as const) {
      await expect(f.vault[method](1n)).to.be.revertedWithCustomError(f.vault, "GoalNotReached").withArgs(60n, 100n);
    }
    expect(await f.vault.reservedBalance()).to.equal(50n);
    await f.vault.deposit({ value: 40n });
    await expect(f.vault.executeWithdrawal(1n)).to.changeEtherBalance(f.member, 50n);
  });

  it("expires approved V1 goal requests and permits reservation cleanup without a payment", async () => {
    const f = await cloneFixture(3);
    await f.vault.deposit({ value: 40n });
    await f.vault.connect(f.g1).requestWithdrawal(50n, f.member.address, ethers.ZeroHash);
    await time.increaseTo((await f.vault.getWithdrawalRequest(1n)).deadline + 1n);
    await expect(f.vault.executeGoalWithdrawal(1n)).to.be.revertedWithCustomError(f.vault, "RequestExpired");
    await f.vault.connect(f.other).cancelWithdrawal(1n);
    expect(await f.vault.reservedBalance()).to.equal(0n);
    expect(await f.vault.accountedVaultBalance()).to.equal(100n);
  });

  it("prevents a single V1 guardian from bypassing a multi-approval policy through transfers or member edits", async () => {
    const f = await cloneFixture(0, 2);
    await expect(f.vault.connect(f.g1).executeVaultTransfer(f.other.address, 20n, ethers.ZeroHash)).to.be.revertedWithCustomError(f.vault, "QuorumNotMet");
    for (const method of ["addGuardian", "removeGuardian", "addBeneficiary", "removeBeneficiary"] as const) {
      await expect(f.vault.connect(f.g1)[method](f.member.address)).to.be.revertedWithCustomError(f.vault, "QuorumNotMet");
    }
    expect(await f.vault.accountedVaultBalance()).to.equal(60n);
  });

  it("blocks V1 policy-specific funds from using generic withdrawal and transfer bypasses", async () => {
    for (const template of [1, 2]) {
      const f = await cloneFixture(template);
      await expect(f.vault.connect(f.g1).requestWithdrawal(20n, f.member.address, ethers.ZeroHash)).to.be.revertedWithCustomError(f.vault, "InvalidTemplate");
      await expect(f.vault.connect(f.g1).executeVaultTransfer(f.other.address, 20n, ethers.ZeroHash)).to.be.revertedWithCustomError(f.vault, "InvalidTemplate");
    }
    const goal = await cloneFixture(3);
    await expect(goal.vault.connect(goal.g1).executeVaultTransfer(goal.other.address, 20n, ethers.ZeroHash)).to.be.revertedWithCustomError(goal.vault, "InvalidTemplate");
  });

  it("invalidates V1 withdrawal authorizations after beneficiary membership changes", async () => {
    const f = await cloneFixture();
    await f.vault.connect(f.g1).requestWithdrawal(20n, f.member.address, ethers.ZeroHash);
    await f.vault.connect(f.g1).removeBeneficiary(f.member.address);
    await expect(f.vault.executeWithdrawal(1n)).to.be.revertedWithCustomError(f.vault, "InvalidState");
    await f.vault.cancelWithdrawal(1n);
    expect(await f.vault.reservedBalance()).to.equal(0n);
  });
});

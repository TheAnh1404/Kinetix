import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { t1Fixture, signedForward } from "./support/t1";

describe("T1 signatures, recovery, chores and ROSCA", () => {
  it("executes standard OZ EIP712 forwarding and rejects replay", async () => {
    const f = await t1Fixture();
    const id = await f.create();
    await f.hub.depositToVault(id, { value: 100n });
    const request = await signedForward(
      f,
      f.hub.interface.encodeFunctionData("fastWithdraw", [id, 10n]),
    );
    expect(await f.forwarder.verify(request)).to.equal(true);
    await expect(f.forwarder.execute(request)).to.changeEtherBalance(
      f.member,
      10n,
    );
    expect(await f.forwarder.nonces(f.member.address)).to.equal(1n);
    expect(await f.forwarder.verify(request)).to.equal(false);
    await expect(f.forwarder.execute(request)).to.be.revertedWithCustomError(
      f.forwarder,
      "ERC2771ForwarderInvalidSigner",
    );
  });
  it("rejects targets that do not trust the forwarder", async () => {
    const f = await t1Fixture();
    const request = await signedForward(f, "0x", { to: f.other.address });
    expect(await f.forwarder.verify(request)).to.equal(false);
    await expect(f.forwarder.execute(request)).to.be.revertedWithCustomError(
      f.forwarder,
      "ERC2771UntrustfulTarget",
    );
  });
  it("rejects expired forward requests and malformed signatures", async () => {
    const f = await t1Fixture();
    await f.create();
    const request = await signedForward(
      f,
      f.hub.interface.encodeFunctionData("fastWithdraw", [1n, 1n]),
    );
    expect(
      await f.forwarder.verify({ ...request, signature: "0x00" }),
    ).to.equal(false);
    await time.increase(601);
    await expect(f.forwarder.execute(request)).to.be.revertedWithCustomError(
      f.forwarder,
      "ERC2771ForwarderExpiredRequest",
    );
  });
  it("rolls back nonce and value on failed target execution", async () => {
    const f = await t1Fixture();
    await f.create();
    const request = await signedForward(
      f,
      f.hub.interface.encodeFunctionData("fastWithdraw", [1n, 1n]),
    );
    await expect(f.forwarder.execute(request)).to.be.reverted;
    expect(await f.forwarder.nonces(f.member.address)).to.equal(0n);
  });
  it("sends exact user-provided value and cannot fund a batch from old funds", async () => {
    const f = await t1Fixture();
    const id = await f.create();
    await ethers.provider.send("hardhat_setBalance", [
      String(f.forwarder.target),
      "0x64",
    ]);
    const request = await signedForward(
      f,
      f.hub.interface.encodeFunctionData("depositToVault", [id]),
      { value: 10n },
    );
    await expect(
      f.forwarder.executeBatch([request], ethers.ZeroAddress),
    ).to.be.revertedWithCustomError(
      f.forwarder,
      "ERC2771ForwarderMismatchedValue",
    );
    expect((await f.hub.getVault(id)).totalBalance).to.equal(0n);
    expect(await f.forwarder.nonces(f.member.address)).to.equal(0n);
    await f.forwarder.execute(request, { value: 10n });
    expect((await f.hub.getVault(id)).totalBalance).to.equal(10n);
  });
  it("offchain guardian signatures require quorum and cannot count a signer twice", async () => {
    const f = await t1Fixture();
    const id = await f.create();
    await f.hub.depositToVault(id, { value: 100n });
    await f.hub.connect(f.member).requestLargeWithdrawal(id, 100n, "Expense");
    const domain = {
      name: "FamilyHub",
      version: "1",
      chainId: (await ethers.provider.getNetwork()).chainId,
      verifyingContract: String(f.hub.target),
    };
    const types = {
      WithdrawalApproval: [
        { name: "requestId", type: "uint256" },
        { name: "vaultId", type: "uint256" },
        { name: "recipient", type: "address" },
        { name: "amount", type: "uint256" },
        { name: "nonce", type: "uint256" },
      ],
    };
    const message = {
      requestId: 1n,
      vaultId: id,
      recipient: f.member.address,
      amount: 100n,
      nonce: 1n,
    };
    const first = await f.g1.signTypedData(domain, types, message);
    const second = await f.g2.signTypedData(domain, types, message);
    await expect(
      f.hub.executeWithdrawalWithSignatures(1n, [first, first]),
    ).to.be.revertedWithCustomError(f.hub, "InvalidApprovalThreshold");
    await expect(
      f.hub.executeWithdrawalWithSignatures(1n, [first, second]),
    ).to.changeEtherBalance(f.member, 100n);
  });
  it("recovery invalidates pending requests and old approvals", async () => {
    const f = await t1Fixture();
    const id = await f.create();
    await f.hub.depositToVault(id, { value: 100n });
    await f.hub.connect(f.member).requestLargeWithdrawal(id, 100n, "Expense");
    await f.hub.connect(f.g1).approveWithdrawal(1n);
    await f.hub
      .connect(f.g1)
      .recoverMemberWallet(id, f.g2.address, f.replacement.address);
    await f.hub
      .connect(f.g2)
      .recoverMemberWallet(id, f.g2.address, f.replacement.address);
    expect(await f.hub.getVaultGuardians(id)).to.deep.equal([
      f.g1.address,
      f.replacement.address,
    ]);
    await expect(
      f.hub.connect(f.replacement).approveWithdrawal(1n),
    ).to.be.revertedWithCustomError(f.hub, "StaleAuthorization");
    await expect(
      f.hub.connect(f.g2).createChore(id, "Old signer", 1n, f.member.address),
    ).to.be.revertedWithCustomError(f.hub, "NotVaultGuardian");
  });
  it("recovery removes old user vault access and does not reset spent daily allowance", async () => {
    const f = await t1Fixture();
    const id = await f.create();
    await f.hub.depositToVault(id, { value: ethers.parseEther("3") });
    for (let i = 0; i < 2; i++)
      await f.hub.connect(f.member).fastWithdraw(id, ethers.parseEther("1"));
    await f.hub
      .connect(f.g1)
      .recoverMemberWallet(id, f.member.address, f.replacement.address);
    await f.hub
      .connect(f.g2)
      .recoverMemberWallet(id, f.member.address, f.replacement.address);
    expect(await f.hub.getUserVaultIds(f.member.address)).to.deep.equal([]);
    await expect(
      f.hub.connect(f.replacement).fastWithdraw(id, 1n),
    ).to.be.revertedWithCustomError(f.hub, "ExceedsDailyLimit");
  });
  it("rejects recovery that merges or resurrects member identities", async () => {
    const f = await t1Fixture();
    const id = await f.create();
    await expect(
      f.hub
        .connect(f.g1)
        .recoverMemberWallet(id, f.member.address, f.g2.address),
    ).to.be.revertedWithCustomError(f.hub, "InvalidRecovery");
    await f.hub
      .connect(f.g1)
      .recoverMemberWallet(id, f.member.address, f.replacement.address);
    await f.hub
      .connect(f.g2)
      .recoverMemberWallet(id, f.member.address, f.replacement.address);
    await expect(
      f.hub
        .connect(f.g1)
        .recoverMemberWallet(id, f.replacement.address, f.member.address),
    ).to.be.revertedWithCustomError(f.hub, "InvalidRecovery");
  });
  it("reserves task rewards, requires quorum and releases the reservation only once", async () => {
    const f = await t1Fixture();
    const id = await f.create(1);
    await f.hub.depositToVault(id, { value: 100n });
    await f.hub
      .connect(f.g1)
      .createChore(id, "Homework", 70n, f.member.address);
    await expect(
      f.hub.connect(f.g1).createChore(id, "Overcommit", 31n, f.member.address),
    ).to.be.revertedWithCustomError(f.hub, "InsufficientVaultBalance");
    await expect(
      f.hub.connect(f.member).requestLargeWithdrawal(id, 100n, "Bypass"),
    ).to.be.revertedWithCustomError(f.hub, "InvalidRuleAction");
    await f.hub.connect(f.member).claimChoreCompleted(1n);
    await expect(
      f.hub.connect(f.member).claimChoreCompleted(1n),
    ).to.be.revertedWithCustomError(f.hub, "AlreadyApproved");
    await f.hub.connect(f.g1).verifyAndRewardChore(1n);
    expect((await f.hub.tasks(1n)).isRewarded).to.equal(false);
    await expect(
      f.hub.connect(f.g1).verifyAndRewardChore(1n),
    ).to.be.revertedWithCustomError(f.hub, "AlreadyApproved");
    await expect(
      f.hub.connect(f.g2).verifyAndRewardChore(1n),
    ).to.changeEtherBalance(f.member, 70n);
    expect(await f.hub.reservedRewards(id)).to.equal(0n);
    await expect(
      f.hub.connect(f.g2).verifyAndRewardChore(1n),
    ).to.be.revertedWithCustomError(f.hub, "TaskAlreadyRewarded");
  });
  it("task cancellation frees funds without a payout and blocks all subsequent transitions", async () => {
    const f = await t1Fixture();
    const id = await f.create(1);
    await f.hub.depositToVault(id, { value: 10n });
    await f.hub
      .connect(f.g1)
      .createChore(id, "Cancelled", 10n, f.member.address);
    await f.hub.connect(f.g2).cancelChore(1n);
    expect(await f.hub.reservedRewards(id)).to.equal(0n);
    await expect(
      f.hub.connect(f.member).claimChoreCompleted(1n),
    ).to.be.revertedWithCustomError(f.hub, "TaskCancelled");
    await expect(
      f.hub.connect(f.g1).cancelChore(1n),
    ).to.be.revertedWithCustomError(f.hub, "TaskCancelled");
    expect((await f.hub.getVault(id)).totalBalance).to.equal(10n);
  });
  it("recovery redirects existing chores and requires fresh reward approvals", async () => {
    const f = await t1Fixture();
    const id = await f.create(1);
    await f.hub.depositToVault(id, { value: 10n });
    await f.hub
      .connect(f.g1)
      .createChore(id, "Homework", 10n, f.member.address);
    await f.hub.connect(f.member).claimChoreCompleted(1n);
    await f.hub.connect(f.g1).verifyAndRewardChore(1n);
    await f.hub
      .connect(f.g1)
      .recoverMemberWallet(id, f.member.address, f.replacement.address);
    await f.hub
      .connect(f.g2)
      .recoverMemberWallet(id, f.member.address, f.replacement.address);
    await f.hub.connect(f.g2).verifyAndRewardChore(1n);
    expect((await f.hub.tasks(1n)).isRewarded).to.equal(false);
    await expect(
      f.hub.connect(f.g1).verifyAndRewardChore(1n),
    ).to.changeEtherBalances([f.replacement, f.member], [10n, 0n]);
  });
  it("prevents a guardian assigning a self-approved reward", async () => {
    const f = await t1Fixture();
    const id = await f.create(1, 2, [f.g1.address]);
    await f.hub.depositToVault(id, { value: 10n });
    await expect(
      f.hub.connect(f.g1).createChore(id, "Self reward", 10n, f.g1.address),
    ).to.be.revertedWithCustomError(f.hub, "AssigneeMismatch");
  });
  it("ROSCA requires exact contributions, all members, and only one finite cycle", async () => {
    const f = await t1Fixture();
    const id = await f.create(2, 2, [f.member.address, f.other.address]);
    await expect(
      f.hub.depositToVault(id, { value: 1n }),
    ).to.be.revertedWithCustomError(f.hub, "InvalidRuleAction");
    await expect(
      f.hub.connect(f.member).contributeRoscaRound(id, { value: 1n }),
    ).to.be.revertedWithCustomError(f.hub, "RoscaContributionMismatch");
    for (let round = 0; round < 2; round++) {
      await f.hub
        .connect(f.member)
        .contributeRoscaRound(id, { value: ethers.parseEther("1") });
      await time.increase(61);
      await expect(f.hub.payoutRoscaRound(id)).to.be.revertedWithCustomError(
        f.hub,
        "IncompleteRoscaRound",
      );
      await f.hub
        .connect(f.other)
        .contributeRoscaRound(id, { value: ethers.parseEther("1") });
      await expect(f.hub.payoutRoscaRound(id)).to.changeEtherBalance(
        round === 0 ? f.member : f.other,
        ethers.parseEther("2"),
      );
    }
    await expect(f.hub.payoutRoscaRound(id)).to.be.revertedWithCustomError(
      f.hub,
      "RoscaCycleEnded",
    );
    await expect(
      f.hub
        .connect(f.member)
        .contributeRoscaRound(id, { value: ethers.parseEther("1") }),
    ).to.be.revertedWithCustomError(f.hub, "RoscaCycleEnded");
    expect(await f.cashflow.totalLiabilities()).to.equal(0n);
  });
});

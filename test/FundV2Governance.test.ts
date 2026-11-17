import { expect } from "chai";
import { ethers } from "hardhat";
import {
  loadFixture,
  time,
} from "@nomicfoundation/hardhat-toolbox/network-helpers";

const ZERO_HASH = ethers.ZeroHash;
const INITIAL_TERMS = ethers.id("initial terms v2");
const NEW_TERMS = ethers.id("upgraded terms v2");
const DAY = 86400;

// Enums matching IKinetixFundV2
const FundKind = { OPERATING: 0, GOAL: 1 };
const Status = {
  NONE: 0,
  PENDING: 1,
  APPROVED: 2,
  EXECUTED: 3,
  CANCELLED: 4,
  REJECTED: 5,
  EXPIRED: 6,
  INVALIDATED: 7,
};
const Action = { POLICY: 0, PAUSE: 1, RESUME: 2, CLOSE: 3, SURPLUS: 4 };

// Permission bitmasks
const PROPOSE = 1;
const APPROVE = 2;
const SPEND = 4;

describe("FundV2Governance: 24h Timelock, Policy Epoch Invalidation & Quorum Pause/Resume", () => {
  async function deployGovernanceFixture() {
    const [
      deployer,
      creator,
      approver1,
      approver2,
      approver3,
      replacementApprover,
      proposer,
      spender,
      contributor,
      recipient,
      outsider,
    ] = await ethers.getSigners();

    const factory = await (
      await ethers.getContractFactory("KinetixFundFactoryV2", deployer)
    ).deploy();
    await factory.waitForDeployment();

    const initialPolicy = {
      quorum: 2n,
      transactionLimit: ethers.parseEther("1.0"),
      dailyLimit: ethers.parseEther("5.0"),
    };

    const initialMembers = [
      { account: approver1.address, permissions: APPROVE, dailyAllowance: 0n },
      { account: approver2.address, permissions: APPROVE, dailyAllowance: 0n },
      { account: approver3.address, permissions: APPROVE, dailyAllowance: 0n },
      { account: proposer.address, permissions: PROPOSE, dailyAllowance: 0n },
      { account: spender.address, permissions: SPEND, dailyAllowance: ethers.parseEther("2.0") },
    ];

    const operatingParams = {
      kind: FundKind.OPERATING,
      goalTarget: 0n,
      goalDeadline: 0n,
      termsHash: INITIAL_TERMS,
      policy: initialPolicy,
      members: initialMembers,
    };

    const tx = await factory.connect(creator).createFund(operatingParams);
    await tx.wait();
    const fundAddr = await factory.funds(1n);
    const fund = await ethers.getContractAt("KinetixFundV2", fundAddr);

    // Seed fund with 20 AVAX
    await fund
      .connect(contributor)
      .deposit(ethers.id("seed"), { value: ethers.parseEther("20.0") });

    return {
      factory,
      fund,
      fundAddr,
      creator,
      approver1,
      approver2,
      approver3,
      replacementApprover,
      proposer,
      spender,
      contributor,
      recipient,
      outsider,
      initialPolicy,
      initialMembers,
    };
  }

  describe("1. Policy Governance & 24h Timelock Enforcement", () => {
    it("strictly enforces 24h timelock: reverts before delay, succeeds after delay, and updates policyEpoch", async () => {
      const {
        fund,
        approver1,
        approver2,
        approver3,
        replacementApprover,
        proposer,
        spender,
        outsider,
      } = await loadFixture(deployGovernanceFixture);

      const upgradedPolicy = {
        quorum: 2n,
        transactionLimit: ethers.parseEther("2.0"),
        dailyLimit: ethers.parseEther("10.0"),
      };

      // Replacement members: approver1, approver2, replacementApprover, proposer, spender
      const upgradedMembers = [
        { account: approver1.address, permissions: APPROVE, dailyAllowance: 0n },
        { account: approver2.address, permissions: APPROVE, dailyAllowance: 0n },
        { account: replacementApprover.address, permissions: APPROVE, dailyAllowance: 0n },
        { account: proposer.address, permissions: PROPOSE, dailyAllowance: 0n },
        { account: spender.address, permissions: SPEND, dailyAllowance: ethers.parseEther("4.0") },
      ];

      // Propose policy change
      const propTx = await fund
        .connect(approver1)
        .proposePolicy(upgradedPolicy, upgradedMembers, NEW_TERMS);
      await propTx.wait();

      expect(await fund.governanceCount()).to.equal(1n);

      let gov = await fund.getGovernance(1n);
      expect(gov.action).to.equal(Action.POLICY);
      expect(gov.approvals).to.equal(0n);
      expect(gov.readyAt).to.equal(0n);
      expect(gov.status).to.equal(Status.PENDING);

      // Approver 1 approves
      await fund.connect(approver1).approveGovernance(1n);
      gov = await fund.getGovernance(1n);
      expect(gov.approvals).to.equal(1n);
      expect(gov.readyAt).to.equal(0n);

      // Approver 2 approves -> meets quorum of 2
      const approveTx = await fund.connect(approver2).approveGovernance(1n);
      const approveReceipt = await approveTx.wait();
      const approveBlock = await ethers.provider.getBlock(approveReceipt!.blockNumber);

      gov = await fund.getGovernance(1n);
      expect(gov.approvals).to.equal(2n);
      expect(gov.status).to.equal(Status.APPROVED);

      // Exactly 1 day (86400s) timelock scheduled
      const expectedReadyAt = BigInt(approveBlock!.timestamp + DAY);
      expect(gov.readyAt).to.equal(expectedReadyAt);

      // Attempt to execute immediately -> Reverts with TimelockNotElapsed
      await expect(
        fund.connect(outsider).executeGovernance(1n),
      ).to.be.revertedWithCustomError(fund, "TimelockNotElapsed");

      // Fast forward to readyAt - 5 seconds -> Still reverts
      await time.increaseTo(expectedReadyAt - 5n);
      await expect(
        fund.connect(outsider).executeGovernance(1n),
      ).to.be.revertedWithCustomError(fund, "TimelockNotElapsed");

      // Fast forward to exact readyAt timestamp -> Execution succeeds!
      await time.increaseTo(expectedReadyAt);

      await expect(fund.connect(outsider).executeGovernance(1n))
        .to.emit(fund, "PolicyApplied")
        .withArgs(2n, 2n, NEW_TERMS)
        .and.to.emit(fund, "GovernanceFinalized")
        .withArgs(1n, Status.EXECUTED);

      // Verify updated state
      expect(await fund.policyEpoch()).to.equal(2n);
      expect(await fund.termsHash()).to.equal(NEW_TERMS);

      // Approver 3 was removed; replacementApprover was added
      expect(await fund.permissions(approver3.address)).to.equal(0);
      expect(await fund.permissions(replacementApprover.address)).to.equal(APPROVE);

      // Spender daily allowance was upgraded to 4.0 AVAX
      expect(await fund.dailyAllowance(spender.address)).to.equal(
        ethers.parseEther("4.0"),
      );

      // Governance proposal status is EXECUTED
      gov = await fund.getGovernance(1n);
      expect(gov.status).to.equal(Status.EXECUTED);
    });
  });

  describe("2. PolicyEpoch Increment & O(1) Invalidation of Old Expenses", () => {
    it("invalidates all pending expenses from previous epoch in O(1) and clears reservations", async () => {
      const {
        fund,
        approver1,
        approver2,
        replacementApprover,
        proposer,
        spender,
        recipient,
        outsider,
      } = await loadFixture(deployGovernanceFixture);

      // In epoch 1: propose expense #1 (5 AVAX)
      const expenseAmount = ethers.parseEther("5.0");
      const deadline = BigInt((await time.latest()) + 7 * DAY);
      await fund
        .connect(proposer)
        .proposeExpense(recipient.address, expenseAmount, deadline, ZERO_HASH);

      expect(await fund.expenseCount()).to.equal(1n);
      expect(await fund.reservedBalance()).to.equal(expenseAmount);
      expect(await fund.availableBalance()).to.equal(ethers.parseEther("15.0"));

      // Approver 1 approves expense #1 (1 approval, still pending)
      await fund.connect(approver1).approveExpense(1n);

      // Now propose a policy change
      const newPolicy = {
        quorum: 2n,
        transactionLimit: ethers.parseEther("1.0"),
        dailyLimit: ethers.parseEther("5.0"),
      };
      const newMembers = [
        { account: approver1.address, permissions: APPROVE, dailyAllowance: 0n },
        { account: approver2.address, permissions: APPROVE, dailyAllowance: 0n },
        { account: replacementApprover.address, permissions: APPROVE, dailyAllowance: 0n },
        { account: proposer.address, permissions: PROPOSE, dailyAllowance: 0n },
        { account: spender.address, permissions: SPEND, dailyAllowance: ethers.parseEther("2.0") },
      ];

      await fund
        .connect(approver1)
        .proposePolicy(newPolicy, newMembers, NEW_TERMS);

      // Quorum approvals for policy change
      await fund.connect(approver1).approveGovernance(1n);
      await fund.connect(approver2).approveGovernance(1n);

      // Fast forward 24 hours past timelock
      const gov = await fund.getGovernance(1n);
      await time.increaseTo(gov.readyAt);

      // Execute policy change -> increments policyEpoch to 2
      await fund.connect(outsider).executeGovernance(1n);
      expect(await fund.policyEpoch()).to.equal(2n);

      // O(1) Invariant: reservedBalance is immediately reset to 0 without iterating over expenses
      expect(await fund.reservedBalance()).to.equal(0n);
      expect(await fund.availableBalance()).to.equal(ethers.parseEther("20.0"));

      // Old expense #1 is now INVALIDATED
      const oldExp = await fund.getExpense(1n);
      expect(oldExp.status).to.equal(Status.INVALIDATED);

      // Cannot approve invalidated expense
      await expect(
        fund.connect(approver2).approveExpense(1n),
      ).to.be.revertedWithCustomError(fund, "InvalidState");

      // Cannot execute invalidated expense
      await expect(
        fund.connect(outsider).executeExpense(1n),
      ).to.be.revertedWithCustomError(fund, "InvalidState");

      // Permissionless settleExpense records INVALIDATED without double-releasing reservation
      await expect(fund.connect(outsider).settleExpense(1n))
        .to.emit(fund, "ExpenseFinalized")
        .withArgs(1n, Status.INVALIDATED);

      // reservedBalance remains 0 (no underflow or negative deduction)
      expect(await fund.reservedBalance()).to.equal(0n);
      expect(await fund.availableBalance()).to.equal(ethers.parseEther("20.0"));
    });
  });

  describe("3. Quorum Emergency Pause / Resume", () => {
    it("allows approvers to pause immediately without 24h delay, blocking deposits and payouts until resumed", async () => {
      const {
        fund,
        approver1,
        approver2,
        proposer,
        spender,
        contributor,
        recipient,
        outsider,
      } = await loadFixture(deployGovernanceFixture);

      // Approver 1 proposes PAUSE
      const memo = ethers.id("suspicious activity pause");
      await expect(
        fund.connect(approver1).proposeAction(Action.PAUSE, ethers.ZeroAddress, 0n, memo),
      )
        .to.emit(fund, "GovernanceProposed")
        .withArgs(1n, Action.PAUSE, approver1.address, 1n, memo);

      // Approver 1 votes
      await fund.connect(approver1).approveGovernance(1n);

      // Approver 2 votes -> meets quorum of 2
      // For PAUSE and RESUME, delay is 0 (readyAt == current timestamp)
      const tx = await fund.connect(approver2).approveGovernance(1n);
      const receipt = await tx.wait();
      const block = await ethers.provider.getBlock(receipt!.blockNumber);

      const gov = await fund.getGovernance(1n);
      expect(gov.readyAt).to.equal(BigInt(block!.timestamp));

      // Can execute immediately
      await expect(fund.connect(outsider).executeGovernance(1n))
        .to.emit(fund, "PauseChanged")
        .withArgs(true);

      expect(await fund.paused()).to.be.true;

      // While paused: deposits are blocked
      await expect(
        fund
          .connect(contributor)
          .deposit(ethers.id("paused-dep"), { value: ethers.parseEther("1.0") }),
      ).to.be.revertedWithCustomError(fund, "FundUnavailable");

      // While paused: proposing expenses is blocked
      const deadline = BigInt((await time.latest()) + 2 * DAY);
      await expect(
        fund
          .connect(proposer)
          .proposeExpense(recipient.address, ethers.parseEther("1.0"), deadline, ZERO_HASH),
      ).to.be.revertedWithCustomError(fund, "FundUnavailable");

      // While paused: quick spend is blocked
      await expect(
        fund
          .connect(spender)
          .spend(recipient.address, ethers.parseEther("0.1"), ZERO_HASH),
      ).to.be.revertedWithCustomError(fund, "FundUnavailable");

      // Proposing PAUSE again while already paused reverts
      await expect(
        fund.connect(approver1).proposeAction(Action.PAUSE, ethers.ZeroAddress, 0n, memo),
      ).to.be.revertedWithCustomError(fund, "InvalidState");

      // Approver 1 proposes RESUME
      const resumeMemo = ethers.id("incident resolved resume");
      await fund
        .connect(approver1)
        .proposeAction(Action.RESUME, ethers.ZeroAddress, 0n, resumeMemo);

      // Quorum approves RESUME
      await fund.connect(approver1).approveGovernance(2n);
      await fund.connect(approver2).approveGovernance(2n);

      // Execute RESUME immediately
      await expect(fund.connect(outsider).executeGovernance(2n))
        .to.emit(fund, "PauseChanged")
        .withArgs(false);

      expect(await fund.paused()).to.be.false;

      // Deposits work again
      await expect(
        fund
          .connect(contributor)
          .deposit(ethers.id("unpaused-dep"), { value: ethers.parseEther("1.0") }),
      ).to.emit(fund, "Deposited");

      expect(await fund.accountedBalance()).to.equal(ethers.parseEther("21.0"));
    });

    it("invalidates stale pause proposals when pauseNonce changes", async () => {
      const { fund, approver1, approver2, outsider } = await loadFixture(
        deployGovernanceFixture,
      );

      // Proposal 1: PAUSE
      await fund
        .connect(approver1)
        .proposeAction(Action.PAUSE, ethers.ZeroAddress, 0n, ethers.id("pause-1"));

      // Proposal 2: PAUSE
      await fund
        .connect(approver2)
        .proposeAction(Action.PAUSE, ethers.ZeroAddress, 0n, ethers.id("pause-2"));

      // Approve and execute Proposal 1
      await fund.connect(approver1).approveGovernance(1n);
      await fund.connect(approver2).approveGovernance(1n);
      await fund.connect(outsider).executeGovernance(1n);

      expect(await fund.paused()).to.be.true;
      expect(await fund.pauseNonce()).to.equal(1n);

      // Proposal 2 was created when pauseNonce was 0. Now pauseNonce is 1.
      // Proposal 2 is now INVALIDATED
      const gov2 = await fund.getGovernance(2n);
      expect(gov2.status).to.equal(Status.INVALIDATED);

      // Cannot execute stale proposal 2
      await expect(
        fund.connect(outsider).executeGovernance(2n),
      ).to.be.revertedWithCustomError(fund, "InvalidState");
    });
  });

  describe("4. Governance Cancellation, Rejection & Expiration", () => {
    it("allows proposer to cancel and independent approver to reject pending proposals", async () => {
      const { fund, approver1, approver2, outsider } = await loadFixture(
        deployGovernanceFixture,
      );

      // Propose pause
      await fund
        .connect(approver1)
        .proposeAction(Action.PAUSE, ethers.ZeroAddress, 0n, ethers.id("cancel-me"));

      // Non-proposer non-approver outsider cannot cancel
      await expect(
        fund.connect(outsider).cancelGovernance(1n),
      ).to.be.revertedWithCustomError(fund, "Unauthorized");

      // Proposer cancels
      await expect(fund.connect(approver1).cancelGovernance(1n))
        .to.emit(fund, "GovernanceFinalized")
        .withArgs(1n, Status.CANCELLED);

      expect((await fund.getGovernance(1n)).status).to.equal(Status.CANCELLED);

      // Propose again
      await fund
        .connect(approver1)
        .proposeAction(Action.PAUSE, ethers.ZeroAddress, 0n, ethers.id("reject-me"));

      // Independent approver rejects
      await expect(fund.connect(approver2).cancelGovernance(2n))
        .to.emit(fund, "GovernanceFinalized")
        .withArgs(2n, Status.REJECTED);

      expect((await fund.getGovernance(2n)).status).to.equal(Status.REJECTED);
    });

    it("expires unapproved governance proposals after 7 days", async () => {
      const { fund, approver1, outsider } = await loadFixture(
        deployGovernanceFixture,
      );

      await fund
        .connect(approver1)
        .proposeAction(Action.PAUSE, ethers.ZeroAddress, 0n, ethers.id("will-expire"));

      // Fast forward 7 days + 1 second
      await time.increase(7 * DAY + 1);

      expect((await fund.getGovernance(1n)).status).to.equal(Status.EXPIRED);

      // Settle expired proposal
      await expect(fund.connect(outsider).settleGovernance(1n))
        .to.emit(fund, "GovernanceFinalized")
        .withArgs(1n, Status.EXPIRED);
    });
  });
});

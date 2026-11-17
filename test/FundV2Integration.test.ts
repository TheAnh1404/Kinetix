import { expect } from "chai";
import { ethers } from "hardhat";
import {
  loadFixture,
  time,
} from "@nomicfoundation/hardhat-toolbox/network-helpers";

const ZERO_HASH = ethers.ZeroHash;
const TERMS_HASH = ethers.id("kinetix operating terms v2 test");
const GOAL_TERMS_HASH = ethers.id("kinetix goal terms v2 test");
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

describe("FundV2Integration: Factory, Clones, Contributions, Multi-Approval & Refunds", () => {
  async function deployFactoryFixture() {
    const [
      deployer,
      creator,
      approver1,
      approver2,
      approver3,
      proposer,
      spender,
      contributor1,
      contributor2,
      recipient1,
      recipient2,
      outsider,
    ] = await ethers.getSigners();

    const factory = await (
      await ethers.getContractFactory("KinetixFundFactoryV2", deployer)
    ).deploy();
    await factory.waitForDeployment();

    const operatingParams = {
      kind: FundKind.OPERATING,
      goalTarget: 0n,
      goalDeadline: 0n,
      termsHash: TERMS_HASH,
      policy: {
        quorum: 2n,
        transactionLimit: ethers.parseEther("0.5"),
        dailyLimit: ethers.parseEther("2.0"),
      },
      members: [
        { account: approver1.address, permissions: APPROVE, dailyAllowance: 0n },
        { account: approver2.address, permissions: APPROVE, dailyAllowance: 0n },
        { account: approver3.address, permissions: APPROVE, dailyAllowance: 0n },
        { account: proposer.address, permissions: PROPOSE, dailyAllowance: 0n },
        { account: spender.address, permissions: SPEND, dailyAllowance: ethers.parseEther("1.0") },
      ],
    };

    async function createOperatingFund(customParams = operatingParams) {
      const tx = await factory.connect(creator).createFund(customParams);
      const receipt = await tx.wait();
      const fundCount = await factory.fundCount();
      const fundAddr = await factory.funds(fundCount);
      const fund = await ethers.getContractAt("KinetixFundV2", fundAddr);
      return { fund, fundAddr, fundCount, receipt };
    }

    async function createGoalFund(target = ethers.parseEther("10"), duration = 3 * DAY) {
      const currentBlockTime = await time.latest();
      const goalDeadline = BigInt(currentBlockTime + duration);
      const goalParams = {
        kind: FundKind.GOAL,
        goalTarget: target,
        goalDeadline: goalDeadline,
        termsHash: GOAL_TERMS_HASH,
        policy: {
          quorum: 2n,
          transactionLimit: 0n,
          dailyLimit: 0n,
        },
        members: [
          { account: approver1.address, permissions: APPROVE, dailyAllowance: 0n },
          { account: approver2.address, permissions: APPROVE, dailyAllowance: 0n },
          { account: approver3.address, permissions: APPROVE, dailyAllowance: 0n },
          { account: proposer.address, permissions: PROPOSE, dailyAllowance: 0n },
        ],
      };
      const tx = await factory.connect(creator).createFund(goalParams);
      await tx.wait();
      const fundCount = await factory.fundCount();
      const fundAddr = await factory.funds(fundCount);
      const fund = await ethers.getContractAt("KinetixFundV2", fundAddr);
      return { fund, fundAddr, goalTarget: target, goalDeadline };
    }

    return {
      factory,
      deployer,
      creator,
      approver1,
      approver2,
      approver3,
      proposer,
      spender,
      contributor1,
      contributor2,
      recipient1,
      recipient2,
      outsider,
      operatingParams,
      createOperatingFund,
      createGoalFund,
    };
  }

  describe("1. Factory Deployment & Registry Validation", () => {
    it("deploys factory, provisions immutable implementation and validates registry invariants", async () => {
      const { factory } = await loadFixture(deployFactoryFixture);

      expect(await factory.VERSION()).to.equal(2n);
      expect(await factory.fundCount()).to.equal(0n);

      const implAddress = await factory.implementation();
      expect(implAddress).to.not.equal(ethers.ZeroAddress);

      const code = await ethers.provider.getCode(implAddress);
      expect(code.length).to.be.greaterThan(2); // Non-empty bytecode

      // Implementation template itself is not a registered user fund
      expect(await factory.isFund(implAddress)).to.be.false;

      // Implementation constructor locked initialization
      const impl = await ethers.getContractAt("KinetixFundV2", implAddress);
      const dummyParams = {
        kind: FundKind.OPERATING,
        goalTarget: 0n,
        goalDeadline: 0n,
        termsHash: TERMS_HASH,
        policy: { quorum: 2n, transactionLimit: 0n, dailyLimit: 0n },
        members: [],
      };
      await expect(
        impl.initialize(ethers.ZeroAddress, dummyParams),
      ).to.be.revertedWithCustomError(impl, "AlreadyInitialized");
    });
  });

  describe("2. Operating Fund Creation & Clone State Initialization", () => {
    it("atomically creates clone, emits FundCreated, and initializes immutable properties", async () => {
      const { createOperatingFund, factory, creator, approver1, spender } =
        await loadFixture(deployFactoryFixture);

      const { fund, fundAddr, fundCount } = await createOperatingFund();

      expect(fundCount).to.equal(1n);
      expect(await factory.isFund(fundAddr)).to.be.true;
      expect(await factory.funds(1n)).to.equal(fundAddr);

      // Verify immutable bindings
      expect(await fund.factory()).to.equal(await factory.getAddress());
      expect(await fund.creator()).to.equal(creator.address);
      expect(await fund.kind()).to.equal(FundKind.OPERATING);
      expect(await fund.goalTarget()).to.equal(0n);
      expect(await fund.goalDeadline()).to.equal(0n);
      expect(await fund.goalReached()).to.equal(false);
      expect(await fund.paused()).to.equal(false);
      expect(await fund.closed()).to.equal(false);
      expect(await fund.termsHash()).to.equal(TERMS_HASH);
      expect(await fund.policyEpoch()).to.equal(1n);
      expect(await fund.accountedBalance()).to.equal(0n);
      expect(await fund.reservedBalance()).to.equal(0n);
      expect(await fund.availableBalance()).to.equal(0n);
      expect(await fund.asset()).to.equal(ethers.ZeroAddress);

      // Verify member permissions and allowances
      expect(await fund.permissions(approver1.address)).to.equal(APPROVE);
      expect(await fund.permissions(spender.address)).to.equal(SPEND);
      expect(await fund.dailyAllowance(spender.address)).to.equal(
        ethers.parseEther("1.0"),
      );

      // Clone cannot be re-initialized
      const dummyParams = {
        kind: FundKind.OPERATING,
        goalTarget: 0n,
        goalDeadline: 0n,
        termsHash: TERMS_HASH,
        policy: { quorum: 2n, transactionLimit: 0n, dailyLimit: 0n },
        members: [],
      };
      await expect(
        fund.initialize(creator.address, dummyParams),
      ).to.be.revertedWithCustomError(fund, "AlreadyInitialized");
    });
  });

  describe("3. Contributions & Exact Wei Accounting", () => {
    it("reverts direct plain AVAX transfers without deposit function", async () => {
      const { createOperatingFund, contributor1 } = await loadFixture(
        deployFactoryFixture,
      );
      const { fund, fundAddr } = await createOperatingFund();

      await expect(
        contributor1.sendTransaction({
          to: fundAddr,
          value: ethers.parseEther("1.0"),
        }),
      ).to.be.revertedWithCustomError(fund, "DirectTransferDisabled");
    });

    it("reverts deposit with 0 wei value", async () => {
      const { createOperatingFund, contributor1 } = await loadFixture(
        deployFactoryFixture,
      );
      const { fund } = await createOperatingFund();

      await expect(
        fund.connect(contributor1).deposit(ethers.id("empty-ref"), { value: 0n }),
      ).to.be.revertedWithCustomError(fund, "InvalidAmount");
    });

    it("accepts deposits and tracks exact wei balances and individual contributions", async () => {
      const { createOperatingFund, contributor1, contributor2 } =
        await loadFixture(deployFactoryFixture);
      const { fund, fundAddr } = await createOperatingFund();

      const dep1 = ethers.parseEther("5.123456789012345678");
      const dep2 = ethers.parseEther("3.876543210987654322");
      const expectedTotal = dep1 + dep2; // Exact 9.0 AVAX

      const ref1 = ethers.id("tx-ref-1");
      const ref2 = ethers.id("tx-ref-2");

      await expect(fund.connect(contributor1).deposit(ref1, { value: dep1 }))
        .to.emit(fund, "Deposited")
        .withArgs(contributor1.address, dep1, ref1);

      await expect(fund.connect(contributor2).deposit(ref2, { value: dep2 }))
        .to.emit(fund, "Deposited")
        .withArgs(contributor2.address, dep2, ref2);

      expect(await fund.accountedBalance()).to.equal(expectedTotal);
      expect(await fund.availableBalance()).to.equal(expectedTotal);
      expect(await fund.reservedBalance()).to.equal(0n);
      expect(await ethers.provider.getBalance(fundAddr)).to.equal(expectedTotal);

      expect(await fund.contributions(contributor1.address)).to.equal(dep1);
      expect(await fund.contributions(contributor2.address)).to.equal(dep2);
    });
  });

  describe("4. Multi-Approval Expense Lifecycle & Exact Wei Settlement", () => {
    it("executes full expense lifecycle: proposal, multi-approval, execution and exact wei delivery", async () => {
      const {
        createOperatingFund,
        contributor1,
        proposer,
        approver1,
        approver2,
        recipient1,
        outsider,
      } = await loadFixture(deployFactoryFixture);
      const { fund, fundAddr } = await createOperatingFund();

      // Fund with 10 AVAX
      await fund
        .connect(contributor1)
        .deposit(ethers.id("funding"), { value: ethers.parseEther("10.0") });

      const expenseAmount = ethers.parseEther("3.5");
      const latestTime = await time.latest();
      const deadline = BigInt(latestTime + 7 * DAY);
      const memoHash = ethers.id("office supplies invoice #101");

      // Non-proposer cannot propose
      await expect(
        fund
          .connect(outsider)
          .proposeExpense(recipient1.address, expenseAmount, deadline, memoHash),
      ).to.be.revertedWithCustomError(fund, "Unauthorized");

      // Proposer creates expense
      await expect(
        fund
          .connect(proposer)
          .proposeExpense(recipient1.address, expenseAmount, deadline, memoHash),
      )
        .to.emit(fund, "ExpenseProposed")
        .withArgs(
          1n,
          proposer.address,
          recipient1.address,
          expenseAmount,
          deadline,
          1n,
          memoHash,
        );

      expect(await fund.expenseCount()).to.equal(1n);
      expect(await fund.reservedBalance()).to.equal(expenseAmount);
      expect(await fund.availableBalance()).to.equal(
        ethers.parseEther("10.0") - expenseAmount,
      );
      expect(await fund.accountedBalance()).to.equal(ethers.parseEther("10.0"));

      // Cannot over-reserve beyond available balance
      const tooMuch = ethers.parseEther("7.0");
      await expect(
        fund
          .connect(proposer)
          .proposeExpense(recipient1.address, tooMuch, deadline, memoHash),
      ).to.be.revertedWithCustomError(fund, "InsufficientAvailableBalance");

      // Approver 1 votes
      await expect(fund.connect(approver1).approveExpense(1n))
        .to.emit(fund, "ExpenseApproved")
        .withArgs(1n, approver1.address, 1n);

      expect(await fund.expenseVotes(1n, approver1.address)).to.be.true;

      // Duplicate approval reverts
      await expect(
        fund.connect(approver1).approveExpense(1n),
      ).to.be.revertedWithCustomError(fund, "AlreadyVoted");

      // Still pending (needs quorum = 2)
      let exp = await fund.getExpense(1n);
      expect(exp.status).to.equal(Status.PENDING);
      expect(exp.approvals).to.equal(1n);

      // Cannot execute prematurely
      await expect(
        fund.connect(outsider).executeExpense(1n),
      ).to.be.revertedWithCustomError(fund, "InvalidState");

      // Approver 2 votes -> meets quorum of 2
      await expect(fund.connect(approver2).approveExpense(1n))
        .to.emit(fund, "ExpenseApproved")
        .withArgs(1n, approver2.address, 2n);

      exp = await fund.getExpense(1n);
      expect(exp.status).to.equal(Status.APPROVED);

      // Execute expense: record recipient1 balance before
      const balBefore = await ethers.provider.getBalance(recipient1.address);

      // Permissionless execution (any address can trigger execution once approved)
      await expect(fund.connect(outsider).executeExpense(1n))
        .to.emit(fund, "ExpenseFinalized")
        .withArgs(1n, Status.EXECUTED);

      const balAfter = await ethers.provider.getBalance(recipient1.address);
      expect(balAfter - balBefore).to.equal(expenseAmount);

      // Exact wei ledger conservation
      expect(await fund.reservedBalance()).to.equal(0n);
      expect(await fund.accountedBalance()).to.equal(ethers.parseEther("6.5"));
      expect(await fund.availableBalance()).to.equal(ethers.parseEther("6.5"));
      expect(await ethers.provider.getBalance(fundAddr)).to.equal(
        ethers.parseEther("6.5"),
      );

      // Re-executing reverts
      await expect(
        fund.connect(outsider).executeExpense(1n),
      ).to.be.revertedWithCustomError(fund, "InvalidState");
    });

    it("allows proposer cancellation and approver rejection with exact reservation release", async () => {
      const { createOperatingFund, contributor1, proposer, approver1, recipient1, outsider } =
        await loadFixture(deployFactoryFixture);
      const { fund } = await createOperatingFund();

      await fund
        .connect(contributor1)
        .deposit(ethers.id("funding"), { value: ethers.parseEther("5.0") });

      const amount = ethers.parseEther("1.0");
      const deadline = BigInt((await time.latest()) + DAY);

      // Propose expense #1
      await fund
        .connect(proposer)
        .proposeExpense(recipient1.address, amount, deadline, ZERO_HASH);
      expect(await fund.reservedBalance()).to.equal(amount);

      // Non-proposer cannot cancel
      await expect(
        fund.connect(outsider).cancelExpense(1n),
      ).to.be.revertedWithCustomError(fund, "Unauthorized");

      // Proposer cancels
      await expect(fund.connect(proposer).cancelExpense(1n))
        .to.emit(fund, "ExpenseFinalized")
        .withArgs(1n, Status.CANCELLED);
      expect(await fund.reservedBalance()).to.equal(0n);

      // Propose expense #2
      await fund
        .connect(proposer)
        .proposeExpense(recipient1.address, amount, deadline, ZERO_HASH);
      expect(await fund.reservedBalance()).to.equal(amount);

      // Independent approver rejects
      await expect(fund.connect(approver1).rejectExpense(2n))
        .to.emit(fund, "ExpenseFinalized")
        .withArgs(2n, Status.REJECTED);
      expect(await fund.reservedBalance()).to.equal(0n);
    });
  });

  describe("5. Operating Fund Quick Spending (spend) within Limits", () => {
    it("enforces per-transaction limit, member daily allowance, and total daily cap", async () => {
      const { createOperatingFund, contributor1, spender, recipient2 } =
        await loadFixture(deployFactoryFixture);
      const { fund } = await createOperatingFund();

      // Fund with 5 AVAX
      await fund
        .connect(contributor1)
        .deposit(ethers.id("fund-ops"), { value: ethers.parseEther("5.0") });

      // Policy: transactionLimit = 0.5 AVAX, dailyLimit = 2.0 AVAX
      // Spender dailyAllowance = 1.0 AVAX

      // Spend 0.4 AVAX -> OK
      const spend1 = ethers.parseEther("0.4");
      const balBefore = await ethers.provider.getBalance(recipient2.address);
      await expect(
        fund.connect(spender).spend(recipient2.address, spend1, ethers.id("lunch")),
      )
        .to.emit(fund, "LimitedPayment")
        .withArgs(spender.address, recipient2.address, spend1, ethers.id("lunch"));

      expect((await ethers.provider.getBalance(recipient2.address)) - balBefore).to.equal(
        spend1,
      );
      expect(await fund.accountedBalance()).to.equal(
        ethers.parseEther("5.0") - spend1,
      );

      // Exceeds transactionLimit (0.6 > 0.5)
      await expect(
        fund
          .connect(spender)
          .spend(recipient2.address, ethers.parseEther("0.6"), ZERO_HASH),
      ).to.be.revertedWithCustomError(fund, "SpendingLimitExceeded");

      // Spend 0.5 AVAX (reaches cumulative 0.9 AVAX today) -> OK
      await fund
        .connect(spender)
        .spend(recipient2.address, ethers.parseEther("0.5"), ZERO_HASH);

      // Spend 0.2 AVAX (cumulative would be 1.1 > spender daily allowance 1.0) -> Reverts
      await expect(
        fund
          .connect(spender)
          .spend(recipient2.address, ethers.parseEther("0.2"), ZERO_HASH),
      ).to.be.revertedWithCustomError(fund, "SpendingLimitExceeded");

      // Spend remaining 0.1 AVAX -> OK
      await fund
        .connect(spender)
        .spend(recipient2.address, ethers.parseEther("0.1"), ZERO_HASH);

      // Exactly 1.0 AVAX spent today
      expect(await fund.accountedBalance()).to.equal(ethers.parseEther("4.0"));
    });
  });

  describe("6. Goal Fund: Target Reached & Expense Unlocking", () => {
    it("locks expenses until target is reached, then unlocks proposal and quorum execution", async () => {
      const { createGoalFund, contributor1, contributor2, proposer, approver1, approver2, recipient1 } =
        await loadFixture(deployFactoryFixture);

      const target = ethers.parseEther("10.0");
      const { fund } = await createGoalFund(target, 5 * DAY);

      // Deposit 6 AVAX (< 10 target)
      await fund
        .connect(contributor1)
        .deposit(ethers.id("goal-dep-1"), { value: ethers.parseEther("6.0") });

      expect(await fund.goalReached()).to.be.false;

      // Expenses remain locked
      const deadline = BigInt((await time.latest()) + 2 * DAY);
      await expect(
        fund
          .connect(proposer)
          .proposeExpense(recipient1.address, ethers.parseEther("1.0"), deadline, ZERO_HASH),
      ).to.be.revertedWithCustomError(fund, "GoalLocked");

      // Deposit remaining 4 AVAX -> Target reached!
      await expect(
        fund
          .connect(contributor2)
          .deposit(ethers.id("goal-dep-2"), { value: ethers.parseEther("4.0") }),
      )
        .to.emit(fund, "GoalReached")
        .withArgs(target);

      expect(await fund.goalReached()).to.be.true;

      // Now expense proposal works
      await expect(
        fund
          .connect(proposer)
          .proposeExpense(recipient1.address, ethers.parseEther("5.0"), deadline, ZERO_HASH),
      ).to.emit(fund, "ExpenseProposed");

      await fund.connect(approver1).approveExpense(1n);
      await fund.connect(approver2).approveExpense(1n);
      await fund.executeExpense(1n);

      expect(await fund.accountedBalance()).to.equal(ethers.parseEther("5.0"));
    });
  });

  describe("7. Failed-Goal 1-Tap Refund Execution & Zero-Loss Invariant", () => {
    it("allows contributors to recover 100% of their contributions when goal expires unmet, preventing double claims", async () => {
      const { createGoalFund, contributor1, contributor2, outsider } =
        await loadFixture(deployFactoryFixture);

      const target = ethers.parseEther("10.0");
      const duration = 2 * DAY;
      const { fund, fundAddr, goalDeadline } = await createGoalFund(target, duration);

      const dep1 = ethers.parseEther("4.5");
      const dep2 = ethers.parseEther("3.2");

      await fund
        .connect(contributor1)
        .deposit(ethers.id("claim-1"), { value: dep1 });
      await fund
        .connect(contributor2)
        .deposit(ethers.id("claim-2"), { value: dep2 });

      expect(await fund.accountedBalance()).to.equal(dep1 + dep2); // 7.7 AVAX < 10.0 target

      // Attempt refund before deadline expires
      await expect(
        fund.connect(contributor1).refundFailedGoal(),
      ).to.be.revertedWithCustomError(fund, "InvalidState");

      // Fast-forward past deadline
      await time.increaseTo(goalDeadline + 10n);

      // Contributor 1 claims 100% refund
      const bal1Before = await ethers.provider.getBalance(contributor1.address);
      const tx1 = await fund.connect(contributor1).refundFailedGoal();
      const receipt1 = await tx1.wait();
      const gasSpent1 = receipt1!.gasUsed * receipt1!.gasPrice;
      const bal1After = await ethers.provider.getBalance(contributor1.address);

      expect(bal1After + gasSpent1 - bal1Before).to.equal(dep1);
      expect(await fund.contributions(contributor1.address)).to.equal(0n);
      expect(await fund.accountedBalance()).to.equal(dep2);

      // Contributor 1 attempts to double-claim
      await expect(
        fund.connect(contributor1).refundFailedGoal(),
      ).to.be.revertedWithCustomError(fund, "InvalidAmount");

      // Non-contributor outsider attempts to claim refund
      await expect(
        fund.connect(outsider).refundFailedGoal(),
      ).to.be.revertedWithCustomError(fund, "InvalidAmount");

      // Contributor 2 claims 100% refund
      const bal2Before = await ethers.provider.getBalance(contributor2.address);
      const tx2 = await fund.connect(contributor2).refundFailedGoal();
      const receipt2 = await tx2.wait();
      const gasSpent2 = receipt2!.gasUsed * receipt2!.gasPrice;
      const bal2After = await ethers.provider.getBalance(contributor2.address);

      expect(bal2After + gasSpent2 - bal2Before).to.equal(dep2);
      expect(await fund.contributions(contributor2.address)).to.equal(0n);

      // Contract balance is exact 0: no trapped wei
      expect(await fund.accountedBalance()).to.equal(0n);
      expect(await fund.availableBalance()).to.equal(0n);
      expect(await ethers.provider.getBalance(fundAddr)).to.equal(0n);
    });
  });
});

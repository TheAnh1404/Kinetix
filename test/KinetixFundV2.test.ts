import { expect } from "chai";
import { ethers } from "hardhat";
import {
  loadFixture,
  time,
} from "@nomicfoundation/hardhat-toolbox/network-helpers";

const ZERO = ethers.ZeroHash;
const TERMS = ethers.id("operating terms v2");
const DAY = 86400;
const S = {
  NONE: 0,
  PENDING: 1,
  APPROVED: 2,
  EXECUTED: 3,
  CANCELLED: 4,
  REJECTED: 5,
  EXPIRED: 6,
  INVALIDATED: 7,
};
const A = { POLICY: 0, PAUSE: 1, RESUME: 2, CLOSE: 3, SURPLUS: 4 };

async function fixture() {
  const [
    creator,
    a,
    b,
    c,
    proposer,
    spender,
    outsider,
    recipient,
    replacement,
  ] = await ethers.getSigners();
  const factory = await (
    await ethers.getContractFactory("KinetixFundFactoryV2")
  ).deploy();
  const params = {
    kind: 0,
    goalTarget: 0n,
    goalDeadline: 0n,
    termsHash: TERMS,
    policy: { quorum: 2n, transactionLimit: 10n, dailyLimit: 30n },
    members: [
      { account: a.address, permissions: 3, dailyAllowance: 0n },
      { account: b.address, permissions: 2, dailyAllowance: 0n },
      { account: c.address, permissions: 2, dailyAllowance: 0n },
      { account: proposer.address, permissions: 1, dailyAllowance: 0n },
      { account: spender.address, permissions: 4, dailyAllowance: 20n },
    ],
  };
  async function create(config = params) {
    await factory.createFund(config);
    return ethers.getContractAt(
      "KinetixFundV2",
      await factory.funds(await factory.fundCount()),
    );
  }
  const fund = await create();
  return {
    creator,
    a,
    b,
    c,
    proposer,
    spender,
    outsider,
    recipient,
    replacement,
    factory,
    params,
    create,
    fund,
  };
}
type F = Awaited<ReturnType<typeof fixture>>;

async function deposit(f: F, amount = 100n) {
  await f.fund
    .connect(f.outsider)
    .deposit(ethers.id("contribution"), { value: amount });
}
async function expense(
  f: F,
  amount = 20n,
  recipient = f.recipient.address,
  duration = DAY,
) {
  await f.fund
    .connect(f.proposer)
    .proposeExpense(recipient, amount, (await time.latest()) + duration, ZERO);
  return f.fund.expenseCount();
}
async function approveExpense(f: F, id: bigint) {
  await f.fund.connect(f.a).approveExpense(id);
  await f.fund.connect(f.b).approveExpense(id);
}
async function approveGov(f: F, id: bigint) {
  await f.fund.connect(f.a).approveGovernance(id);
  await f.fund.connect(f.b).approveGovernance(id);
}
async function executeGov(f: F, id: bigint) {
  const proposal = await f.fund.getGovernance(id);
  if (proposal.readyAt > BigInt(await time.latest()))
    await time.increaseTo(proposal.readyAt);
  await f.fund.connect(f.outsider).executeGovernance(id);
}
async function action(
  f: F,
  type: number,
  recipient = ethers.ZeroAddress,
  amount = 0n,
) {
  await f.fund.connect(f.a).proposeAction(type, recipient, amount, ZERO);
  const id = await f.fund.governanceCount();
  await approveGov(f, id);
  return id;
}
async function policy(
  f: F,
  members = f.params.members,
  config = f.params.policy,
) {
  await f.fund.connect(f.a).proposePolicy(config, members, TERMS);
  const id = await f.fund.governanceCount();
  await approveGov(f, id);
  return id;
}
async function goalFixture() {
  const f = await fixture();
  const deadline = BigInt((await time.latest()) + 3 * DAY);
  const params = {
    ...f.params,
    kind: 1,
    goalTarget: 100n,
    goalDeadline: deadline,
    policy: { quorum: 2n, transactionLimit: 0n, dailyLimit: 0n },
    members: f.params.members.slice(0, 4),
  };
  const fund = await f.create(params);
  return { ...f, fund, deadline };
}

describe("Kinetix shared funds V2", () => {
  describe("factory and initialization", () => {
    it("atomically registers isolated immutable clones and configuration commitments", async () => {
      const f = await loadFixture(fixture);
      const fund2 = await f.create();
      expect(await f.factory.fundCount()).to.equal(2);
      expect(await f.factory.isFund(f.fund)).to.equal(true);
      expect(await f.factory.isFund(f.outsider.address)).to.equal(false);
      expect(await f.fund.factory()).to.equal(f.factory);
      expect(await f.fund.creator()).to.equal(f.creator.address);
      expect(await f.fund.policyEpoch()).to.equal(1);
      expect(await f.fund.permissions(f.creator.address)).to.equal(0);
      await deposit(f);
      expect(await fund2.accountedBalance()).to.equal(0);
      const hash = ethers.keccak256(
        ethers.AbiCoder.defaultAbiCoder().encode(
          [
            "tuple(uint8 kind,uint256 goalTarget,uint256 goalDeadline,bytes32 termsHash,tuple(uint256 quorum,uint256 transactionLimit,uint256 dailyLimit) policy,tuple(address account,uint8 permissions,uint256 dailyAllowance)[] members)",
          ],
          [f.params],
        ),
      );
      const [predicted] = await f.factory.createFund.staticCall(f.params);
      await expect(f.factory.createFund(f.params))
        .to.emit(f.factory, "FundCreated")
        .withArgs(3, predicted, f.creator.address, 0, 2, hash);
    });

    it("locks implementation and initialized clone", async () => {
      const f = await loadFixture(fixture);
      const implementation = await ethers.getContractAt(
        "KinetixFundV2",
        await f.factory.implementation(),
      );
      await expect(
        implementation.initialize(f.creator.address, f.params),
      ).to.be.revertedWithCustomError(implementation, "AlreadyInitialized");
      await expect(
        f.fund.initialize(f.creator.address, f.params),
      ).to.be.revertedWithCustomError(f.fund, "AlreadyInitialized");
      await expect(
        implementation.deposit(ZERO, { value: 1 }),
      ).to.be.revertedWithCustomError(implementation, "FundUnavailable");
    });

    it("rolls back failed creation with no registry gaps", async () => {
      const f = await loadFixture(fixture);
      await expect(
        f.factory.createFund({ ...f.params, termsHash: ZERO }),
      ).to.be.revertedWithCustomError(f.fund, "InvalidConfiguration");
      expect(await f.factory.fundCount()).to.equal(1);
    });

    it("requires unique valid members and enough independent approvers", async () => {
      const f = await loadFixture(fixture);
      const cases = [
        { ...f.params, members: [] },
        { ...f.params, members: [...f.params.members, f.params.members[0]] },
        { ...f.params, policy: { ...f.params.policy, quorum: 0n } },
        { ...f.params, policy: { ...f.params.policy, quorum: 3n } },
        {
          ...f.params,
          members: [
            { ...f.params.members[0], account: ethers.ZeroAddress },
            ...f.params.members.slice(1),
          ],
        },
        {
          ...f.params,
          members: [
            { ...f.params.members[0], permissions: 8 },
            ...f.params.members.slice(1),
          ],
        },
        {
          ...f.params,
          members: [
            { ...f.params.members[0], dailyAllowance: 1n },
            ...f.params.members.slice(1),
          ],
        },
        { ...f.params, policy: { ...f.params.policy, dailyLimit: 0n } },
        { ...f.params, goalTarget: 1n },
        {
          ...f.params,
          members: Array.from({ length: 33 }, () => f.params.members[0]),
        },
      ];
      for (const params of cases)
        await expect(
          f.factory.createFund(params),
        ).to.be.revertedWithCustomError(f.fund, "InvalidConfiguration");
    });
  });

  describe("contributions, expenses and isolation", () => {
    it("accepts explicit contributions but rejects zero and plain transfers", async () => {
      const f = await loadFixture(fixture);
      await expect(f.fund.deposit(ZERO)).to.be.revertedWithCustomError(
        f.fund,
        "InvalidAmount",
      );
      await expect(
        f.outsider.sendTransaction({ to: f.fund, value: 1 }),
      ).to.be.revertedWithCustomError(f.fund, "DirectTransferDisabled");
      await expect(f.fund.connect(f.outsider).deposit(TERMS, { value: 100 }))
        .to.emit(f.fund, "Deposited")
        .withArgs(f.outsider.address, 100, TERMS);
      expect(await f.fund.contributions(f.outsider.address)).to.equal(100);
    });

    it("creator and contributors gain no implicit proposal or approval rights", async () => {
      const f = await loadFixture(fixture);
      await deposit(f);
      for (const signer of [f.creator, f.outsider, f.spender]) {
        await expect(
          f.fund
            .connect(signer)
            .proposeExpense(
              f.recipient.address,
              1,
              (await time.latest()) + DAY,
              ZERO,
            ),
        ).to.be.revertedWithCustomError(f.fund, "Unauthorized");
      }
      const id = await expense(f);
      await expect(
        f.fund.connect(f.proposer).approveExpense(id),
      ).to.be.revertedWithCustomError(f.fund, "Unauthorized");
      await expect(
        f.fund
          .connect(f.creator)
          .proposeAction(A.PAUSE, ethers.ZeroAddress, 0, ZERO),
      ).to.be.revertedWithCustomError(f.fund, "Unauthorized");
    });

    it("reserves funds, excludes self votes and executes exactly once after independent quorum", async () => {
      const f = await loadFixture(fixture);
      await deposit(f);
      const id = await expense(f, 20n, f.a.address);
      expect(await f.fund.availableBalance()).to.equal(80);
      await expect(
        f.fund.connect(f.a).approveExpense(id),
      ).to.be.revertedWithCustomError(f.fund, "SelfApproval");
      await f.fund.connect(f.b).approveExpense(id);
      await expect(
        f.fund.connect(f.b).approveExpense(id),
      ).to.be.revertedWithCustomError(f.fund, "AlreadyVoted");
      await expect(f.fund.executeExpense(id)).to.be.revertedWithCustomError(
        f.fund,
        "InvalidState",
      );
      await f.fund.connect(f.c).approveExpense(id);
      expect((await f.fund.getExpense(id)).status).to.equal(S.APPROVED);
      await expect(
        f.fund.connect(f.outsider).executeExpense(id),
      ).to.changeEtherBalances([f.fund, f.a], [-20, 20]);
      expect(await f.fund.reservedBalance()).to.equal(0);
      expect(await f.fund.accountedBalance()).to.equal(80);
      await expect(f.fund.executeExpense(id)).to.be.revertedWithCustomError(
        f.fund,
        "InvalidState",
      );
    });

    it("rejects invalid recipients, amount, deadlines and over-reservation", async () => {
      const f = await loadFixture(fixture);
      await deposit(f, 20n);
      await expect(expense(f, 0n)).to.be.revertedWithCustomError(
        f.fund,
        "InvalidAmount",
      );
      await expect(
        expense(f, 1n, ethers.ZeroAddress),
      ).to.be.revertedWithCustomError(f.fund, "InvalidRecipient");
      await expect(
        expense(f, 1n, await f.fund.getAddress()),
      ).to.be.revertedWithCustomError(f.fund, "InvalidRecipient");
      await expect(
        expense(f, 1n, f.recipient.address, 0),
      ).to.be.revertedWithCustomError(f.fund, "InvalidDeadline");
      await expect(
        expense(f, 1n, f.recipient.address, 31 * DAY),
      ).to.be.revertedWithCustomError(f.fund, "InvalidDeadline");
      await expense(f, 20n);
      await expect(expense(f, 1n)).to.be.revertedWithCustomError(
        f.fund,
        "InsufficientAvailableBalance",
      );
      await expect(
        f.fund.connect(f.spender).spend(f.recipient.address, 1, ZERO),
      ).to.be.revertedWithCustomError(f.fund, "InsufficientAvailableBalance");
    });

    it("proposer cancels and independent approvers reject, without double release", async () => {
      const f = await loadFixture(fixture);
      await deposit(f);
      const id = await expense(f);
      await expect(
        f.fund.connect(f.outsider).cancelExpense(id),
      ).to.be.revertedWithCustomError(f.fund, "Unauthorized");
      await f.fund.connect(f.proposer).cancelExpense(id);
      expect((await f.fund.getExpense(id)).status).to.equal(S.CANCELLED);
      await expect(
        f.fund.connect(f.proposer).cancelExpense(id),
      ).to.be.revertedWithCustomError(f.fund, "InvalidState");
      const next = await expense(f, 30n, f.a.address);
      await expect(
        f.fund.connect(f.a).rejectExpense(next),
      ).to.be.revertedWithCustomError(f.fund, "SelfApproval");
      await f.fund.connect(f.b).rejectExpense(next);
      expect((await f.fund.getExpense(next)).status).to.equal(S.REJECTED);
      expect(await f.fund.availableBalance()).to.equal(100);
    });

    it("expires at the exact boundary and permissionless cleanup happens once", async () => {
      const f = await loadFixture(fixture);
      await deposit(f);
      const id = await expense(f);
      await approveExpense(f, id);
      await time.increaseTo((await f.fund.getExpense(id)).deadline);
      expect((await f.fund.getExpense(id)).status).to.equal(S.EXPIRED);
      await expect(f.fund.executeExpense(id)).to.be.revertedWithCustomError(
        f.fund,
        "InvalidState",
      );
      await f.fund.connect(f.outsider).settleExpense(id);
      await expect(f.fund.settleExpense(id)).to.be.revertedWithCustomError(
        f.fund,
        "InvalidState",
      );
      expect(await f.fund.availableBalance()).to.equal(100);
    });

    it("does not reuse approvals or permissions across fund addresses", async () => {
      const f = await loadFixture(fixture);
      await deposit(f);
      const id = await expense(f);
      await approveExpense(f, id);
      const other = await f.create({
        ...f.params,
        members: f.params.members.slice(0, 3),
      });
      await other.deposit(ZERO, { value: 30 });
      await other
        .connect(f.a)
        .proposeExpense(
          f.recipient.address,
          20,
          (await time.latest()) + DAY,
          ZERO,
        );
      await expect(other.executeExpense(id)).to.be.revertedWithCustomError(
        other,
        "InvalidState",
      );
      expect(await other.expenseVotes(id, f.a.address)).to.equal(false);
      await expect(
        other
          .connect(f.proposer)
          .proposeExpense(
            f.recipient.address,
            1,
            (await time.latest()) + DAY,
            ZERO,
          ),
      ).to.be.revertedWithCustomError(other, "Unauthorized");
    });
  });

  describe("limited spending", () => {
    it("enforces transaction, cumulative member and whole-fund UTC-day limits", async () => {
      const f = await loadFixture(fixture);
      await deposit(f);
      await expect(
        f.fund.connect(f.a).spend(f.recipient.address, 1, ZERO),
      ).to.be.revertedWithCustomError(f.fund, "Unauthorized");
      await expect(
        f.fund.connect(f.spender).spend(f.recipient.address, 11, ZERO),
      ).to.be.revertedWithCustomError(f.fund, "SpendingLimitExceeded");
      await f.fund.connect(f.spender).spend(f.recipient.address, 10, ZERO);
      await f.fund.connect(f.spender).spend(f.recipient.address, 10, ZERO);
      await expect(
        f.fund.connect(f.spender).spend(f.recipient.address, 1, ZERO),
      ).to.be.revertedWithCustomError(f.fund, "SpendingLimitExceeded");
      await time.increaseTo(
        (BigInt(await time.latest()) / BigInt(DAY) + 1n) * BigInt(DAY),
      );
      await f.fund.connect(f.spender).spend(f.recipient.address, 10, ZERO);
      expect(await f.fund.accountedBalance()).to.equal(70);
    });

    it("global daily cap cannot be multiplied across members", async () => {
      const f = await loadFixture(fixture);
      const otherMembers = [
        ...f.params.members,
        { account: f.replacement.address, permissions: 4, dailyAllowance: 20n },
      ];
      const id = await policy(f, otherMembers);
      await executeGov(f, id);
      await deposit(f);
      await f.fund.connect(f.spender).spend(f.recipient.address, 10, ZERO);
      await f.fund.connect(f.spender).spend(f.recipient.address, 10, ZERO);
      await f.fund.connect(f.replacement).spend(f.recipient.address, 10, ZERO);
      await expect(
        f.fund.connect(f.replacement).spend(f.recipient.address, 1, ZERO),
      ).to.be.revertedWithCustomError(f.fund, "SpendingLimitExceeded");
    });

    it("policy changes do not reset day counters", async () => {
      const f = await loadFixture(fixture);
      await deposit(f);
      const id = await policy(f);
      const ready = (await f.fund.getGovernance(id)).readyAt;
      // Đặt giao dịch xa ranh giới ngày để kiểm tra reset policy, không kiểm tra đổi ngày.
      const midday = (ready / BigInt(DAY) + 1n) * BigInt(DAY) + 3600n;
      await time.increaseTo(midday);
      await f.fund.connect(f.spender).spend(f.recipient.address, 10, ZERO);
      await f.fund.connect(f.spender).spend(f.recipient.address, 10, ZERO);
      await f.fund.executeGovernance(id);
      await expect(
        f.fund.connect(f.spender).spend(f.recipient.address, 1, ZERO),
      ).to.be.revertedWithCustomError(f.fund, "SpendingLimitExceeded");
    });
  });

  describe("governance and recovery", () => {
    it("requires old quorum and a full delay after quorum, with no automatic proposer vote", async () => {
      const f = await loadFixture(fixture);
      await f.fund
        .connect(f.a)
        .proposePolicy(f.params.policy, f.params.members, TERMS);
      expect((await f.fund.getGovernance(1)).approvals).to.equal(0);
      await expect(f.fund.executeGovernance(1)).to.be.revertedWithCustomError(
        f.fund,
        "InvalidState",
      );
      await f.fund.connect(f.a).approveGovernance(1);
      await expect(
        f.fund.connect(f.a).approveGovernance(1),
      ).to.be.revertedWithCustomError(f.fund, "AlreadyVoted");
      await expect(
        f.fund.connect(f.outsider).approveGovernance(1),
      ).to.be.revertedWithCustomError(f.fund, "Unauthorized");
      await f.fund.connect(f.b).approveGovernance(1);
      await expect(f.fund.executeGovernance(1)).to.be.revertedWithCustomError(
        f.fund,
        "TimelockNotElapsed",
      );
      await executeGov(f, 1n);
      expect(await f.fund.policyEpoch()).to.equal(2);
      await expect(f.fund.executeGovernance(1)).to.be.revertedWithCustomError(
        f.fund,
        "InvalidState",
      );
    });

    it("replaces lost wallets by quorum, invalidates old votes and releases reservations in O(1)", async () => {
      const f = await loadFixture(fixture);
      await deposit(f);
      const old = await expense(f);
      await approveExpense(f, old);
      await f.fund
        .connect(f.a)
        .proposeAction(A.PAUSE, ethers.ZeroAddress, 0, ZERO);
      const replaced = f.params.members.map((m) =>
        m.account === f.c.address
          ? { ...m, account: f.replacement.address }
          : m,
      );
      const id = await policy(f, replaced);
      const [proposed, members, terms] = await f.fund.getProposedPolicy(id);
      expect(proposed.quorum).to.equal(2);
      expect(members[2].account).to.equal(f.replacement.address);
      expect(terms).to.equal(TERMS);
      await executeGov(f, id);
      expect(await f.fund.permissions(f.c.address)).to.equal(0);
      expect(await f.fund.permissions(f.replacement.address)).to.equal(2);
      expect((await f.fund.getExpense(old)).status).to.equal(S.INVALIDATED);
      expect((await f.fund.getGovernance(1)).status).to.equal(S.INVALIDATED);
      expect(await f.fund.reservedBalance()).to.equal(0);
      const next = await expense(f, 90n);
      await f.fund.settleExpense(old);
      expect(await f.fund.reservedBalance()).to.equal(90);
      await expect(f.fund.settleExpense(old)).to.be.revertedWithCustomError(
        f.fund,
        "InvalidState",
      );
      await expect(f.fund.executeExpense(old)).to.be.revertedWithCustomError(
        f.fund,
        "InvalidState",
      );
      await expect(
        f.fund.connect(f.c).approveExpense(next),
      ).to.be.revertedWithCustomError(f.fund, "Unauthorized");
      await f.fund.settleGovernance(1);
      await expect(f.fund.settleGovernance(1)).to.be.revertedWithCustomError(
        f.fund,
        "InvalidState",
      );
    });

    it("quorum pauses/resumes without enabling withdrawals; cleanup still works", async () => {
      const f = await loadFixture(fixture);
      await deposit(f);
      const exp = await expense(f);
      await approveExpense(f, exp);
      const id = await action(f, A.PAUSE);
      await f.fund.executeGovernance(id);
      expect(await f.fund.paused()).to.equal(true);
      await expect(
        f.fund.deposit(ZERO, { value: 1 }),
      ).to.be.revertedWithCustomError(f.fund, "FundUnavailable");
      await expect(f.fund.executeExpense(exp)).to.be.revertedWithCustomError(
        f.fund,
        "FundUnavailable",
      );
      await expect(
        f.fund.connect(f.spender).spend(f.recipient.address, 1, ZERO),
      ).to.be.revertedWithCustomError(f.fund, "FundUnavailable");
      await f.fund.connect(f.proposer).cancelExpense(exp);
      const resume = await action(f, A.RESUME);
      await f.fund.executeGovernance(resume);
      await f.fund.deposit(ZERO, { value: 1 });
      expect(await f.fund.accountedBalance()).to.equal(101);
    });

    it("invalidates stale pause/resume proposals across pause state transitions", async () => {
      const f = await loadFixture(fixture);
      const first = await action(f, A.PAUSE);
      const stale = await action(f, A.PAUSE);
      await f.fund.executeGovernance(first);
      expect((await f.fund.getGovernance(stale)).status).to.equal(
        S.INVALIDATED,
      );
      const resume = await action(f, A.RESUME);
      const oldResume = await action(f, A.RESUME);
      await f.fund.executeGovernance(resume);
      const pause = await action(f, A.PAUSE);
      await f.fund.executeGovernance(pause);
      await expect(
        f.fund.executeGovernance(oldResume),
      ).to.be.revertedWithCustomError(f.fund, "InvalidState");
    });

    it("supports veto/cancellation and expires governance after seven days exactly once", async () => {
      const f = await loadFixture(fixture);
      const first = await action(f, A.PAUSE);
      await expect(
        f.fund.connect(f.outsider).cancelGovernance(first),
      ).to.be.revertedWithCustomError(f.fund, "Unauthorized");
      await f.fund.connect(f.c).cancelGovernance(first);
      expect((await f.fund.getGovernance(first)).status).to.equal(S.REJECTED);
      const second = await action(f, A.PAUSE);
      await f.fund.connect(f.a).cancelGovernance(second);
      expect((await f.fund.getGovernance(second)).status).to.equal(S.CANCELLED);
      const third = await action(f, A.PAUSE);
      await time.increaseTo((await f.fund.getGovernance(third)).deadline);
      await expect(
        f.fund.executeGovernance(third),
      ).to.be.revertedWithCustomError(f.fund, "InvalidState");
      await f.fund.connect(f.outsider).settleGovernance(third);
      await expect(
        f.fund.settleGovernance(third),
      ).to.be.revertedWithCustomError(f.fund, "InvalidState");
    });

    it("closes only empty funds after quorum and delay, with no reopen", async () => {
      const f = await loadFixture(fixture);
      await deposit(f);
      const id = await action(f, A.CLOSE);
      const e = await expense(f, 100n, f.recipient.address, 3 * DAY);
      await approveExpense(f, e);
      await time.increaseTo((await f.fund.getGovernance(id)).readyAt);
      await expect(f.fund.executeGovernance(id)).to.be.revertedWithCustomError(
        f.fund,
        "InvalidState",
      );
      await f.fund.executeExpense(e);
      await f.fund.executeGovernance(id);
      expect(await f.fund.closed()).to.equal(true);
      await expect(
        f.fund.deposit(ZERO, { value: 1 }),
      ).to.be.revertedWithCustomError(f.fund, "FundUnavailable");
      await expect(
        f.fund
          .connect(f.a)
          .proposePolicy(f.params.policy, f.params.members, TERMS),
      ).to.be.revertedWithCustomError(f.fund, "InvalidState");
    });
  });

  describe("goal funds", () => {
    it("validates immutable goal terms and disallows delegated quick spending", async () => {
      const f = await loadFixture(goalFixture);
      await expect(
        f.factory.createFund({
          ...f.params,
          kind: 1,
          goalTarget: 100n,
          goalDeadline: f.deadline,
        }),
      ).to.be.revertedWithCustomError(f.fund, "InvalidConfiguration");
      await expect(
        f.factory.createFund({
          ...f.params,
          kind: 1,
          goalTarget: 0n,
          goalDeadline: 1n,
        }),
      ).to.be.revertedWithCustomError(f.fund, "InvalidConfiguration");
      await expect(
        f.fund
          .connect(f.a)
          .proposePolicy(f.params.policy, f.params.members, TERMS),
      ).to.be.revertedWithCustomError(f.fund, "InvalidConfiguration");
      await expect(
        f.fund.connect(f.spender).spend(f.recipient.address, 1, ZERO),
      ).to.be.revertedWithCustomError(f.fund, "Unauthorized");
    });

    it("locks expenses before target, latches success and preserves approval requirements", async () => {
      const f = await loadFixture(goalFixture);
      await deposit(f, 60n);
      await expect(expense(f)).to.be.revertedWithCustomError(
        f.fund,
        "GoalLocked",
      );
      await expect(f.fund.deposit(ZERO, { value: 40 }))
        .to.emit(f.fund, "GoalReached")
        .withArgs(100);
      const id = await expense(f, 90n);
      await approveExpense(f, id);
      await f.fund.executeExpense(id);
      expect(await f.fund.goalReached()).to.equal(true);
      await expense(f, 10n);
      await time.increaseTo(f.deadline);
      await expect(
        f.fund.connect(f.outsider).refundFailedGoal(),
      ).to.be.revertedWithCustomError(f.fund, "InvalidState");
      await expect(
        f.fund.deposit(ZERO, { value: 1 }),
      ).to.be.revertedWithCustomError(f.fund, "InvalidDeadline");
    });

    it("refunds each failed-goal contributor exactly once to their own address", async () => {
      const f = await loadFixture(goalFixture);
      await deposit(f, 60n);
      await f.fund.connect(f.proposer).deposit(ZERO, { value: 20 });
      await expect(
        f.fund.connect(f.outsider).refundFailedGoal(),
      ).to.be.revertedWithCustomError(f.fund, "InvalidState");
      await time.increaseTo(f.deadline);
      await expect(
        f.fund.connect(f.outsider).refundFailedGoal(),
      ).to.changeEtherBalances([f.fund, f.outsider], [-60, 60]);
      await expect(
        f.fund.connect(f.outsider).refundFailedGoal(),
      ).to.be.revertedWithCustomError(f.fund, "InvalidAmount");
      await expect(
        f.fund.connect(f.creator).refundFailedGoal(),
      ).to.be.revertedWithCustomError(f.fund, "InvalidAmount");
      expect(await f.fund.accountedBalance()).to.equal(20);
      await f.fund.connect(f.proposer).refundFailedGoal();
      expect(await f.fund.accountedBalance()).to.equal(0);
    });

    it("does not turn operating contributions into automatic refund rights", async () => {
      const f = await loadFixture(fixture);
      await deposit(f);
      await expect(
        f.fund.connect(f.outsider).refundFailedGoal(),
      ).to.be.revertedWithCustomError(f.fund, "InvalidState");
    });
  });

  describe("hostile recipients and forced surplus", () => {
    it("rolls back allowance counters when a limited payment fails", async () => {
      const f = await loadFixture(fixture);
      await deposit(f);
      const receiver = await (
        await ethers.getContractFactory("FundV2Receiver")
      ).deploy();
      await receiver.configure(f.fund, true, false, 0);
      await expect(
        f.fund.connect(f.spender).spend(receiver, 10, ZERO),
      ).to.be.revertedWithCustomError(f.fund, "TransferFailed");
      const day = BigInt(await time.latest()) / BigInt(DAY);
      expect(await f.fund.dailySpent(day)).to.equal(0);
      expect(await f.fund.memberDailySpent(f.spender.address, day)).to.equal(0);
      expect(await f.fund.accountedBalance()).to.equal(100);
    });

    it("rechecks surplus at execution and rolls back failed surplus payouts", async () => {
      const f = await loadFixture(fixture);
      const receiver = await (
        await ethers.getContractFactory("FundV2Receiver")
      ).deploy();
      await receiver.configure(f.fund, true, false, 0);
      await (
        await ethers.getContractFactory("FundV2ForcedNative")
      ).deploy(await f.fund.getAddress(), { value: 15 });
      const failed = await action(
        f,
        A.SURPLUS,
        await receiver.getAddress(),
        15n,
      );
      const first = await action(f, A.SURPLUS, f.recipient.address, 15n);
      const second = await action(f, A.SURPLUS, f.recipient.address, 15n);
      await time.increaseTo((await f.fund.getGovernance(second)).readyAt);
      await expect(
        f.fund.executeGovernance(failed),
      ).to.be.revertedWithCustomError(f.fund, "TransferFailed");
      expect((await f.fund.getGovernance(failed)).status).to.equal(S.APPROVED);
      await f.fund.executeGovernance(first);
      await expect(
        f.fund.executeGovernance(second),
      ).to.be.revertedWithCustomError(f.fund, "InsufficientAvailableBalance");
    });

    it("cannot close while paused, but can recover forced surplus after normal closure", async () => {
      const f = await loadFixture(fixture);
      const close = await action(f, A.CLOSE);
      const pause = await action(f, A.PAUSE);
      await f.fund.executeGovernance(pause);
      await time.increaseTo((await f.fund.getGovernance(close)).readyAt);
      await expect(
        f.fund.executeGovernance(close),
      ).to.be.revertedWithCustomError(f.fund, "InvalidState");
      const resume = await action(f, A.RESUME);
      await f.fund.executeGovernance(resume);
      await f.fund.executeGovernance(close);
      await (
        await ethers.getContractFactory("FundV2ForcedNative")
      ).deploy(await f.fund.getAddress(), { value: 7 });
      const surplus = await action(f, A.SURPLUS, f.recipient.address, 7n);
      await executeGov(f, surplus);
      expect(await ethers.provider.getBalance(f.fund)).to.equal(0);
    });

    it("rolls back failed transfers and blocks reentrant execution", async () => {
      const f = await loadFixture(fixture);
      await deposit(f);
      const receiver = await (
        await ethers.getContractFactory("FundV2Receiver")
      ).deploy();
      const id = await expense(f, 20n, await receiver.getAddress());
      await approveExpense(f, id);
      await receiver.configure(f.fund, true, false, id);
      await expect(f.fund.executeExpense(id)).to.be.revertedWithCustomError(
        f.fund,
        "TransferFailed",
      );
      expect(await f.fund.accountedBalance()).to.equal(100);
      expect(await f.fund.reservedBalance()).to.equal(20);
      expect((await f.fund.getExpense(id)).status).to.equal(S.APPROVED);
      await receiver.configure(f.fund, false, true, id);
      await f.fund.executeExpense(id);
      expect(await receiver.reentered()).to.equal(false);
      expect(await ethers.provider.getBalance(receiver)).to.equal(20);
    });

    it("failed refund is retryable without destroying the contributor claim", async () => {
      const f = await loadFixture(goalFixture);
      const receiver = await (
        await ethers.getContractFactory("FundV2Receiver")
      ).deploy();
      await receiver.configure(f.fund, true, false, 0);
      await receiver.contribute({ value: 30 });
      await time.increaseTo(f.deadline);
      await expect(receiver.refund()).to.be.revertedWithCustomError(
        f.fund,
        "TransferFailed",
      );
      expect(await f.fund.contributions(receiver)).to.equal(30);
      await receiver.configure(f.fund, false, false, 0);
      await receiver.refund();
      expect(await f.fund.accountedBalance()).to.equal(0);
    });

    it("keeps forced surplus out of accounting and requires independent quorum plus delay", async () => {
      const f = await loadFixture(fixture);
      await deposit(f);
      await (
        await ethers.getContractFactory("FundV2ForcedNative")
      ).deploy(await f.fund.getAddress(), { value: 15 });
      expect(await f.fund.accountedBalance()).to.equal(100);
      expect(await f.fund.availableBalance()).to.equal(100);
      await f.fund.connect(f.a).proposeAction(A.SURPLUS, f.a.address, 15, ZERO);
      await expect(
        f.fund.connect(f.a).approveGovernance(1),
      ).to.be.revertedWithCustomError(f.fund, "SelfApproval");
      await f.fund.connect(f.b).approveGovernance(1);
      await f.fund.connect(f.c).approveGovernance(1);
      await expect(f.fund.executeGovernance(1)).to.be.revertedWithCustomError(
        f.fund,
        "TimelockNotElapsed",
      );
      await time.increaseTo((await f.fund.getGovernance(1)).readyAt);
      await expect(f.fund.executeGovernance(1)).to.changeEtherBalances(
        [f.fund, f.a],
        [-15, 15],
      );
      expect(await f.fund.accountedBalance()).to.equal(100);
      await expect(
        f.fund.connect(f.a).proposeAction(A.SURPLUS, f.a.address, 1, ZERO),
      ).to.be.revertedWithCustomError(f.fund, "InsufficientAvailableBalance");
    });

    it("failed-goal forced surplus cannot fake target attainment or consume refund backing", async () => {
      const f = await loadFixture(goalFixture);
      await deposit(f, 30n);
      await (
        await ethers.getContractFactory("FundV2ForcedNative")
      ).deploy(await f.fund.getAddress(), { value: 100 });
      expect(await f.fund.goalReached()).to.equal(false);
      const id = await action(f, A.SURPLUS, f.recipient.address, 100n);
      await executeGov(f, id);
      await time.increaseTo(f.deadline);
      await f.fund.connect(f.outsider).refundFailedGoal();
      expect(await ethers.provider.getBalance(f.fund)).to.equal(0);
    });

    it("exposes absent IDs as NONE and disallows mutating them", async () => {
      const f = await loadFixture(fixture);
      expect((await f.fund.getExpense(99)).status).to.equal(S.NONE);
      expect((await f.fund.getGovernance(99)).status).to.equal(S.NONE);
      await expect(f.fund.settleExpense(99)).to.be.revertedWithCustomError(
        f.fund,
        "InvalidState",
      );
      await expect(f.fund.settleGovernance(99)).to.be.revertedWithCustomError(
        f.fund,
        "InvalidState",
      );
    });
  });

  describe("accounting invariants", () => {
    it("conserves native assets and reservations over a deterministic mixed-action sequence", async () => {
      const f = await loadFixture(fixture);
      await deposit(f, 1000n);
      let paid = 0n;
      let seed = 17091;
      const ids: bigint[] = [];
      const settled = new Set<bigint>();
      for (let step = 0; step < 72; step++) {
        seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
        const choice = seed % 6;
        const live: bigint[] = [];
        for (const id of ids) {
          const status = (await f.fund.getExpense(id)).status;
          if (status === BigInt(S.PENDING) || status === BigInt(S.APPROVED))
            live.push(id);
        }
        if (choice < 2) {
          ids.push(
            await expense(
              f,
              BigInt((seed % 25) + 1),
              f.recipient.address,
              3 * DAY,
            ),
          );
        } else if (choice === 2 && live.length) {
          const id = live[seed % live.length];
          await f.fund.connect(f.proposer).cancelExpense(id);
        } else if (choice === 3 && live.length) {
          const id = live[seed % live.length];
          const request = await f.fund.getExpense(id);
          await approveExpense(f, id);
          await f.fund.connect(f.outsider).executeExpense(id);
          paid += request.amount;
        } else if (choice === 4) {
          await time.increase(DAY);
          await f.fund.connect(f.spender).spend(f.recipient.address, 3, ZERO);
          paid += 3n;
        } else if (choice === 5) {
          const change = await policy(f);
          await executeGov(f, change);
        }
        let reserved = 0n;
        for (const id of ids) {
          let request = await f.fund.getExpense(id);
          if (
            request.status === BigInt(S.EXPIRED) ||
            request.status === BigInt(S.INVALIDATED)
          ) {
            // Chỉ ghi nhận hết hạn/vô hiệu một lần cho mỗi yêu cầu.
            if (!settled.has(id)) {
              await f.fund.settleExpense(id);
              settled.add(id);
            }
            request = await f.fund.getExpense(id);
          }
          if (
            request.status === BigInt(S.PENDING) ||
            request.status === BigInt(S.APPROVED)
          )
            reserved += request.amount;
        }
        expect(await f.fund.accountedBalance()).to.equal(1000n - paid);
        expect(await ethers.provider.getBalance(f.fund)).to.equal(1000n - paid);
        expect(await f.fund.reservedBalance()).to.equal(reserved);
        expect(await f.fund.availableBalance()).to.equal(
          1000n - paid - reserved,
        );
      }
    });
  });
});

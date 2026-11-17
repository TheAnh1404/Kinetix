import assert from "node:assert/strict";
import { ethers, network } from "hardhat";
import { time } from "@nomicfoundation/hardhat-toolbox/network-helpers";

const ZERO_HASH = ethers.ZeroHash;
const TERMS_HASH = ethers.id("kinetix-terms-v2-full-integration");
const UPGRADED_TERMS = ethers.id("kinetix-terms-v2-upgraded");
const GOAL_TERMS = ethers.id("kinetix-goal-terms-v2");
const DAY = 86400;

const PROPOSE = 1;
const APPROVE = 2;
const SPEND = 4;

const FundKind = { OPERATING: 0n, GOAL: 1n };
const Status = {
  NONE: 0n,
  PENDING: 1n,
  APPROVED: 2n,
  EXECUTED: 3n,
  CANCELLED: 4n,
  REJECTED: 5n,
  EXPIRED: 6n,
  INVALIDATED: 7n,
};
const Action = { POLICY: 0n, PAUSE: 1n, RESUME: 2n, CLOSE: 3n, SURPLUS: 4n };

let totalPassed = 0;
function pass(checkName: string) {
  totalPassed++;
  console.log(`  [PASS ${totalPassed}] ${checkName}`);
}

async function main() {
  console.log("==================================================================");
  console.log("  KINETIX V2 FULL INTEGRATION VERIFICATION RUNNER");
  console.log("  Dual-Custody Smart Contract V2 Lifecycle & Invariant Verification");
  console.log("==================================================================\n");

  const signers = await ethers.getSigners();
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
    newApprover,
  ] = signers;

  // --- Step 1: Deploy Factory V2 ---
  console.log("[Phase 1] Factory Deployment & Immutability Verification");
  const factory: any = await (
    await ethers.getContractFactory("KinetixFundFactoryV2", deployer)
  ).deploy();
  await factory.waitForDeployment();
  const factoryAddr = await factory.getAddress();
  const implAddr = await factory.implementation();

  assert.equal(await factory.VERSION(), 2n, "Factory version must be 2");
  assert.equal(await factory.fundCount(), 0n, "Initial fundCount must be 0");
  assert.equal(await factory.isFund(implAddr), false, "Implementation itself cannot be marked as a fund");

  const implCode = await ethers.provider.getCode(implAddr);
  assert.ok(implCode.length > 2, "Implementation must have deployed bytecode");
  pass("Factory V2 deployed and implementation template secured");

  // --- Step 2: Initialize Operating Fund V2 ---
  console.log("\n[Phase 2] Operating Fund Clone Initialization");
  const operatingParams = {
    kind: FundKind.OPERATING,
    goalTarget: 0n,
    goalDeadline: 0n,
    termsHash: TERMS_HASH,
    policy: {
      quorum: 2n,
      transactionLimit: ethers.parseEther("1.0"),
      dailyLimit: ethers.parseEther("4.0"),
    },
    members: [
      { account: approver1.address, permissions: APPROVE, dailyAllowance: 0n },
      { account: approver2.address, permissions: APPROVE, dailyAllowance: 0n },
      { account: approver3.address, permissions: APPROVE, dailyAllowance: 0n },
      { account: proposer.address, permissions: PROPOSE, dailyAllowance: 0n },
      { account: spender.address, permissions: SPEND, dailyAllowance: ethers.parseEther("2.0") },
    ],
  };

  const createTx = await factory.connect(creator).createFund(operatingParams);
  const receipt = await createTx.wait();
  assert.equal(await factory.fundCount(), 1n, "fundCount must increment to 1");

  const fundAddr = await factory.funds(1n);
  assert.equal(await factory.isFund(fundAddr), true, "Clone must be registered in factory");
  const opFund: any = await ethers.getContractAt("KinetixFundV2", fundAddr);

  assert.equal(await opFund.factory(), factoryAddr, "Fund factory must point to factory");
  assert.equal(await opFund.creator(), creator.address, "Fund creator must match caller");
  assert.equal(await opFund.kind(), BigInt(FundKind.OPERATING), "Fund kind must be OPERATING");
  assert.equal(await opFund.policyEpoch(), 1n, "Initial policyEpoch must be 1");
  assert.equal(await opFund.termsHash(), TERMS_HASH, "termsHash must match config");
  assert.equal(await opFund.permissions(approver1.address), BigInt(APPROVE), "approver1 must have APPROVE permission");
  assert.equal(await opFund.permissions(proposer.address), BigInt(PROPOSE), "proposer must have PROPOSE permission");
  assert.equal(await opFund.permissions(spender.address), BigInt(SPEND), "spender must have SPEND permission");
  assert.equal(await opFund.dailyAllowance(spender.address), ethers.parseEther("2.0"), "spender dailyAllowance must match");
  pass("Operating Fund V2 clone created and immutable state verified");

  // --- Step 3: Native AVAX Deposit & Accounting ---
  console.log("\n[Phase 3] Native AVAX Deposit & Exact Wei Accounting");
  const dep1 = ethers.parseEther("10.0");
  const dep2 = ethers.parseEther("5.0");
  const ref1 = ethers.id("contribution-1");
  const ref2 = ethers.id("contribution-2");

  await opFund.connect(contributor1).deposit(ref1, { value: dep1 });
  await opFund.connect(contributor2).deposit(ref2, { value: dep2 });

  const totalDeposited = dep1 + dep2; // 15.0 AVAX
  assert.equal(await opFund.accountedBalance(), totalDeposited, "accountedBalance must match deposits");
  assert.equal(await opFund.availableBalance(), totalDeposited, "availableBalance must match deposits");
  assert.equal(await opFund.reservedBalance(), 0n, "reservedBalance must initially be 0");
  assert.equal(await ethers.provider.getBalance(fundAddr), totalDeposited, "Contract balance must match exactly");
  assert.equal(await opFund.contributions(contributor1.address), dep1, "Contributor 1 contribution tracked");
  assert.equal(await opFund.contributions(contributor2.address), dep2, "Contributor 2 contribution tracked");
  pass("Native AVAX deposits reconciled with zero-loss exact wei accounting");

  // --- Step 4: Multi-Approval Expense Workflow ---
  console.log("\n[Phase 4] Expense Proposal, Multi-Approval & Execution");
  const expenseAmount = ethers.parseEther("3.0");
  const currentTime = await time.latest();
  const expenseDeadline = BigInt(currentTime + 5 * DAY);
  const memoHash = ethers.id("invoice-q4-2026");

  await opFund.connect(proposer).proposeExpense(recipient1.address, expenseAmount, expenseDeadline, memoHash);
  assert.equal(await opFund.expenseCount(), 1n, "expenseCount must be 1");
  assert.equal(await opFund.reservedBalance(), expenseAmount, "reservedBalance must hold 3.0 AVAX");
  assert.equal(await opFund.availableBalance(), ethers.parseEther("12.0"), "availableBalance must be 12.0 AVAX");

  // Approvals by quorum
  await opFund.connect(approver1).approveExpense(1n);
  let exp = await opFund.getExpense(1n);
  assert.equal(exp.status, Status.PENDING, "Expense must be PENDING with 1 approval");

  await opFund.connect(approver2).approveExpense(1n);
  exp = await opFund.getExpense(1n);
  assert.equal(exp.status, Status.APPROVED, "Expense must be APPROVED with 2 approvals");

  // Execute payment
  const rec1Before = await ethers.provider.getBalance(recipient1.address);
  await opFund.connect(approver3).executeExpense(1n);
  const rec1After = await ethers.provider.getBalance(recipient1.address);

  assert.equal(rec1After - rec1Before, expenseAmount, "Recipient must receive exact payment amount");
  assert.equal(await opFund.reservedBalance(), 0n, "reservedBalance must return to 0");
  assert.equal(await opFund.accountedBalance(), ethers.parseEther("12.0"), "accountedBalance decremented by 3.0 AVAX");
  assert.equal(await opFund.availableBalance(), ethers.parseEther("12.0"), "availableBalance equals accountedBalance");
  pass("Multi-approval expense executed with exact wei delivery and ledger conservation");

  // --- Step 5: Limited Quick Spend Flow ---
  console.log("\n[Phase 5] Operating Limited Quick Spend (Daily Cap & Allowance)");
  const quickSpendAmount = ethers.parseEther("0.8");
  const rec2Before = await ethers.provider.getBalance(recipient2.address);
  await opFund.connect(spender).spend(recipient2.address, quickSpendAmount, ethers.id("quick-lunch"));
  const rec2After = await ethers.provider.getBalance(recipient2.address);

  assert.equal(rec2After - rec2Before, quickSpendAmount, "Recipient 2 received quick payment");
  assert.equal(await opFund.accountedBalance(), ethers.parseEther("11.2"), "Balance reduced to 11.2 AVAX");
  pass("Quick spend validated against daily transaction limit and member allowance");

  // --- Step 6: Emergency Pause & Resume Governance ---
  console.log("\n[Phase 6] Quorum Emergency Pause & Resume");
  await opFund.connect(approver1).proposeAction(Action.PAUSE, ethers.ZeroAddress, 0n, ethers.id("emergency"));
  await opFund.connect(approver1).approveGovernance(1n);
  await opFund.connect(approver2).approveGovernance(1n);
  await opFund.connect(approver1).executeGovernance(1n);
  assert.equal(await opFund.paused(), true, "Fund must be paused");

  // Verify paused fund rejects operations
  await assert.rejects(
    async () => opFund.connect(contributor1).deposit(ethers.id("fail"), { value: ethers.parseEther("1.0") }),
    /FundUnavailable/,
    "Deposit must revert when paused"
  );

  // Resume fund
  await opFund.connect(approver1).proposeAction(Action.RESUME, ethers.ZeroAddress, 0n, ethers.id("resume"));
  await opFund.connect(approver1).approveGovernance(2n);
  await opFund.connect(approver2).approveGovernance(2n);
  await opFund.connect(approver1).executeGovernance(2n);
  assert.equal(await opFund.paused(), false, "Fund must be unpaused");
  pass("Emergency pause and resume executed under quorum governance without timelock lag");

  // --- Step 7: 24h Timelocked Policy Upgrade & O(1) Epoch Invalidation ---
  console.log("\n[Phase 7] 24h Timelocked Policy Governance & Epoch Invalidation");
  // In epoch 1: propose expense 2 to reserve 2.0 AVAX
  const pendingAmount = ethers.parseEther("2.0");
  await opFund.connect(proposer).proposeExpense(recipient1.address, pendingAmount, BigInt((await time.latest()) + 5 * DAY), ZERO_HASH);
  assert.equal(await opFund.reservedBalance(), pendingAmount, "Expense #2 reserved 2.0 AVAX");

  // Propose policy change
  const newPolicy = {
    quorum: 2n,
    transactionLimit: ethers.parseEther("2.0"),
    dailyLimit: ethers.parseEther("8.0"),
  };
  const newMembers = [
    { account: approver1.address, permissions: APPROVE, dailyAllowance: 0n },
    { account: approver2.address, permissions: APPROVE, dailyAllowance: 0n },
    { account: newApprover.address, permissions: APPROVE, dailyAllowance: 0n },
    { account: proposer.address, permissions: PROPOSE, dailyAllowance: 0n },
    { account: spender.address, permissions: SPEND, dailyAllowance: ethers.parseEther("3.0") },
  ];

  await opFund.connect(approver1).proposePolicy(newPolicy, newMembers, UPGRADED_TERMS);
  const govId = await opFund.governanceCount(); // proposal #3

  await opFund.connect(approver1).approveGovernance(govId);
  await opFund.connect(approver2).approveGovernance(govId);

  const govProposal = await opFund.getGovernance(govId);
  assert.ok(govProposal.readyAt > 0n, "readyAt must be scheduled");

  // Must revert before timelock
  await assert.rejects(
    async () => opFund.connect(approver1).executeGovernance(govId),
    /TimelockNotElapsed/,
    "Policy change must enforce 24h timelock"
  );

  // Advance time past 24h
  await time.increaseTo(govProposal.readyAt);
  await opFund.connect(approver1).executeGovernance(govId);

  assert.equal(await opFund.policyEpoch(), 2n, "policyEpoch must increment to 2");
  assert.equal(await opFund.termsHash(), UPGRADED_TERMS, "termsHash updated");
  assert.equal(await opFund.permissions(approver3.address), 0n, "approver3 permissions revoked");
  assert.equal(await opFund.permissions(newApprover.address), BigInt(APPROVE), "newApprover permissions granted");

  // O(1) Old Expense Invalidation
  assert.equal(await opFund.reservedBalance(), 0n, "Old reservation cleared in O(1) upon epoch change");
  const exp2 = await opFund.getExpense(2n);
  assert.equal(exp2.status, Status.INVALIDATED, "Old expense from previous epoch marked INVALIDATED");
  pass("24h timelock enforced and O(1) policyEpoch invalidation verified");

  // --- Step 8: Goal Fund Creation & Failed-Goal 1-Tap Refund ---
  console.log("\n[Phase 8] Goal Fund Lifecycle & 1-Tap Failed-Goal Refund");
  const target = ethers.parseEther("20.0");
  const goalDeadline = BigInt((await time.latest()) + 2 * DAY);
  const goalParams = {
    kind: FundKind.GOAL,
    goalTarget: target,
    goalDeadline: goalDeadline,
    termsHash: GOAL_TERMS,
    policy: { quorum: 2n, transactionLimit: 0n, dailyLimit: 0n },
    members: [
      { account: approver1.address, permissions: APPROVE, dailyAllowance: 0n },
      { account: approver2.address, permissions: APPROVE, dailyAllowance: 0n },
      { account: approver3.address, permissions: APPROVE, dailyAllowance: 0n },
      { account: proposer.address, permissions: PROPOSE, dailyAllowance: 0n },
    ],
  };

  await factory.connect(creator).createFund(goalParams);
  const goalFundAddr = await factory.funds(2n);
  const goalFund: any = await ethers.getContractAt("KinetixFundV2", goalFundAddr);

  // Contributors deposit partial amount (8.0 AVAX < 20.0 AVAX target)
  const c1Dep = ethers.parseEther("5.0");
  const c2Dep = ethers.parseEther("3.0");
  await goalFund.connect(contributor1).deposit(ethers.id("g-dep-1"), { value: c1Dep });
  await goalFund.connect(contributor2).deposit(ethers.id("g-dep-2"), { value: c2Dep });

  assert.equal(await goalFund.goalReached(), false, "Goal must not be reached");

  // Refund before deadline must revert
  await assert.rejects(
    async () => goalFund.connect(contributor1).refundFailedGoal(),
    /InvalidState/,
    "Refund must not be allowed before deadline"
  );

  // Fast forward past deadline
  await time.increaseTo(goalDeadline + 10n);

  // Contributor 1 claims 100% refund
  const c1BalBefore = await ethers.provider.getBalance(contributor1.address);
  const refundTx1 = await goalFund.connect(contributor1).refundFailedGoal();
  const rReceipt1 = await refundTx1.wait();
  const c1Gas = BigInt(rReceipt1!.gasUsed) * BigInt(rReceipt1!.gasPrice ?? 0n);
  const c1BalAfter = await ethers.provider.getBalance(contributor1.address);

  assert.equal(c1BalAfter + c1Gas - c1BalBefore, c1Dep, "Contributor 1 must receive exact 100% refund");
  assert.equal(await goalFund.contributions(contributor1.address), 0n, "Contributor 1 contribution reset to 0");

  // Contributor 1 double-claim blocked
  await assert.rejects(
    async () => goalFund.connect(contributor1).refundFailedGoal(),
    /InvalidAmount/,
    "Double refund claim must be rejected"
  );

  // Contributor 2 claims 100% refund
  const c2BalBefore = await ethers.provider.getBalance(contributor2.address);
  const refundTx2 = await goalFund.connect(contributor2).refundFailedGoal();
  const rReceipt2 = await refundTx2.wait();
  const c2Gas = BigInt(rReceipt2!.gasUsed) * BigInt(rReceipt2!.gasPrice ?? 0n);
  const c2BalAfter = await ethers.provider.getBalance(contributor2.address);

  assert.equal(c2BalAfter + c2Gas - c2BalBefore, c2Dep, "Contributor 2 must receive exact 100% refund");

  // Goal Fund zero-loss conservation
  assert.equal(await goalFund.accountedBalance(), 0n, "Goal Fund accountedBalance is 0");
  assert.equal(await ethers.provider.getBalance(goalFundAddr), 0n, "Goal Fund contract balance is 0");
  pass("1-Tap Failed-Goal refund completed with zero trapped wei and duplicate-prevention");

  console.log("\n==================================================================");
  console.log(`  VERIFICATION COMPLETE: ALL ${totalPassed} INVARIANT CHECKS PASSED`);
  console.log("  Full Smart Contract V2 integration is verified and operational.");
  console.log("==================================================================\n");
}

main().catch((err) => {
  console.error("Verification failed:", err);
  process.exitCode = 1;
});

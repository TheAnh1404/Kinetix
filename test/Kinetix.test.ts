import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { t1Fixture } from "./support/t1";

describe("T1 native vault policies and treasury", () => {
  for (const modular of [true, false]) {
    describe(modular ? "Cashflow custody" : "Standalone custody", () => {
      it("backs every deposited wei locally, including rounding boundaries", async () => {
        const f = await t1Fixture(modular);
        const id = await f.create();
        for (const value of [1n, 9n, ethers.parseEther("2")])
          await f.hub.depositToVault(id, { value });
        const vault = await f.hub.getVault(id);
        expect(vault.totalBalance).to.equal(ethers.parseEther("2") + 10n);
        expect(vault.l1BufferBalance).to.equal(vault.totalBalance);
        expect(vault.cChainPrincipal).to.equal(0n);
        expect(
          await ethers.provider.getBalance(
            modular ? f.cashflow.target : f.hub.target,
          ),
        ).to.equal(vault.totalBalance);
      });
      it("pays a fast withdrawal once and respects the fixed daily boundary", async () => {
        const f = await t1Fixture(modular);
        const id = await f.create();
        await f.hub.depositToVault(id, { value: ethers.parseEther("4") });
        await expect(
          f.hub.connect(f.member).fastWithdraw(id, ethers.parseEther("1")),
        ).to.changeEtherBalance(f.member, ethers.parseEther("1"));
        await f.hub.connect(f.member).fastWithdraw(id, ethers.parseEther("1"));
        await expect(
          f.hub.connect(f.member).fastWithdraw(id, 1n),
        ).to.be.revertedWithCustomError(f.hub, "ExceedsDailyLimit");
        await time.increase(86400);
        await f.hub.connect(f.member).fastWithdraw(id, 1n);
        expect((await f.hub.getVault(id)).totalBalance).to.equal(
          ethers.parseEther("2") - 1n,
        );
      });
      it("requires distinct actual guardians, pays exact approved amount and blocks replay", async () => {
        const f = await t1Fixture(modular);
        const id = await f.create();
        await f.hub.depositToVault(id, { value: ethers.parseEther("3") });
        await f.hub
          .connect(f.member)
          .requestLargeWithdrawal(
            id,
            ethers.parseEther("2"),
            "Medical expense",
          );
        await expect(f.hub.approveWithdrawal(1n)).to.be.revertedWithCustomError(
          f.hub,
          "NotVaultGuardian",
        );
        await f.hub.connect(f.g1).approveWithdrawal(1n);
        await expect(
          f.hub.connect(f.g1).approveWithdrawal(1n),
        ).to.be.revertedWithCustomError(f.hub, "AlreadyApproved");
        await expect(
          f.hub.connect(f.g2).approveWithdrawal(1n),
        ).to.changeEtherBalance(f.member, ethers.parseEther("2"));
        await expect(
          f.hub.connect(f.g2).approveWithdrawal(1n),
        ).to.be.revertedWithCustomError(f.hub, "RequestAlreadyExecuted");
        expect((await f.hub.getVault(id)).totalBalance).to.equal(
          ethers.parseEther("1"),
        );
      });
      it("does not spend another vault's backing", async () => {
        const f = await t1Fixture(modular);
        const first = await f.create();
        const second = await f.create();
        await f.hub.depositToVault(first, { value: 10n });
        await f.hub.depositToVault(second, { value: 100n });
        await expect(
          f.hub.connect(f.member).fastWithdraw(first, 11n),
        ).to.be.revertedWithCustomError(f.hub, "InsufficientLocalBuffer");
        expect((await f.hub.getVault(second)).totalBalance).to.equal(100n);
      });
    });
  }
  it("rejects zero values, nonmembers, non-allowlisted senders and oversized withdrawals", async () => {
    const f = await t1Fixture();
    const id = await f.create();
    await expect(
      f.hub.depositToVault(id, { value: 0n }),
    ).to.be.revertedWithCustomError(f.hub, "ZeroAmount");
    await expect(
      f.hub.connect(f.other).depositToVault(id, { value: 1n }),
    ).to.be.revertedWithCustomError(f.hub, "NotAllowlisted");
    await f.hub.setAllowlistStatus(f.other.address, true);
    await expect(
      f.hub.connect(f.other).fastWithdraw(id, 1n),
    ).to.be.revertedWithCustomError(f.hub, "NotVaultBeneficiary");
    await expect(
      f.hub.connect(f.member).fastWithdraw(id, ethers.parseEther("1") + 1n),
    ).to.be.revertedWithCustomError(f.hub, "ExceedsFastLimit");
  });
  it("rejects invalid or unconfigured vault policies and unapproved creators", async () => {
    const f = await t1Fixture();
    await f.hub.setAllowlistStatus(f.g1.address, true);
    await f.hub.setAllowlistStatus(f.member.address, true);
    await expect(
      f.hub.createCustomVault(
        "Bad ratio",
        0,
        1000,
        0n,
        1,
        [f.g1.address],
        [f.member.address],
      ),
    ).to.be.revertedWithCustomError(f.hub, "InvalidBufferRatio");
    await expect(
      f.hub.createCustomVault(
        "Bad quorum",
        0,
        10000,
        0n,
        3,
        [f.g1.address],
        [f.member.address],
      ),
    ).to.be.revertedWithCustomError(f.hub, "InvalidApprovalThreshold");
    await expect(
      f.hub.createCustomVault(
        "Zero member",
        0,
        10000,
        0n,
        1,
        [ethers.ZeroAddress],
        [f.member.address],
      ),
    ).to.be.revertedWithCustomError(f.hub, "ZeroAddress");
    await expect(
      f.hub.createCustomVault(
        "Missing goal",
        3,
        10000,
        0n,
        1,
        [f.g1.address],
        [f.member.address],
      ),
    ).to.be.revertedWithCustomError(f.hub, "InvalidRuleAction");
    await expect(
      f.hub
        .connect(f.other)
        .createCustomVault(
          "Unapproved",
          0,
          10000,
          0n,
          1,
          [f.other.address],
          [f.other.address],
        ),
    ).to.be.revertedWithCustomError(f.hub, "NotAllowlisted");
  });
  it("expires requests at 48 hours", async () => {
    const f = await t1Fixture();
    const id = await f.create();
    await f.hub.depositToVault(id, { value: 10n });
    await f.hub.connect(f.member).requestLargeWithdrawal(id, 10n, "Expense");
    await time.increase(48 * 3600 + 1);
    await expect(
      f.hub.connect(f.g1).approveWithdrawal(1n),
    ).to.be.revertedWithCustomError(f.hub, "RequestExpired");
  });
  it("keeps admin outside guardian quorum and immutable spending policy", async () => {
    const f = await t1Fixture();
    const id = await f.create();
    await expect(
      f.hub.createChore(id, "Bypass", 1n, f.member.address),
    ).to.be.revertedWithCustomError(f.hub, "NotVaultGuardian");
    await expect(
      f.hub.connect(f.g1).setVaultDailyLimit(id, ethers.parseEther("100")),
    ).to.be.revertedWithCustomError(f.hub, "ConfigurationLocked");
    await expect(
      f.cashflow.executeWithdrawal(id, f.admin.address, 1n),
    ).to.be.revertedWithCustomError(f.cashflow, "NotController");
    await expect(
      f.cashflow.setController(f.hub.target),
    ).to.be.revertedWithCustomError(f.cashflow, "ConfigurationLocked");
  });
  it("locks direct treasury deposits and repeated wiring", async () => {
    const f = await t1Fixture();
    await f.create();
    await expect(
      f.cashflow.deposit(1n, f.admin.address, { value: 1n }),
    ).to.be.revertedWithCustomError(f.cashflow, "NotController");
    await expect(
      f.hub.setVaultCashflow(f.cashflow.target),
    ).to.be.revertedWithCustomError(f.hub, "ConfigurationLocked");
    await expect(
      f.hub.setTrustedForwarder(f.forwarder.target),
    ).to.be.revertedWithCustomError(f.hub, "ConfigurationLocked");
  });
  it("blocks every policy write during pause and resumes safely", async () => {
    const f = await t1Fixture();
    const id = await f.create(1);
    await f.hub.depositToVault(id, { value: 10n });
    await f.hub.pause();
    await expect(f.create()).to.be.revertedWithCustomError(
      f.hub,
      "EnforcedPause",
    );
    await expect(
      f.hub.depositToVault(id, { value: 1n }),
    ).to.be.revertedWithCustomError(f.hub, "EnforcedPause");
    await expect(
      f.hub.connect(f.g1).createChore(id, "Task", 1n, f.member.address),
    ).to.be.revertedWithCustomError(f.hub, "EnforcedPause");
    await f.hub.unpause();
    await f.hub.depositToVault(id, { value: 1n });
    await f.cashflow.pause();
    await expect(
      f.hub.depositToVault(id, { value: 1n }),
    ).to.be.revertedWithCustomError(f.cashflow, "EnforcedPause");
    expect((await f.hub.getVault(id)).totalBalance).to.equal(11n);
  });
  it("requires goal success or expiry both at request and execution", async () => {
    const f = await t1Fixture();
    const id = await f.create(3);
    await f.hub.depositToVault(id, { value: ethers.parseEther("5") });
    await expect(
      f.hub.connect(f.member).requestLargeWithdrawal(id, 1n, "Too early"),
    ).to.be.revertedWithCustomError(f.hub, "GoalNotReached");
    await time.increase(86401);
    await f.hub
      .connect(f.member)
      .requestLargeWithdrawal(
        id,
        ethers.parseEther("5"),
        "Expired goal, quorum settlement",
      );
    await f.hub.connect(f.g1).approveWithdrawal(1n);
    await expect(
      f.hub.connect(f.g2).approveWithdrawal(1n),
    ).to.changeEtherBalance(f.member, ethers.parseEther("5"));
  });
  it("rechecks goal condition after a competing request reduces its balance", async () => {
    const f = await t1Fixture();
    const id = await f.create(3);
    await f.hub.depositToVault(id, { value: ethers.parseEther("10") });
    for (let i = 0; i < 2; i++)
      await f.hub
        .connect(f.member)
        .requestLargeWithdrawal(id, ethers.parseEther("1"), "Goal purchase");
    await f.hub.connect(f.g1).approveWithdrawal(1n);
    await f.hub.connect(f.g2).approveWithdrawal(1n);
    await expect(
      f.hub.connect(f.g1).approveWithdrawal(2n),
    ).to.be.revertedWithCustomError(f.hub, "GoalNotReached");
  });
});

import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { readFileSync } from "node:fs";
import ts from "typescript";

// Kiểm thử tái hiện lỗi trên EVM cục bộ, KHÔNG phải acceptance chứng nhận an toàn.
// Khi sửa contract, đổi từng case sang kỳ vọng từ chối/invariant đúng tương ứng.
describe("Contract readiness audit: reproduced pre-upgrade defects", function () {
  async function fixture() {
    const [admin, guardian, beneficiary, outsider] = await ethers.getSigners();
    const messenger = await (
      await ethers.getContractFactory("MockTeleporterMessenger")
    ).deploy();
    const source = ethers.keccak256(ethers.toUtf8Bytes("Family-L1"));
    const yieldVault = await (
      await ethers.getContractFactory("FamilyYieldVault")
    ).deploy(messenger.target, source, ethers.ZeroAddress);
    const hub = await (
      await ethers.getContractFactory("FamilyHub")
    ).deploy(
      admin.address,
      messenger.target,
      ethers.keccak256(ethers.toUtf8Bytes("destination")),
      yieldVault.target,
    );
    await yieldVault.updateTeleporterConfig(
      messenger.target,
      source,
      hub.target,
    );
    return {
      admin,
      guardian,
      beneficiary,
      outsider,
      messenger,
      yieldVault,
      hub,
    };
  }
  it("AUD-01: deposit implicitly creates a vault without the configured guardians", async () => {
    const { hub, outsider } = await fixture();
    await hub.connect(outsider).depositToVault(1n, { value: 1n });
    const vault = await hub.getVault(1n);
    expect(vault.creator).to.equal(outsider.address);
    expect(vault.guardians.length).to.equal(0);
    expect(vault.requiredApprovals).to.equal(2n);
    expect(vault.isActive).to.equal(true);
  });
  it("AUD-02: native fastWithdraw bypasses the SHARED_GOAL policy", async () => {
    const { hub, admin, beneficiary } = await fixture();
    await hub.createAdvancedVault(
      "Goal",
      3,
      10000,
      ethers.parseEther("10"),
      1,
      [admin.address],
      [beneficiary.address],
      ethers.parseEther("100"),
      (await time.latest()) + 86400,
      0,
      0,
    );
    await hub.depositToVault(1n, { value: ethers.parseEther("10") });
    const before = await ethers.provider.getBalance(hub.target);
    await hub.connect(beneficiary).fastWithdraw(1n, ethers.parseEther("10"));
    expect(await ethers.provider.getBalance(hub.target)).to.equal(
      before - ethers.parseEther("10"),
    );
    expect((await hub.getVault(1n)).totalBalance).to.equal(0n);
  });
  it("AUD-03: token fastWithdraw bypasses a goal and the native withdrawal limit", async () => {
    const { hub, admin, beneficiary, messenger, yieldVault } = await fixture();
    const cashflow = await (
      await ethers.getContractFactory("VaultCashflow")
    ).deploy(
      admin.address,
      hub.target,
      messenger.target,
      ethers.ZeroHash,
      yieldVault.target,
    );
    await hub.setVaultCashflow(cashflow.target);
    await hub.createAdvancedVault(
      "Token goal",
      3,
      10000,
      0,
      1,
      [admin.address],
      [beneficiary.address],
      ethers.parseEther("100"),
      (await time.latest()) + 86400,
      0,
      0,
    );
    const token = await (
      await ethers.getContractFactory("MockERC20")
    ).deploy("Test Token", "TEST");
    const amount = ethers.parseEther("100");
    await token.approve(hub.target, amount);
    await hub.depositTokenToVault(1n, token.target, amount);
    await hub.connect(beneficiary).fastWithdrawToken(1n, token.target, amount);
    expect(await token.balanceOf(beneficiary.address)).to.equal(amount);
  });
  it("AUD-04: signed requests can spend pre-existing Forwarder funds with msg.value=0", async () => {
    const { admin, outsider } = await fixture();
    const forwarder = await (
      await ethers.getContractFactory("KinetixForwarder")
    ).deploy();
    await admin.sendTransaction({
      to: forwarder.target,
      value: ethers.parseEther("1"),
    });
    const req = {
      from: outsider.address,
      to: outsider.address,
      value: ethers.parseEther("1"),
      gas: 100000n,
      nonce: 0n,
      deadline: BigInt((await time.latest()) + 600),
      data: "0x",
    };
    const signature = await outsider.signTypedData(
      {
        name: "KinetixForwarder",
        version: "1",
        chainId: (await ethers.provider.getNetwork()).chainId,
        verifyingContract: String(forwarder.target),
      },
      {
        ForwardRequest: [
          { name: "from", type: "address" },
          { name: "to", type: "address" },
          { name: "value", type: "uint256" },
          { name: "gas", type: "uint256" },
          { name: "nonce", type: "uint256" },
          { name: "deadline", type: "uint256" },
          { name: "data", type: "bytes" },
        ],
      },
      req,
    );
    const before = await ethers.provider.getBalance(outsider.address);
    await forwarder.execute(req, signature);
    expect(await ethers.provider.getBalance(outsider.address)).to.equal(
      before + ethers.parseEther("1"),
    );
    expect(await ethers.provider.getBalance(forwarder.target)).to.equal(0n);
  });
  it("AUD-05: compounding creates unbacked principal when the yield reserve is empty", async () => {
    const { yieldVault, outsider } = await fixture();
    await yieldVault.depositPrincipal(1n, { value: ethers.parseEther("1") });
    await time.increase(365 * 86400);
    await yieldVault.connect(outsider).compoundYield(1n);
    expect(await yieldVault.yieldReservePool()).to.equal(0n);
    expect(await yieldVault.vaultPrincipals(1n)).to.be.greaterThan(
      await ethers.provider.getBalance(yieldVault.target),
    );
  });
  it("AUD-06: a small earlier deposit lets newly added principal accrue retroactive yield", async () => {
    const { yieldVault } = await fixture();
    await yieldVault.depositPrincipal(1n, { value: 1n });
    await time.increase(1000);
    await yieldVault.depositPrincipal(1n, { value: ethers.parseEther("100") });
    // Một block vừa nạp vốn mới chưa thể tạo lãi cho cả 1000 giây trước đó.
    expect(await yieldVault.calculateAccruedYield(1n)).to.be.greaterThan(
      ethers.parseEther("0.0002"),
    );
  });
  it("AUD-07: one withdrawal can pay the full amount locally and its deficit on the destination", async () => {
    const { hub, yieldVault, admin, beneficiary } = await fixture();
    await yieldVault.depositYieldReserve({ value: ethers.parseEther("100") });
    await hub.createCustomVault(
      "Shield",
      0,
      1000,
      ethers.parseEther("50"),
      1,
      [admin.address],
      [beneficiary.address],
    );
    await hub.depositToVault(1n, { value: ethers.parseEther("100") });
    expect(await yieldVault.vaultPrincipals(1n)).to.equal(
      ethers.parseEther("90"),
    );
    expect(await ethers.provider.getBalance(hub.target)).to.equal(
      ethers.parseEther("100"),
    );
    await hub
      .connect(beneficiary)
      .requestLargeWithdrawal(1n, ethers.parseEther("60"), "General");
    const before = await ethers.provider.getBalance(beneficiary.address);
    await hub.approveWithdrawal(1n);
    expect(await ethers.provider.getBalance(beneficiary.address)).to.equal(
      before + ethers.parseEther("110"),
    );
  });
  it("AUD-08: Cashflow's message is rejected when YieldVault authenticates only the Hub", async () => {
    const { hub, yieldVault, messenger, admin, beneficiary } = await fixture();
    const cashflow = await (
      await ethers.getContractFactory("VaultCashflow")
    ).deploy(
      admin.address,
      hub.target,
      messenger.target,
      ethers.ZeroHash,
      yieldVault.target,
    );
    await hub.setVaultCashflow(cashflow.target);
    await hub.createCustomVault(
      "Shield",
      0,
      1000,
      1n,
      1,
      [admin.address],
      [beneficiary.address],
    );
    await hub.depositToVault(1n, { value: ethers.parseEther("1") });
    expect((await cashflow.getVaultLedger(1n)).cChainPrincipal).to.equal(
      ethers.parseEther("0.9"),
    );
    expect(await yieldVault.vaultPrincipals(1n)).to.equal(0n);
  });
  it("AUD-09: duplicate guardians satisfy array threshold validation without distinct signers", async () => {
    const { hub, guardian, beneficiary } = await fixture();
    await hub.createCustomVault(
      "Duplicate quorum",
      0,
      10000,
      1n,
      2,
      [guardian.address, guardian.address],
      [beneficiary.address],
    );
    const vault = await hub.getVault(1n);
    expect(
      new Set(vault.guardians.map((address) => address.toLowerCase())).size,
    ).to.equal(1);
    expect(vault.requiredApprovals).to.equal(2n);
  });
  it("AUD-10: relayer accepts a client-selected Forwarder, target and sponsored value without a chain check", async () => {
    const previous = process.env.RELAYER_PRIVATE_KEY;
    process.env.RELAYER_PRIVATE_KEY = `0x${"11".repeat(32)}`;
    const captures: any[] = [];
    let chainReads = 0;
    try {
      const compiled = ts.transpileModule(
        readFileSync("backend/src/services/relayerService.ts", "utf8"),
        {
          compilerOptions: {
            module: ts.ModuleKind.CommonJS,
            target: ts.ScriptTarget.ES2022,
          },
        },
      ).outputText;
      const module = { exports: {} as any };
      const hash = `0x${"1".repeat(64)}`;
      new Function("require", "module", "exports", compiled)(
        (name: string) => {
          if (name === "viem")
            return {
              isAddress: (address: string) => /^0x[0-9a-f]{40}$/i.test(address),
              http: () => ({}),
              createWalletClient: () => ({
                writeContract: async (args: any) => {
                  captures.push(args);
                  return hash;
                },
              }),
              createPublicClient: () => ({
                readContract: async () => true,
                getChainId: async () => {
                  chainReads++;
                  return 1;
                },
                waitForTransactionReceipt: async () => ({
                  status: "success",
                  blockNumber: 1n,
                }),
              }),
            };
          if (name === "viem/accounts")
            return {
              privateKeyToAccount: () => ({ address: `0x${"f".repeat(40)}` }),
            };
          if (name.includes("chainService"))
            return { hubClient: () => ({ chainId: 43113 }) };
          if (name.includes("security"))
            return {
              assert: (
                condition: unknown,
                _status: number,
                message: string,
              ) => {
                if (!condition) throw new Error(message);
              },
            };
          return { KINETIX_FORWARDER_ABI: [] };
        },
        module,
        module.exports,
      );
      const oldRpc = process.env.HUB_RPC_URL;
      process.env.HUB_RPC_URL = "https://rpc.test.invalid";
      try {
        const untrusted = `0x${"b".repeat(40)}`;
        await module.exports.relayForwardRequest(untrusted, {
          from: `0x${"a".repeat(40)}`,
          to: `0x${"c".repeat(40)}`,
          value: ethers.parseEther("1").toString(),
          gas: "90000000",
          nonce: "0",
          deadline: "9999999999",
          data: "0x12345678",
          signature: "0x00",
        });
        expect(captures[0].address).to.equal(untrusted);
        expect(captures[0].value).to.equal(ethers.parseEther("1"));
        expect(chainReads).to.equal(0);
      } finally {
        if (oldRpc === undefined) delete process.env.HUB_RPC_URL;
        else process.env.HUB_RPC_URL = oldRpc;
      }
    } finally {
      if (previous === undefined) delete process.env.RELAYER_PRIVATE_KEY;
      else process.env.RELAYER_PRIVATE_KEY = previous;
    }
  });
  it("AUD-11: attaching Cashflow after a deposit hides the funded vault without migrating its assets", async () => {
    const { hub, admin, beneficiary, messenger, yieldVault } = await fixture();
    await hub.createCustomVault(
      "Existing capital",
      0,
      10000,
      1n,
      1,
      [admin.address],
      [beneficiary.address],
    );
    await hub.depositToVault(1n, { value: ethers.parseEther("1") });
    const cashflow = await (
      await ethers.getContractFactory("VaultCashflow")
    ).deploy(
      admin.address,
      hub.target,
      messenger.target,
      ethers.ZeroHash,
      yieldVault.target,
    );
    await hub.setVaultCashflow(cashflow.target);
    expect((await hub.getVault(1n)).totalBalance).to.equal(0n);
    expect(await ethers.provider.getBalance(hub.target)).to.equal(
      ethers.parseEther("1"),
    );
    expect(await ethers.provider.getBalance(cashflow.target)).to.equal(0n);
  });
  it("AUD-12: paying one vault's interest with an empty reserve consumes another vault's backing", async () => {
    const { yieldVault, beneficiary } = await fixture();
    await yieldVault.depositPrincipal(1n, { value: ethers.parseEther("1") });
    await time.increase(365 * 86400);
    await yieldVault.depositPrincipal(2n, { value: ethers.parseEther("1") });
    await yieldVault.processVaultWithdrawal(
      1n,
      beneficiary.address,
      ethers.parseEther("1.08"),
    );
    expect(await yieldVault.yieldReservePool()).to.equal(0n);
    expect(await ethers.provider.getBalance(yieldVault.target)).to.be.lessThan(
      await yieldVault.vaultPrincipals(2n),
    );
  });
  it("AUD-13: ROSCA still pays the old wallet after beneficiary recovery changes the permission mapping", async () => {
    const { hub, admin, beneficiary, outsider } = await fixture();
    await hub.createAdvancedVault(
      "Recovered ROSCA",
      2,
      10000,
      0n,
      1,
      [admin.address],
      [beneficiary.address],
      0n,
      0n,
      0n,
      ethers.parseEther("1"),
    );
    await hub.depositToVault(1n, { value: ethers.parseEther("1") });
    await hub.recoverMemberWallet(1n, beneficiary.address, outsider.address);
    expect(await hub.isVaultBeneficiary(1n, beneficiary.address)).to.equal(
      false,
    );
    expect(await hub.isVaultBeneficiary(1n, outsider.address)).to.equal(true);
    const before = await ethers.provider.getBalance(beneficiary.address);
    await hub.payoutRoscaRound(1n);
    expect(await ethers.provider.getBalance(beneficiary.address)).to.equal(
      before + ethers.parseEther("1"),
    );
  });
  it("AUD-14: one Guardian bypasses a SHIELD multisig through the unrestricted chore payout route", async () => {
    const { hub, admin, guardian, beneficiary } = await fixture();
    await hub.createCustomVault(
      "Two-person Shield",
      0,
      10000,
      0n,
      2,
      [admin.address, guardian.address],
      [beneficiary.address],
    );
    await hub.depositToVault(1n, { value: ethers.parseEther("10") });
    await hub
      .connect(guardian)
      .createChore(
        1n,
        "Wrong rule payout",
        ethers.parseEther("10"),
        guardian.address,
      );
    await hub.connect(guardian).claimChoreCompleted(1n);
    await hub.connect(guardian).verifyAndRewardChore(1n);
    expect(await hub.requestCounter()).to.equal(0n);
    expect((await hub.getVault(1n)).requiredApprovals).to.equal(2n);
    expect((await hub.getVault(1n)).totalBalance).to.equal(0n);
  });
});

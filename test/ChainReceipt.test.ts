import { expect } from "chai";
import { ethers, network } from "hardhat";
import { createServer, Server } from "http";
import { AddressInfo } from "net";
import { verifiedEvent, readHub } from "../backend/src/services/chainService";
import { memberVaultPolicy } from "../backend/src/services/vaultPolicyService";
import type { AuthContext } from "../backend/src/auth/service";
import { forwardTypes } from "./support/t1";

describe("Backend receipt verification against the local EVM", function () {
  this.timeout(15000);
  let rpc: Server;
  let hub: any;
  let admin: any;
  let outsider: any;
  let hash: string;
  let forwarder: any;
  let oldRpc: string | undefined;
  let oldChain: string | undefined;
  const identity = (address: string) =>
    ({ wallet: { address: address.toLowerCase() } }) as AuthContext;
  const rejects = async (action: () => Promise<unknown>, status: number) => {
    let error: any;
    try {
      await action();
    } catch (caught) {
      error = caught;
    }
    expect(error?.status).to.equal(status);
  };
  before(async () => {
    [admin, outsider] = await ethers.getSigners();
    const teleporter = await (
      await ethers.getContractFactory("MockTeleporterMessenger")
    ).deploy();
    const yieldVault = await (
      await ethers.getContractFactory("FamilyYieldVault")
    ).deploy(
      await teleporter.getAddress(),
      ethers.ZeroHash,
      ethers.ZeroAddress,
    );
    hub = await (
      await ethers.getContractFactory("FamilyHub")
    ).deploy(
      admin.address,
      ethers.ZeroAddress,
      ethers.ZeroHash,
      ethers.ZeroAddress,
    );
    await hub.waitForDeployment();
    forwarder = await (
      await ethers.getContractFactory("KinetixForwarder")
    ).deploy();
    await hub.setTrustedForwarder(forwarder.target);
    await hub.setAllowlistStatus(outsider.address, true);
    const tx = await hub.createCustomVault(
      "Receipt verified family",
      0,
      10000,
      ethers.parseEther("1"),
      1,
      [admin.address],
      [outsider.address],
    );
    hash = tx.hash;
    await tx.wait();
    rpc = createServer(async (req, res) => {
      let body = "";
      for await (const chunk of req) body += chunk;
      const request = JSON.parse(body);
      const handle = async (item: any) => {
        try {
          return {
            jsonrpc: "2.0",
            id: item.id,
            result: await network.provider.send(item.method, item.params || []),
          };
        } catch (error: any) {
          return {
            jsonrpc: "2.0",
            id: item.id,
            error: {
              code: error.code || -32000,
              message: "Local EVM request rejected",
            },
          };
        }
      };
      res.setHeader("Content-Type", "application/json");
      res.end(
        JSON.stringify(
          Array.isArray(request)
            ? await Promise.all(request.map(handle))
            : await handle(request),
        ),
      );
    });
    await new Promise<void>((resolve) => rpc.listen(0, "127.0.0.1", resolve));
    oldRpc = process.env.HUB_RPC_URL;
    oldChain = process.env.HUB_CHAIN_ID;
    process.env.HUB_RPC_URL = `http://127.0.0.1:${(rpc.address() as AddressInfo).port}`;
    process.env.HUB_CHAIN_ID = "31337";
  });
  after(async () => {
    if (oldRpc === undefined) delete process.env.HUB_RPC_URL;
    else process.env.HUB_RPC_URL = oldRpc;
    if (oldChain === undefined) delete process.env.HUB_CHAIN_ID;
    else process.env.HUB_CHAIN_ID = oldChain;
    if (rpc) await new Promise<void>((resolve) => rpc.close(() => resolve()));
  });
  it("accepts a mined event only from the configured hub, chain and authenticated wallet", async () => {
    const result = await verifiedEvent(
      identity(admin.address),
      await hub.getAddress(),
      hash,
      "VaultCreated",
      (args) =>
        args.creator.toLowerCase() === admin.address.toLowerCase() &&
        args.vaultId === 1n,
    );
    expect(result.receipt.status).to.equal("success");
    expect(result.event.name).to.equal("Receipt verified family");
    const vault: any = await readHub(await hub.getAddress(), "getVault", [1n]);
    expect(vault.beneficiaries[0].toLowerCase()).to.equal(
      outsider.address.toLowerCase(),
    );
  });
  it("rejects wrong sender, contract, expected event, vault and RPC chain", async () => {
    await rejects(
      () =>
        verifiedEvent(
          identity(outsider.address),
          hub.target,
          hash,
          "VaultCreated",
          () => true,
        ),
      403,
    );
    await rejects(
      () =>
        verifiedEvent(
          identity(admin.address),
          outsider.address,
          hash,
          "VaultCreated",
          () => true,
        ),
      403,
    );
    await rejects(
      () =>
        verifiedEvent(
          identity(admin.address),
          hub.target,
          hash,
          "WithdrawalRequested",
          () => true,
        ),
      400,
    );
    await rejects(
      () =>
        verifiedEvent(
          identity(admin.address),
          hub.target,
          hash,
          "VaultCreated",
          (args) => args.vaultId === 2n,
        ),
      400,
    );
    process.env.HUB_CHAIN_ID = "43113";
    await rejects(
      () =>
        verifiedEvent(
          identity(admin.address),
          hub.target,
          hash,
          "VaultCreated",
          () => true,
        ),
      503,
    );
    process.env.HUB_CHAIN_ID = "31337";
  });
  it("binds a forwarded creation receipt to the actual EIP712 signer rather than the broadcaster", async () => {
    const block = await ethers.provider.getBlock("latest");
    const message = {
      from: admin.address,
      to: String(hub.target),
      value: 0n,
      gas: 2000000n,
      nonce: await forwarder.nonces(admin.address),
      deadline: BigInt(block!.timestamp + 600),
      data: hub.interface.encodeFunctionData("createCustomVault", [
        "Forwarded creation",
        0,
        10000,
        1n,
        1,
        [admin.address],
        [outsider.address],
      ]),
    };
    const signature = await admin.signTypedData(
      {
        name: "KinetixForwarder",
        version: "1",
        chainId: 31337,
        verifyingContract: String(forwarder.target),
      },
      forwardTypes,
      message,
    );
    const { nonce, ...request } = message;
    const transaction = await forwarder
      .connect(outsider)
      .execute({ ...request, signature });
    await transaction.wait();
    const verified = await verifiedEvent(
      identity(admin.address),
      String(hub.target),
      transaction.hash,
      "VaultCreated",
      (args) => args.creator.toLowerCase() === admin.address.toLowerCase(),
    );
    expect(verified.receipt.from.toLowerCase()).to.equal(
      outsider.address.toLowerCase(),
    );
    expect(verified.event.name).to.equal("Forwarded creation");
    await rejects(
      () =>
        verifiedEvent(
          identity(outsider.address),
          String(hub.target),
          transaction.hash,
          "VaultCreated",
          () => true,
        ),
      403,
    );
  });
  it("verifies operator provisioning by event and live contract state without requiring the member to be the sender", async () => {
    const tx = await hub.setAllowlistStatus(outsider.address, true);
    await tx.wait();
    const result = await verifiedEvent(
      identity(outsider.address),
      hub.target,
      tx.hash,
      "AllowlistStatusChanged",
      (args) =>
        args.account.toLowerCase() === outsider.address.toLowerCase() &&
        args.isAllowed,
      false,
    );
    expect(result.receipt.from.toLowerCase()).to.equal(
      admin.address.toLowerCase(),
    );
    expect(
      await readHub(hub.target, "isAllowlisted", [outsider.address]),
    ).to.equal(true);
  });
  it("reads actual beneficiary, limit, liquidity, daily remaining and pause state for the review screen", async () => {
    await (
      await hub.depositToVault(1n, { value: ethers.parseEther("2") })
    ).wait();
    const initial = await memberVaultPolicy(hub.target, 1n, outsider.address);
    expect(initial.isBeneficiary).to.equal(true);
    expect(initial.availableNow).to.equal("1");
    expect(initial.requiredApprovals).to.equal(1);
    await (
      await hub.connect(outsider).fastWithdraw(1n, ethers.parseEther("0.25"))
    ).wait();
    const remaining = await memberVaultPolicy(hub.target, 1n, outsider.address);
    expect(remaining.availableNow).to.equal("1");
    expect(remaining.remainingToday).to.equal("1.75");
    const unrelated = await memberVaultPolicy(hub.target, 1n, admin.address);
    expect(unrelated.isBeneficiary).to.equal(false);
    expect(unrelated.availableNow).to.equal("0");
    await (await hub.pause()).wait();
    const paused = await memberVaultPolicy(hub.target, 1n, outsider.address);
    expect(paused.isActive).to.equal(false);
    expect(paused.availableNow).to.equal("0");
    await (await hub.unpause()).wait();
  });
});

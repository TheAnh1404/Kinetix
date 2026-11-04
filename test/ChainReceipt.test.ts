import { expect } from "chai";
import { ethers, network } from "hardhat";
import { createServer, Server } from "http";
import { AddressInfo } from "net";
import { verifiedEvent, readHub } from "../backend/src/services/chainService";
import type { AuthContext } from "../backend/src/auth/service";

describe("Backend receipt verification against the local EVM", function () {
  this.timeout(15000);
  let rpc: Server;
  let hub: any;
  let admin: any;
  let outsider: any;
  let hash: string;
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
      await teleporter.getAddress(),
      ethers.keccak256(ethers.toUtf8Bytes("receipt-test-chain")),
      await yieldVault.getAddress(),
    );
    await hub.waitForDeployment();
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
});

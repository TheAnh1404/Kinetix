import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-toolbox/network-helpers";

export async function t1Fixture(modular = true) {
  const [admin, g1, g2, member, other, replacement] = await ethers.getSigners();
  const hub = await (
    await ethers.getContractFactory("FamilyHub")
  ).deploy(
    admin.address,
    ethers.ZeroAddress,
    ethers.ZeroHash,
    ethers.ZeroAddress,
  );
  const forwarder = await (
    await ethers.getContractFactory("KinetixForwarder")
  ).deploy();
  await hub.setTrustedForwarder(forwarder.target);
  const cashflow = await (
    await ethers.getContractFactory("VaultCashflow")
  ).deploy(
    admin.address,
    hub.target,
    ethers.ZeroAddress,
    ethers.ZeroHash,
    ethers.ZeroAddress,
  );
  if (modular) await hub.setVaultCashflow(cashflow.target);
  const yieldVault = await (
    await ethers.getContractFactory("FamilyYieldVault")
  ).deploy(ethers.ZeroAddress, ethers.ZeroHash, ethers.ZeroAddress);
  const create = async (
    rule = 0,
    quorum = 2,
    beneficiaries = [member.address],
  ) => {
    for (const address of [g1.address, g2.address, ...beneficiaries])
      await hub.setAllowlistStatus(address, true);
    await hub.createAdvancedVault(
      "T1 vault",
      rule,
      10000,
      rule === 0 ? ethers.parseEther("1") : 0n,
      quorum,
      [g1.address, g2.address],
      beneficiaries,
      rule === 3 ? ethers.parseEther("10") : 0n,
      rule === 3 ? (await time.latest()) + 86400 : 0,
      rule === 2 ? 60 : 0,
      rule === 2 ? ethers.parseEther("1") : 0n,
    );
    return hub.vaultCounter();
  };
  return {
    hub,
    cashflow,
    forwarder,
    yieldVault,
    admin,
    g1,
    g2,
    member,
    other,
    replacement,
    create,
  };
}

export const forwardTypes = {
  ForwardRequest: [
    { name: "from", type: "address" },
    { name: "to", type: "address" },
    { name: "value", type: "uint256" },
    { name: "gas", type: "uint256" },
    { name: "nonce", type: "uint256" },
    { name: "deadline", type: "uint48" },
    { name: "data", type: "bytes" },
  ],
};

export async function signedForward(
  f: Awaited<ReturnType<typeof t1Fixture>>,
  data: string,
  overrides: Record<string, any> = {},
) {
  const message = {
    from: f.member.address,
    to: String(f.hub.target),
    value: 0n,
    gas: 500000n,
    nonce: await f.forwarder.nonces(f.member.address),
    deadline: BigInt((await time.latest()) + 600),
    data,
    ...overrides,
  };
  const signature = await f.member.signTypedData(
    {
      name: "KinetixForwarder",
      version: "1",
      chainId: (await ethers.provider.getNetwork()).chainId,
      verifyingContract: String(f.forwarder.target),
    },
    forwardTypes,
    message,
  );
  const { nonce, ...request } = message;
  return { ...request, signature };
}

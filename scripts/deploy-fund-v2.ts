import { ethers, network } from "hardhat";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

/** Triển khai factory V2 riêng; không ghi đè manifest hay kích hoạt adapter T1/V1. */
async function main() {
  const chain = await ethers.provider.getNetwork();
  if (![31337n, 43113n].includes(chain.chainId)) {
    throw new Error(
      "V2 deployment is restricted to local Hardhat and Avalanche Fuji.",
    );
  }
  const [deployer] = await ethers.getSigners();
  if (!deployer) throw new Error("No deployment signer configured.");
  const factory = await (
    await ethers.getContractFactory("KinetixFundFactoryV2", deployer)
  ).deploy();
  const deploymentTx = factory.deploymentTransaction();
  if (!deploymentTx) throw new Error("Missing deployment transaction.");
  const receipt = await deploymentTx.wait(network.name === "fuji" ? 3 : 1);
  if (!receipt || receipt.status !== 1)
    throw new Error("Deployment did not succeed.");
  const address = await factory.getAddress();
  const implementation = await factory.implementation();
  const factoryCode = await ethers.provider.getCode(address);
  const implementationCode = await ethers.provider.getCode(implementation);
  if (factoryCode === "0x" || implementationCode === "0x")
    throw new Error("Runtime code missing.");
  const evidence = {
    version: 2,
    chainId: chain.chainId.toString(),
    network: network.name,
    factory: address,
    implementation,
    deployer: deployer.address,
    transactionHash: receipt.hash,
    blockNumber: receipt.blockNumber,
    blockHash: receipt.blockHash,
    factoryRuntimeHash: ethers.keccak256(factoryCode),
    implementationRuntimeHash: ethers.keccak256(implementationCode),
    enabled: false,
    verification: "receipt-and-code-presence-only",
    asset: "native",
    features: { erc20: false, yield: false, crossChain: false, relayer: false },
    note: "Not activation evidence. Independently verify source/runtime identity and canonical finality before integration.",
  };
  const directory = resolve("deployments");
  mkdirSync(directory, { recursive: true });
  const output = resolve(
    directory,
    `fund-v2-${network.name}-${receipt.hash}.json`,
  );
  writeFileSync(output, JSON.stringify(evidence, null, 2) + "\n");
  console.log(
    `V2 factory: ${address}\nImplementation: ${implementation}\nDisabled deployment record: ${output}`,
  );
}

main().catch((error: unknown) => {
  console.error(
    error instanceof Error ? error.message : "V2 deployment failed.",
  );
  process.exitCode = 1;
});

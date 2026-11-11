import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import { resolve } from "node:path";
import { getAddress, ZeroAddress, ZeroHash } from "ethers";
import { DeploymentContract } from "../../shared/deploymentManifest";

export interface ChainDeployment {
  chainId: number;
  sourceHash: string;
  admin: string;
  contracts: Record<string, DeploymentContract>;
  transactions: Record<string, string>;
  status: string;
}
export const deploymentDirectory = () =>
  resolve(process.env.KINETIX_DEPLOYMENT_DIRECTORY || "deployments/dual-chain");
export function requireAddress(value: string | undefined, label: string) {
  if (!value || getAddress(value) === ZeroAddress)
    throw new Error(`INVALID_ADDRESS:${label}`);
  return getAddress(value);
}
export function requireBlockchainId(value: string | undefined, label: string) {
  if (
    !value ||
    !/^0x[0-9a-f]{64}$/i.test(value) ||
    value.toLowerCase() === ZeroHash
  )
    throw new Error(
      `INVALID_BLOCKCHAIN_ID:${label}:expected-bytes32-not-EVM-chain-id`,
    );
  return value;
}
export function readChainDeployment(
  chainId: number,
): ChainDeployment | undefined {
  const path = resolve(deploymentDirectory(), `${chainId}.json`);
  return existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : undefined;
}
export function saveChainDeployment(deployment: ChainDeployment) {
  const directory = deploymentDirectory();
  mkdirSync(directory, { recursive: true });
  const path = resolve(directory, `${deployment.chainId}.json`);
  writeFileSync(`${path}.tmp`, JSON.stringify(deployment, null, 2) + "\n");
  renameSync(`${path}.tmp`, path);
  // Chỉ xuất địa chỉ công khai, không ghi key hoặc sửa manifest T1 đang hoạt động.
  const fuji = readChainDeployment(43113);
  const family =
    deployment.chainId === 43113
      ? readChainDeployment(Number(process.env.FAMILY_L1_CHAIN_ID || "99999"))
      : deployment;
  const values = {
    FAMILY_YIELD_VAULT_ADDRESS: fuji?.contracts.yieldVault?.address,
    FAMILY_HUB_ADDRESS: family?.contracts.hub?.address,
    VAULT_CASHFLOW_ADDRESS: family?.contracts.cashflow?.address,
    KINETIX_FORWARDER_ADDRESS: family?.contracts.forwarder?.address,
  };
  writeFileSync(
    resolve(directory, "addresses.env"),
    Object.entries(values)
      .filter(([, value]) => value)
      .map(([key, value]) => `${key}=${value}`)
      .join("\n") + "\n",
  );
}

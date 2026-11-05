import { isAddress, zeroAddress } from "viem";

export interface DeploymentContract {
  address: `0x${string}`;
  transactionHash: `0x${string}`;
  blockNumber: string;
  runtimeCodeHash: `0x${string}`;
}
export interface DeploymentManifest {
  schemaVersion: number;
  version: string;
  mode: string;
  status: string;
  enabled: boolean;
  chainId: number;
  avalancheBlockchainId: string | null;
  rpcUrl: string;
  explorerUrl: string;
  deploymentBlock: string | null;
  compiler: string;
  evmVersion: string;
  sourceHash: string | null;
  admin: string | null;
  features: {
    native: boolean;
    erc20: boolean;
    crossChain: boolean;
    yield: boolean;
    relayer: boolean;
  };
  contracts: {
    hub: DeploymentContract | null;
    cashflow: DeploymentContract | null;
    forwarder: DeploymentContract | null;
    yieldVault: DeploymentContract | null;
  };
  wiring: string[];
}

/** Manifest công khai không chứa credential hoặc địa chỉ fixture dự phòng. */
export function validateDeployment(value: unknown): DeploymentManifest {
  const m = value as DeploymentManifest;
  if (
    !m ||
    m.schemaVersion !== 1 ||
    m.version !== "2.0.0-t1" ||
    m.chainId !== 43113 ||
    m.mode !== "single-chain"
  )
    throw new Error("DEPLOYMENT_MANIFEST_INVALID");
  for (const url of [m.rpcUrl, m.explorerUrl]) {
    const parsed = new URL(url);
    if (
      parsed.protocol !== "https:" ||
      parsed.username ||
      parsed.password ||
      parsed.search ||
      parsed.hash ||
      parsed.hostname === "localhost" ||
      /^[\d.]+$/.test(parsed.hostname)
    )
      throw new Error("DEPLOYMENT_PUBLIC_URL_INVALID");
  }
  if (
    !m.features?.native ||
    m.features.erc20 ||
    m.features.crossChain ||
    m.features.yield ||
    m.features.relayer ||
    m.contracts?.yieldVault
  )
    throw new Error("T1_FEATURE_POLICY_INVALID");
  if (m.enabled) {
    if (
      m.status !== "verified" ||
      !m.deploymentBlock ||
      !/^\d+$/.test(m.deploymentBlock) ||
      !/^0x[0-9a-f]{64}$/i.test(m.sourceHash || "") ||
      !isAddress(m.admin || "") ||
      m.admin === zeroAddress ||
      m.wiring.length !== 2
    )
      throw new Error("DEPLOYMENT_EVIDENCE_MISSING");
    const addresses = new Set<string>();
    for (const item of [
      m.contracts.hub,
      m.contracts.cashflow,
      m.contracts.forwarder,
    ]) {
      if (
        !item ||
        !isAddress(item.address) ||
        item.address === zeroAddress ||
        !/^0x[0-9a-f]{64}$/i.test(item.transactionHash) ||
        !/^0x[0-9a-f]{64}$/i.test(item.runtimeCodeHash) ||
        !/^\d+$/.test(item.blockNumber)
      )
        throw new Error("DEPLOYMENT_EVIDENCE_MISSING");
      addresses.add(item.address.toLowerCase());
    }
    if (
      addresses.size !== 3 ||
      m.wiring.some((hash) => !/^0x[0-9a-f]{64}$/i.test(hash))
    )
      throw new Error("DEPLOYMENT_EVIDENCE_INVALID");
  }
  return m;
}

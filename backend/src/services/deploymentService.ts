import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createPublicClient, http, keccak256, parseAbi } from "viem";
import { validateDeployment } from "../../../shared/deploymentManifest";
import { assert } from "../auth/security";

export function deploymentManifest() {
  try {
    return validateDeployment(
      JSON.parse(
        readFileSync(
          resolve(process.env.DEPLOYMENT_MANIFEST || "shared/deployment.json"),
          "utf8",
        ),
      ),
    );
  } catch {
    assert(
      false,
      503,
      "Manifest triển khai không hợp lệ.",
      "DEPLOYMENT_MANIFEST_INVALID",
    );
    throw new Error("unreachable");
  }
}

/** Danh tính provisioning giữ riêng từng deployment; request legacy không tự được nâng quyền. */
export function provisioningIdentity() {
  const manifest = deploymentManifest();
  const hub = manifest.enabled ? manifest.contracts.hub!.address.toLowerCase() : null;
  return { chainId: manifest.chainId, hub, deploymentRef: `${manifest.version}:${hub || "unconfigured"}`, status: "PENDING" };
}

/** Kiểm bằng chứng RPC thật trước write. Không coi địa chỉ đã cấu hình là verified. */
export async function verifiedDeployment(hub?: string | null) {
  const manifest = deploymentManifest();
  assert(
    manifest.enabled && manifest.status === "verified",
    503,
    "Deployment T1 chưa được triển khai và xác minh.",
    "DEPLOYMENT_NOT_ENABLED",
  );
  const expected = manifest.contracts.hub!;
  assert(
    !hub || hub.toLowerCase() === expected.address.toLowerCase(),
    409,
    "Không gian đang gắn với deployment khác; cần đối soát bằng receipt.",
    "DEPLOYMENT_HUB_MISMATCH",
  );
  const configuredChain = process.env.HUB_CHAIN_ID;
  const configuredHub = process.env.FAMILY_HUB_ADDRESS;
  assert(
    (!configuredChain || Number(configuredChain) === manifest.chainId) &&
      (!configuredHub ||
        configuredHub.toLowerCase() === expected.address.toLowerCase()),
    503,
    "Cấu hình môi trường khác manifest đang bật.",
    "DEPLOYMENT_CONFIG_MISMATCH",
  );
  const client = createPublicClient({
    transport: http(process.env.HUB_RPC_URL || manifest.rpcUrl, {
      timeout: 8000,
      retryCount: 0,
    }),
  });
  try {
    assert(
      (await client.getChainId()) === manifest.chainId,
      503,
      "RPC đang ở mạng khác.",
      "RPC_CHAIN_MISMATCH",
    );
    const finalized = await client.getBlock({ blockTag: "finalized" });
    for (const item of [
      manifest.contracts.hub!,
      manifest.contracts.cashflow!,
      manifest.contracts.forwarder!,
    ]) {
      const [code, receipt] = await Promise.all([
        client.getBytecode({ address: item.address }),
        client.getTransactionReceipt({ hash: item.transactionHash }),
      ]);
      assert(
        code &&
          keccak256(code) === item.runtimeCodeHash &&
          receipt.status === "success" &&
          receipt.contractAddress?.toLowerCase() ===
            item.address.toLowerCase() &&
          receipt.blockNumber === BigInt(item.blockNumber),
        503,
        "Bytecode hoặc receipt deployment không khớp manifest.",
        "DEPLOYMENT_CODE_MISMATCH",
      );
      assert(
        finalized.number !== null && receipt.blockNumber <= finalized.number,
        503,
        "Receipt deployment chưa finalized.",
        "DEPLOYMENT_NOT_FINALIZED",
      );
    }
    const hubAbi = parseAbi([
      "function deploymentVersion() view returns (string)",
      "function familyAdmin() view returns (address)",
      "function vaultCashflow() view returns (address)",
      "function trustedForwarder() view returns (address)",
      "function crossChainEnabled() view returns (bool)",
      "function yieldEnabled() view returns (bool)",
    ]);
    const read = (name: any) =>
      client.readContract({
        address: expected.address,
        abi: hubAbi,
        functionName: name,
      });
    const [
      version,
      admin,
      cashflow,
      forwarder,
      crossChain,
      yieldEnabled,
      controller,
    ] = await Promise.all([
      read("deploymentVersion"),
      read("familyAdmin"),
      read("vaultCashflow"),
      read("trustedForwarder"),
      read("crossChainEnabled"),
      read("yieldEnabled"),
      client.readContract({
        address: manifest.contracts.cashflow!.address,
        abi: parseAbi(["function controller() view returns (address)"]),
        functionName: "controller",
      }),
    ]);
    assert(
      version === manifest.version &&
        String(admin).toLowerCase() === manifest.admin!.toLowerCase() &&
        String(cashflow).toLowerCase() ===
          manifest.contracts.cashflow!.address.toLowerCase() &&
        String(forwarder).toLowerCase() ===
          manifest.contracts.forwarder!.address.toLowerCase() &&
        controller.toLowerCase() === expected.address.toLowerCase() &&
        crossChain === false &&
        yieldEnabled === false,
      503,
      "Wiring/quyền deployment chưa hợp lệ.",
      "DEPLOYMENT_WIRING_MISMATCH",
    );
    for (const hash of manifest.wiring) {
      const receipt = await client.getTransactionReceipt({
        hash: hash as `0x${string}`,
      });
      assert(
        receipt.status === "success" &&
          receipt.to?.toLowerCase() === expected.address.toLowerCase() &&
          finalized.number !== null &&
          receipt.blockNumber <= finalized.number,
        503,
        "Receipt wiring không hợp lệ.",
        "DEPLOYMENT_WIRING_MISMATCH",
      );
    }
  } catch (error: any) {
    if (error?.status) throw error;
    assert(
      false,
      503,
      "Không thể xác minh deployment qua RPC.",
      "RPC_UNAVAILABLE",
    );
  }
  return { manifest, client, chainId: manifest.chainId };
}

import "dotenv/config";
import { readFileSync, writeFileSync, renameSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { createHash } from "node:crypto";
import { validateDeployment } from "../shared/deploymentManifest";
import { verifiedDeployment } from "../backend/src/services/deploymentService";
import { sourceIdentity, expectedTransaction } from "../backend/src/services/coreDeploymentService";

async function main() {
  const candidate = process.argv[2];
  if (!candidate) throw new Error("CANDIDATE_MANIFEST_PATH_REQUIRED");
  const file = resolve(candidate);
  const manifest = validateDeployment(JSON.parse(readFileSync(file, "utf8")));
  const info = JSON.parse(readFileSync(resolve(dirname(file), "journal.json"), "utf8"));
  if (info.sourceHash !== manifest.sourceHash || info.chainId !== 43113) throw new Error("CANDIDATE_JOURNAL_MISMATCH");
  if (sourceIdentity() !== manifest.sourceHash) throw new Error("CANDIDATE_BUILD_MISMATCH");
  process.env.DEPLOYMENT_MANIFEST = file;
  // Existing environment is updated only after the candidate independently passes RPC verification.
  delete process.env.FAMILY_HUB_ADDRESS;
  delete process.env.HUB_CHAIN_ID;
  delete process.env.HUB_RPC_URL;
  const { client } = await verifiedDeployment();
  for (const key of ["hub", "cashflow", "forwarder", "cashflowWiring", "forwarderWiring"] as const) {
    const expected = expectedTransaction(key, info, manifest.admin!);
    const tx = await client.getTransaction({ hash: info.transactions[key] });
    if (tx.from.toLowerCase() !== manifest.admin!.toLowerCase() || (tx.to?.toLowerCase() || null) !== (expected.to?.toLowerCase() || null) || tx.input.toLowerCase() !== expected.data.toLowerCase() || tx.value !== 0n) throw new Error("CANDIDATE_INPUT_MISMATCH");
  }
  const finalized = await client.getBlock({ blockTag: "finalized" });
  const path = resolve("shared/deployment.json");
  writeFileSync(`${path}.tmp`, JSON.stringify(manifest, null, 2) + "\n");
  renameSync(`${path}.tmp`, path);
  const updateEnv = (target: string, values: Record<string, string>) => {
    let content: string;
    try { content = readFileSync(target, "utf8"); } catch { content = ""; }
    for (const [key, value] of Object.entries(values)) {
      const line = `${key}=${value}`;
      const regex = new RegExp(`^${key}=.*$`, "m");
      content = regex.test(content) ? content.replace(regex, line) : `${content.trimEnd()}\n${line}\n`;
    }
    writeFileSync(target, content);
  };
  updateEnv(resolve(".env"), { HUB_CHAIN_ID: "43113", HUB_RPC_URL: manifest.rpcUrl, FAMILY_HUB_ADDRESS: manifest.contracts.hub!.address });
  updateEnv(resolve("frontend/.env.local"), { NEXT_PUBLIC_HUB_CHAIN_ID: "43113", NEXT_PUBLIC_FAMILY_HUB_ADDRESS: manifest.contracts.hub!.address });
  console.log(JSON.stringify({ status: "ACTIVATED", chainId: 43113, hub: manifest.contracts.hub!.address, checkedAtBlock: finalized.number!.toString(), manifestSha256: createHash("sha256").update(readFileSync(path)).digest("hex") }));
  const { pool } = await import("../backend/src/db");
  await pool.end();
}
main().catch((error) => { console.error("Activation stopped:", error?.code || error?.message || "UNKNOWN"); process.exitCode = 1; });

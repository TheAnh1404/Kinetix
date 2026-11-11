import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

// Đồng bộ mọi ABI đang được ứng dụng dùng, giữ cả thế hệ Vault V1.
const contracts = [
  ["FAMILY_HUB_ABI", "FamilyHub.sol/FamilyHub"],
  ["FAMILY_YIELD_VAULT_ABI", "FamilyYieldVault.sol/FamilyYieldVault"],
  [
    "TELEPORTER_MESSENGER_ABI",
    "interfaces/ITeleporterMessenger.sol/ITeleporterMessenger",
  ],
  ["VAULT_CASHFLOW_ABI", "VaultCashflow.sol/VaultCashflow"],
  ["KINETIX_FORWARDER_ABI", "KinetixForwarder.sol/KinetixForwarder"],
  ["KINETIX_VAULT_V1_ABI", "KinetixVaultV1.sol/KinetixVaultV1"],
  [
    "KINETIX_VAULT_FACTORY_V1_ABI",
    "KinetixVaultFactoryV1.sol/KinetixVaultFactoryV1",
  ],
];
for (const [file, constant] of [
  ["frontend/src/contracts/abis.ts", " as const"],
  ["shared/abis.ts", ""],
]) {
  const exports = contracts.map(([name, artifact]) => {
    const { abi } = JSON.parse(
      readFileSync(resolve("artifacts/contracts", `${artifact}.json`), "utf8"),
    );
    return `export const ${name} = ${JSON.stringify(abi, null, 2)}${constant};`;
  });
  writeFileSync(
    resolve(file),
    "/** ABI đồng bộ từ artifacts Solidity; chạy scripts/export-abis.ts sau compile. */\n\n" +
      exports.join("\n\n") +
      "\n",
  );
}
console.log("Updated frontend and shared contract ABIs.");

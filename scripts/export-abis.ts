import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

// Đồng bộ mọi ABI đang được ứng dụng dùng, bao gồm KinetixFundFactoryV2, KinetixFundV2 và Vault V1.
const contracts = [
  ["FAMILY_HUB_ABI", "FamilyHub.sol/FamilyHub", "FamilyHub"],
  ["FAMILY_YIELD_VAULT_ABI", "FamilyYieldVault.sol/FamilyYieldVault", "FamilyYieldVault"],
  [
    "TELEPORTER_MESSENGER_ABI",
    "interfaces/ITeleporterMessenger.sol/ITeleporterMessenger",
    "ITeleporterMessenger",
  ],
  ["VAULT_CASHFLOW_ABI", "VaultCashflow.sol/VaultCashflow", "VaultCashflow"],
  ["KINETIX_FORWARDER_ABI", "KinetixForwarder.sol/KinetixForwarder", "KinetixForwarder"],
  ["KINETIX_VAULT_V1_ABI", "KinetixVaultV1.sol/KinetixVaultV1", "KinetixVaultV1"],
  [
    "KINETIX_VAULT_FACTORY_V1_ABI",
    "KinetixVaultFactoryV1.sol/KinetixVaultFactoryV1",
    "KinetixVaultFactoryV1",
  ],
  ["KINETIX_FUND_V2_ABI", "KinetixFundV2.sol/KinetixFundV2", "KinetixFundV2"],
  [
    "KINETIX_FUND_FACTORY_V2_ABI",
    "KinetixFundFactoryV2.sol/KinetixFundFactoryV2",
    "KinetixFundFactoryV2",
  ],
  [
    "IKINETIX_FUND_V2_ABI",
    "interfaces/IKinetixFundV2.sol/IKinetixFundV2",
    "IKinetixFundV2",
  ],
];

// Đảm bảo các thư mục đích tồn tại
mkdirSync(resolve("shared/abis"), { recursive: true });
mkdirSync(resolve("frontend/src/contracts"), { recursive: true });

// 1. Xuất file TypeScript abis.ts cho frontend và shared
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

// 2. Xuất file JSON cho từng contract vào shared/abis/ và frontend/src/contracts/
for (const [_name, artifact, filename] of contracts) {
  const artifactPath = resolve("artifacts/contracts", `${artifact}.json`);
  const { abi } = JSON.parse(readFileSync(artifactPath, "utf8"));
  const jsonContent = JSON.stringify(abi, null, 2) + "\n";

  writeFileSync(resolve("shared/abis", `${filename}.json`), jsonContent);
  writeFileSync(resolve("frontend/src/contracts", `${filename}.json`), jsonContent);
}

// 3. Tạo shared/abis/index.ts re-export các ABI
const indexTs = `/**
 * Re-export tất cả ABIs cho shared/abis
 */
export * from "../abis";
`;
writeFileSync(resolve("shared/abis/index.ts"), indexTs);

console.log("Updated frontend and shared contract ABIs (ts and json formats).");

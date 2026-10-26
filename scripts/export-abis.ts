import * as fs from "fs";
import * as path from "path";

const familyHubArtifact = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, "../artifacts/contracts/FamilyHub.sol/FamilyHub.json"), "utf8")
);

const familyYieldVaultArtifact = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, "../artifacts/contracts/FamilyYieldVault.sol/FamilyYieldVault.json"), "utf8")
);

const teleporterArtifact = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, "../artifacts/contracts/interfaces/ITeleporterMessenger.sol/ITeleporterMessenger.json"), "utf8")
);

const content = `/**
 * Smart Contract ABIs for Kinetix
 * Tự động đồng bộ từ Smart Contracts Solidity đã biên dịch
 */

export const FAMILY_HUB_ABI = ${JSON.stringify(familyHubArtifact.abi, null, 2)} as const;

export const FAMILY_YIELD_VAULT_ABI = ${JSON.stringify(familyYieldVaultArtifact.abi, null, 2)} as const;

export const TELEPORTER_MESSENGER_ABI = ${JSON.stringify(teleporterArtifact.abi, null, 2)} as const;
`;

fs.writeFileSync(path.resolve(__dirname, "../frontend/src/contracts/abis.ts"), content, "utf8");
console.log("✅ Đã cập nhật frontend/src/contracts/abis.ts thành công!");

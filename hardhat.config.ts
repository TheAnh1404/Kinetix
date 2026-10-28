import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";

dotenv.config();

// Lấy Private Key từ ví Avalanche Core Wallet được cung cấp qua .env
const CORE_WALLET_PRIVATE_KEY = process.env.CORE_WALLET_PRIVATE_KEY || "";
const accounts = CORE_WALLET_PRIVATE_KEY.length === 64 || CORE_WALLET_PRIVATE_KEY.startsWith("0x")
  ? [CORE_WALLET_PRIVATE_KEY.startsWith("0x") ? CORE_WALLET_PRIVATE_KEY : `0x${CORE_WALLET_PRIVATE_KEY}`]
  : [];

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      viaIR: true,
    },
  },
  networks: {
    // Mạng Avalanche Fuji C-Chain (Testnet chính thức)
    fuji: {
      url: process.env.FUJI_RPC_URL || "https://api.avax-test.network/ext/bc/C/rpc",
      chainId: 43113,
      accounts: accounts.length > 0 ? accounts : undefined,
    },
    // Mạng Family L1 (Avalanche Custom Subnet / L1) với cấu hình Gas = 0
    familyL1: {
      url: process.env.FAMILY_L1_RPC_URL || "http://127.0.0.1:9650/ext/bc/FamilyL1/rpc",
      chainId: process.env.FAMILY_L1_CHAIN_ID ? parseInt(process.env.FAMILY_L1_CHAIN_ID) : 99999,
      gasPrice: 0, // Phí gas bằng 0 cho toàn bộ thành viên gia đình
      accounts: accounts.length > 0 ? accounts : undefined,
    },
    // Mạng Hardhat Network cục bộ phục vụ kiểm thử đơn vị (Unit Testing)
    hardhat: {
      chainId: 31337,
    },
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
};

export default config;

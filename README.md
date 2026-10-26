# ⚡ Kinetix - Multi-Generational Family Finance OS on Avalanche

> **Solo Builder MVP for Avalanche Team1 Vietnam - UniHack**  
> Protect family wealth with AI-resistant Tiered Multisig, zero gas transactions on Family L1, and real DeFi yield on Avalanche Fuji C-Chain.

---

## 🌟 Core Features

1. **🛡️ Anti-Scam Tiered Multisig:**
   - **Fast Daily Withdrawals ($\le 50$ USDC):** Instant 1-tap payout from Family L1 local buffer (<1s, 0 gas fee) for grandparents' daily allowances.
   - **Large Critical Withdrawals ($> 50$ USDC):** Automatically placed in a 48-hour pending queue, requiring $\ge 2/3$ Guardian confirmations (adult children) on-chain before funds can be unlocked.
2. **💧 10/90 Fractional Liquidity Buffer:**
   - **10%** of all deposits stay liquid on Family L1 for rapid, zero-gas daily expenditures.
   - **90%** of deposits are automatically bridged to Fuji C-Chain via Avalanche Teleporter (ICM) to accumulate ~8% real APY.
3. **🌱 Real Yield Engine (No Mock Time Travel):**
   - Pure production-grade smart contracts calculating accrued yield strictly via real `block.timestamp` without fake time-warp methods.
4. **🤝 Social Recovery:**
   - Seamlessly recover and rotate lost wallets for elderly members with $\ge 2/3$ Guardian approvals.
5. **🧹 Chore-to-Earn (Financial Education for Kids):**
   - Gamified household chores where children complete tasks and parents reward them from the `KidsSavings` sub-vault with 0 gas fee.

---

## 🏗️ Architecture

```
                       +---------------------------------------+
                       |           Avalanche Network           |
                       +---------------------------------------+
                                          |
            +-----------------------------+-----------------------------+
            |                                                           |
            v                                                           v
+------------------------+                                  +------------------------+
|       Family L1        |                                  |   Avalanche C-Chain    |
|   (Custom Subnet)      |                                  |      (Fuji Testnet)    |
|   - Gas Price: 0       |   Avalanche Teleporter (ICM/ICTT) |   - High Liquidity     |
|   - Allowlist Network  | <==============================> |   - Real DeFi Yield    |
+------------------------+                                  +------------------------+
|     FamilyHub.sol      |                                  |  FamilyYieldVault.sol  |
|  - 3 Sub-Vaults        |                                  |  - 8% APY Engine       |
|  - 10% Local Buffer    |                                  |  - Timestamp-based     |
|  - Tiered Multisig     |                                  |  - Compound Yield      |
|  - Chore-to-Earn       |                                  +------------------------+
+------------------------+
```

---

## 📂 Project Structure

```
Kinetix/
├── .agents/                      # AI Agent workspace rules and workflows
│   ├── rules/                    # Architecture & coding standards
│   └── skills/                   # Phased execution runbooks
├── backend/                      # Complete Web3 Backend & Database Service
│   ├── drizzle/                  # Drizzle ORM PostgreSQL migrations
│   ├── src/
│   │   ├── db/                   # Neon Serverless connection, schema, seed
│   │   ├── routes/               # Express REST API routes
│   │   ├── services/             # Family finance business logic
│   │   ├── workers/              # Viem Blockchain event listener worker
│   │   └── server.ts             # Express server entry point
│   └── drizzle.config.ts         # Drizzle Kit configuration
├── contracts/                    # Smart Contracts (Solidity v0.8.20)
│   ├── interfaces/
│   │   └── ITeleporterMessenger.sol  # Avalanche Teleporter (ICM) interfaces
│   ├── mocks/
│   │   └── MockTeleporterMessenger.sol # Local cross-chain testing harness
│   ├── FamilyHub.sol             # Core family governance & multisig contract
│   └── FamilyYieldVault.sol      # C-Chain 8% APY yield engine
├── scripts/
│   └── deploy.ts                 # Multi-network deployment script
├── test/
│   ├── Kinetix.test.ts           # Smart contract test suite (14/14 passing)
│   └── backend.test.ts           # Backend integration test suite (6/6 passing)
├── hardhat.config.ts             # Hardhat network configuration (Fuji & Family L1)
└── README.md
```

---

## 🚀 Quick Start

### 1. Installation
```bash
npm install
```

### 2. Environment Setup
Copy `.env.example` to `.env` and fill in your Avalanche Core Wallet Private Key:
```bash
cp .env.example .env
```

### 3. Compile Contracts
```bash
npx hardhat compile
```

### 4. Run Unit Tests (14/14 Pass)
```bash
npx hardhat test
```

### 5. Deployment
Deploy to Avalanche Fuji C-Chain:
```bash
npm run deploy:fuji
```

Deploy to Family L1:
```bash
npm run deploy:familyL1
```

---

## 📜 License
MIT License. Built with ❤️ for Avalanche Team1 Vietnam - UniHack.

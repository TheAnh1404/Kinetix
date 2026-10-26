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
├── frontend/                     # Next.js 14 App Router UI (Google Stitch Design)
│   ├── src/
│   │   ├── app/                  # App Router, Layout, Global styles
│   │   ├── components/           # Role switcher, Header, Footer
│   │   │   └── views/            # 5 Role-based interactive views
│   │   │       ├── HomeView.tsx      # Trang Chủ - Tổng quan hệ điều hành
│   │   │       ├── ElderlyView.tsx   # Kinetix Shield - Chế độ Ông Bà (<50 USDC fast)
│   │   │       ├── GuardianView.tsx  # Quản Trị Cha Mẹ - Multisig 2/3 Emergency
│   │   │       ├── KidsView.tsx      # Kinetix Kids - Heo Đất & Chore-to-Earn
│   │   │       └── RoscaView.tsx     # Quỹ Họ Hụi ROSCA On-chain Dòng Họ
│   │   └── types/                # Navigation tabs & demo members
│   ├── tailwind.config.ts        # Stitch Material 3 design tokens & palettes
│   └── package.json
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

### 4. Run Unit Tests (25/25 Pass)
Chạy toàn bộ 25 bài kiểm thử đơn vị cho Smart Contracts (14/14), Backend Services (6/6), và Full-Stack Auth SIWE (5/5):
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

### 6. Run Frontend (Fullstack Web3 & Stitch UI)
```bash
cd frontend
npm install
npm run dev
```
Truy cập ứng dụng tại `http://localhost:3000` để trải nghiệm hệ thống Fullstack kết nối trực tiếp Smart Contracts và Neon Database:
- **Đăng Nhập Đa Thế Hệ (`/login`):**
  + **Bố Mẹ / Quản Trị:** Ký ví Avalanche Core Wallet EIP-4361 SIWE không cần mật khẩu, chống replay attack qua nonce bảng `auth_nonces`.
  + **Ông Bà / Trẻ Nhỏ:** Đăng nhập 1-chạm hoặc mã PIN 4 số to rõ (mặc định: `1234`), phiên lưu trong HTTP-Only cookie `kinetix_session` (7 ngày).
  + **Demo Quick Switcher:** Thanh điều khiển nổi cho phép ban giám khảo và người quay phim chuyển đổi 1-click giữa 4 nhân vật mẫu (Bố Ba, Cô Út, Ông Nội, Bé Na).
- **Trang Chủ:** Bức tranh tổng tài sản gia đình, bộ đệm thanh khoản 10/90, nạp tiền vào quỹ qua smart contract `depositToVault`.
- **Kinetix Shield (Chế Độ Ông Bà):** Rút tiền nhanh $\le 50$ USDC trong 1 chạm (<1s, 0 gas) và tạo yêu cầu rút tiền lớn $>50$ USDC bảo vệ chống lừa đảo AI.
- **Quản Trị Cha Mẹ:** Bảng điều khiển bảo hộ với tính năng phê duyệt đa chữ ký 2/3 (Multisig) on-chain qua `approveWithdrawal`.
- **Kinetix Kids:** Heo đất tích lũy, nộp báo cáo việc nhà và cha mẹ ký duyệt phát thưởng trực tiếp on-chain qua `verifyAndRewardChore`.
- **Quỹ Tương Trợ ROSCA:** Mô hình Họ Hụi truyền thống bất biến trên Avalanche L1, sinh lãi DeFi tự động.
- **Hộp Thư Cảnh Báo:** Nhận thông báo tức thời về giao dịch khả nghi, hoàn thành việc nhà và chi trả lợi suất.

---

## 📜 License
MIT License. Built with ❤️ for Avalanche Team1 Vietnam - UniHack.

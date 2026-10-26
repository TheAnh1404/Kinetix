---
description: "Quy chuẩn viết Smart Contract Solidity trên Avalanche L1 và C-Chain cho Kinetix (Dynamic Vaults)"
trigger: glob
globs: "contracts/**"
---

# SMART CONTRACT DEVELOPMENT GUIDELINES
## Dynamic & Composable Multi-Space Vaults

## 1. Phiên Bản & Thư Viện Tiêu Chuẩn
- **Solidity:** Phiên bản cố định `^0.8.20`.
- **Thư viện bên thứ ba:** Sử dụng OpenZeppelin Contracts v5 chính thức:
  - `ReentrancyGuard` cho các hàm rút/nạp tài sản.
  - `Ownable` / `AccessControl` cho phân quyền quản trị.
  - `Pausable` cơ chế khẩn cấp khi phát hiện dấu hiệu bất thường.

## 2. Kiến Trúc Hợp Đồng & Hũ Tiền Động

### A. Hợp đồng `FamilyHub.sol` (Family L1)
- **Định nghĩa 4 Bộ Quy Tắc:**
  ```solidity
  enum RuleTemplate {
      SHIELD,      // 0: Bảo vệ & Trợ cấp
      MILESTONE,   // 1: Nhiệm vụ & Cột mốc (Chore-to-Earn)
      ROSCA,       // 2: Góp vốn xoay vòng
      SHARED_GOAL  // 3: Mục tiêu chung
  }
  ```
- **Cấu trúc Hũ động (`DynamicVault`):**
  - Quản lý độc lập: `vaultId`, `name`, `creator`, `ruleType`, `totalBalance`, `l1BufferBalance`, `cChainPrincipal`, `bufferRatioBps`, `fastWithdrawLimit`, `requiredApprovals`, `guardians`, `beneficiaries`, `isActive`.
- **Các hàm nghiệp vụ:**
  - `createCustomVault(...)`: Khởi tạo Hũ mới, kiểm tra `bufferRatioBps <= 10000`, `requiredApprovals <= guardians.length`.
  - `depositToVault(uint256 vaultId)`: Tách đệm L1/C-Chain chuẩn xác không lỗi làm tròn:
    `toBridge = (msg.value * (10000 - vault.bufferRatioBps)) / 10000; toBuffer = msg.value - toBridge;`
  - `fastWithdraw(uint256 vaultId, uint256 amount)`: Rút nhanh $\le$ limit tức thì 0 gas cho Beneficiary.
  - `requestLargeWithdrawal(uint256 vaultId, uint256 amount, string calldata reason)`.
  - `approveWithdrawal(uint256 requestId)`: Duyệt đa chữ ký $M/N$ của Hũ đó; giải ngân và tự động rút phần thiếu từ C-Chain qua Teleporter nếu đệm L1 không đủ.
  - `createChore(uint256 vaultId, ...)`, `claimChoreCompleted(uint256 taskId)`, `verifyAndRewardChore(uint256 taskId)`.
  - `recoverMemberWallet(uint256 vaultId, address oldWallet, address newWallet)`.

### B. Hợp đồng `FamilyYieldVault.sol` (Fuji C-Chain)
- Quản lý vốn gốc và lãi suất theo định danh `vaultId`:
  - `mapping(uint256 => uint256) public vaultPrincipals;`
  - `mapping(uint256 => uint256) public accruedYields;`
  - `mapping(uint256 => uint256) public lastDepositTimestamp;`
  - Lãi suất cố định `APY_RATE = 8;` (8%/năm).
- `receiveCrossChainDeposit(uint256 vaultId)`: Kết toán lãi cũ trước khi nhận vốn mới.
- `calculateTotalYield(uint256 vaultId)`: Tính toán lãi suất thời gian thực theo `block.timestamp`.
- `processVaultWithdrawal(uint256 vaultId, address recipient, uint256 amount)`: Rút vốn/lãi đúng `vaultId` và bắn ngược qua Teleporter về L1.

## 3. Quản Lý Lỗi & Bảo Mật (Security & Best Practices)
- **Custom Errors:** Dùng `error CustomErrorName(...)` thay cho `require(condition, string)` để tiết kiệm bytecode.
- **Mô hình CEI (Checks-Effects-Interactions):** Luôn cập nhật state nội bộ trước khi chuyển tiền hoặc gọi Teleporter.
- **Kiểm soát truy cập theo Hũ:** Kiểm tra `isVaultGuardian[vaultId][msg.sender]` và `isVaultBeneficiary[vaultId][msg.sender]`.

## 4. Quy Chuẩn Kiểm Thử (Unit Testing)
- Hợp đồng phải có bộ test case bao phủ toàn diện:
  1. Tạo nhiều Hũ động với `RuleTemplate` và `bufferRatioBps` khác nhau (10/90, 20/80, 0/100).
  2. Nạp tiền tách đệm chuẩn xác.
  3. Rút nhanh không cần duyệt đối với `SHIELD`.
  4. Duyệt đa chữ ký theo ngưỡng riêng $M/N$ của từng hũ.
  5. Nhiệm vụ Chore-to-Earn giải ngân thưởng từ Hũ `MILESTONE`.
  6. Tính lãi suất thực tế 8% APY trên C-Chain dựa vào `block.timestamp`.

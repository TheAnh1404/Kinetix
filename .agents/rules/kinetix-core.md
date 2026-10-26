---
description: "Quy tắc kiến trúc cốt lõi và ràng buộc công nghệ bắt buộc cho dự án Kinetix (Dynamic & Composable Multi-Space Vaults)"
trigger: always_on
---

# KINETIX CORE ARCHITECTURE & SYSTEM CONSTRAINTS
## Dynamic & Composable Multi-Space Vaults on Avalanche

## 1. Định Vị Dự Án
- **Tên dự án:** Kinetix (The Dynamic & Composable Multi-Space Vault OS on Avalanche)
- **Mục tiêu:** Solo Builder MVP tham dự cuộc thi Avalanche Team1 Vietnam - UniHack.
- **Nghiệp vụ cốt lõi:**
  1. **Đa Không Gian Chia Sẻ (Multi-Space Workspaces):** Một người dùng có thể tham gia nhiều không gian (Đại gia đình, Nhóm anh em ruột, Hội bạn thân, CLB cộng đồng).
  2. **Hũ Tiền Động Không Giới Hạn (Dynamic Vaults):** Trong mỗi không gian, người dùng có thể khởi tạo N Hũ tiền theo nhu cầu thực tế (`vaultId` tự tăng).
  3. **4 Bộ Quy Tắc Tùy Biến (Composable Rule Templates):**
     - `SHIELD` (0): Bảo vệ & Trợ cấp (Rút nhanh $\le$ limit tức thì 0 gas từ đệm L1; rút lớn cần $M/N$ chữ ký Guardians duyệt).
     - `MILESTONE` (1): Nhiệm vụ & Cột mốc (`Chore-to-Earn` - Vốn gửi C-Chain sinh lời, mở khóa thưởng khi hoàn thành task được xác nhận).
     - `ROSCA` (2): Góp vốn xoay vòng (Định kỳ góp vốn, tiền nhàn rỗi sinh lời C-Chain, đến kỳ giải ngân gốc + chia lãi).
     - `SHARED_GOAL` (3): Mục tiêu chung (Cả nhóm góp tiền mua sắm/du lịch, sinh lời C-Chain cho đến khi đạt target và đủ $M/N$ chữ ký).
  4. **Tỷ Lệ Đệm Thanh Khoản Linh Hoạt (`bufferRatioBps`):** Cấu hình tỷ lệ giữ lại L1 (VD: 1000 = 10% L1 / 90% C-Chain, 2000 = 20%, 0 = 100% C-Chain).
  5. **Đa Chữ Ký Phân Tầng Theo Hũ ($M/N$ Multisig):** Ngưỡng duyệt `requiredApprovals` được cấu hình độc lập cho từng Hũ tiền.

---

## 2. Ràng Buộc Công Nghệ Bắt Buộc (Strict Constraints)

### A. Mô Hình Kiến Trúc Đa Chuỗi (Dual-Chain Architecture)
1. **Family L1 (Custom Chain / Appchain):**
   - Phí giao dịch bằng 0 (`Custom Fee Config`).
   - Mạng khép kín: Chỉ các địa chỉ ví thành viên được cấp quyền mới có thể tương tác (`Transaction Allowlist Precompile`).
   - Triển khai hợp đồng trung tâm: `FamilyHub.sol`.
2. **Avalanche Fuji C-Chain (Chain ID: 43113):**
   - Môi trường DeFi mở, thanh khoản cao, APY = 8%.
   - Triển khai hợp đồng tích lũy lợi nhuận: `FamilyYieldVault.sol`.
3. **Cơ chế liên lạc liên chuỗi:**
   - Tích hợp giao diện **Avalanche Teleporter (ICM / ICTT)** để truyền thông điệp và chuyển giao tài sản an toàn giữa Family L1 và C-Chain dựa theo `vaultId`.
4. **Kết nối Ví:**
   - Tương thích hoàn toàn với **Avalanche Core Wallet** (qua `CORE_WALLET_PRIVATE_KEY` và SIWE EIP-4361) kết hợp chế độ **Passkey / PIN 4 số** cho Ông Bà & Trẻ Nhỏ.

### B. Cơ Chế Đệm Thanh Khoản Tùy Chỉnh (`bufferRatioBps`)
- Tùy chỉnh theo từng Hũ tiền (Mặc định khuyến nghị: 10% L1 / 90% C-Chain):
  - **Phần giữ lại L1 (`toBuffer`):** Phục vụ rút tiền tức thì (<1 giây, 0 gas fee) cho các chi tiêu thường nhật.
  - **Phần chuyển tiếp C-Chain (`toBridge`):** Tự động chuyển tiếp sang Fuji C-Chain để stake vào Vault nhận lợi nhuận ~8% APY.

### C. Cơ Chế Đa Chữ Ký Phân Tầng Riêng Biệt Cho Từng Hũ
- **Rút tiền nhỏ ($\le$ `fastWithdrawLimit`):** Giải ngân tức thì từ bộ đệm L1 của Hũ, không yêu cầu biểu quyết.
- **Rút tiền lớn ($>$ `fastWithdrawLimit`):**
  - Đưa vào hàng đợi `pendingRequests` gắn với `vaultId`.
  - Cần tối thiểu `requiredApprovals` chữ ký Guardians của Hũ đó xác nhận ký duyệt on-chain mới được giải ngân.
  - Nếu số dư đệm L1 không đủ, tự động gửi thông điệp ICM sang C-Chain rút phần thiếu từ `vaultPrincipals[vaultId]` về ví người nhận.

### D. Nguyên Tắc Kiểm Thử & Lãi Suất (No Mock Time Travel)
- **TUYỆT ĐỐI KHÔNG** tạo các hàm hack/giả lập thời gian (như `demoTimeTravelJump`).
- Lãi suất tính toán nghiêm ngặt dựa trên `block.timestamp` thực tế theo công thức:
  $$\text{interest} = \frac{\text{principal} \times \text{APY\_RATE} \times \text{timeElapsed}}{\text{BPS\_DIVISOR} \times 365\text{ days}}$$

---

## 3. Quy Chuẩn Làm Việc Của AI Agent Trong AGY IDE
1. **Lập kế hoạch trước:** Luôn tạo Implementation Plan và danh sách công việc chi tiết trước khi chỉnh sửa hoặc tạo mới file mã nguồn.
2. **Tuân thủ thứ tự:** Không triển khai Frontend khi Smart Contract và hệ thống Unit Test chưa hoàn tất 100%.
3. **Ngôn ngữ chú thích:** Mã nguồn phải có chú thích (comments) giải thích logic nghiệp vụ bằng **tiếng Việt** rõ ràng.

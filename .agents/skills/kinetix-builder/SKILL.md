---
name: kinetix-builder
description: >-
  Thực thi quy trình phát triển dự án Kinetix qua 4 giai đoạn từ Scaffolding,
  Smart Contract Solidity, Web3 Client Hooks, đến Role-based Dashboard UI.
  Kích hoạt khi người dùng yêu cầu triển khai theo từng Phase hoặc xây dựng tính năng cho Kinetix.
---

# Kinetix Phased Execution Workflow

Kỹ năng này hướng dẫn Agent triển khai dự án Kinetix theo đúng lộ trình 4 giai đoạn nghiêm ngặt, đảm bảo chất lượng từ tầng Smart Contract đến tầng giao diện người dùng.

---

## Phase 1: Khởi Tạo Dự Án & Cấu Hình Mạng (Scaffolding & Network Setup)
1. **Cấu trúc Monorepo:**
   - Khởi tạo 2 thư mục độc lập trong workspace:
     - `/contracts`: Dự án Hardhat hoặc Foundry phát triển Solidity.
     - `/frontend`: Dự án Next.js (App Router) với Tailwind CSS.
2. **Cấu hình Mạng (Network Configurations):**
   - Mạng 1: `Avalanche Fuji C-Chain` (ChainId `43113`).
   - Mạng 2: `Family L1` (Custom Subnet/L1, ChainId tùy biến, Gas Fee = 0).
3. **Biến môi trường:**
   - Tạo file `.env.example` với đầy đủ các khóa: RPC URLs, Deployer Private Key, Contract Addresses, Teleporter Registry Address.

---

## Phase 2: Phát Triển Smart Contract & Kiểm Thử (Core Contracts & Verification)
1. **Triển khai hợp đồng theo quy chuẩn `.agents/rules/kinetix-core.md` và `.agents/rules/blockchain-contracts.md`:**
   - `FamilyHub.sol` trên Family L1:
     - Quản lý thành viên gia đình (Admin, Guardians, Elderly, Kids).
     - Phân bổ tự động: 10% giữ đệm thanh khoản, 90% gửi C-Chain.
     - Cơ chế Tiered Multisig: Rút $\le 50$ USDC giải ngân ngay, rút $> 50$ USDC cần 2/3 chữ ký Guardians.
   - `FamilyYieldVault.sol` trên Fuji C-Chain:
     - Quản lý vốn gửi và tính lãi suất dựa trên `block.timestamp` thực tế (~8% APY).
2. **Bộ kiểm thử (Test Suite):**
   - Viết các bài test Hardhat/Foundry chi tiết.
   - **Bắt buộc:** 100% test pass trước khi chuyển sang Phase 3.

---

## Phase 3: Tích Hợp Web3 Hooks (Web3 Client Hooks)
1. **Cấu hình Wagmi v2 & Viem:**
   - Thiết lập provider hỗ trợ đồng thời cả Fuji C-Chain và Custom Family L1.
2. **Custom React Hooks:**
   - `useFamilyHub`: Đọc số dư đệm L1, danh sách yêu cầu rút tiền `pendingRequests`, trạng thái xác nhận chữ ký.
   - `useYieldVault`: Đọc số dư sinh lời C-Chain và lãi suất tích lũy thời gian thực.
3. **Lắng nghe sự kiện (Event Listening):**
   - Dùng `watchContractEvent` để cập nhật trạng thái UI ngay khi có Guardian ký duyệt đa chữ ký.

---

## Phase 4: Giao Diện Người Dùng Đa Thế Hệ (Role-Based Dashboard UI)
1. **Layout & Thanh chuyển đổi vai trò (Role Switcher):**
   - Cho phép người dùng chuyển nhanh giữa 3 chế độ: **Ông Bà (Elderly)**, **Bố Mẹ (Guardian)**, **Con Trẻ (Kids)**.
2. **Triển khai giao diện từng vai trò theo `.agents/rules/frontend-web3.md`:**
   - **Elderly View:** Nút bấm to bản, chữ lớn, 1 chạm, giấu hash/gas.
   - **Guardian View:** Quản lý 3 hũ số dư, tiến trình $0/3 \to 1/3 \to 2/3$ chữ ký, duyệt yêu cầu rút tiền.
   - **Kids View:** Giao diện heo đất, danh sách việc nhà nhận thưởng.
3. **Kịch bản Demo Video (Happy Path):**
   - Đảm bảo luồng chạy trơn tru cho bài thuyết trình demo 3 phút tại cuộc thi Avalanche Team1 UniHack.

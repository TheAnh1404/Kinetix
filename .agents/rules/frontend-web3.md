---
description: "Quy chuẩn kiến trúc UI/UX và kết nối Web3 Next.js cho Kinetix (Multi-Space & Dynamic Vaults)"
trigger: glob
globs: "frontend/**"
---

# FRONTEND & WEB3 INTEGRATION RULES
## Dynamic & Composable Multi-Space Vaults

## 1. Công Nghệ Nền Tảng (Tech Stack)
- **Framework:** Next.js (App Router), TypeScript, Tailwind CSS.
- **Biểu tượng & Giao diện:** Google Material Symbols, Lucide React, Tailwind CSS.
- **Web3 SDK:** Viem, Wagmi v2.
- **Cơ sở dữ liệu:** Neon Serverless PostgreSQL + Drizzle ORM.

---

## 2. Kiến Trúc Giao Diện Đa Không Gian & Hũ Tiền Động

### A. Thanh Chuyển Đổi Không Gian (Workspace Switcher)
- Đặt tại Header/Sidebar: Cho phép chuyển đổi linh hoạt giữa các Không gian ("Đại Gia Đình Bác Ba", "Hội Anh Em & Bạn Thân", "+ Tạo Không Gian Mới").
- Khi chuyển không gian, toàn bộ danh sách Hũ tiền (`vaults`), số dư, thành viên và thông báo tự động cập nhật theo không gian đó.

### B. Modal Tạo Hũ Tiền Mới (CreateVaultModal - 3 Bước Chuyên Nghiệp)
1. **Bước 1 (Chọn Mẫu & Đặt Tên):**
   - Đặt tên Hũ (VD: "Hũ Báo Hiếu Ông Bà", "Hũ Lì Xì & Học Tập", "Quỹ Du Lịch Đà Lạt").
   - Chọn 1 trong 4 Bộ Quy Tắc:
     - `SHIELD`: Bảo vệ & Trợ cấp (Ông Bà / Người cao tuổi).
     - `MILESTONE`: Nhiệm vụ & Cột mốc (`Chore-to-Earn`).
     - `ROSCA`: Góp vốn xoay vòng (Họ Hụi minh bạch).
     - `SHARED_GOAL`: Mục tiêu chung (Tiết kiệm nhóm).
2. **Bước 2 (Cấu Hình Đệm Thanh Khoản L1 / C-Chain):**
   - Thanh kéo (Slider) trực quan: Cho phép chọn tỷ lệ giữ lại L1 từ 0% đến 50% (Mặc định khuyến nghị: 10% L1 Instant Buffer / 90% C-Chain 8% APY).
3. **Bước 3 (Thành Viên & Ngưỡng Ký Duyệt):**
   - Chọn danh sách Người thụ hưởng (Beneficiaries) và Người bảo hộ (Guardians).
   - Đặt hạn mức rút nhanh (`fastWithdrawLimit`) và số chữ ký duyệt tối thiểu $M/N$ (`requiredApprovals`).

### C. 3 Chế Độ Trải Nghiệm Đa Thế Hệ (Role-Based Views)
1. **Elderly View (Chế độ Ông Bà):**
   - Tự động lọc và hiển thị các Hũ `SHIELD` mà Ông Bà là Beneficiary.
   - Nút bấm to bản, chữ lớn, 1 chạm rút nhanh tức thì 0 gas fee, rút lớn hiển thị tiến trình con cái duyệt.
2. **Guardian / Manager View (Chế độ Bố Mẹ / Quản Lý Không Gian):**
   - Lưới danh sách toàn bộ các Hũ động trong Workspace.
   - Thẻ thống kê thanh khoản L1 / C-Chain, tiến trình đa chữ ký và nút "+ Tạo Hũ Mới".
3. **Kids / Milestone View (Chế độ Con Trẻ / Thành viên nhận Task):**
   - Heo đất trực quan và bảng nhiệm vụ Chore-to-Earn thuộc các Hũ `MILESTONE`.
4. **Rosca & Shared Goal View:**
   - Bảng theo dõi lượt nhận hụi xoay vòng hoặc thanh tiến trình đạt mục tiêu nhóm.

---

## 3. Trải Nghiệm Mạng & Dự Phòng Rủi Ro (Network UX & Fail-Safe)
1. **Kiểm tra Allowlist Thân thiện:**
   - Thông báo rõ ràng khi địa chỉ ví chưa được cấp quyền trên Family L1 kèm nút liên hệ Admin.
2. **Tối ưu Hóa Giao Dịch Web3:**
   - Mọi tương tác Smart Contract (`depositToVault`, `fastWithdraw`, `requestLargeWithdrawal`, `approveWithdrawal`, `createCustomVault`) đều truyền tham số `vaultId: bigint`.

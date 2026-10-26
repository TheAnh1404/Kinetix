---
description: "Quy chuẩn viết Smart Contract Solidity trên Avalanche L1 và C-Chain cho Kinetix"
trigger: glob
globs: "contracts/**"
---

# SMART CONTRACT DEVELOPMENT GUIDELINES

## 1. Phiên Bản & Thư Viện Tiêu Chuẩn
- **Solidity:** Phiên bản cố định `^0.8.20`.
- **Thư viện bên thứ ba:** Sử dụng OpenZeppelin Contracts v5 chính thức:
  - `ReentrancyGuard` cho các hàm rút/nạp tài sản.
  - `Ownable` / `AccessControl` cho phân quyền quản trị gia đình.
  - `Pausable` cơ chế khẩn cấp khi phát hiện dấu hiệu bất thường.

## 2. Quản Lý Lỗi & Bảo Mật (Security & Best Practices)
- **Custom Errors:** Luôn dùng `error CustomErrorName(...)` thay vì chuỗi `require(condition, "error message")` nhằm tối ưu bytecode và tiết kiệm tài nguyên.
- **Mô hình CEI (Checks-Effects-Interactions):** Kiểm tra điều kiện $\to$ Cập nhật trạng thái nội bộ $\to$ Tương tác với địa chỉ/hợp đồng bên ngoài.
- **Kiểm soát truy cập nghiêm ngặt:**
  - `onlyFamilyAdmin`: Dành cho ví quản trị gia đình (cấu hình thành viên, hạn mức).
  - `onlyGuardian`: Dành cho các thành viên người bảo hộ tham gia ký duyệt đa chữ ký.

## 3. Tính Toán Số Học & Lãi Suất (Precision Math)
- **Tránh lỗi làm tròn số nguyên:**
  - Luôn thực hiện phép nhân trước phép chia (`multiplication before division`).
  - Kiểm tra kỹ công thức phân bổ đệm thanh khoản 10/90 để không làm thất thoát dư số (dust amount).
- **Công thức tính lãi suất thực tế trên C-Chain (`FamilyYieldVault.sol`):**
  $$\text{interest} = \frac{\text{principal} \times \text{APY\_RATE} \times \text{timeElapsed}}{\text{BPS\_DIVISOR} \times 365\text{ days}}$$
  - `timeElapsed = block.timestamp - lastDepositTimestamp`.
  - Không sử dụng các biến số gian lận hay tua nhanh thời gian giả tạo.

## 4. Quy Chuẩn Kiểm Thử (Unit Testing)
- Hợp đồng `FamilyHub.sol` và `FamilyYieldVault.sol` phải có bộ test case bao phủ toàn diện:
  1. **Happy Path:**
     - Nạp tiền $\to$ Tách đúng 10% giữ tại L1 và 90% gửi sang C-Chain.
     - Rút tiền nhỏ $\le 50$ USDC $\to$ Giải ngân ngay lập tức từ bộ đệm.
     - Rút tiền lớn $> 50$ USDC $\to$ Thu thập đủ 2/3 chữ ký Guardian $\to$ Giải ngân thành công.
  2. **Revert Path:**
     - Rút tiền lớn chưa đủ 2 chữ ký $\to$ Revert `InsufficientApprovals`.
     - Địa chỉ ví không nằm trong Allowlist $\to$ Revert `UnauthorizedAccess`.
     - Tấn công Reentrancy $\to$ Revert `ReentrancyGuardReentrantCall`.

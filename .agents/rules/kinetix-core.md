---
description: "Quy tắc kiến trúc cốt lõi và ràng buộc công nghệ bắt buộc cho dự án Kinetix"
trigger: always_on
---

# KINETIX CORE ARCHITECTURE & SYSTEM CONSTRAINTS

## 1. Định Vị Dự Án
- **Tên dự án:** Kinetix (The Multi-Generational Family Finance OS on Avalanche)
- **Mục tiêu:** Solo Builder MVP tham dự cuộc thi Avalanche Team1 Vietnam - UniHack.
- **Nghiệp vụ cốt lõi:**
  1. **Chống lừa đảo người cao tuổi (Anti-Scam):** Bảo vệ tài sản gia đình bằng mô hình Đa chữ ký phân tầng (Tiered Multisig).
  2. **Trải nghiệm Web3 thân thiện (Gasless & Private):** Phí gas bằng 0, mạng gia đình khép kín qua Transaction Allowlist.
  3. **Tối ưu lợi suất gia đình (Yield Generation):** Tự động điều chuyển vốn nhàn rỗi sang Avalanche C-Chain sinh lời DeFi thực tế (~8% APY).

---

## 2. Ràng Buộc Công Nghệ Bắt Buộc (Strict Constraints)

### A. Mô Hình Kiến Trúc Đa Chuỗi (Dual-Chain Architecture)
1. **Family L1 (Custom Chain / Subnet):**
   - Phí giao dịch bằng 0 (`Custom Fee Config`).
   - Mạng khép kín: Chỉ các địa chỉ ví gia đình được cấp quyền mới có thể tương tác (`Transaction Allowlist Precompile`).
   - Triển khai hợp đồng trung tâm: `FamilyHub.sol`.
2. **Avalanche Fuji C-Chain:**
   - Môi trường DeFi mở, thanh khoản cao.
   - Triển khai hợp đồng tích lũy lợi nhuận: `FamilyYieldVault.sol`.
3. **Cơ chế liên lạc liên chuỗi:**
   - Tích hợp giao diện **Avalanche Teleporter** (ICM / ICTT) để truyền thông điệp và chuyển giao tài sản an toàn giữa Family L1 và C-Chain.

### B. Cơ Chế Đệm Thanh Khoản 10/90 (10/90 Liquidity Buffer)
- **10% Vốn nạp (Liquid Buffer):** Giữ lại trên Family L1 để phục vụ rút tiền chi tiêu hàng ngày tức thì (<1 giây, 0 gas fee).
- **90% Vốn nạp (Yield Engine):** Tự động chuyển tiếp sang Fuji C-Chain để stake vào Vault nhận lợi nhuận.

### C. Cơ Chế Đa Chữ Ký Phân Tầng (Tiered Anti-Scam Multisig)
- **Rút tiền nhỏ (<= 50 USDC):** Tự động giải ngân tức thì từ bộ đệm 10% trên L1, không yêu cầu biểu quyết.
- **Rút tiền lớn (> 50 USDC):** 
  - Đưa vào hàng đợi `pendingRequests`.
  - Bắt buộc kích hoạt quy trình đa chữ ký: Cần tối thiểu **2/3 Guardians (các con)** xác nhận ký duyệt on-chain mới được giải ngân.

### D. Nguyên Tắc Kiểm Thử & Lãi Suất (No Mock Time Travel)
- **TUYỆT ĐỐI KHÔNG** tạo các hàm hack/giả lập thời gian (như `demoTimeTravelJump`).
- Mã nguồn Smart Contract phải đạt tiêu chuẩn **Production-grade**:
  - Lãi suất tính toán nghiêm ngặt dựa trên `block.timestamp` thực tế.
  - Video demo sản phẩm sẽ sử dụng kỹ thuật cắt dựng thời gian hoặc nạp trước dữ liệu có mốc thời gian thực trên Testnet.

---

## 3. Quy Chuẩn Làm Việc Của AI Agent Trong AGY IDE
1. **Lập kế hoạch trước:** Luôn tạo Implementation Plan và danh sách công việc chi tiết trước khi chỉnh sửa hoặc tạo mới file mã nguồn.
2. **Tuân thủ thứ tự:** Không triển khai Frontend khi Smart Contract và hệ thống Unit Test chưa hoàn tất 100%.
3. **Ngôn ngữ chú thích:** Mã nguồn phải có chú thích (comments) giải thích logic nghiệp vụ bằng **tiếng Việt** rõ ràng.

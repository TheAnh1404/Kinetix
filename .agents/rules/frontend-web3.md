---
description: "Quy chuẩn kiến trúc UI/UX và kết nối Web3 Next.js cho Kinetix"
trigger: glob
globs: "frontend/**"
---

# FRONTEND & WEB3 INTEGRATION RULES

## 1. Công Nghệ Nền Tảng (Tech Stack)
- **Framework:** Next.js (App Router), TypeScript, Tailwind CSS.
- **Biểu tượng & Giao diện:** Lucide React, Shadcn/ui component primitives.
- **Web3 SDK:** Wagmi v2, Viem.

---

## 2. Thiết Kế Phân Tầng 3 Chế Độ (Role-Based Views)
Ứng dụng phải hỗ trợ chuyển đổi mượt mà giữa 3 chế độ trải nghiệm tương ứng 3 thế hệ trong gia đình:

### A. Elderly View (Giao diện Ông Bà)
- **Đặc điểm:** Tối giản hóa tối đa, tiếp cận dễ dàng.
- **Typography & Màu sắc:** Font chữ cực lớn (`text-xl`, `text-2xl`), độ tương phản cao, nút bấm to bản rõ ràng.
- **Trải nghiệm:** Thao tác "1 chạm" để nhận trợ cấp hoặc yêu cầu rút tiền.
- **Bảo mật nhận thức:** Ẩn hoàn toàn các thông số kỹ thuật rườm rà gây bối rối (như gas fee, mã băm txHash, địa chỉ hex 0x..., nonce).

### B. Guardian View (Giao diện Bố Mẹ / Các Con Bảo Hộ)
- **Đặc điểm:** Bảng điều khiển quản trị tài chính gia đình toàn diện.
- **Dashboard:**
  - Hiển thị trực quan số dư 3 hũ tài chính (Hũ Chi Tiêu L1, Hũ Sinh Lời C-Chain, Hũ Dự Phòng Tiết Kiệm).
  - Tỷ lệ phân bổ đệm thanh khoản 10/90 theo thời gian thực.
- **Trung tâm Phê duyệt Đa chữ ký (Multisig Center):**
  - Danh sách yêu cầu rút tiền lớn đang chờ (`pendingRequests`).
  - Thanh tiến trình duyệt trực quan: $0/3 \to 1/3 \to 2/3$ (Đã đủ điều kiện giải ngân).

### C. Kids View (Giao diện Con Trẻ)
- **Đặc điểm:** Trực quan, vui tươi, ứng dụng cơ chế Game hóa (Gamification).
- **Thành phần:**
  - Đồ họa Heo đất 3D/vector trực quan thể hiện khoản tích lũy.
  - Danh sách nhiệm vụ "Làm việc nhà nhận thưởng" (Chore-to-Earn).

---

## 3. Trải Nghiệm Mạng & Dự Phòng Rủi Ro (Network UX & Fail-Safe)
1. **Kiểm tra Allowlist Thân thiện:**
   - Khi một ví kết nối không nằm trong danh sách Allowlist của Family L1, hiển thị thông báo/modal hướng dẫn thân thiện, tránh hiển thị lỗi mã code thô ráp.
2. **Cơ chế Fallback khi Demo:**
   - Chuẩn bị sẵn cơ chế dữ liệu fallback (mock/cache an toàn) trong trường hợp mạng RPC Testnet phản hồi chậm trong quá trình ghi hình video demo 3 phút của Hackathon.

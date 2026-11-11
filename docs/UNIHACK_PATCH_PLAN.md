# Kế hoạch vá readiness UniHack

1. Khôi phục receiver Teleporter với xác thực messenger, cấu hình, blockchain ID và Hub; giữ kiểm tra vốn thực nhận, reserve và thanh khoản trước chi. Kiểm thử lỗi và rollback trước khi sửa UI.
2. Mở tỷ lệ đệm 0–10000 bps trong Hub/Cashflow; giữ số dư có bảo chứng. Tách cấu hình tỷ lệ khỏi bằng chứng chuyển tài sản: ICM không tự chuyển AVAX.
3. Khôi phục deploy theo chain ID, journal receipt, nạp reserve và wiring hai mạng có preflight/postcondition. Giao dịch hai blockchain không có tính atomic; chỉ ghi trạng thái hoàn tất sau khi cả hai bên xác minh.
4. Thêm switcher ba nhân vật dùng chung định danh với seed, không sửa quyền phiên đăng nhập hoặc ký thay ví người khác. Chế độ trình diễn được ghi nhãn và tách khỏi giao dịch thật. Thêm slider, truyền bps qua validation, calldata và đồng bộ backend.
5. Chạy Hardhat đầy đủ, typecheck/build phù hợp; bổ sung walkthrough và báo cáo bằng chứng. Tìm skill auditor đã được yêu cầu và chỉ công bố điểm có căn cứ.

## Điều kiện nghiệm thu

- Tests kiểm tra đủ năm lỗi bảo mật, funded/unfunded messages, pause, tỷ lệ biên, rollback thanh khoản và reserve alias.
- Script từ chối sai chain, cấu hình rỗng, messenger không có code và wiring sai owner; không công bố hoàn tất nếu receipt/assert thất bại.
- Không triển khai lên testnet hoặc sửa database thật khi chỉ chạy kiểm thử cục bộ.
- Không tự khẳng định WCAG AAA hay 100/100 nếu thiếu đánh giá, deployment hoặc skill chấm điểm.

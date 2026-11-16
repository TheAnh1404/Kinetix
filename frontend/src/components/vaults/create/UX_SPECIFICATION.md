# Đặc tả tạo quỹ trên điện thoại

Cập nhật: 15/11/2026. Đây là yêu cầu mục tiêu; chưa xác nhận wizard hiện tại đáp ứng. Tham chiếu [chuẩn UX](../../../../../docs/MOBILE_UX_STANDARD.md), [đặc tả nghiệp vụ](../../../../../docs/GROUP_FINANCE_SPEC.md) và [nghiệm thu](../../../../../docs/MOBILE_ACCEPTANCE.md).

Mô hình tạo/quản lý đầy đủ: [FUND_CREATION_MANAGEMENT.md](../../../../../docs/FUND_CREATION_MANAGEMENT.md). Các trạng thái, quyền hoàn và điều kiện từng loại quỹ theo [FUND_OPERATING_MODEL.md](../../../../../docs/FUND_OPERATING_MODEL.md).

## Luồng

1. Mục đích: Quỹ hoạt động hoặc Quỹ mục tiêu; nhóm và tên quỹ. Mỗi mẫu có một mô tả ngắn.
2. Quy tắc tiền: tài sản/mạng, nơi giữ tiền, cách góp, điều kiện chi/hoàn, target/deadline nếu GOAL; chi hạn mức mặc định tắt.
3. Người và quyền: người đề nghị, người duyệt, quorum và allowance nếu có SPEND. Không đồng nhất người quản lý nhóm với người có quyền chi.
4. Xem lại: điều khoản/hash, chính sách, tài sản/mạng, người có quyền và phí triển khai. Ký qua adapter được hỗ trợ, theo dõi receipt rồi xác minh quỹ.

Hai mẫu tương ứng OPERATING/GOAL trong source V2; không được giả định T1/V1 có cùng enum hoặc điều kiện hoàn. Giữ các quỹ cũ qua adapter; không tự ánh xạ mẫu sang template chưa kiểm chứng. Không hiện yield, chia thanh khoản L1/C-Chain hoặc miễn gas khi deployment không hỗ trợ. Nhiệm vụ escrow và xoay vòng chưa nằm trong selector tạo quỹ thật.

## Bố cục

Dùng trang theo bước cho form dài; điện thoại ưu tiên một cột. Hai cột lựa chọn chỉ khi nhãn và vùng chạm vẫn đạt ở 320px. Không ép card có chiều cao cố định hoặc chữ nhỏ để nhét nội dung. Một CTA chính mỗi bước; quay lại giữ dữ liệu.

Body/input 16px, vùng chạm ít nhất 44px. Hành động dưới cùng có safe-area và khoảng trống khi bàn phím mở. Điều kiện quan trọng ở bước xem lại luôn thấy được, chi tiết kỹ thuật mở theo nhu cầu. Không lồng modal hoặc ẩn lỗi trong toast.

## Trạng thái và kiểm tra

Kiểm tra quorum độc lập và ví hợp lệ. Từ chối ký, sai mạng, đổi tài khoản, thiếu gas, mất kết nối và receipt chưa đối soát phải có cách phục hồi. Không tạo mapping quỹ tài chính chỉ từ payload client. Reload/quay lại từ ví tiếp tục yêu cầu đã gửi thay vì deploy lại.

Kiểm tra 320/360/390/430px, tên dài, nhiều thành viên, phóng chữ, input cuối khi mở bàn phím, back/reload và chuyển ứng dụng ví. Lưu bằng chứng theo checklist chung. Không dùng tỷ lệ cắt chữ hoặc tuyên bố “zero AI slop” làm kết quả nếu chưa đo và kiểm chứng.

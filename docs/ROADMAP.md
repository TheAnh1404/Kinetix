# Lộ trình phát triển

Cập nhật: 15/11/2026. Đây là công việc đề xuất, không phải tính năng đã phát hành. Xem [hiện trạng](STATUS.md).

Mô hình triển khai từng quỹ và trình tạo chung được chốt làm baseline tại [FUND_OPERATING_MODEL.md](FUND_OPERATING_MODEL.md); ưu tiên và kịch bản nghiệm thu theo [FUND_MODEL_ACCEPTANCE.md](FUND_MODEL_ACCEPTANCE.md). Các mô hình mở rộng không tự trở thành hạng mục phát hành chỉ vì đã có đặc tả.

## 1. Kiểm chứng nhu cầu

Phỏng vấn 5–8 CLB/cộng đồng, ưu tiên người trưởng thành đã dùng ví. Quan sát một vòng thu chi thực tế, kiểm tra nhu cầu duyệt, đối soát, bàn giao và ký trên điện thoại. Chốt điều kiện góp, hoàn, chi, rời nhóm và đóng quỹ. Đầu ra: bằng chứng nhu cầu, hai mẫu quỹ và phạm vi pilot theo [định hướng](PRODUCT_DIRECTION.md).

## 2. Quyền và hợp đồng

Inventory T1/V1/ví chung; đánh giá tái sử dụng trước khi viết contract mới. Tách quyền quản lý nhóm và quyền tiền; thiết kế quorum, hạn mức, thay chính sách và phục hồi. Đầu ra: ma trận quyền, đặc tả contract, kiểm thử invariant và kế hoạch chuyển đổi theo [đặc tả](GROUP_FINANCE_SPEC.md).

## 3. Backend và dữ liệu

Mô hình hóa nghĩa vụ góp, khoản nhận, đề nghị chi, chứng từ, phê duyệt và payment. Hoàn thiện isolation, idempotency, finality/reorg và đối soát. Migration additive cần dry-run và kế hoạch khôi phục. Không tự chuyển tiền hoặc cấp quyền từ enum cũ. Đầu ra: API contract, migration và integration tests trên database riêng.

## 4. Giao diện điện thoại

Triển khai Tổng quan, Quỹ, Chờ xử lý, Hoạt động và các tác vụ thành viên/cài đặt/báo cáo trên điện thoại. Hoàn thiện xem lại, ký ví, quay lại ứng dụng và phục hồi trạng thái. Áp dụng [chuẩn UX](MOBILE_UX_STANDARD.md). Có thể thiết kế/prototype song song khi API chưa sẵn sàng, với dữ liệu mô phỏng ghi rõ.

## 5. Pilot Fuji

Thử với 3–5 nhóm sau khi luồng chính đạt [checklist](MOBILE_ACCEPTANCE.md). Ghi lỗi, điểm cần trợ giúp, thời gian hoàn thành và việc dùng lại ở kỳ tiếp theo. Tối thiểu 3 nhóm tự hoàn tất vòng thu–chi–đối soát là ngưỡng nội bộ đề xuất để đánh giá tiếp tục, không thay thế gate bảo mật.

## 6. Điều kiện xem xét tiền thật

Kiểm toán độc lập và khắc phục phát hiện; xác minh deployment/quyền quản trị; giám sát worker, cảnh báo, backup/restore và diễn tập sự cố. Kiểm tra thiết bị/ví thật. Chốt tài sản thanh toán và yêu cầu pháp lý phù hợp thị trường trước khi nhận tiền thật. Passing local tests không tự mở mainnet.

## Sau luồng lõi

ROSCA, nhiệm vụ/thưởng, passkeys, PWA, stablecoin, fiat/off-ramp, yield, cross-chain và L1 riêng được đánh giá riêng sau pilot. Không hứa ngày phát hành, lãi cố định, miễn gas hoặc tích hợp chưa xác minh. Phục hồi ví không phải inheritance; reserve-funded accrual không phải yield thực tế.

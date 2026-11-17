# Nghiệm thu ứng dụng trên điện thoại

Trạng thái: checklist cho lần triển khai tiếp theo; chưa có kết quả thiết bị trong đợt chuẩn hóa tài liệu 15/11/2026.

Cập nhật source 16/11/2026: đã nối adapter ví cá nhân và chỉnh các form/điều hướng. Chrome bị từ chối quyền điều khiển nên chưa có ảnh viewport hoặc kết quả ví điện thoại thật; không đánh dấu checklist dưới đây là đạt từ build/typecheck. Xem [bằng chứng và phần chưa hỗ trợ](DEMO_TO_LIVE_2026-11-16.md).

## Phạm vi kiểm tra

| Môi trường | Mục đích |
| --- | --- |
| 320, 360, 390, 430 CSS px | Reflow, chữ, số tiền, hành động chính |
| 768 và 1280 CSS px | Mở rộng tablet/desktop, giữ cùng khả năng |
| Safari iOS và Chrome Android trên máy thật | Bàn phím, safe area, tải chứng từ, chuyển ứng dụng ví |
| Môi trường ví di động được sản phẩm hỗ trợ | Kết nối, đổi tài khoản/mạng, ký, quay lại ứng dụng |
| Zoom 200%, bàn phím và screen reader | Thứ tự focus, label, lỗi và trạng thái |

Ghi phiên bản OS/browser/ví, viewport, commit và deployment cho mỗi lần nghiệm thu. Giả lập viewport không thay thế kiểm tra ví hoặc bàn phím trên máy thật. Môi trường chưa chạy ghi “Chưa kiểm tra”, không đánh dấu đạt.

## Luồng cần hoàn tất trên điện thoại

- [ ] Đăng ký/đăng nhập, liên kết ví và trở lại đúng trang được mở trước đó.
- [ ] Tạo nhóm, mời thành viên, chấp nhận lời mời và chuyển nhóm.
- [ ] Tạo Quỹ hoạt động/Quỹ mục tiêu, chọn người duyệt, quorum và xem chính sách.
- [ ] Góp tiền, xem nghĩa vụ còn thiếu và đối soát khoản nhận.
- [ ] Gửi đề nghị chi, thêm/đổi/xóa chứng từ và kiểm tra số tiền/người nhận.
- [ ] Người có quyền duyệt/từ chối; người ngoài phạm vi không xem hoặc thao tác được.
- [ ] Ký thanh toán, theo dõi receipt và xem lịch sử sau khi tải lại.
- [ ] Xem thành viên, sửa quyền tổ chức, bàn giao theo quyền tài chính thực tế.
- [ ] Xem báo cáo, lọc lịch sử và tải/xem tệp xuất nếu tính năng được phát hành.
- [ ] Rời nhóm, xử lý quỹ còn tiền và đóng quỹ theo chính sách; tính năng chưa hỗ trợ phải nói rõ.

## Các tình huống gây lỗi

- [ ] Tên nhóm/thành viên dài, tiếng Việt có dấu, địa chỉ ví dài, số dư lớn và số lẻ nhỏ.
- [ ] Bàn phím mở ở input cuối, bàn phím đóng/mở, xoay máy, back và cuộn cuối sheet.
- [ ] Không có dữ liệu, tải chậm, API lỗi, mất mạng, reconnect và worker chậm.
- [ ] Từ chối ký, thiếu gas, sai chain, đổi ví trong lúc xem lại, timeout và receipt revert.
- [ ] Nhấn gửi hai lần, reload sau khi gửi, hai người cùng duyệt/chi, đề nghị hết hạn.
- [ ] Phiên hết hạn khi quay từ ví, deep link lỗi và ví chưa cài.
- [ ] Tệp quá lớn, sai định dạng, upload gián đoạn, chứng từ không có quyền xem.
- [ ] Membership bị thu hồi hoặc policy thay đổi trong khi trang đang mở.

## Điều kiện đạt

Không còn tràn ngang toàn trang ở 320px, nút/input bị che, nội dung tài chính quan trọng bị cắt, điều khiển chỉ dùng hover, submit trùng hoặc thông báo thanh toán sai thực tế. Không có tác vụ thiết yếu yêu cầu chuyển sang desktop. Nội dung đạt [chuẩn UX](MOBILE_UX_STANDARD.md); hướng dẫn dài nằm đúng nơi cần đọc.

Chặn phát hành khi có sai tiền/người nhận, vượt quyền, ghi trùng, mất dấu giao dịch hoặc không hoàn tất luồng chính trên môi trường điện thoại được cam kết. Lỗi nhỏ còn lại phải có mức độ, chủ sở hữu và cách xử lý. Không tuyên bố “không lỗi” chỉ vì build/test pass.

## Bằng chứng cần lưu

PR có ảnh 360/390px cho màn hình đổi, ảnh desktop nếu đổi responsive, video ngắn luồng ký ví và kết quả các trạng thái lỗi liên quan. Báo cáo ghi expected/actual, cách tái hiện, môi trường, mã yêu cầu và transaction hash công khai nếu có; che dữ liệu cá nhân, token và chứng từ riêng tư.

Kết quả automated tests, kiểm tra trực quan, accessibility và máy thật ghi riêng. Khi chưa có quyền truy cập thiết bị hoặc ví, nêu rõ giới hạn; không dùng đánh giá từ source để thay kết quả thực hành.

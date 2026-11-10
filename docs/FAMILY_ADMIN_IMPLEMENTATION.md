# Family Admin và Cài đặt tài khoản

## Quyền được triển khai

Yêu cầu mới nhất thay thế phần chuyển giao và ủy quyền trong `FAMILY_ADMIN_PRODUCTION_PLAN.md`: **chỉ người tạo gia đình là chủ nhà**, và chỉ quản trị khi đang mở đúng gia đình đó. Không có quyền quản trị toàn ứng dụng và không có nút cấp quyền chủ nhà cho người được mời.

| Ngữ cảnh | Quản trị gia đình | Hoạt động tài chính |
| --- | --- | --- |
| Người tạo A đang mở A, membership ADMIN còn hiệu lực | Có | Theo quyền hũ, ví ký, quorum và số dư |
| Người tạo A tham gia B | Không | Theo quyền thành viên được giao tại B |
| Guardian được mời, kể cả còn cờ quản lý cũ | Không | Theo quyền hũ; quyền ký hợp đồng không tự sinh từ quyền ứng dụng |
| Raw ADMIN không trùng người tạo, thiếu bằng chứng người tạo, hoặc membership bị khóa | Không | Bị kiểm tra lại theo phạm vi thực tế; membership bị khóa bị từ chối |

`membership()` chuẩn hóa vai trò từ database cho toàn bộ dịch vụ dùng chung. `shared/workspacePermissions.ts` được dùng ở frontend và backend; frontend lấy workspace từ phiên xác thực, không dùng vai trò toàn cục hay chế độ xem thử để cấp quyền. Chuyển gia đình/tài khoản hủy trạng thái màn hình và yêu cầu ký cũ.

## Chức năng

- `/dashboard/admin`: tổng quan, thành viên, mời thành viên bằng ví, thu hồi lời mời, khóa/mở truy cập tại gia đình, chính sách hũ, nhật ký, CSV và cấu hình.
- Thay hạn mức SHIELD/SAVINGS giữ nguyên đơn vị wei; chặn khi còn nghiệp vụ hoặc tiền giữ chỗ. ROSCA đang chạy không được sửa mức góp/thứ tự nhận.
- Lưu trữ hũ yêu cầu không còn tiền, reservation, nghiệp vụ hoặc giao dịch liên quan chưa hoàn tất. Hũ lưu trữ không được chọn cho giao dịch mới.
- Lưu trữ gia đình kiểm tra tiền, nghiệp vụ, giao dịch và contract vault còn hoạt động. Khôi phục vẫn giữ trạng thái tạm dừng chi đến khi chủ nhà xác nhận mở riêng.
- Tạm dừng chi tác động đến yêu cầu mới và bước chuẩn bị thanh toán trong sổ cái. Đối soát receipt và hủy giao dịch vẫn hoạt động. Đây không phải lệnh pause EOA hoặc smart contract, và không hủy giao dịch đã broadcast.
- CSV theo phạm vi gia đình, tối đa 366 ngày/10.000 giao dịch; chứa số tiền wei, trạng thái và tx hash, chống công thức CSV. Không xuất mật khẩu, phiên đăng nhập hay ảnh minh chứng.
- `/settings`: hồ sơ cá nhân, đổi mật khẩu, thu hồi phiên, xác thực lại Core, ví đã xác minh, tùy chọn hiển thị/riêng tư, danh sách gia đình và quyền hiện tại. Các liên kết cũ được ánh xạ sang màn hình mới.

## Xác nhận thay đổi nhạy cảm

1. Backend kiểm tra phiên còn hiệu lực và chủ nhà đúng workspace.
2. Chuẩn bị intent với request ID, revision, payload, actor, session digest, workspace, origin và hạn 5 phút. Chuẩn bị chưa áp dụng thay đổi.
3. Giao diện hiển thị nội dung thay đổi và thông điệp ký; Core ký bằng ví chủ nhà đã liên kết.
4. Backend kiểm tra lại phiên, quyền, revision, hạn dùng, chữ ký và nội dung được ký. Advisory lock giao dịch ngăn hai thay đổi ghi đè nhau.
5. Thay đổi dữ liệu, tăng revision, hoàn tất intent và ghi audit trong cùng transaction. Gửi lại intent đã hoàn tất không thực hiện thao tác lần hai.

Chữ ký quản trị xác nhận thay đổi ứng dụng; không tạo tx hash giả và không được dùng để đánh dấu chuyển tiền thành công. Các API đồng bộ cũ không xác minh được blockchain đã trả 410.

## Migration và vận hành

`0017_family_owner_admin.sql` thêm người tạo, trạng thái quản trị, intent và cờ lưu trữ hũ. Với dữ liệu cũ, chỉ nhận chủ nhà khi có bằng chứng khớp ví người tạo hoặc bản ghi đăng ký, và kết quả là duy nhất. Bản ghi không đủ bằng chứng giữ trạng thái không có quyền quản trị, cần kiểm tra hồ sơ trước khi xử lý; không tự chọn một ADMIN bất kỳ.

Migration đã được áp dụng trên database cấu hình hiện tại; `npm run db:check` xác nhận không thiếu cột. Không reset database ứng dụng để chạy test. Kiểm thử tích hợp phải dùng `TEST_DATABASE_URL` riêng và `AUTH_TEST_ALLOW_RESET=true`.

CI cài dependency của cả monorepo, kiểm tra contract/API/UI, dùng PostgreSQL tạm cho test tích hợp, build hai image rồi smoke test Compose. Backend container dùng Node 24 cho Argon2, đặt dependencies ở root để `shared/` resolve đúng, chạy non-root, và có gateway PostgreSQL cho driver Neon hiện hữu. Release gọi lại CI trước khi xuất bản image.

Các bước xác nhận khi phát hành: chạy CI xanh, kiểm tra Core trên trình duyệt với hai gia đình, kiểm tra Docker trên máy có Docker Engine, và hoàn tất cấu hình môi trường thật. Ví kho tiền hiện tại và Fuji là kiến trúc testnet của dự án; không coi phân quyền ứng dụng là quyền sở hữu riêng tài sản on-chain của mỗi gia đình.

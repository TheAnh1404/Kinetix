> **Historical engineering note.** This document may describe superseded plans or validation results. See the [current project status](STATUS.md) for supported behavior and deployment evidence.

# Bàn giao ba giao diện hũ

## Truy cập

- `/dashboard/elderly`: hũ an sinh, số dư khả dụng, hạn mức còn trong ngày UTC, xem lại yêu cầu, duyệt và thanh toán.
- `/dashboard/kids`: quỹ việc nhà và heo đất cá nhân, ảnh minh chứng, góp ý làm lại, duyệt thưởng, phân bổ vào heo đất hoặc chi ra ví, mục tiêu tiết kiệm.
- `/dashboard/rosca`: kỳ góp, phần cần góp, roster, thứ tự nhận, đề nghị giải ngân và bằng chứng dòng tiền.

Mỗi trang có lựa chọn Ví chung Core / Hũ smart contract. Hũ contract hiện có giữ nguyên nguồn tiền; các trang chi tiết legacy vẫn truy cập được. Giao diện ví chung đọc dữ liệu thật từ `/api/workspaces/:id/vault-experience`, không có dữ liệu mẫu được seed vào ứng dụng.

## Cấu hình lần đầu

Admin mở “Tạo hũ” ở trang tương ứng, đặt tên, chọn người thụ hưởng đã liên kết ví, người duyệt và ngưỡng duyệt. Thứ tự nhận ROSCA được chọn bằng các nút lên/xuống trước khi tạo; cấu hình này được giữ cố định sau khi tạo.

Tạo quỹ việc nhà và heo đất là hai hũ riêng: quỹ thưởng là nguồn tiền của gia đình; heo đất là khoản đã phân bổ cho đúng một người. Sau khi đủ duyệt việc, có thể chọn heo đất đúng trẻ để ghi hai bút toán đối ứng thay vì chuyển blockchain. Trẻ có thể đặt mục tiêu và yêu cầu rút từ heo đất qua người duyệt.

Hũ mới bắt đầu từ 0. Nạp qua form của hũ để gắn số tiền vào đúng ledger. Chỉ tạo hũ/quy tắc không tạo tiền hoặc thay đổi quyền ký ví Core. Chủ ví chung vẫn ký khoản chi bằng Core; quy trình duyệt off-chain không cưỡng chế được ví EOA như smart contract.

## Quy tắc và tính toàn vẹn

- Các hũ có chính sách không được chi qua API rút/chuyển generic để bỏ qua yêu cầu nghiệp vụ.
- Yêu cầu an sinh giữ chỗ ngay và kiểm tra hạn mức ngày. Sau 48 giờ chưa chuẩn bị thanh toán, worker tự hủy hiệu lực và giải phóng giữ chỗ. Người nhận có thể hủy trước khi có lệnh thanh toán. Yêu cầu đã hủy phải tạo mới để kiểm tra lại hạn mức.
- Việc nhà giữ chỗ tiền thưởng khi giao. Chỉ đúng người được giao nộp ảnh; ảnh PNG được validate/sanitize, chỉ người có quyền xem và bị xóa sau thời hạn 7 ngày. API tổng quan không tải ảnh theo mỗi lượt polling; ảnh được đọc riêng qua endpoint xác thực khi mở minh chứng.
- Duyệt là các user khác nhau; chuẩn bị chi kiểm tra lại người duyệt đang hoạt động và ví nhận. Một yêu cầu đủ duyệt chưa được gọi là đã chi trả.
- ROSCA góp đúng số wei cố định, mỗi thành viên một khoản/kỳ. Chưa đủ thành viên hoặc chưa đủ thời gian không được đề nghị chi. Kỳ chỉ tăng trong cùng transaction database ghi nhận receipt chi trả finalized.
- Các lệnh thanh toán tiếp tục dùng intent/nonce/memo cố định, lưu hash thay thế/hủy, kiểm tra canonical block và finalized. Chuyển nội bộ có mã đối soát, không tạo tx hash giả.
- Mọi thao tác quan trọng có audit. Các thông điệp miễn gas/lợi suất không hoạt động đã được loại khỏi nhãn chính và metadata của trang.

## Dữ liệu mới

Migration `0015_treasury_workflows` thêm policies, jobs và audit. `0016_treasury_request_expiry` thêm trạng thái hết hạn và audit actor hệ thống. Migration đã được áp dụng vào database được cấu hình, không reset hoặc seed dữ liệu tiền/người dùng.

Giữ API/worker cùng chạy (`npm run dev:all`). Worker xử lý receipt, hết hạn yêu cầu và dọn ảnh; tắt worker sẽ làm các bước đồng bộ tự động chậm lại. Quorum cố định có thể không đủ nếu guardian bị thu hồi quyền; cần đối soát/cấu hình một hũ thay thế, không tự hạ ngưỡng duyệt.

## Kiểm tra

```sh
npm run typecheck
npx tsc --noEmit -p backend/tsconfig.json
npx tsc --noEmit -p frontend/tsconfig.json
npm test
npm run test:auth
```

Production build trong PowerShell hạn chế tạo child process:

```powershell
$env:KINETIX_CONSTRAINED_BUILD="true"
$env:KINETIX_BUILD_DIR=".next-treasury-check"
$env:OUTPUT_STANDALONE="true"
npm --prefix frontend run build
```

Chấp nhận PostgreSQL dùng database riêng, không dùng DATABASE_URL của ứng dụng:

```powershell
$env:TEST_DATABASE_URL="postgresql://user:password@127.0.0.1:5432/kinetix_tests"
$env:AUTH_TEST_ALLOW_RESET="true"
node scripts/run-local-postgres-tests.cjs --treasury
```

Các bài unit chạy service thật với biên database/RPC mô phỏng và kiểm tra render React. Script acceptance mới kiểm tra PostgreSQL thật, concurrent idempotency, reservation, quorum, bypass API, thưởng vào heo đất, quyền riêng tư và mức góp chính xác; CI chạy script này với PostgreSQL disposable.

## Giới hạn xác minh trong phiên này

Chưa có bài kiểm tra chuyển AVAX thật và chưa có ảnh desktop/mobile được duyệt bằng trình duyệt. Công cụ computer-use từ chối quyền điều khiển Google Chrome. PostgreSQL cục bộ có binary nhưng không khởi động được dưới restricted token của môi trường, nên bài acceptance database riêng được chuẩn bị cho CI, chưa chạy cục bộ. Không coi các bài test mô phỏng hoặc render server là E2E Core/browser.

Các hạng mục cần thực hiện khi môi trường sẵn sàng: chạy CI trên GitHub; kiểm tra Compose thực; kiểm tra responsive 320/375/390/768/1024/1440px, bàn phím, screen reader, reduced motion; chụp ảnh ba trang; ký thử nạp/chi/hủy bằng Core trên Fuji với AVAX testnet.

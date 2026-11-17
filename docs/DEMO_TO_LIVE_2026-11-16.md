# Chuyển giao diện demo sang luồng có dữ liệu thật

Ngày: 16/11/2026. Phạm vi: mã nguồn ứng dụng, migration additive và kiểm thử cục bộ. Đây **không** phải xác nhận đã triển khai public, đã kích hoạt V2, đã nâng cấp database đang sử dụng hoặc đã nghiệm thu trên điện thoại thật.

## Phát hiện và xử lý

Giao diện trước đó có nhiều đường đang hiển thị dữ liệu minh họa như dữ liệu thật: hook quỹ tự tạo số dư và mã giao dịch; lỗi API/RPC bị bỏ qua; workspace rỗng được bổ sung nhóm mẫu; màn hình quản trị/ROSCA/an sinh dùng số liệu dự phòng. Phiếu duyệt và trạng thái trả tiền cũng có chỗ bị nhập làm một.

- `FamilyContext` chỉ sử dụng fixture khi đang ở `/demo`, có cờ demo và chưa đăng nhập. Phiên thật chỉ nhận membership từ API. Danh sách rỗng hoặc lỗi không được thay bằng nhóm, tiền hay người dùng mẫu. Đổi nhóm xóa dữ liệu cũ trước khi tải; không tự chọn người đầu tiên làm người đang đăng nhập.
- `AppShell` dùng danh sách nhóm thật, bỏ preset số dư USDC, thao tác tự tạo nhóm khi chọn loại và thanh đổi vai diễn trong phiên thật. Tạo nhóm không hứa tự tạo quỹ mẫu.
- Router thật dùng `GuardianView`, `ElderlyPortal`, `KidsPortal`, `GuardianMobileView` và `RoscaView`; không dùng `ModernAdminDashboard`, `ElderlyDashboard` hoặc `RoscaTimeline` làm màn hình giao dịch thật. Các prototype còn trong source không phải bằng chứng tính năng đang phục vụ.
- Trang giới thiệu/đăng nhập bỏ quảng cáo 0 gas, lợi suất 8% và bảo đảm chống gian lận. Không đổi hợp đồng hoặc deployment manifest.

## Inventory và đường vào

| Khu vực | Đường vào / source | Ranh giới hiện tại |
| --- | --- | --- |
| Tài khoản | `/login`, `/register`, `/activate`, `/settings`, `useAuth` | Giữ xác thực mật khẩu và chứng minh ví hiện hành; không giả lập tài khoản bằng persona |
| Quỹ chung | `/dashboard/finance`, `useGroupFinance` | Bốn mục Tổng quan, Quỹ, Chờ xử lý, Hoạt động dùng API thật |
| Thành viên | `/dashboard/finance/members` | Roster, lời mời gắn ví, nhận mã mời, tạo nhóm thật; không suy quyền tiền từ enum cũ |
| Quản trị | `/dashboard/finance/manage` | Chủ nhóm dùng console quản trị hiện hành; người khác chỉ xem roster; archive bị chặn khi còn quỹ chung hoạt động |
| Quỹ contract T1 và sổ Core cũ | `/dashboard/admin`, `/dashboard/elderly`, `/dashboard/kids`, `/dashboard/rosca`, `/dashboard/tools` | Dùng adapter hiện hành và quyền được backend/contract kiểm tra; không đổi tên role thành quyền rộng hơn |
| Thiết lập ban đầu | `/start` | Có lối vào quỹ chung mà không cần hoàn tất cấu hình contract T1 |
| Demo | `/demo` khi bật cờ | Dữ liệu minh họa riêng; không được dùng làm fallback cho phiên thật |

## Luồng quỹ ví cá nhân đã nối

Tạo quỹ hoạt động/mục tiêu → góp AVAX → lập đề nghị kèm ảnh PNG đã kiểm tra → người duyệt độc lập biểu quyết → ví giữ tiền ký → RPC xác minh → ghi sổ và xuất báo cáo.

**Lưu ký:** mỗi quỹ mới công bố chính ví đã liên kết của người tạo làm ví giữ tiền. Người này vẫn có thể kiểm soát tiền ngoài ứng dụng. Quorum trong database chỉ điều khiển workflow ứng dụng, không tạo multisig và không cách ly vật lý tiền của các quỹ dùng cùng ví. Số dư hiển thị là sổ các giao dịch đã đối soát, không phải cam kết số dư ví hiện có.

Chọn ít nhất hai ví người duyệt không trùng, thuộc thành viên đang hoạt động; ngưỡng nhỏ hơn số người duyệt. Người nhận không được tự duyệt. ADMIN không tự có quyền duyệt, từ chối hoặc đổi chính sách quỹ. Trước tạo lệnh thanh toán, backend kiểm lại người duyệt vẫn có membership và ví tương ứng.

Chi nhanh bị tắt trong adapter này. Mục tiêu chỉ mở quyền đề nghị khi đạt số tiền; hết hạn không tự mở khóa. Quyền hoàn tự động, thay chính sách qua quorum, bàn giao ví, rời nhóm và đóng quỹ **chưa được tích hợp**; không hiển thị chúng như đã hỗ trợ. Chưa đáp ứng điều kiện pilot tiền thật của đặc tả sản phẩm.

## Lệnh chuyển và accounting

- Migration `0019_group_finance_transfers` thêm binding ví giữ tiền, bảng intent và trạng thái `PAYMENT_PENDING`; không đổi enum/ABI cũ, không chuyển tài sản.
- Intent lưu user, fund, loại lệnh, sender, recipient, amount bằng wei, nonce và memo UUID trước khi mở ví. Mỗi ví chỉ có một lệnh chưa kết thúc trong adapter này.
- Chỉ xác nhận sau khi kiểm chain 43113, receipt thành công, sender/recipient/value/nonce/memo, block canonical và finality. Không có fallback khi RPC lỗi. Không dùng số tiền client để ghi sổ.
- Thanh toán đang ký/gửi tiếp tục giữ reservation; không được hủy hoặc tự hết hạn để chi lại tiền. Retry và worker không phát lại giao dịch chuyển tài sản. Mã giao dịch được lưu phía trình duyệt và gửi lên server để đối soát.
- Khi ví không trả hash, ứng dụng giữ trạng thái chưa chắc chắn. Khi đã hủy/thay thế/thất bại, chỉ mở lại sau bằng chứng giao dịch cùng nonce đã finalized và không trả tiền đúng lệnh. Thay phí có thể được đối soát bằng hash mới nếu cùng nội dung và nonce.
- Ghi số dư và reservation trong transaction có khóa chung. Hết hạn/hủy/từ chối giải phóng một lần. Chỉ settlement đã xác minh mới giảm số dư; không ép sổ âm thành zero.
- Worker quỹ chung chạy độc lập với điều kiện triển khai T1. Intent đã xác nhận có replay protection; đối soát lại không ghi tiền lần hai.
- Các quỹ cũ chưa có binding mới được liệt kê riêng, không cộng vào số dư hay bật giao dịch. Báo cáo chỉ lấy contribution/payment gắn với intent mới đã xác nhận. Không tự công nhận số liệu từ backend demo cũ là tiền thật.

## Điện thoại, chứng từ và báo cáo

Form tạo quỹ tách ba bước, có xem lại nơi giữ tiền và giới hạn. Form chi có bước xem lại số tiền chính xác, người nhận và quorum. Draft được lưu theo tài khoản/nhóm trong sessionStorage; khóa yêu cầu đi cùng nội dung để retry không tạo bản ghi trùng.

Dialog mới dùng native modal để giữ focus, hỗ trợ Escape và trả focus. Dùng viewport động, safe area, input 16px, nút chính 48px, địa chỉ có thể xuống dòng. Đây là thay đổi source, **chưa chứng minh reflow ở 320px**.

Ảnh JPG/PNG/WebP được chuẩn hóa thành PNG, bỏ metadata; backend kiểm CRC, dữ liệu giải nén và kích thước. Chứng từ lưu off-chain trong API có kiểm tra membership, không tạo URL ảnh công khai. Chính sách lưu/xóa chứng từ dài hạn vẫn cần hoàn thiện trước pilot có dữ liệu thật.

Hoạt động phân trang bằng cursor PostgreSQL có giữ độ chính xác timestamp; báo cáo CSV xuất theo khoảng ngày, gồm wei và hash thật, bảo vệ ô bắt đầu bằng công thức. Chỉ xuất khoản đã xác nhận. Nếu quá 1.000 khoản thu hoặc chi trong khoảng chọn, API yêu cầu thu hẹp khoảng, không cắt báo cáo âm thầm. Khi mở CSV bằng bảng tính, nhập cột wei dạng text để giữ đủ chữ số.

## Migration và vận hành

Chỉ áp dụng migration sau khi xác định database đích và chuẩn bị bản sao/khôi phục theo quy trình dự án. Không chạy migration trên database ứng dụng trong đợt này. Không backfill ví giữ tiền từ địa chỉ hardcode, vai trò ADMIN hay tên nhóm. Bản ghi cũ cần đối soát và binding riêng; giữ nguyên dữ liệu để kiểm tra.

Các tiến trình dùng cùng PostgreSQL và cấu hình BFF hiện hành. Sau migration và build, truy cập `/dashboard/finance`. Giao dịch cần đúng ví đã liên kết, AVAX thử nghiệm và RPC Fuji. Trình duyệt có provider Core hoặc session provider đã đăng ký mới ký được; chưa tích hợp pairing WalletConnect/deep link cho trình duyệt điện thoại thông thường.

Lệnh kiểm tra mới: `npm run test:group-finance:local`. Bắt buộc cấu hình database dùng một lần, khác database ứng dụng và bật opt-in theo [CONTRIBUTING.md](../CONTRIBUTING.md). Runner **xóa dữ liệu trong database kiểm thử được chỉ định** trước khi tạo fixture. Không dùng database có dữ liệu cần giữ.

## Bằng chứng và giới hạn nghiệm thu

- Bộ nghiệm thu gồm 20 tình huống tích hợp trên PostgreSQL 18 riêng và EVM Hardhat cục bộ có chain ID 43113. Kiểm tra receipt, finality, replay, isolation, quorum, reservation cạnh tranh, mục tiêu, báo cáo, tạm dừng chi và khôi phục nonce. Chain ID trùng Fuji không biến EVM cục bộ thành deployment Fuji.
- Có hồi quy hook thật cho trạng thái rỗng/lỗi API, wei chính xác, bỏ dữ liệu demo không có binding và response cũ về sau đổi nhóm. Các ví dụ số học rời khỏi code thật trong test cũ đã được thay bằng kiểm tra adapter đang chạy.
- Chrome bị công cụ từ chối quyền điều khiển; không có ảnh viewport 320/360/390/430/768/1280 trong đợt này.
- Safari iOS, Chrome Android, bàn phím thật, chuyển ứng dụng ví, Core mobile, zoom 200% và screen reader: **Chưa kiểm tra**.
- Chưa triển khai ứng dụng public, chưa xác minh giao dịch mới trên Fuji, chưa kích hoạt V2 và chưa có audit độc lập. Không dùng thay đổi này làm bằng chứng sẵn sàng mainnet hoặc pilot tiền thật.

Build production đã đạt với cấu hình hạn chế tài nguyên `KINETIX_CONSTRAINED_BUILD=true`; lệnh build mặc định bị môi trường từ chối spawn worker. Typecheck root/backend/frontend và kiểm tra tài liệu đã chạy đạt. Bộ hồi quy PostgreSQL đầy đủ còn 4 bài wizard cũ được đánh dấu bỏ qua; không gọi đây là nghiệm thu toàn bộ wizard hoặc CI xanh. Đã thêm bước tích hợp quỹ chung vào CI nhưng chưa chạy trên GitHub; job dùng `FORBID_PENDING_TESTS=true` vẫn cần xử lý các bài pending trước khi đạt gate đó.

| Kiểm tra cục bộ cuối đợt | Kết quả |
| --- | --- |
| Hardhat suite với PostgreSQL dùng một lần và transport kiểm thử | 415 đạt, 4 pending, 0 lỗi |
| `npm run test:group-finance:local` | 20 tình huống đạt, gồm giao dịch EVM thật trong mạng cục bộ |
| Hồi quy hook/bộ ký quỹ chung | Có trong suite; lỗi API, đổi scope, ký không chắc chắn, nonce và storage sau broadcast |
| Typecheck root/backend/frontend | Đạt |
| Frontend production build, constrained worker | Đạt |
| `npm run docs:check`, `git diff --check` | Đạt |
| Database ứng dụng, deployment public, ví Fuji và thiết bị điện thoại thật | Chưa áp dụng / chưa nghiệm thu |

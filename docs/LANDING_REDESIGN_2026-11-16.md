# Landing page — 16/11/2026

Phạm vi: trang chủ và giao diện giới thiệu, không thay API, schema, quyền tài chính hoặc deployment.

## Bản hiện tại sau phản hồi “AI slop” — 16/11/2026

- Bỏ các dải giới thiệu đối tượng, badge, thẻ trang trí, biểu tượng lặp lại, câu khẩu hiệu và CTA cuối trang. Giữ logo có sẵn, nền tối và màu đỏ cho hành động chính.
- Hero dùng tiêu đề trực tiếp “Quản lý quỹ chung”, giới thiệu ngắn và một CTA tạo nhóm. Không có glow hoặc gradient mới.
- Ví dụ sổ quỹ chỉ thể hiện số dư, tiền giữ chỗ/tiến độ và ba dòng thu chi. Không có nút giao dịch giả, avatar hoặc số người dùng giả. Nội dung minh họa vẫn được gắn nhãn.
- Hai loại quỹ dùng hai cột văn bản; quy trình chi dùng ba bước. Thông tin custody, quyền và giới hạn bản thử nghiệm nằm trong ba câu hỏi.
- Thiết kế source chuyển về một cột dưới 760px; toàn bộ phần đọc và quyết định bên ngoài minh họa dùng body 16px/nhãn phụ 14px. Chưa có ảnh viewport hoặc nghiệm thu trực quan, zoom 200%, screen reader hay điện thoại thật vì browser access host không khả dụng.

Kiểm chứng bản hiện tại: frontend typecheck, production build với constrained worker và `git diff --check` đạt. HTTP cục bộ trả 200; HTML có một h1, bốn section, bộ chọn mẫu quỹ, ba FAQ và các đường dẫn tài khoản; CSS tải được. Đây là kiểm tra kỹ thuật, không phải xác nhận hình thức hoặc thao tác trên trình duyệt. Các kết quả bên dưới thuộc các bản trước.

## Bản sửa nền tối lần đầu — đã được thay thế

Người dùng đánh giá bản kem–xanh xấu hơn giao diện trước. Bản sửa này quay lại nền tối `#090D16`, đỏ Avalanche, logo Kinetix đầy đủ và hero căn giữa. Không phục hồi nội dung cũ về APY, miễn gas hoặc quyền tài chính theo thế hệ.

- Thay toàn bộ stylesheet của bản kem–xanh; bỏ minh họa thẻ nghiêng và các màu xanh làm chủ đạo.
- Bản xem trước là một cửa sổ sản phẩm: số dư và thao tác bên trái, đề nghị chi/mục tiêu bên phải. Source chuyển thành một cột dưới 600px. Số liệu vẫn ghi rõ là minh họa.
- Giữ bộ chọn hai mẫu quỹ, menu điện thoại, FAQ, focus và reduced motion. Chưa có kết quả thao tác trực quan trong trình duyệt cho bản sửa này.
- Truy vấn skill về bố cục landing không trả về kết quả phù hợp; quyết định hình thức dựa trên phong cách cũ trong repository, phản hồi người dùng và quy chuẩn dự án.

Kiểm chứng bản sửa: frontend typecheck, production build và HTTP trang chủ/CSS đạt. Browser access host tiếp tục không khả dụng; chưa có ảnh viewport, chưa kiểm tra trên điện thoại thật, zoom 200% hoặc screen reader.

## Thiết kế lần đầu — đã được thay thế

- Nền kem, chữ Inter/Plus Jakarta Sans có sẵn, điểm nhấn đỏ Avalanche và các bề mặt xanh nhạt. Giữ biểu tượng Kinetix hiện có.
- Hero hai cột ở desktop, một cột trên điện thoại; CTA tạo nhóm và đường vào đăng nhập rõ ràng.
- Bản xem trước có nút chọn Quỹ hoạt động/Quỹ mục tiêu. Số tiền được ghi rõ là minh họa, không lấy từ tài khoản hoặc giả lập giao dịch thật.
- Quy trình bốn bước, hai mẫu quỹ, giải thích nơi giữ tiền, FAQ mở/đóng và CTA cuối trang.
- Điều hướng điện thoại dùng native disclosure; FAQ dùng native details. Có skip link, focus rõ, vùng chạm tối thiểu 44px và hỗ trợ reduced motion.
- Trang chủ hiển thị nội dung công khai ngay trong lúc kiểm tra phiên. Người đã đăng nhập vẫn được chuyển vào ứng dụng theo luồng hiện hành.

Thông tin giữ nguyên ranh giới sản phẩm: AVAX trên Fuji có phí mạng; chủ ví cá nhân vẫn kiểm soát tiền; đủ duyệt chưa phải đã thanh toán; V2 và các phần vòng đời chưa hỗ trợ không được quảng cáo là đã hoàn tất.

## Kiểm chứng lần đầu

| Kiểm tra | Kết quả |
| --- | --- |
| Frontend typecheck | Đạt |
| Next.js production build với constrained worker | Đạt |
| HTTP trên bản production cục bộ | Trang chủ trả 200; HTML có một h1, các anchor, nhãn minh họa và CTA; CSS trả 200 |
| Đường dẫn đăng ký và dashboard khi chưa đăng nhập | Redirect tới đăng nhập theo luồng hiện hành; chưa kiểm thử gửi form đăng ký trong lần sửa này |
| `git diff --check` | Đạt |

Các breakpoint trong source hướng tới 320–390px và mở rộng lên desktop. **Chưa có ảnh viewport hoặc nghiệm thu trực quan** tại 320/360/390/430/768/1280px: browser access host không khả dụng trong phiên kiểm tra. Không suy ra không tràn ngang hoặc đạt accessibility chỉ từ build/source review.

Safari iOS, Chrome Android, zoom 200%, screen reader và ví di động thật: **Chưa kiểm tra**. Bản xem trước landing không xác nhận hỗ trợ ký ví hoặc sẵn sàng dùng tiền thật.

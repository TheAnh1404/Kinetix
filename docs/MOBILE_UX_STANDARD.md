# Quy chuẩn giao diện điện thoại và nội dung

Áp dụng toàn bộ ứng dụng: đăng nhập, onboarding, quỹ, duyệt, ví, thành viên, quản trị, cài đặt, lịch sử và báo cáo. Đây là tiêu chuẩn cần triển khai, không phải kết quả kiểm thử UI hiện tại.

## Bố cục và điều hướng

Thiết kế từ 360px, kiểm tra reflow ở 320px; mở rộng lên tablet/desktop. Một cột cho tác vụ chính. Không thu nhỏ dashboard desktop, giấu tác vụ thiết yếu sau hover hoặc yêu cầu xoay ngang để hoàn thành.

Không tràn ngang toàn trang. Danh sách thu chi dùng hàng/card có nhãn trên điện thoại; bảng thực sự cần đối chiếu nhiều cột có vùng cuộn riêng và chỉ dẫn. Tên dài, số lớn, địa chỉ ví và tiếng Việt không phá layout. Không cắt mất thông tin tài chính quan trọng; số chính xác mở được ở chi tiết và luôn có ở bước xác nhận.

Thanh điều hướng chính tối đa 4–5 mục có nhãn. Nút quay lại và tên nhóm/quỹ rõ ràng. Chuyển nhóm phải cập nhật dữ liệu, quyền và cache; không hiển thị số dư nhóm cũ trong trạng thái tải. Deep link trở về đúng tác vụ sau đăng nhập/ký ví.

Tôn trọng safe area, viewport động và bàn phím ảo. Fixed/sticky footer phải chừa khoảng nội dung tương ứng; không che input, lỗi, hàng cuối hoặc nút hệ thống. Form dài dùng trang riêng; bottom sheet dành cho chọn nhanh hoặc tác vụ ngắn. Chỉ một lớp dialog/sheet hoạt động.

## Mật độ nội dung

Mỗi màn hình tác vụ có một mục tiêu chính và một CTA chính theo trạng thái. Trang danh sách có thể có nhiều hàng cùng hành động nhưng không có nhiều nút cạnh tranh trong cùng một vùng.

Mục tiêu biên tập: tiêu đề khoảng 3–8 từ, mô tả mở đầu tối đa hai dòng ở 360px. Card danh sách có tên, số tiền/trạng thái và tối đa một dòng bổ trợ. Nếu nội dung cần dài hơn để hiểu đúng, tách thành bước hoặc chi tiết; không ép chữ nhỏ, truncate điều kiện chi hay ẩn lỗi để đạt số dòng.

Tổng quan ưu tiên: số khả dụng, việc cần làm, hoạt động gần đây. Hiển thị 3–5 mục gần nhất rồi “Xem tất cả”; danh sách đầy đủ có phân trang hoặc tải thêm, giữ vị trí khi quay lại. Không lặp cùng số liệu trong banner, card và đoạn giải thích.

Quy tắc, quyền rút/hoàn, người nhận, tài sản, phí, mạng và hậu quả thay đổi phải xuất hiện đúng bước quyết định. Chi tiết kỹ thuật như ABI, chain ID, hash và log nằm trong vùng chi tiết có thể mở; tên mạng và thông tin cần để ký đúng vẫn phải rõ.

## Chữ, chạm và hình thức

Body và input mặc định 16px; nhãn phụ khoảng 14px; không dùng chữ 10–12px cho thông tin cần hành động. Không giảm font để nhét layout. Hỗ trợ phóng chữ và zoom 200% mà không mất tác vụ.

Mục tiêu dự án: vùng chạm tối thiểu 44×44 CSS px, nút chính cao khoảng 48px, đủ khoảng cách giữa duyệt và từ chối. Tương phản mục tiêu 4.5:1 cho chữ thường, 3:1 cho chữ lớn và thành phần điều khiển cần nhận diện. Trạng thái có chữ/icon, không chỉ dùng màu. Focus nhìn thấy, label gắn input, icon-only có tên truy cập, lỗi được thông báo cho công nghệ hỗ trợ.

Dùng hệ typography, spacing, màu và icon có sẵn một cách nhất quán. Nền và bề mặt đơn giản, màu nhấn dành cho hành động và trạng thái. Tránh gradient phủ mọi card, glassmorphism thiếu tương phản, badge trang trí, emoji hàng loạt, animation số dư và minh họa chiếm chỗ của tác vụ. Chuyển động ngắn và tôn trọng reduced motion.

## Viết nội dung

Viết như một công cụ tài chính: nêu việc gì, số tiền nào, ai cần làm gì tiếp theo. Dùng ngôn ngữ thống nhất trong một luồng, dịch nhãn thay vì ghép tiếng Anh không cần thiết. Các giới hạn từ/số dòng là mục tiêu biên tập nội bộ, không phải tiêu chuẩn pháp lý hoặc WCAG.

| Tránh | Dùng |
| --- | --- |
| Kiến tạo tương lai tài chính minh bạch vượt trội | Góp tiền và theo dõi quỹ chung |
| Tận hưởng trải nghiệm phê duyệt liền mạch | Cần thêm 1 người duyệt |
| Your financial command center | Tổng quan quỹ |
| Thành công! khi mới đủ phiếu | Đủ duyệt · Chưa thanh toán |
| Đã xảy ra lỗi | Không gửi được yêu cầu. Thử lại. |
| Không ai có thể gian lận | Khoản chi này cần 2 trong 3 người duyệt |

CTA dùng động từ cụ thể: “Góp tiền”, “Gửi đề nghị”, “Duyệt chi”, “Mở ví”, “Thử lại”. Không dùng “Khám phá ngay” hoặc “Bắt đầu hành trình” trong luồng tác vụ. Không thêm lời chào dài, đoạn động viên hoặc giải thích lặp lại ở mỗi trang. Không hứa an toàn tuyệt đối, lãi cố định, miễn phí gas hay thanh toán tức thì khi hệ thống chưa bảo đảm.

## Form và xác nhận

Chia theo quyết định: mục đích → quy tắc/quyền → xem lại và ký. Giữ bản nháp khi quay lại hoặc chuyển ví; không lưu dữ liệu nhạy cảm vào URL/local storage tùy tiện. Input số tiền có inputmode phù hợp, đơn vị, số dư và lỗi gần trường. Xác định rõ dấu thập phân/phân cách hàng nghìn; không suy đoán chuỗi mơ hồ.

Màn hình xác nhận hiển thị quỹ nguồn, người nhận, số tiền chính xác, tài sản, mạng, phí ước tính và điều kiện duyệt. Thay đổi tài khoản/mạng/số tiền sau mô phỏng phải xác minh lại. Không ẩn thông tin này trong tooltip.

Yêu cầu quyền camera/tệp khi người dùng thêm chứng từ. Có chọn từ thư viện/tệp, giới hạn dung lượng và lỗi tải lên rõ ràng; không bắt buộc camera mới gửi được đề nghị. Chứng từ phải có preview và xóa/đổi được trước khi gửi.

## Ví và trạng thái

Kết nối/ký ví phải hoạt động khi ví ở ứng dụng khác. Desktop extension không phải bằng chứng hỗ trợ điện thoại. Chỉ quảng cáo phương thức kết nối đã được kiểm chứng. Nếu môi trường không hỗ trợ, nêu cách mở trong môi trường được hỗ trợ và giữ bản nháp; không để nút im lặng.

Tách chờ duyệt, chờ ký, đã gửi mạng, đang xác minh và đã thanh toán. Từ chối ký không phải mất tiền; timeout không mặc định là giao dịch thất bại. Tra cứu yêu cầu/hash cũ trước khi cho thử gửi lại. Đóng modal, tải lại hoặc quay từ ví không mất trạng thái. Khóa submit trùng; thông báo ngắn tại chỗ, không chỉ toast thoáng qua.

Mỗi màn hình có loading, empty, error, không đủ quyền, dữ liệu cũ và mất kết nối phù hợp. Không dùng 0 để thay số dư chưa tải. Khi dữ liệu chưa đủ để chi đúng, giải thích và chặn ký. Khi phục hồi kết nối, đối soát trước khi yêu cầu gửi lại.

## Nghiệm thu

Thực hiện [MOBILE_ACCEPTANCE.md](MOBILE_ACCEPTANCE.md). Đánh giá riêng nội dung, bố cục và trạng thái tài chính. Việc sửa tài liệu không chứng minh giao diện đã đáp ứng các tiêu chí này.

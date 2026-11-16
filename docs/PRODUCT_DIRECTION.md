# Định hướng sản phẩm Kinetix

Ngày quyết định: 15/11/2026. Đây là định hướng phát triển; các khả năng đã chạy được mô tả riêng trong [STATUS.md](STATUS.md).

## Sản phẩm

Kinetix giúp các nhóm cùng góp tiền, duyệt chi và theo dõi quỹ chung theo quy tắc đã thống nhất. Toàn bộ tác vụ thường ngày phải thực hiện được trên điện thoại. Desktop bổ sung không gian làm việc, không mở khóa nghiệp vụ thiết yếu mà điện thoại thiếu.

Gia đình, anh em, nhóm bạn và câu lạc bộ dùng chung mô hình tài chính. Loại nhóm chỉ gợi ý mẫu thiết lập và cách diễn đạt; không cấp quyền dựa trên tuổi hay quan hệ gia đình.

## Người dùng đầu tiên

Ưu tiên kiểm chứng với CLB và cộng đồng nhỏ có thành viên trưởng thành, thu chi lặp lại và đã quen dùng ví. Đây là giả thuyết thị trường, chưa phải bằng chứng về nhu cầu hoặc khả năng trả phí. Nhóm bạn và gia đình là các mẫu mở rộng. Trải nghiệm chuyên biệt cho trẻ nhỏ chưa thuộc phiên bản ưu tiên.

Phỏng vấn 5–8 nhóm trước khi chốt backlog triển khai lớn. Hỏi về kỳ thu chi gần nhất, khoản thiếu, cách duyệt, tranh chấp và bàn giao; quan sát công cụ đang dùng. Kiểm tra việc họ có chấp nhận giữ tiền trong ví/contract chung và ký bằng điện thoại. Không dùng câu hỏi dẫn dắt để coi lời khen là nhu cầu.

## Nghiệp vụ chung

Nhóm → Thành viên → Quỹ → Quy tắc → Khoản góp / Đề nghị chi → Phê duyệt → Thanh toán → Đối soát.

| Đối tượng | Ý nghĩa |
| --- | --- |
| Nhóm / workspace | Phạm vi cộng tác, thành viên và dữ liệu |
| Quỹ / vault | Tiền dành cho một mục đích, có chính sách và nơi giữ tiền rõ ràng |
| Khoản phải góp | Nghĩa vụ đã thống nhất; có thể chưa được thanh toán |
| Khoản góp | Tiền đã nhận và được đối soát |
| Đề nghị chi | Số tiền, tài sản, người nhận và mục đích cố định để xét duyệt |
| Phê duyệt | Quyết định hợp lệ theo chính sách; chưa phải thanh toán |
| Thanh toán | Chuyển tài sản, có bằng chứng và trạng thái riêng |

Tiền góp không tự tạo quyền sở hữu theo tỷ lệ, quyền biểu quyết hoặc quyền rút lại. Mỗi quỹ phải công bố cách sử dụng tiền dư, hoàn tiền, đóng quỹ và xử lý thành viên rời nhóm trước khi nhận góp.

## Phạm vi phiên bản ưu tiên

Hai mẫu khởi tạo: **Quỹ hoạt động** và **Quỹ mục tiêu**. Mẫu đầu hỗ trợ thu chi thường xuyên; mẫu sau có số tiền mục tiêu và hạn dự kiến. Điều kiện giải ngân, hoàn tiền và thay đổi mục tiêu phải được hiển thị rõ, không suy ra từ tên mẫu.

Luồng nghiệm thu: tạo nhóm → mời thành viên → tạo quỹ và xem quy tắc → góp tiền → đề nghị chi kèm chứng từ → duyệt → thanh toán → đối soát. Bổ sung bàn giao, rời nhóm và đóng quỹ theo chính sách trước khi thử nghiệm tiền thật.

ROSCA, thưởng việc nhà, yield, cross-chain, L1 riêng và tích hợp ngân hàng không nằm trên đường găng. Giữ tương thích tính năng cũ; không tự chuyển quỹ hoặc thay đổi tài sản người dùng khi đổi định hướng.

## Giá trị cần chứng minh

Kinetix phải giúp nhóm biết ai còn phải góp, khoản nào chờ ai duyệt, tiền đã chi chưa và ai có quyền thay đổi quy tắc. Với quỹ contract, quyền sử dụng tiền phải được thực thi on-chain. Với quỹ ví cá nhân, ứng dụng phải nói rõ chủ ví vẫn kiểm soát tiền; phiếu duyệt trong database không tạo ra multisig.

Không mặc định blockchain tốt hơn bảng tính/chuyển khoản cho mọi nhóm. Nếu người dùng chỉ cần ghi sổ VND và không chấp nhận ví, cần đánh giá lại thị trường hoặc mô hình thanh toán. Không quảng cáo tích hợp fiat khi chưa có.

## Đo lường và quyết định pilot

Theo dõi tỷ lệ tự hoàn tất luồng trên điện thoại, thời gian chờ duyệt/chi, lỗi chuyển ứng dụng ví, khoản chưa đối soát và việc quay lại ở kỳ thu chi tiếp theo. Ghi mẫu thử, thiết bị, điểm cần người hướng dẫn và lý do bỏ dở; không chỉ đếm ví kết nối.

Đề xuất pilot Fuji với 3–5 nhóm. Điều kiện tiếp tục: ít nhất 3 nhóm tự hoàn thành một vòng thu–chi–đối soát, không còn lỗi tài chính nghiêm trọng và có bằng chứng họ cần dùng tiếp. Đây là ngưỡng ra quyết định nội bộ, không phải dự báo tăng trưởng. Mô hình thu phí cần nghiên cứu sau khi có hành vi sử dụng lặp lại.

## Tài liệu thực thi

- [Mô hình hoạt động từng quỹ và phần quản lý chung](FUND_OPERATING_MODEL.md).
- [Mô hình tạo/quản lý trên điện thoại](FUND_CREATION_MANAGEMENT.md) và [nghiệm thu nghiệp vụ](FUND_MODEL_ACCEPTANCE.md).
- [Kiến trúc mục tiêu và kế hoạch chuyển đổi](GROUP_FINANCE_SPEC.md).
- [Quy chuẩn giao diện điện thoại và nội dung](MOBILE_UX_STANDARD.md).
- [Lộ trình](ROADMAP.md) và [nghiệm thu](MOBILE_ACCEPTANCE.md).

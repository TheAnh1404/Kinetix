# Mở rộng: nhiệm vụ/cột mốc và góp xoay vòng

Đặc tả nghiên cứu nghiệp vụ 1.0, 15/11/2026. Hai mô hình này chưa được V2 thực thi như loại quỹ riêng. Không bật trong wizard thật cho tới khi có thiết kế, kiểm thử và bằng chứng tích hợp tương ứng. Đọc [mô hình chung](FUND_OPERATING_MODEL.md).

## 1. Quỹ nhiệm vụ / cột mốc

### 1.1 Những quyết định khác nhau

Phân biệt tiền tài trợ, ngân sách dự kiến, tiền đã giữ chỗ cho công việc và khoản đã trả. Người tài trợ không tự có quyền duyệt; người được giao việc không sở hữu reward trước khi đạt điều kiện.

| Đối tượng | Nội dung |
| --- | --- |
| Công việc | ID, mô tả, kết quả cần đạt, thời hạn, người làm |
| Ngân sách công việc | Asset, reward, quỹ nguồn, reservation owner |
| Nộp kết quả | Phiên bản nội dung, tệp riêng tư, thời điểm |
| Xác nhận kết quả | Reviewer đủ quyền và không hưởng khoản trả |
| Quyết định chi | Quorum tài chính và policy context |
| Thanh toán | Expense/payment binding duy nhất |

Một nhiệm vụ chỉ có một người nhận trong phiên bản đầu; chia cho nhiều người tạo các khoản trả rõ ràng, không dùng một recipient đại diện rồi giả định đã chia. Các cột mốc cùng dự án dùng reward riêng, không trả toàn bộ dự án sau khi chỉ hoàn tất một phần.

### 1.2 Vòng đời đề xuất

```text
DRAFT → FUNDED/ASSIGNED → SUBMITTED → VERIFIED → PAYMENT_PENDING → PAID
                         ↘ NEEDS_CHANGES → SUBMITTED (phiên bản mới)
                         ↘ DISPUTED → quyết định theo điều khoản
FUNDED/ASSIGNED → CANCELLED hoặc EXPIRED → giải phóng giữ chỗ
```

Mỗi mũi tên có actor, quyền, deadline và audit. VERIFIED chưa là PAID. SUBMITTED không cho thay kết quả âm thầm sau khi reviewer đã xác nhận; sửa nội dung tạo version mới và vô hiệu xác nhận cũ. Đổi người nhận/reward cần hủy cam kết cũ và duyệt lại.

Phải định nghĩa ai xác nhận, thời gian phản hồi, có được yêu cầu sửa bao nhiêu lần và cách xử lý không có phản hồi. Thời hạn hết không tự kết luận công việc đạt hoặc gian lận. Tranh chấp không tự trả tiền; có đường người có thẩm quyền quyết định đã thống nhất trước. Nếu không có cơ chế phân xử khả thi, không nhận tiền dưới lời hứa escrow tự động.

### 1.3 Hai mức triển khai, không được trộn bảo đảm

| Mức | Có thể làm | Không thể hứa |
| --- | --- | --- |
| Workflow ứng dụng trên OPERATING V2 | Giao việc, lưu kết quả, review, sau đó tạo expense chuẩn | Reward đã được khóa riêng từ lúc giao; reviewer là điều kiện contract bắt buộc |
| Escrow/cột mốc phiên bản mới | Reservation riêng, điều kiện xác nhận được enforce, binding task/payment, hủy/hết hạn | Tự biết kết quả ngoài đời đúng nếu vẫn cần reviewer/oracle |

V2 chỉ giữ chỗ qua expense với recipient/amount cố định và hạn tối đa 30 ngày. Tạo expense ngay khi giao việc cho phép approver duyệt/execute trước khi công việc hoàn tất nếu không có ràng buộc contract khác. Vì vậy không dùng cách này để tuyên bố task escrow.

Reservation ở backend chỉ là cam kết ứng dụng. Người có quyền chain vẫn có thể dùng tiền qua luồng khác. Nếu thử workflow ở mức ứng dụng phải hiện “Ngân sách dự kiến, chưa khóa trên chain” và không cộng soft hold vào R contract.

### 1.4 Accounting cho escrow tương lai

Đề xuất mỗi khoản giữ chỗ có duy nhất owner: TASK hoặc EXPENSE. Chuyển TASK sang EXPENSE là chuyển chủ reservation nguyên tử; không tạo thêm một reservation cùng số tiền.

```text
R_total = R_task + R_expense + các reservation khác không giao nhau
V = A - R_total
```

Trả một reward làm giảm A và reservation tương ứng cùng số tiền. Hủy chỉ giảm reservation, không giảm A. Partial payout chỉ tồn tại khi đã đặc tả phần giữ lại, phần đã trả, giới hạn tổng và cách hủy phần còn lại. Phiên bản đầu đề xuất không hỗ trợ partial payout tự do.

Ví dụ: A=100, task giữ 30 → V=70. Khi task được duyệt chuyển sang expense, R_total vẫn 30. Trả thành công → A=70, R=0. Sai thiết kế sẽ giữ cả task và expense thành R=60 hoặc giải phóng task trước khi expense giữ chỗ, mở cửa chi trùng.

### 1.5 Các thay đổi bắt buộc review trước xây escrow

- Tách quyền giao việc, review kết quả và duyệt tiền; cấm người nhận tự review và tự tính phiếu tài chính.
- Khóa reward, recipient, task version và điều kiện đủ để trả.
- Quy định deadline công việc, deadline review và deadline payment riêng.
- Xử lý policy epoch thay đổi: giữ claim/commitment nào, xác nhận nào phải làm lại; không mặc định reset mọi reward về khả dụng.
- Chống một task tạo nhiều expense đã trả; recipient revert không làm mất reward đã đủ điều kiện.
- Công bố privacy chứng từ và quyền truy cập khi người thực hiện rời nhóm.

## 2. Quỹ góp xoay vòng

### 2.1 Mô hình tối thiểu để nghiên cứu

Tập N thành viên cố định, mỗi kỳ mỗi người góp q, có N kỳ và mỗi thành viên nhận đúng một lượt. Thứ tự được mọi người xem và chấp thuận trước kích hoạt. Không đấu giá lượt, không lãi, không ghép người lạ hoặc thay thứ tự tùy ý trong phiên bản nghiên cứu đầu.

Mỗi thành viên đã nhận tiền vẫn còn nghĩa vụ góp tới hết chu kỳ. “Đã nhận” không đồng nghĩa “đã hoàn thành mọi nghĩa vụ”. Số dư kỳ, contribution từng thành viên và khoản phải góp tương lai là ba dữ liệu khác nhau.

### 2.2 Ví dụ rủi ro phải thấy được

Bốn người, mỗi kỳ góp 10; kỳ đầu đủ 40 trả cho A. A đã góp 10, nhận 40 và còn nghĩa vụ góp 30 trong ba kỳ tiếp theo. Nếu A bỏ góp, smart contract không tự thu được 30 từ ví A.

Kỳ hai B/C/D góp tổng 30 nhưng A không góp. Tiền hiện giữ 30; lịch sử đã nhận 70 và đã trả 40. Không được hứa hoàn toàn bộ 70 cho tất cả người từng góp: quỹ chỉ còn 30 và quyền/nghĩa vụ giữa họ khác nhau. Khoản A còn nợ không phải tài sản có sẵn để trả.

### 2.3 Vòng đời và điểm dừng

```text
FORMING → COMMITTED → ROUND_OPEN → ROUND_READY → PAYOUT_PENDING → ROUND_PAID
                           ↘ DELINQUENT → xử lý theo điều khoản hoặc STOPPED
ROUND_PAID → ROUND_OPEN kỳ sau → COMPLETED sau kỳ cuối
```

Mỗi kỳ có window góp, grace period đã thỏa thuận, người nhận, số tiền phải nhận, điều kiện ready, policy version và payout ID duy nhất. Kỳ đủ tiền chưa là kỳ đã trả. Chỉ mở kỳ tiếp sau khi khoản trả được final hoặc theo một chính sách chồng kỳ đã thiết kế riêng; phiên bản đầu đề xuất không chồng kỳ.

Không tự lấy tiền dư của quỹ khác hoặc khoản góp kỳ sau để báo kỳ hiện tại đủ tiền. Người lạ chuyển tiền không tự trở thành thành viên. Góp thay cần quy tắc attribution rõ, nhưng không chuyển nghĩa vụ và quyền nhận lượt chỉ bằng metadata.

### 2.4 Quyết định khi thiếu góp

| Phương án | Yêu cầu cần có | Giới hạn |
| --- | --- | --- |
| Chờ trong grace period | Deadline rõ, chưa payout, theo dõi người thiếu | Không giải quyết trường hợp bỏ góp vĩnh viễn |
| Bảo đảm/collateral | Asset, custody, mức bảo đảm, điều kiện xử lý và kiểm thử | Có chi phí vốn; không được hứa đủ bảo đảm nếu thiếu tài sản |
| Góp đủ toàn chu kỳ trước | Khóa toàn bộ nghĩa vụ từ đầu | Giảm rủi ro bỏ góp nhưng thay đổi giá trị của mô hình xoay vòng |
| Xử lý ngoài chain | Thỏa thuận và bên chịu trách nhiệm rõ | Contract không bảo đảm thu hồi; cần đánh giá thị trường/pháp lý riêng |
| Dừng và quyết toán | Ma trận đã góp/đã nhận/còn giữ, thứ tự ưu tiên và đồng thuận | Không thể hoàn đủ khi tài sản không đủ |

Đề xuất hiện tại: không phát hành ROSCA cho tiền thật khi chưa chọn một phương án và chứng minh bằng accounting/case tests. Không dùng “minh bạch” làm lời thay thế cho nguồn bảo đảm.

### 2.5 Thành viên, thứ tự và dừng giữa chừng

Trước kích hoạt có thể sửa draft, nhưng tất cả phải chấp thuận snapshot mới. Sau kích hoạt không cho admin tự thêm/xóa thành viên, thay q, thay lịch hoặc đổi thứ tự. Chuyển ví cần giữ nguyên danh tính kinh tế: đóng góp cũ, lượt đã nhận, nghĩa vụ còn lại và sự đồng ý của bên liên quan.

Thành viên rời nhóm ứng dụng không xóa nghĩa vụ chu kỳ. Vỡ quorum không mở đường cho admin tự payout. Có thể publicize trạng thái chậm góp trong phạm vi người có quyền nhưng không phát tán thông tin cá nhân/hành vi tài chính ra public chain ngoài dữ liệu bắt buộc.

Khi dừng: khóa kỳ mới theo cơ chế enforce → đối soát khoản pending → thống kê tài sản còn giữ và lịch sử quyền/nghĩa vụ → áp dụng điều khoản phân bổ → ghi từng settlement → đóng khi không còn tiền/claim cần xử lý. Công thức phân bổ phải được chốt trước activation, không tự chọn tỷ lệ có vẻ công bằng sau khi đã thiếu tiền.

## 3. Phần dùng chung và phần riêng

Dùng chung: danh tính nhóm, binding quỹ, asset integer, quyền truy cập, chứng từ, transaction intents, approvals có context, payment reconciliation, audit và giao diện xem lại.

Riêng nhiệm vụ: task versions, reviewer, task reservations, dispute và payout entitlement. Riêng ROSCA: cycle membership, kỳ/lượt, future obligations, default/collateral và settlement. Không ép hai hệ này thành vài boolean trong OPERATING rồi quảng cáo cùng mức bảo đảm.

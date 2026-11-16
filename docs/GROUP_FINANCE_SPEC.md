# Đặc tả quỹ chung và kế hoạch chuyển đổi

Trạng thái: mục tiêu triển khai từ 15/11/2026. Không mô tả API, schema hay contract mới như đã tồn tại. Xem [kiến trúc hiện tại](ARCHITECTURE.md) và [định hướng](PRODUCT_DIRECTION.md).

Cập nhật contracts: phần on-chain V2 đã được triển khai trong source, với quyết định cụ thể tại [CONTRACTS_V2.md](CONTRACTS_V2.md). Schema, API ứng dụng, indexer và UI V2 vẫn là mục tiêu; không suy ra đã tích hợp hoặc đã triển khai public từ thay đổi contracts.

Chi tiết nghiệp vụ được chuẩn hóa tại [mô hình hoạt động quỹ](FUND_OPERATING_MODEL.md), [hai quỹ lõi](FUND_MODELS_CORE.md), [mở rộng](FUND_MODELS_EXTENSIONS.md), [tạo/quản lý chung](FUND_CREATION_MANAGEMENT.md) và [ma trận nghiệm thu](FUND_MODEL_ACCEPTANCE.md). Đây là nguồn tham chiếu cho ý nghĩa trạng thái, tiền góp/quyền hoàn và cấu hình theo capability; không suy ra các bảng/API đang có đã đáp ứng toàn bộ mô hình.

## Ranh giới quyền

Quyền nhóm và quyền tiền tách biệt. Chủ nhóm quản lý thành viên không mặc nhiên được rút tiền hay thay người ký. Một người có thể có nhiều quyền, khác nhau giữa các quỹ.

| Phạm vi | Khả năng đề xuất |
| --- | --- |
| Nhóm | Xem dữ liệu nhóm, mời thành viên, quản lý quyền tổ chức |
| Quỹ | Xem, góp tiền, đề nghị chi, duyệt chi, chi trong hạn mức |
| Chính sách quỹ | Đổi người duyệt, ngưỡng duyệt, hạn mức, cơ chế phục hồi, đóng quỹ |

Các nhãn Người quản lý, Thành viên, Người duyệt, Người nhận tiền là cách trình bày; backend và contract kiểm tra khả năng và phạm vi thực tế. Người nhận không được tự tính phiếu cho khoản trả cho mình. Cần kiểm tra đủ người duyệt độc lập khi tạo quỹ và sau mỗi thay đổi thành viên.

## Contracts

Ưu tiên đánh giá tái sử dụng V1/factory trước khi thiết kế phiên bản mới. T1 FamilyHub và V1 là hai hệ thống riêng; tên mới trong UI không thay ABI, storage hoặc địa chỉ triển khai.

Mục tiêu: cách ly tiền từng quỹ; cố định tài sản; chính sách chi có hạn mức giao dịch và hạn mức cộng dồn; quorum hợp lệ; thay đổi quyền tài chính qua cơ chế quản trị đã thống nhất. Không thêm bộ máy policy tổng quát nếu hai mẫu quỹ chưa cần.

Đề nghị chi cố định chain, quỹ, tài sản, người nhận, số tiền, thời hạn và phiên bản chính sách. Đổi nội dung cần đề nghị mới và duyệt lại. Chống phiếu trùng, thực thi trùng, chữ ký cũ và tự duyệt khoản hưởng lợi. Hết hạn/hủy phải giải phóng reservation đúng một lần. Chính sách cần xác định ai được hủy, từ chối hoặc thực thi sau khi đủ phiếu.

Số khả dụng = số dư ghi nhận − khoản giữ chỗ còn hiệu lực. Khoản phải trả đã tách khỏi số dư cần có nghĩa vụ riêng; không cộng reservation hai lần. Kiểm tra invariant trước/sau external call, chuyển trạng thái theo CEI và chống reentrancy. Không dùng tiền quỹ khác để bù thiếu.

Quy trình đổi người ký, quorum, hạn mức và phục hồi phải xác định quyền đề xuất/duyệt/thực thi, thời điểm hiệu lực và cách xử lý yêu cầu cũ. Không để đường admin khẩn cấp thành đường rút tiền một phía. Nếu cần timelock, phải đặc tả riêng; hạn hết hiệu lực không phải timelock.

Tên, ảnh, chứng từ và lý do riêng tư lưu off-chain có kiểm soát truy cập. Chỉ lưu hash khi cần và phải nêu giới hạn: hash không bảo đảm nội dung đúng hoặc riêng tư tuyệt đối. Không tạo lịch sử bằng mảng storage tăng vô hạn.

Fuji hiện dùng AVAX. Stablecoin là quyết định tương lai, cần đánh giá token, decimals, approve/transfer, quyền pause/blacklist và hỗ trợ ví. Không quy đổi AVAX sang VND/USD thành giá cam kết khi chưa có nguồn giá, thời điểm và quy tắc làm tròn.

## Backend và dữ liệu

Các thực thể mục tiêu: Group, Membership, Fund, FundPermission, FundPolicyVersion, ContributionObligation, Contribution, ExpenseRequest, Approval, Payment, Attachment, AuditEvent. Tên này là mô hình nghiệp vụ đề xuất, không phải tên bảng/API hiện hữu.

Phân biệt nghĩa vụ góp, khoản đã nhận, số dư khả dụng và quyền được hoàn. Theo dõi chu kỳ, miễn/giảm khoản góp, nộp một phần hoặc nộp thừa theo chính sách; không gán mọi deposit thành hội phí của người gửi nếu chưa có bằng chứng liên kết.

Backend thực thi tenant isolation, quyền theo hành động và ownership chứng từ. Signed URL có hạn khi cần; không công khai ảnh, dữ liệu trẻ em hoặc lý do chi riêng tư qua event/memo. Cấu hình thời hạn lưu/xóa chứng từ trước pilot có dữ liệu thật.

Tách trạng thái xét duyệt và thanh toán. “Đủ duyệt” không thành “Đã trả”. Payment cần phản ánh chờ ký, đã gửi, đang xác minh, xác nhận, thất bại và cần đối soát. Worker kiểm chain, contract, sender, recipient, asset, amount, receipt và finality theo từng adapter. Dữ liệu index là read model, không ghi đè quyền contract bằng database.

Khóa event gồm chainId + contractAddress + transactionHash + logIndex. Ghi block hash/cursor, xử lý trùng, reorg và replay. API tạo yêu cầu có idempotency; cùng khóa với nội dung khác phải bị từ chối. Lưu tiền bằng đơn vị nhỏ nhất, không qua floating point.

## Frontend trên điện thoại

Điều hướng mục tiêu: Tổng quan, Quỹ, Chờ xử lý, Hoạt động. Thành viên và cài đặt mở trong nhóm; không ép mọi tính năng thành tab. Chi tiết quỹ hiển thị khả dụng, giữ chỗ, quy tắc và tác vụ được phép. Góp tiền, gửi chứng từ, duyệt, xuất báo cáo và quản lý thành viên đều dùng được trên điện thoại.

Loại nhóm cung cấp tên và mẫu cấu hình, không thay đổi quyền. Không dùng bộ chuyển vai trò để giả lập quyền trong luồng thật. Giữ chế độ demo có nhãn rõ. Tuân thủ [chuẩn UX](MOBILE_UX_STANDARD.md) và [nghiệm thu](MOBILE_ACCEPTANCE.md).

## Chuyển đổi từng bước

1. Lập inventory T1, V1, ví chung, API, enums, routes và quỹ đang tồn tại; ghi adapter và nguồn quyền mỗi loại.
2. Thêm mô hình khả năng và kiểm thử isolation. Không ánh xạ `ADMIN` thành người ký, `CHILD`/`ELDERLY` thành quyền chi hoặc `GUARDIAN` thành người duyệt mọi quỹ. Chuyển quyền tài chính phải đối chiếu state on-chain.
3. Thiết kế migration additive, dry-run trên database sao chép đã loại dữ liệu nhạy cảm, thống kê bản ghi không ánh xạ được và kế hoạch khôi phục. Không chạy migration trong đợt sửa tài liệu.
4. Thêm adapter và phiên bản API tương thích. Giữ enum/ABI cũ cho tới khi không còn consumer phụ thuộc; không đổi thứ tự enum Solidity.
5. Hoàn thiện hai mẫu quỹ và luồng điện thoại xuyên suốt. Mỗi adapter chỉ bật thao tác thực sự hỗ trợ.
6. Nếu cần contract mới: deployment phiên bản mới, xác minh bytecode/receipt, người có quyền thực hiện chuyển tiền rõ ràng. Không giả định clone cũ tự nâng cấp. Rollback UI/API không đảo ngược giao dịch đã final.

## Kiểm chứng bắt buộc khi triển khai

Bao phủ vượt quyền giữa nhóm/quỹ, quorum độc lập, thay chính sách, epoch cũ, hạn mức cộng dồn, cạnh tranh reservation, hủy/hết hạn, thực thi trùng, worker replay/reorg và sai asset/network. Chạy database tests trên database riêng. Chạy luồng điện thoại với ví thật trên Fuji trước khi coi tích hợp hoàn tất.

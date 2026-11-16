# Nghiệm thu mô hình quỹ và quyết định triển khai

Đặc tả 1.0, 15/11/2026. Ma trận này là yêu cầu nghiệm thu, chưa phải kết quả test mới. Các test đã chạy trước đây nằm trong [báo cáo contracts V2](CONTRACTS_V2_IMPLEMENTATION.md). Đọc [mô hình chung](FUND_OPERATING_MODEL.md).

## 1. Các quyết định mặc định được đề xuất

| ID | Quyết định | Hệ quả |
| --- | --- | --- |
| D01 | Một quỹ = một asset/chain/custody binding | Không gộp số dư thành quyền chi giả |
| D02 | Phiên bản đầu chỉ Hoạt động và Mục tiêu | Không phát hành task escrow/ROSCA qua một nhãn UI |
| D03 | SPEND mặc định tắt, mở bằng chính sách đã ký | Không tự cấp chi độc lập cho thủ quỹ |
| D04 | Gợi ý 2/3 nếu đủ người, hiển thị quorum thật | Không ép tạo thêm ví; V2 vẫn hỗ trợ 1/2 |
| D05 | App đề xuất expense TTL 7 ngày, V2 tối đa 30 | Không nhầm TTL thành thời gian chờ |
| D06 | GOAL giữ đúng soft-cap/latch/failed-refund V2 | Không chỉnh target/hạn hay hứa hoàn sau thành công |
| D07 | Tiền phải góp, góp thực, claim hoàn và shares tách biệt | Không có shares hoặc auto-refund hoạt động |
| D08 | Một trình tạo bốn bước, khả năng theo adapter | Không có tùy chọn backend không enforce được |
| D09 | Task workflow app không được gọi là escrow | Mức bảo đảm hiển thị trước cam kết reward |
| D10 | ROSCA chưa phát hành nếu chưa chốt default/settlement | Không hứa bù thiếu từ khoản nợ tương lai |

D01–D10 là baseline cho thiết kế tiếp theo, không cho phép sửa hoặc chuyển tiền của quỹ cũ. Các điều khoản có tác động người góp phải được chấp thuận theo cơ chế và phiên bản quỹ thật.

## 2. Khoảng cách giữa mô hình và source V2

| Yêu cầu | V2 source | Việc còn lại |
| --- | --- | --- |
| Hai loại quỹ, AVAX riêng, quorum, reservation | Đã có | Adapter/app và nghiệm thu tích hợp |
| Claim mục tiêu thất bại về sender | Đã có | UX đúng người nhận, gas, pause, mất khóa |
| Cap giao dịch/thành viên/quỹ theo ngày UTC | Đã có | Read model và thông tin hạn mức chính xác |
| Governance thay quyền, pause/resume/close | Đã có | Policy diff, receipt/epoch reconciliation và bàn giao |
| Lịch thu, nghĩa vụ góp, phân bổ khoản nhận | Không do contract quản lý | Backend, audit, partial/exemption/overpayment |
| Chứng từ, xác nhận nghiệp vụ | Không do contract kiểm chứng | Private storage, ACL, retention và workflow |
| Phiếu V2 enforce approver khác proposer | Không; chỉ cấm recipient tự duyệt | Không hứa cơ chế chưa có, hoặc thiết kế version mới |
| Claim sau recovery ví | Contribution gắn sender cũ, không chuyển | Nêu giới hạn hoặc thiết kế recovery claim mới |
| GOAL hard cap, sửa deadline, hoàn sau thành công | Không | Bỏ tùy chọn khỏi V2 UI; version khác nếu có nhu cầu |
| Task escrow và ROSCA | Không | Spec/security/accounting riêng trước code |
| Winding-down khóa nhận góp on-chain | Không có mode này ở V2 | Nhãn app không được giả là enforcement |
| Đóng OPERATING theo lịch bất chấp deposit ngoài app | Không bảo đảm; deposit mới có thể làm A>0 | Đánh giá mode WINDING_DOWN/version mới nếu yêu cầu đóng chắc chắn |

Workspace có thay đổi backend/frontend song song; đợt mô hình chỉ đối chiếu semantics V2 và đọc chọn lọc type/service đang có, chưa nghiệm thu toàn bộ code mới. Không suy ra khoảng cách app đã được giải quyết từ việc tên bảng hoặc component đã xuất hiện.

## 3. Ma trận kịch bản tối thiểu

| ID | Kịch bản | Kết quả yêu cầu | Lớp kiểm |
| --- | --- | --- | --- |
| C01 | Creator không có quyền quỹ | Không được đề nghị/duyệt/chi | Contract + API |
| C02 | Xóa member trong DB, chưa thay chain | Báo chờ thu hồi chain, không giả đã mất signing rights | API + UI |
| C03 | Approver là recipient | Không tính phiếu của chính họ | Contract + UI |
| C04 | Approver đồng thời proposer, recipient khác | Phản ánh đúng V2 cho phép; không claim độc lập tuyệt đối | Contract + copy |
| C05 | Quorum thiếu người, địa chỉ trùng, chưa có ví | Không tạo policy không hợp lệ | Wizard + contract |
| C06 | Hai khoản đồng thời giữ cùng ngân sách | Chỉ khoản đủ available thực thi, không âm số dư | Contract + API concurrency |
| C07 | Expense EXPIRED nhưng chưa cleanup | UI không cộng tiền chờ dọn vào available chain | Indexer + UI |
| C08 | Đổi policy trong lúc chờ duyệt/chi | Request epoch cũ INVALIDATED; reservation không trừ lần hai | Contract + indexer |
| C09 | Pause qua deadline rồi resume | Deadline vẫn chạy; không khôi phục request đã expired | Contract + UI |
| C10 | Recipient revert | Sổ/claim còn đúng, có retry hợp lệ, không báo đã trả | Contract + payment |
| C11 | Reentrant recipient | Không trả hai lần hoặc dùng tiền giữ chỗ | Contract |
| C12 | Cùng một khoản nhận gán hai nghĩa vụ | Tổng allocation không vượt số tiền nhận | DB + concurrency |
| C13 | Nộp một phần, quá hạn, miễn/giảm và nộp thừa | Báo nghĩa vụ đúng, không tạo tiền hoặc shares | Backend + UI |
| C14 | Hai spender chi sát cap ngày | Member và global cap đều enforce; reservation được giữ | Contract + UI |
| C15 | Chi quanh 00:00 UTC | Thể hiện đúng fixed day, không quảng cáo rolling 24h | Contract + copy |
| C16 | Deposit ngoài app khi đang chờ đóng | Close có thể thất bại vì A>0; không bỏ khoản tiền mới hoặc hứa đã khóa góp | Contract + close UX |
| G01 | Deposit trước hạn nhưng mined sau hạn | Revert nếu timestamp >= deadline | Contract + UI |
| G02 | Hai người cùng góp phần còn thiếu | V2 có thể vượt target; ghi đủ tiền thật | Contract + reconciliation |
| G03 | Đạt target rồi chi làm A dưới target | goalReached vẫn true; không mở failed refund | Contract + UI |
| G04 | Hết hạn không đạt, người ngoài claim | Chỉ sender có contribution được claim về chính mình | Contract + UI |
| G05 | A góp giúp B | Phân bổ nghĩa vụ B không chuyển claim từ A sang B | API + UI |
| G06 | Wallet member được thay bằng governance | Không giả contribution/claim cũ tự chuyển | Contract + recovery UX |
| G07 | GOAL đã đạt, kế hoạch ngoài đời bị hủy | Không bật refund thất bại; dùng điều khoản và chi quorum | Workflow + copy |
| G08 | Forced native surplus | Không tính target/claim/budget; governance surplus riêng | Contract + indexer |
| T01 | Quay từ ví không có hash hoặc timeout | Giữ intent, đối soát trước retry, không create/deposit trùng | Mobile + payment |
| T02 | Create thành công nhưng DB lỗi | Rebuild fund từ event + state, không bắt tạo lại | Worker + API |
| T03 | Reorg/replay/restart worker | Không thu/chi hai lần, đảo read model bị orphan | Indexer |
| T04 | Đổi chain/ví/cấu hình sau xem lại | Xác minh/mô phỏng lại, không ký payload cũ | Client |
| T05 | Cùng ID expense ở hai quỹ/chain | Không dùng nhầm phiếu hoặc receipt | API + indexer |
| T06 | Đóng/archived khi còn claim hoặc tiền | Không nhầm archive với close; contract không đóng khi A>0 | Workflow + UI |
| M01 | Reward ghi trong app, chưa giữ chain | Hiện đúng mức bảo đảm; không hứa escrow | Task spec + UI |
| M02 | Chuyển task hold thành expense hold | Không double reserve hoặc tạo khoảng trống chi trùng | Future escrow |
| R01 | Người đã nhận lượt bỏ góp | Không báo kỳ đủ hoặc tự lấy quỹ khác bù | Future ROSCA |
| R02 | Dừng ROSCA sau payout | Settlement theo tài sản còn và điều khoản, không hứa hoàn mọi contribution | Future ROSCA |

Mỗi kịch bản khi triển khai cần fixture, expected balances/permissions, bằng chứng receipt/audit và cách phục hồi. Không viết test chỉ kiểm nhãn UI tồn tại rồi coi nghiệp vụ tài chính đã đạt.

## 4. Kịch bản pilot có thể quan sát

**CLB:** tạo OPERATING với ba approver, PROPOSE cho người mua, SPEND tắt; phát hành một đợt thu; nộp một phần và đủ; gửi khoản hoàn ứng cho một approver; hai người khác duyệt; execute, đối soát và xuất báo cáo. Cho một lần lỗi ví/reload để kiểm retry. Tiêu chí: mọi số tiền và quyền nhất quán, không cần giải thích “đã duyệt khác đã trả” ngoài UI.

**Nhóm chuyến đi:** tạo GOAL với thời hạn thử nghiệm phù hợp, chạy hai quỹ tách biệt: một đạt và chi, một không đạt để mỗi contributor claim. Kiểm người góp giúp người khác và nêu đúng ví được hoàn. Không cố sửa deadline hoặc đi tắt bằng record database.

Đo completion không cần hỗ trợ, số lần retry trùng, khoảng chờ duyệt/thực thi, số sai trạng thái và việc người dùng hiểu điều kiện hoàn. Khảo sát hiểu biết bằng tình huống cụ thể trước ký: “Nếu quỹ đã đủ nhưng chuyến đi bị hủy, tiền có tự hoàn không?”. Không dùng lượt bấm hoặc kết nối ví thay cho hiểu đúng điều khoản.

## 5. Backlog theo phụ thuộc

1. Chốt vocabulary, typed model, canonical commitments và capability của từng adapter. Đầu ra: contract/API/UI nói cùng một nghĩa.
2. Hoàn thiện registry/binding và indexer V2, policy epoch, cleanup và payment intents. Đầu ra: read model dựng lại được và không ghi sai confirmed.
3. Hoàn thiện nghĩa vụ góp/allocation/audit, private evidence và quyền nhóm-quỹ tách biệt. Đầu ra: thu và phân bổ đúng mà không đổi quyền on-chain.
4. Triển khai wizard và khung quản lý hai quỹ trên điện thoại. Đầu ra: pilot hai kịch bản ở trên có bằng chứng thiết bị/ví thật.
5. Chỉ sau bằng chứng nhu cầu: task workflow mức ứng dụng hoặc thiết kế escrow/version mới; không tự chọn cả hai để tăng số tính năng.
6. ROSCA qua gate nghiên cứu riêng: default, nguồn bảo đảm, settlement, vận hành tranh chấp và đánh giá pháp lý phù hợp trước phát hành. Chưa chọn phương án thì trạng thái là chưa sẵn sàng, không mặc định thành tùy chọn tạo quỹ.

Quyết định mở cần ghi owner, phương án, tác động contract/backend/UI và evidence cần có; không cản hai loại quỹ lõi bởi những quyết định ROSCA chưa thuộc phạm vi. Thay spec có tác động tiền cần version/diff, không tự áp dụng hồi tố.

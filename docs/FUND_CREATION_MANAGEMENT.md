# Tạo và quản lý quỹ chung trên điện thoại

Đặc tả sản phẩm/kỹ thuật mục tiêu 1.0, 15/11/2026. Không phải xác nhận route, DTO hoặc giao diện đang chạy đã đáp ứng. Theo [mô hình hoạt động](FUND_OPERATING_MODEL.md) và [chuẩn UX](MOBILE_UX_STANDARD.md).

## 1. Một trình tạo, nhiều mẫu có giới hạn

Không tạo bốn wizard độc lập và không dựng một form chứa mọi trường của bốn loại. Dùng một draft có version, các bước chung và section điều kiện theo capability của adapter được chọn.

Một người có thể lưu draft trước khi có đủ người ký. Chưa đủ approver thì không triển khai; không tự thêm creator vào quorum. Sao chép cấu hình chỉ tạo draft mới, không sao chép số dư, lời mời đã chấp nhận, phiếu duyệt hoặc binding contract.

| Bước | Câu hỏi | Dữ liệu và kiểm tra | CTA |
| --- | --- | --- | --- |
| 1. Mục đích | Quỹ này dùng làm gì? | Nhóm, tên, mẫu tài chính; chỉ hiện mẫu được hỗ trợ | Tiếp tục |
| 2. Quy tắc tiền | Góp, chi và hoàn khi nào? | Asset/network, nghĩa vụ góp, target/deadline nếu GOAL; chi hạn mức mặc định tắt | Tiếp tục |
| 3. Người và quyền | Ai đề nghị, duyệt hoặc chi? | Ví đã chứng minh liên kết, quyền theo quỹ, quorum, allowance nếu bật | Xem lại |
| 4. Xem lại | Mọi người đang thống nhất điều gì? | Điều khoản/hash, số liệu chính xác, quyền, phí và giới hạn thực thi | Tạo quỹ và ký |

Mỗi bước có thể có màn hình con ngắn cho chọn thành viên/điều khoản. Số bước chính không phải lý do nhét mọi trường vào một viewport hoặc dùng font nhỏ. Target và deadline được hỏi khi chọn GOAL; không bắt nhập giá trị zero cho OPERATING.

### Bước 1: chọn mẫu theo nhu cầu

Hai lựa chọn thật: “Chi tiêu chung” → OPERATING, “Góp đủ mục tiêu” → GOAL. Các tên nghiệp vụ như Hội phí, Sinh hoạt, Du lịch có thể gợi ý tên/quy trình nhưng không tạo loại contract mới. Nhiệm vụ và xoay vòng nằm ngoài selector thật; không hiện card “Sắp ra mắt” chiếm diện tích trong luồng thường ngày nếu không có mục đích nghiên cứu rõ.

Nhóm hiện tại luôn thấy được và không âm thầm đổi khi chuyển tab hoặc nhận deep link. Thay nhóm trong draft xóa các lựa chọn quyền không còn hợp lệ, yêu cầu xem lại và không tái sử dụng wallet binding của nhóm cũ.

### Bước 2: điều khoản tiền

Góp tự nguyện/thu định kỳ là quản trị nghĩa vụ, không hạn chế việc V2 nhận tiền từ địa chỉ khác. Bước xem lại phải phân biệt “Nhóm sẽ thu mỗi tháng” với “Contract tự trừ mỗi tháng”. V2 không có tự động trừ ví hoặc direct debit.

GOAL bắt buộc công bố: target/asset cố định, hạn nhận góp, không chi trước target, chấp nhận vượt target, hết hạn chưa đạt thì claim về ví gửi; đạt rồi không có hoàn thất bại tự động. App không cho bật hard cap, gia hạn hoặc hoàn về ví khác bằng cấu hình giả.

OPERATING bắt buộc công bố không có claim hoàn tự động. Nếu bật chi hạn mức, hỏi cap giao dịch, cap cả quỹ/ngày UTC và allowance từng spender. Ngân sách danh mục không được đặt chung dưới nhãn “Contract giới hạn chi” khi chưa enforce.

### Bước 3: phân quyền và tính quorum

Thành viên nhóm có ví khác với địa chỉ ký quyền quỹ; cần binding rõ user-wallet. Người không có ví có thể được mời vào nhóm hoặc xem theo quyền nhưng không được coi là approver on-chain sẵn sàng. Không tự sinh ví thay họ trong flow này.

Hiển thị tên và phần địa chỉ đủ phân biệt, xem được đầy đủ trước xác nhận. Chặn zero, trùng địa chỉ, chính địa chỉ quỹ nếu đã biết, vượt 32 member V2, quorum zero hoặc quorum >= số approver. Có ít nhất hai approver; gợi ý 2/3 khi có ba người. Việc proof địa chỉ không chứng minh ba người khác nhau.

Quyền PROPOSE/APPROVE/SPEND có thể kết hợp. Nếu một người nhận khoản trả là approver, phiếu của người đó không tính. App có thể dùng quy tắc xung đột lợi ích chặt hơn cho workflow riêng nhưng phải ghi “quy tắc ứng dụng”; không mô tả là ràng buộc V2 nếu direct call vẫn làm được.

### Bước 4: xem lại và ký

Tóm tắt bằng các khối ngắn: quỹ/nhóm, tài sản/mạng, tiền ra khi nào, ai có quyền và ngưỡng, điều kiện hoàn, nơi giữ tiền và phí. Điều khoản dài mở riêng, phần hậu quả tài chính quan trọng vẫn có ở tóm tắt.

Canonical serialization và cấu trúc hash phải được version hóa. Với V2, `configurationHash` là `keccak256(abi.encode(InitParams))`, không phải hash JSON tùy ý. `termsHash` phải có tài liệu immutable có thể truy xuất theo quyền; ghi digest algorithm/encoding trong schema điều khoản. Byte representation khác nhau không được coi là cùng commitment.

Trước ký: đọc chain/factory/code identity/capabilities, mô phỏng đúng cấu hình và kiểm tài khoản ký. Thay cấu hình, chain hoặc wallet sau mô phỏng làm kết quả xem lại cũ mất hiệu lực. Creator không cần là người có quyền tài chính trong params.

## 2. Tạo quỹ an toàn khi chuyển ứng dụng ví

```text
DRAFT → VALIDATED → SIGNING → SUBMITTED → VERIFYING → ACTIVE
                         ↘ DECLINED       ↘ REVERTED / NEEDS_RECONCILIATION
```

Lưu intent ID, draft version, hash cấu hình, sender, chain/factory và transaction attempts trước/sau bước ký phù hợp khả năng ví. Timeout khi app quay lại không tạo lần create mới. Nếu wallet không trả hash, tra nonce/receipt khi có đủ bằng chứng hoặc đưa vào đối soát; không tự khẳng định chưa gửi.

Sau receipt thành công, xác minh FundCreated thuộc factory tin cậy, creator/params hash đúng, registry `isFund`, code/binding và state đọc tại block phù hợp. Sau finality mới hiện quỹ đã xác minh. Reorg phải đảo trạng thái read model. Một record UUID trong DB không chứng minh clone tồn tại.

Nếu on-chain create thành công nhưng DB lỗi, worker phục hồi mapping bằng event/intent; không bảo người dùng ký create lần hai. Nếu chính xác có hai fund được tạo, ghi nhận cả hai và hướng dẫn xử lý quỹ dư theo quyền; không gộp địa chỉ hoặc xóa sự thật chain.

## 3. Khung quản lý dùng chung

| Khu vực | Nội dung chính | Nội dung mở thêm |
| --- | --- | --- |
| Tổng quan | Khả dụng, giữ chỗ, trạng thái và việc của tôi | Nơi giữ tiền, thời điểm đồng bộ, chi tiết số dư |
| Góp tiền | Khoản cần đóng và thao tác góp | Đợt thu, phân bổ, miễn/giảm và lịch sử góp |
| Chi tiền | Đề nghị, số tiền và chờ ai xử lý | Chứng từ, phiếu, deadline và các lần gửi giao dịch |
| Hoạt động | Sự kiện thu/chi/chính sách gần đây | Lọc, tìm, xuất và đối soát |
| Quy tắc và người | Điều khoản có hiệu lực, quyền của tôi | Danh sách quyền, đề xuất thay đổi và bàn giao |

Đây là khung thông tin, không bắt buộc năm tab cố định trên màn hình nhỏ. Điều hướng toàn app giữ Tổng quan, Quỹ, Chờ xử lý, Hoạt động; trong quỹ ưu tiên Tổng quan/Thu chi và mở các phần khác qua nhãn rõ. Không có bottom bar thứ hai cạnh tranh hoặc 8 tab cuộn ngang để chứa toàn bộ nghiệp vụ.

Tổng quan mặc định chỉ có một thẻ số dư chính, một vùng việc cần làm và 3–5 hoạt động gần nhất. GOAL thêm trạng thái/tiến độ/hạn góp tại vị trí phù hợp; OPERATING thêm hạn mức nếu người dùng có SPEND. Công việc/chu kỳ chỉ xuất hiện khi mô hình thực sự được hỗ trợ.

## 4. Hành động theo trạng thái

| Người dùng/tình huống | Hành động chính | Thông tin bắt buộc |
| --- | --- | --- |
| Còn nghĩa vụ góp | Góp tiền | Đã nhận, còn thiếu, asset, quỹ/mạng |
| Có PROPOSE và quỹ được chi | Gửi đề nghị | Người nhận, amount, mục đích, hạn, chứng từ |
| Approver đủ điều kiện | Duyệt chi hoặc Từ chối | Điều khoản, số tiền/người nhận cố định, số phiếu |
| Khoản đã đủ quorum | Thanh toán | Chưa trả, người thực thi trả gas, chính xác asset/network |
| GOAL thất bại, caller có claim | Nhận lại tiền góp | Số claim của ví này, nơi nhận cố định, phí gas |
| Quỹ pause | Xem trạng thái / đề xuất resume nếu có quyền | Hành động nào bị chặn; hạn vẫn chạy |
| Reservation hết hạn chưa dọn | Giải phóng giữ chỗ nếu wallet hỗ trợ | Cần transaction và gas, chưa làm A tăng |
| Dữ liệu stale/binding chưa verified | Cập nhật/Đối soát | Vì sao chưa cho ký; không giả số dư zero |

V2 execution và cleanup permissionless không đồng nghĩa app phải mở tác vụ cho mọi tài khoản ngoài nhóm. UI có thể tổ chức trải nghiệm cho người có quyền truy cập app nhưng không được quảng cáo permissionless function như được bảo vệ bởi membership contract.

## 5. Capability làm hợp đồng tích hợp

Capability gồm thông tin hỗ trợ tĩnh theo adapter/version và điều kiện động đọc từ state/permission. Không tin boolean client gửi. Server/client kiểm thực thi bằng nguồn chain thật trước giao dịch, contract là lớp kiểm cuối.

| Capability đề xuất | V2 OPERATING | V2 GOAL | Giới hạn |
| --- | --- | --- | --- |
| deposit | Có khi open | Có khi open và trước hạn | V2 không có allowlist góp |
| quorumExpense | Có | Sau khi goalReached | Cần PROPOSE/APPROVE đúng tác vụ |
| limitedSpend | Nếu policy/member cho phép | Không | UTC-day, không rolling |
| failedGoalRefund | Không | Khi thất bại, có claim, không pause | Về đúng sender contribution |
| configurePolicy | Governance | Governance | Timelock, epoch reset pending requests |
| editGoal | Không | Không | Tạo quỹ mới nếu cần |
| milestoneEscrow | Không | Không | Cần phiên bản mới |
| rotatingCycle | Không | Không | Cần mô hình/version riêng |
| directFundTransfer | Không qua receive thường | Không qua receive thường | Không dùng bút toán DB thay asset transfer |

Nếu adapter ví chung không enforce quorum hay refund, UI nói đúng chủ ví giữ tiền và kết quả duyệt chỉ là workflow. Không gắn nhãn “hoàn được bảo đảm” chỉ vì cùng dùng model GOAL trong database. Mẫu cần bảo đảm bắt buộc phải chọn adapter đủ capability hoặc không cho tạo.

## 6. Hợp đồng dữ liệu mục tiêu

Các tên dưới là thiết kế đích; không phải lệnh đổi enum/schema hiện hành ngay trong đợt đặc tả.

```typescript
type FundBinding = {
  chainId: string;
  assetAddress: string;
  assetDecimals: number;
  custodyAdapter: string;
  contractAddress?: string;
  factoryAddress?: string;
  contractVersion?: number;
  verification: "UNVERIFIED" | "VERIFIED" | "RECONCILIATION_REQUIRED";
};

type Money = { amountAtomic: string }; // số nguyên không âm dạng chuỗi

type FundDefinition = {
  schemaVersion: number;
  workspaceId: string;
  fundId: string;
  model: "OPERATING" | "GOAL"; // mở rộng qua version, không reorder enum Solidity
  presetId?: string;
  binding: FundBinding;
  policyEpoch: string;
  termsVersion: string;
  termsHash: string;
  accounted: Money;
  reservedOnchain: Money;
  availableOnchain: Money;
  observedBlock: { number: string; hash: string; observedAt: string };
};
```

Thiết kế thực tế cần discriminated config cho GOAL/OPERATING, permission snapshots, intent/attempt IDs, event cursor và read freshness. Không dùng một object với hàng chục trường optional mà template nào cũng gửi mặc định zero. Amount fiat/display không là nguồn ký; display string được dẫn xuất từ amountAtomic.

Khóa expense là chain + fund address + local expense ID; khóa governance thêm entityType để tránh trùng với expense ID. Payment intent có nhiều attempt/hash, nhưng chỉ một settlement hiệu lực. DB draft ID khác on-chain expense ID. Memo/reference hash là tham chiếu, không chống nghiệp vụ gửi trùng.

## 7. Quy tắc giao dịch và báo cáo

API mutation có idempotency key gắn actor, workspace, operation và payload hash. Reuse cùng key/payload trả intent cũ; cùng key/payload khác bị từ chối. Transaction chuyển nonce/hash cần giữ mọi attempt; xác minh giao dịch thắng, không chỉ hash đầu hoặc cuối được nhập.

Indexer ghi event idempotent theo chain/contract/txHash/logIndex và canonical block hash. PolicyApplied vô hiệu nhiều request cùng epoch mà không cần có event hủy từng khoản. Báo cáo chỉ coi settlement confirmed theo finality policy; reconciliation pending được liệt kê riêng, không gộp vào thu chi đã xong.

Export trên điện thoại dùng được và giữ cùng quyền dữ liệu với màn hình. Không xuất signed URL lâu dài hoặc chứng từ riêng của quỹ khác. Số dư đầu kỳ + nhận - chi/hoàn đã xác nhận = số dư ghi nhận cuối kỳ; surplus và điều chỉnh cần cột riêng. Thời gian báo cáo có timezone rõ; cap UTC không đổi vì đổi timezone hiển thị.

## 8. Bàn giao, rời nhóm và tiền dư

Rời nhóm không xóa khoản đã góp, khoản nhận hoàn ứng, claim hoặc nghĩa vụ đã chấp thuận. Cho phép người có claim GOAL tiếp cận hướng dẫn claim ngay cả khi không còn membership app; không làm lộ toàn bộ chứng từ nhóm để phục vụ claim. Contract V2 vẫn cho sender tự gọi claim trực tiếp khi đủ điều kiện.

Khi đổi người phụ trách, tách ba tác vụ: chuyển quản trị tổ chức, thay quyền tài chính qua governance và bàn giao vận hành (chứng từ, worker, người trả gas). Chỉ đánh dấu hoàn tất quyền tiền sau receipt/finality và kiểm state mới. Policy mới làm các request cũ vô hiệu nên wizard bàn giao phải liệt kê số request/reservation bị ảnh hưởng trước ký. Không xóa phiếu cũ để làm request trông như vẫn hợp lệ.

Tiền dư có ba hướng điều khoản có thể nêu: giữ cho hoạt động tiếp theo, chi/chuyển theo quyết định nhóm hoặc chia lại theo một quy tắc đã thỏa thuận. V2 chỉ thực thi các khoản chi riêng qua quorum, không có auto rollover liên quỹ hoặc auto pro-rata. Nếu phát triển batch chia lại, cần snapshot người có quyền, nguồn số tiền còn thực, tổng payout không vượt available, quy tắc rounding/dust, thời hạn claim và trường hợp recipient không nhận được; không triển khai bằng vòng lặp chuyển tiền tới danh sách không giới hạn.

Archive giữ khả năng tra cứu và audit theo quyền, không xóa trạng thái chain. Quyền truy cập chứng từ sau rời nhóm áp dụng retention/ACL đã công bố; không tự chuyển file riêng thành public để “minh bạch”. Xóa tài khoản không thể xóa lịch sử công khai trên chain; lưu tối thiểu dữ liệu off-chain cần thiết theo chính sách được đánh giá riêng.

## 9. Nghiệm thu trải nghiệm

320/360/390/430px, tên dài, số tiền nhiều chữ số, chữ phóng lớn, keyboard input cuối, back/reload, camera/tệp và chuyển ví. Giữ bản nháp và intent nhưng không lưu bí mật hoặc chứng từ nhạy cảm tùy tiện trong URL/local storage. Một CTA chính, body/input 16px, vùng chạm tối thiểu 44px và không che safe-area.

Mọi bước tài chính có thông tin sai mạng, sai ví, phí không đủ, từ chối ký, receipt revert, timeout và đối soát. Kiểm tra máy thật với phương thức ví được công bố hỗ trợ. Xem [ma trận nghiệm thu mô hình](FUND_MODEL_ACCEPTANCE.md) và [nghiệm thu điện thoại](MOBILE_ACCEPTANCE.md).

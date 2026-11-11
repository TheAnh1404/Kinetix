> **Historical engineering note.** This document may describe superseded plans or validation results. See the [current project status](STATUS.md) for supported behavior and deployment evidence.

# Kế hoạch thiết kế lại ba giao diện hũ Kinetix

Ngày: 11/11/2026. Trạng thái: đề xuất thiết kế và triển khai, chưa thay đổi giao diện hay nghiệp vụ.
Skill sử dụng: `.agents/skills/ui-ux-pro-max/SKILL.md`.

## 1. Mục tiêu và phạm vi

Làm lại Hũ an sinh, Heo đất & việc nhà, Quỹ họ hụi thành ba trải nghiệm cùng một hệ thiết kế, phù hợp với từng người dùng. Mỗi trang phải trả lời được: tiền nào thuộc về tôi, tôi có thể làm gì tiếp theo, tiền đang ở đâu, giao dịch đã thực sự hoàn thành chưa.

Định hướng chính theo yêu cầu ví chung của dự án: giữ tiền trong Core trên Fuji, quản lý phân bổ và nghiệp vụ bằng database, dùng tx hash làm bằng chứng khoản tiền thực sự đi vào/đi ra. Các hũ contract hiện có tiếp tục được nhận diện đúng nguồn. Không tự chuyển tiền hay đổi cơ chế quản lý của hũ cũ.

Phạm vi gồm: tổng quan, danh sách, chi tiết, tạo/yêu cầu thao tác, xem lại trước ký, theo dõi giao dịch, lịch sử, empty/error/loading states, quyền theo vai trò và responsive. Bổ sung backend cần thiết được tách thành hạng mục rõ ràng trong cùng roadmap; chưa giả định API đó đã tồn tại.

## 2. Kết quả rà soát mã nguồn

Đây là rà soát từ code, chưa phải báo cáo kiểm thử trực tiếp giao diện trong trình duyệt.

| Khu vực | Hiện có | Việc cần giải quyết |
|---|---|---|
| Hũ an sinh | `ElderlyPortal.tsx`: chọn hũ, khả dụng, rút, theo dõi yêu cầu, hỗ trợ người thân | Tăng ưu tiên cho khoản có thể sử dụng; phân biệt số dư chung, hạn mức và tiền cá nhân; trình bày rõ chờ duyệt/chờ ký/chờ chi trả |
| Heo đất & việc nhà | `KidsPortal.tsx`: việc cá nhân, ảnh minh chứng, chờ duyệt, tổng thưởng đã nhận | Heo đất hiện chưa là một sổ tiết kiệm cá nhân độc lập; cần tránh dùng tổng thưởng lịch sử làm số dư tiết kiệm |
| Họ hụi | `RoscaView.tsx`: giới thiệu và nhúng `VaultWorkflowPanel` | Chưa có trang nghiệp vụ riêng; văn bản 10–12px, địa chỉ ví là thông tin chính, CTA góp/giải ngân đặt cạnh nhiều điều khiển kỹ thuật |
| Số tiền góp ROSCA | Hàm `avax()` trong `VaultWorkflowPanel.tsx` dùng `Number(formatEther(...)).toFixed(3)`, kết quả được truyền vào thao tác góp | P0: tách định dạng hiển thị và giá trị giao dịch; truyền nguyên số wei hoặc chuỗi `formatEther` chính xác, không dùng số làm tròn để ký |
| Cam kết sản phẩm | ROSCA hiện có câu “Không ai có thể gian lận…”; metadata/AppShell còn thông điệp zero gas/8% APY | Thay bằng mô tả đúng cơ chế triển khai thực tế. Chỉ hiển thị tính năng đã được backend/deployment xác nhận |
| Ví chung | `TreasuryPanel`, service và ledger đã có nạp/rút/chuyển nội bộ | Chưa có trợ cấp, phân công việc, thưởng, lịch góp và thứ tự nhận riêng cho hũ ví chung |
| Accessibility | `member.css`, `MemberResponsiveShell`, preferences chữ lớn/giọng đọc, focus ring đã tồn tại | Kế thừa và kiểm thử, không xóa các khả năng đang có trong lần thay giao diện |

## 3. Cách áp dụng UI UX Pro Max

Đã tìm design system cho family finance dashboard, hướng dẫn chữ dễ đọc, focus modal và async forms. Kết quả design-system vẫn trả về nhiều cấu trúc marketing/landing sau một lần thu hẹp truy vấn, vì vậy không dùng chúng làm thiết kế dashboard chuẩn.

Các hướng dẫn phù hợp được giữ: phân cấp thông tin rõ, chữ dễ đọc, tương phản, focus hiển thị, trạng thái async có giải thích, giảm chuyển động. Các kết quả stack nhắm Next.js 16/React 19 không được áp dụng máy móc cho repo Next.js 14/React 18. Giữ kiến trúc BFF/Express và các hook hiện có.

Hướng thiết kế dưới đây là đề xuất được điều chỉnh theo sản phẩm: nền sáng, bề mặt sạch, màu nhận diện theo loại hũ, biểu tượng Lucide thống nhất. Giữ Inter/Plus Jakarta Sans đang dùng để giảm phạm vi thay đổi font và kiểm thử dấu tiếng Việt.

## 4. Hệ thiết kế dùng chung

| Thành phần | Đặc tả đề xuất |
|---|---|
| Nền/bề mặt/chữ | Nền `#F8FAFC`, card `#FFFFFF`, chữ chính `#0F172A`, chữ phụ `#475569`, viền `#E2E8F0` |
| Hũ an sinh | Xanh lá trầm `#047857`, nền phụ `#ECFDF5`; cảm giác an tâm, dễ đọc |
| Heo đất & việc nhà | Tím `#6D28D9`, nền phụ `#F5F3FF`; minh họa heo đất thân thiện, chỉ trang trí có kiểm soát |
| Quỹ họ hụi | Hổ phách trầm `#92400E`, nền phụ `#FFFBEB`; danh sách, lịch và bằng chứng rõ ràng |
| Trạng thái | Xanh thành công, vàng đang chờ, đỏ lỗi; luôn có nhãn và icon, không truyền thông tin chỉ bằng màu |
| Chữ | Body chung 16–18px; an sinh 18–20px; tiêu đề 24–32px; số dư 32–48px; metadata tối thiểu 14px |
| Số tiền | Tabular numbers, đơn vị luôn hiện, label rõ loại số dư. Bản xem lại có số chính xác; bảng tổng quan được rút gọn nhưng mở được chi tiết |
| Khoảng cách | Nhịp 4/8px; card padding 20–24px; gap 16–24px; radius card 20–24px, input/button 12–16px |
| Nút | CTA chính cao 48px; an sinh 56px; một CTA chính trên mỗi vùng tác vụ. Đây là mục tiêu thiết kế của dự án |
| Chuyển động | Nhẹ khoảng 150–200ms; hỗ trợ reduced motion; không nhấp nháy số dư/countdown liên tục |
| Mobile | Một cột, hành động chính dễ với tới; desktop chia nội dung chính và cột thông tin phụ; không dựng hai cây form riêng |

Palette là đầu vào thiết kế, phải đo lại từng cặp chữ/nền thực tế trước nghiệm thu. Mục tiêu chữ thông thường tương phản ít nhất 4.5:1 theo [W3C Contrast Minimum](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html). Kiểm thử reflow tại 320 CSS px theo [W3C Reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html), bên cạnh các kích thước thiết bị.

## 5. Kiến trúc thông tin và dữ liệu

Giữ URL hiện có và các deep link. Chỉ bổ sung route chi tiết khi cần, không khiến đường dẫn cũ mất tác dụng.

- An sinh: Tổng quan → Rút/yêu cầu hỗ trợ → Chi tiết yêu cầu; Người thân và Lịch sử truy cập được từ điều hướng.
- Trẻ em: Hôm nay → Việc của con → Chi tiết việc; Heo đất; Tiền thưởng; Người thân.
- Họ hụi: Danh sách quỹ → Chi tiết quỹ → Kỳ hiện tại / Lịch nhận / Thành viên / Giao dịch.
- Admin/guardian: có hàng đợi duyệt riêng theo quyền; preview giao diện thành viên ghi rõ xem trước và khóa thao tác cá nhân.

Mỗi hũ có thông tin nguồn tiền: “Ví chung Core” hoặc “Smart contract”. Trên trang tổng quan chỉ dùng một nhãn ngắn; chi tiết giải thích ai có quyền ký và bằng chứng nào xác nhận thanh toán.

View model chung đề xuất: `id`, `kind`, `custodyMode`, `asset`, `totalWei`, `reservedWei`, `availableWei`, `asOf`, `permissions`, `pendingActions`, `activity`. Các adapter đọc dữ liệu contract/ví chung, không ép hai hệ thống dùng cùng trạng thái nội bộ.

Luồng nghiệp vụ và luồng thanh toán là hai nhóm trạng thái:

- Nghiệp vụ: chờ gia đình duyệt, đã đủ duyệt, bị từ chối, hết hạn.
- Thanh toán: chờ người giữ ví ký, đang chờ Core, đã gửi mạng, chờ finalized, chờ cập nhật sổ, đã chi trả, reverted, đã hủy.

Một yêu cầu đã đủ duyệt không được hiện “đã nhận tiền”. Đóng modal, đổi trang hoặc tải lại phải tiếp tục xem được yêu cầu đang chạy, không mặc định yêu cầu ký lại.

## 6. Hũ an sinh

### 6.1 Tổng quan cho người thụ hưởng

Thứ tự nội dung trên mobile:

1. Tên hũ và người hỗ trợ; bộ chọn hũ khi có nhiều hũ, giữ lựa chọn trong URL.
2. Card lớn “Bạn có thể sử dụng”, đơn vị AVAX và diễn giải khoản đó là hạn mức, khả dụng của hũ hay khoản hỗ trợ được cấp.
3. CTA “Rút về ví của tôi” cho contract đủ điều kiện hoặc “Yêu cầu nhận tiền” cho ví chung. Nhãn dựa trên quyền thực tế.
4. Yêu cầu gần nhất: số tiền, bước đang chờ, việc người dùng cần làm tiếp.
5. Hạn mức còn lại, thời điểm làm mới hạn mức nếu có dữ liệu, lịch sử gần đây.
6. “Nhờ người thân hỗ trợ”; không tự động gửi tin nhắn hay gọi điện.

Desktop: vùng chính khoảng 2/3 cho số dư và yêu cầu; cột phụ 1/3 cho người thân và chính sách. Không đưa hash/gas/quorum kỹ thuật vào hero.

### 6.2 Luồng nhận tiền

Chọn hũ → nhập số tiền → xem lại → gửi yêu cầu hoặc ký → theo dõi.

- Gợi ý số tiền theo hạn mức backend; không hard-code ngưỡng “50” từ mô tả cũ.
- Kiểm tra quá số dư, giữ chỗ, hạn mức ngày, quyền thụ hưởng và hũ tạm dừng trước khi tiến tới ký.
- Xem lại gồm số tiền chính xác, hũ nguồn, tên người nhận, ví nhận, phương thức giữ tiền và phí dự kiến nếu có.
- Trong ví chung: người thụ hưởng gửi yêu cầu bằng tài khoản; admin duyệt; chủ ví ký khoản chi. Không yêu cầu người nhận ký thay chủ ví.
- Trong contract: tiếp tục dùng policy và hook giao dịch hiện có; rút nhanh/rút cần duyệt được giải thích bằng câu ngắn.
- Thành công chỉ hiện sau bằng chứng thanh toán tương ứng; chi tiết kỹ thuật nằm trong vùng mở rộng.

### 6.3 Trạng thái bắt buộc

Chưa có hũ; nhiều hũ chưa chọn; chưa được cấp quyền; không đủ khả dụng; hết hạn mức; thiếu người duyệt; đã đủ duyệt nhưng chưa chi; wallet mismatch; sai mạng; thiếu gas ở ví cần ký; người dùng từ chối Core; receipt reverted; mất kết nối; dữ liệu cũ; đang đồng bộ.

Không dùng số `0` thay cho “chưa tải được”. Lỗi có nút thử lại tại đúng khu vực, giữ dữ liệu đã nhập.

## 7. Heo đất & việc nhà

### 7.1 Trang “Hôm nay”

Hero nhỏ “Chào con” → card heo đất → một việc ưu tiên tiếp theo → nhóm việc chưa làm/chờ người thân → hoạt động thưởng gần nhất.

Heo đất gồm số tiết kiệm hiện có, mục tiêu nếu được lưu thật và tiến độ. Khi chưa có sổ tiết kiệm cá nhân, hiển thị “Tổng thưởng đã nhận” với đúng tên, không gọi đó là số tiền đang có trong heo.

Minh họa heo đất dùng SVG hoặc CSS phù hợp hệ icon. Chúc mừng nhẹ sau kết quả thật, không dùng vòng thưởng ngẫu nhiên hay thúc ép trẻ giao dịch nhiều lần.

### 7.2 Danh sách và chi tiết việc

- Bộ lọc: Cần làm, Chờ người thân, Đã nhận thưởng, Tất cả; hiện số lượng, dùng URL để giữ bộ lọc.
- Card: tên việc, hướng dẫn ngắn, người giao, thưởng dự kiến, hạn hoàn thành chỉ khi backend có dữ liệu, một nút “Xem việc”.
- Chi tiết: hướng dẫn → ảnh minh chứng → xem trước → gửi người thân → tiến trình xử lý.
- Upload hiện tiến độ, loại/kích thước được hỗ trợ theo API, lỗi thử lại; đổi ảnh được trước khi gửi; không làm mất ảnh khi upload đã thành công nhưng bước xác nhận lỗi.
- Với contract, giữ bước Core hiện có khi giao thức yêu cầu. Với ví chung, gửi bài off-chain rồi chủ ví ký thưởng sau duyệt.
- Thưởng dự kiến, đã được duyệt và đã trả là ba khái niệm riêng. Khi tiền đã trả không thêm nút “Nhận thưởng” giả.

### 7.3 Góc người lớn

Hàng đợi: Cần kiểm tra → Chờ đủ duyệt nếu chính sách yêu cầu → Chờ ký thưởng → Đã trả. Mỗi mục có trẻ được giao, việc, ảnh, số thưởng, nguồn hũ và lịch sử thao tác.

Tạo việc: chọn trẻ, hũ thưởng, tiêu đề, hướng dẫn, số thưởng chính xác. Kiểm tra tiền khả dụng và giữ chỗ khoản thưởng theo chính sách backend. Không cho duyệt hoặc trả thưởng hai lần.

“Yêu cầu làm lại” là tính năng mở rộng cần bổ sung trạng thái/API; nếu chưa triển khai, UI không hiện nút hoạt động giả. Ảnh chỉ hiển thị cho người được quyền và tôn trọng thời hạn lưu minh chứng hiện có.

### 7.4 Mục tiêu tiết kiệm

Có thể triển khai sau luồng việc/thưởng: tên mục tiêu, số cần đạt, số đã phân bổ thật, trạng thái hoàn thành. Chuyển thưởng vào heo đất trong ví chung là chuyển nội bộ sổ cái có hai bút toán; tiền đã trả ra ví cá nhân không tự trở thành số dư heo đất. Tính năng này chỉ bật sau khi có mapping hũ cá nhân và dữ liệu chính xác.

## 8. Quỹ họ hụi

### 8.1 Danh sách quỹ

Card quỹ hiển thị tên, thành viên `N`, kỳ `k/N` theo cách đếm 1-based cho người dùng, mức góp mỗi kỳ, tình trạng đóng góp của tôi và người nhận kỳ này. Có bộ lọc Đang tham gia / Đã kết thúc; quỹ tôi không tham gia không tự có CTA góp.

### 8.2 Chi tiết quỹ

Desktop: cột chính cho kỳ hiện tại, đóng góp và lịch nhận; cột phụ cho khoản tôi cần đóng, trạng thái của tôi, quy tắc quỹ. Mobile ưu tiên hành động cá nhân trước danh sách dài.

1. Header: tên, hình thức giữ tiền, trạng thái chu kỳ.
2. Card kỳ hiện tại: kỳ mấy, ai nhận, tổng đã góp thực tế, còn thiếu bao nhiêu người, mốc sớm nhất có thể chi.
3. Card “Phần của bạn”: số cần góp chính xác; Chưa góp / Đang xác nhận / Đã góp; một CTA theo quyền.
4. Danh sách thành viên: avatar/tên trước, ví rút gọn sau; từng người có tình trạng kỳ hiện tại và liên kết bằng chứng.
5. Lịch nhận tuần tự: người đã nhận, người nhận kỳ này, người dự kiến nhận các kỳ tới.
6. Lịch sử theo kỳ: đóng góp, điều kiện đủ, lệnh chi và tx hash chi trả.

### 8.3 Luồng góp và chi trả

Góp kỳ: xem đúng khoản cố định → xác nhận ví nguồn/hũ → Core → finalized → gắn khoản nạp vào thành viên và kỳ. Khoản góp không được dùng lại cho kỳ khác; kiểm tra idempotency theo quỹ/kỳ/thành viên.

Chi trả kỳ: backend xác nhận đủ thành viên góp, đủ thời gian, đúng người nhận, đủ khả dụng và chưa chi. Trong ví chung, admin tạo lệnh và chủ ví ký; trong contract, dùng capabilities và điều kiện contract. Kỳ chỉ chuyển sau khoản chi finalized thành công, không chuyển khi mới có tx hash.

Khi thiếu điều kiện, hiện lý do cụ thể: “Còn 2 người chưa góp”, “Sớm nhất lúc …”, “Đang chờ chủ ví ký”. Countdown chỉ hỗ trợ đọc; server/chain time quyết định quyền chi, không dựa vào đồng hồ máy người dùng.

Lịch tương lai trong contract là dự kiến vì kỳ mới có thể bắt đầu tại thời điểm chi thực tế. Không trình bày tất cả kỳ tương lai như lịch cam kết cứng nếu mô hình dữ liệu không bảo đảm.

### 8.4 Tạo quỹ cho admin

Chọn nguồn giữ tiền → tên quỹ → danh sách và thứ tự nhận → mức góp → thời lượng kỳ → xem lại toàn bộ quy tắc → tạo. Kết quả chưa có thành viên/kỳ/API đúng thì không được hiện “đang hoạt động”.

Thứ tự nhận và chính sách quỹ khi bắt đầu phải được version hóa/ghi audit theo mô hình backend; không cho kéo thả sửa thứ tự âm thầm. Giai đoạn đầu chỉ cho cấu hình trước khi quỹ bắt đầu. Bỏ nhãn “an toàn tuyệt đối”, lợi suất và miễn gas khi chưa có cơ chế tương ứng.

## 9. Backend cần có để ba trang dùng ví chung

| Nghiệp vụ | Bổ sung đề xuất | Điều kiện hoàn thành |
|---|---|---|
| Phân loại hũ | Metadata loại hũ, thành viên/quyền, người thụ hưởng, chính sách version hóa | Hũ hiện có vẫn là loại generic cho tới khi admin cấu hình; không tự suy loại từ tên |
| An sinh | Yêu cầu hỗ trợ, duyệt/từ chối, reservation, liên kết lệnh thanh toán và actor audit | Duyệt không đồng nghĩa đã trả; không chi vượt khả dụng; recipient khớp yêu cầu |
| Việc nhà | Mapping nhiệm vụ với treasury jar, trẻ được giao, bằng chứng, trạng thái duyệt và lệnh thưởng | Kiểm soát ảnh, giữ chỗ/giải phóng tiền rõ ràng, không thưởng hai lần |
| Heo đất | Mapping hũ tiết kiệm cá nhân và mục tiêu, bút toán phân bổ | Số dư hiện tại được tính từ ledger; không suy từ tổng thưởng lịch sử |
| ROSCA | Quỹ, thành viên/thứ tự, kỳ, mức góp wei, contribution allocation, điều kiện chi, payout reference | Unique theo quỹ/kỳ/thành viên; một khoản tiền không ghi nhận hai lần; chỉ một payout mỗi kỳ |
| Đối soát | Liên kết nghiệp vụ với `treasury_transfers`/entries/attempts, đọc trạng thái từ worker | Mọi khoản chi phải có cùng số tiền, recipient và reference của nghiệp vụ đã duyệt |
| Phân quyền | Capability phía server với lý do bị khóa; kiểm tra lại trước tạo/ký/ghi nhận | Không tin role chọn ở UI; đổi workspace không lộ dữ liệu hoặc ký nhầm scope |

Backend là nguồn quyết định chính sách. Người giữ khóa ví Core vẫn có thể chuyển tiền ngoài ứng dụng; giao diện mô tả đây là quy trình duyệt và kiểm toán trong ứng dụng, không tuyên bố database cưỡng chế được ví EOA như smart contract.

Không cho phép API rút tiền chung trở thành đường bỏ qua chính sách sau khi một treasury jar đã được cấu hình SHIELD/MILESTONE/ROSCA. Luồng chi chung của hũ có chính sách phải yêu cầu nghiệp vụ hợp lệ hoặc quyền điều chỉnh có audit rõ ràng.

## 10. Components và điểm tích hợp

Tái sử dụng `MemberResponsiveShell`, preferences chữ lớn/giọng đọc, `PageHeader`, `EmptyState`, upload minh chứng và logic theo dõi giao dịch. Mở rộng có kiểm soát `StatusTimeline` để biểu diễn cả bước đang chờ, lỗi, hết hạn và đã hủy.

Components dự kiến:

- Chung: `VaultPageHeader`, `VaultBalanceCard`, `MoneyAmount`, `VaultSourceBadge`, `TransactionProgress`, `ActivityFeed`, `ActionBlockedReason`, `ConfirmTransferSheet`.
- An sinh: `SupportBalanceCard`, `SupportRequestCard`, `SupportWithdrawalFlow`, `FamilySupportCard`.
- Trẻ em: `PiggyBankCard`, `ChoreCard`, `ChoreDetail`, `RewardBreakdown`, `GuardianChoreQueue`.
- ROSCA: `RoscaFundCard`, `RoscaRoundSummary`, `ContributionRoster`, `PayoutSchedule`, `RoscaActionCard`.

Chỉ tách component nếu có trách nhiệm riêng hoặc dùng lại thực sự. Không tách từng dòng markup thành abstraction. Đưa phần ROSCA ra khỏi `VaultWorkflowPanel` dày đặc; dữ liệu/hooks vẫn tái sử dụng qua adapter.

Files ảnh hưởng chính: `ElderlyPortal.tsx`, `KidsPortal.tsx`, `RoscaView.tsx`, `VaultWorkflowPanel.tsx`, `MemberPrimitives.tsx`, `member.css`, `MemberResponsiveShell.tsx`; hooks/context và backend theo các phần mở rộng trên. Rà soát thêm nhãn trong `AppShell.tsx` và metadata `app/layout.tsx` để thống nhất khả năng thực tế.

## 11. Thứ tự thực hiện và đầu ra

Ước lượng cho một người triển khai, chưa tính thời gian chờ phản hồi; sẽ cập nhật sau bước 0. Đây là khoảng dự kiến, không phải cam kết lịch cố định.

| Bước | Nội dung | Đầu ra nghiệm thu | Ước lượng |
|---|---|---|---|
| 0 — Khóa nghiệp vụ | Chốt cách phân loại hũ ví chung, quyền, states, mapping ledger; xử lý số tiền ROSCA chính xác | Capability matrix, API/view-model contract, test cases P0 | 1–2 ngày |
| 1 — Thiết kế | Wireframe desktop/mobile và luồng lỗi; token, component variants | 3 tổng quan + các luồng chi tiết + bộ trạng thái, prototype tương tác | 2–3 ngày |
| 2 — Nền dữ liệu | Bổ sung dữ liệu/policies ví chung, migration không mất dữ liệu, adapter contract | API và kiểm thử reservation/permissions/idempotency | 3–5 ngày |
| 3 — Hũ an sinh | Tổng quan, yêu cầu/rút, theo dõi, hỗ trợ | Luồng người thụ hưởng và admin hoàn chỉnh | 1–2 ngày |
| 4 — Heo đất & việc nhà | Việc, minh chứng, duyệt/thưởng, số dư đúng ngữ nghĩa | Luồng trẻ và người lớn; mục tiêu tiết kiệm bật khi dữ liệu sẵn sàng | 2–3 ngày |
| 5 — Họ hụi | Quỹ, kỳ, roster, góp, lịch nhận, chi và lịch sử | Luồng đủ/thiếu góp, chưa tới hạn, chi thành công/thất bại | 2–3 ngày |
| 6 — QA và bàn giao | Responsive, accessibility, hồi quy, chạy thử Fuji | Screenshot, kết quả test, hướng dẫn vận hành | 1–2 ngày |

Tổng dự kiến 12–20 ngày làm việc cho cả mở rộng nghiệp vụ ví chung và UI. Nếu chỉ làm lại giao diện trên API contract hiện có, phạm vi nhỏ hơn nhưng chưa đạt mục tiêu ba nghiệp vụ chạy bằng ví Core chung. Ưu tiên bản đầu: dữ liệu đúng → an sinh → việc/thưởng → họ hụi; sau đó mới thêm mục tiêu tiết kiệm và trang trí nâng cao.

## 12. Kiểm thử và tiêu chí nghiệm thu

### Giao diện

- Kiểm tra 320/375/390/768/1024/1440 CSS px; desktop zoom và chữ lớn; nội dung không tràn hoặc bị CTA sticky che.
- Bàn phím dùng được toàn bộ luồng, focus rõ; modal quản lý focus/return focus; nhãn input và lỗi liên kết đúng; thông báo trạng thái dùng `aria-live` phù hợp.
- Screen reader đọc được loại số dư, đơn vị, tiến độ và lý do thao tác chưa khả dụng; bộ đếm không phát thông báo mỗi giây.
- Một cây DOM cho form; đổi breakpoint giữ dữ liệu. Bật reduced motion không mất thông tin.
- Tất cả trang có loading/empty/error/stale/permission states với hành động tiếp theo rõ ràng.

### Nghiệp vụ và tiền

- Số tiền gửi đúng wei ngay cả khi có hơn 3 chữ số thập phân; không dùng JS float cho giá trị thanh toán.
- Reload sau broadcast tiếp tục theo dõi; nhấp hai lần, timeout hoặc gửi lại HTTP không nhân đôi yêu cầu/chi tiền.
- An sinh: đúng người thụ hưởng, đúng hạn mức, đủ tiền, cần duyệt/đủ duyệt/chưa chi/đã chi.
- Việc nhà: chỉ trẻ được giao nộp bài; đúng người được quyền xem ảnh/duyệt; upload thành công nhưng gửi bài lỗi phục hồi được; thưởng chỉ ghi nhận khi trả thật.
- Họ hụi: không góp hai lần/kỳ; khoản góp đúng mức; thiếu một người hoặc chưa đến mốc thời gian thì chưa chi; không sai người nhận; kỳ kết thúc không còn CTA góp.
- Đổi tài khoản/workspace trong lúc thao tác không ký nhầm hũ hoặc hiển thị dữ liệu cũ.
- Chạy contract regression hiện có và backend tests trên database test riêng. Kiểm thử Core/Fuji với AVAX testnet là bước riêng; test mô phỏng không được mô tả là chuyển tiền thật.

### Bàn giao

Mỗi trang có ảnh desktop/mobile, danh sách trạng thái đã kiểm tra, các tính năng phụ thuộc backend và hướng dẫn xác minh tx hash. Chỉ nghiệm thu “hoàn tất” khi thao tác chính đi trọn luồng dữ liệu thật; mock chỉ phục vụ prototype và được ghi nhãn rõ.

## 13. Phạm vi chưa ưu tiên

Dark mode, quy đổi VNĐ theo giá thị trường, lợi suất, bridging, sponsored gas, thay đổi luật ROSCA giữa chu kỳ, nhắn tin tự động và mục tiêu tiết kiệm chưa có dữ liệu. Các tính năng này có thể mở rộng sau khi ba luồng chính ổn định, thay vì đưa vào thiết kế như đã hoạt động.

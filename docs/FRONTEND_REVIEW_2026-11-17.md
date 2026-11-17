# Đánh giá frontend Kinetix — 17/11/2026

## Phạm vi và kết luận

Rà soát working tree hiện tại, bao gồm cả thay đổi chưa commit và các file V2 mới. Đối chiếu PRODUCT_DIRECTION, GROUP_FINANCE_SPEC, MOBILE_UX_STANDARD, MOBILE_ACCEPTANCE, STATUS và ARCHITECTURE. Kiểm tra các mảng landing, đăng nhập/kích hoạt, routing, group finance, quản trị/thành viên, settings, các portal legacy, provider, API proxy, Web3, CSS và kiểm thử. Đây là đánh giá tổng thể theo các đường thực thi chính, không phải chứng nhận mọi dòng mã hoặc audit bảo mật độc lập.

Frontend có nền tảng tốt để tiếp tục phát triển: phân chia component/hook tương đối rõ, strict TypeScript, same-origin BFF, kiểm tra quyền ở server, xử lý exact wei và hàng đợi đối soát trên đường legacy/personal wallet. Tuy nhiên, V2 chưa có cùng mức bảo vệ và có nhiều điểm chưa nối xuyên suốt từ UI đến API và contract. Chưa đủ căn cứ nghiệm thu toàn bộ frontend hoặc sử dụng tiền thật.

Không sửa mã ứng dụng, không ký giao dịch, không chạy migration hoặc kiểm thử ghi database. Báo cáo này là thay đổi tài liệu duy nhất của đợt đánh giá.

## Bằng chứng kiểm tra

| Kiểm tra | Kết quả |
| --- | --- |
| `npm --prefix frontend run typecheck` | Pass |
| Build với `KINETIX_CONSTRAINED_BUILD=true` | Pass, Next.js 14.2.3 |
| 14 file test chọn lọc cho render, routing, BFF và biên ví | 106 passing, 4 pending |
| Mô phỏng receipt `reverted` cho deposit/approve/execute V2 | Cả 3 hàm vẫn resolve thay vì báo lỗi |
| Mô phỏng expense UUID thiếu `onchainExpenseId` | Cả approve và execute nhận on-chain ID = 1 |
| Round-trip ngày ISO → `toLocaleString("vi-VN")` → `new Date` | Ví dụ `15:30:00 17/11/2026` trở thành `Invalid Date` trên Node hiện tại |
| Browser / ảnh viewport | Chưa kiểm tra được: browser host không khả dụng; công cụ từ chối điều khiển Chrome |
| Điện thoại thật / Core Mobile / ký Fuji | Chưa kiểm tra |

Lệnh test đã chạy:

```powershell
npx hardhat test --no-compile test/MemberRender.test.ts test/KidsPortalRender.test.ts test/GuardianMobileView.test.ts test/MemberShellDock.test.ts test/MobileNavRender.test.ts test/SettingsRender.test.ts test/VaultCreationRender.test.ts test/VaultFundingRender.test.ts test/WorkspaceToolsRender.test.ts test/GroupTransferWallet.test.ts test/Web3AuthGuard.test.ts test/StartRouting.test.ts test/StartFlow.test.ts test/BffAuth.test.ts
```

Bốn test pending nằm trong `describe.skip` của [VaultCreationRender.test.ts](../test/VaultCreationRender.test.ts#L8). Các test này không chứng minh tính đúng đắn của luồng tạo quỹ. Render tĩnh và mock RPC cũng không chứng minh reflow, focus, bàn phím ảo hoặc app switching trên điện thoại.

## Các vấn đề cần ưu tiên trước khi nghiệm thu V2

### R01 — P1: Receipt bị revert vẫn được coi là giao dịch thành công

Nguồn: [fundV2Client.ts](../frontend/src/lib/web3/fundV2Client.ts#L244), các hàm approve/execute tương tự tại dòng 328 và 361; [useFundV2.ts](../frontend/src/hooks/useFundV2.ts#L199).

Client chờ receipt rồi trả kết quả mà không kiểm tra `receipt.status`. Hook tiếp tục đặt `CONFIRMED`; có đường còn bỏ qua lỗi đồng bộ backend. Mô phỏng receipt `reverted` đã xác nhận deposit, approve và execute vẫn resolve. Simulation trước ký không bảo đảm transaction thực tế thành công vì state có thể thay đổi.

Cần một executor chung kiểm tra receipt thành công, giữ hash của giao dịch thất bại và phân biệt xác nhận on-chain với hoàn tất đối soát. Không hiển thị “Đã đối soát” chỉ vì có txHash.

### R02 — P1: Thiếu mapping đề nghị chi lại dùng ID = 1

Nguồn: [useFundV2.ts](../frontend/src/hooks/useFundV2.ts#L278) và dòng 329.

Khi không có `onchainExpenseId`, code thử chuyển DB ID thành số rồi fallback về 1. DB ID là UUID nên có thể ký duyệt hoặc thực thi đề nghị số 1 của contract thay vì đề nghị đang xem. Mô phỏng với UUID thiếu mapping đã xác nhận cả hai action dùng ID = 1. Contract vẫn kiểm tra quyền; vấn đề ở đây là chọn sai đối tượng, không phải bằng chứng vượt quyền contract.

Cần chặn ký khi thiếu mapping đã xác minh. Không suy ID on-chain từ UUID hoặc giá trị mặc định. Các ID lấy từ event cũng cần từ chối trường hợp không tìm được event hợp lệ thay vì trả 0.

### R03 — P1: Adapter V2 bỏ qua nhiều bảo vệ danh tính/nhóm của adapter hiện có

Nguồn: [fundV2Client.ts](../frontend/src/lib/web3/fundV2Client.ts#L92), đối chiếu [client.ts](../frontend/src/lib/web3/client.ts) và [groupTransfers.ts](../frontend/src/lib/web3/groupTransfers.ts).

`getFundV2Wallet` lấy `accounts[0]` và tạo wallet client trực tiếp. Không đối chiếu linked wallet của phiên, không kiểm tra `walletWriteScope`/trạng thái ngắt kết nối UI, không kiểm tra lại nhóm và phiên sau bước bất đồng bộ. Kết quả `switchNetwork` bị bỏ qua. Viem có thể chặn một số lỗi chain, nhưng các kiểm tra đó không thay được ràng buộc tài khoản và workspace của ứng dụng.

Ví dụ đăng nhập bằng ví A nhưng extension đang chọn ví B: giao dịch có thể dùng B nếu B có quyền contract, trong khi UI và backend vẫn gắn với A. Cần dùng chung nguyên tắc preflight và recheck cho cả ba adapter, với cấu hình quyền/contract riêng từng loại quỹ.

### R04 — P1: Giao diện góp tiền chặn quỹ V2 hợp lệ

Nguồn: [ContributionModal.tsx](../frontend/src/components/group-finance/ContributionModal.tsx#L56), dòng 99 và 112; [groupFinanceService.ts](../backend/src/services/groupFinanceService.ts#L1631).

Modal bắt buộc `treasuryWalletAddress` và disable nút khi thiếu trường này. Quỹ V2 đăng ký bằng `contractAddress`, không phải ví cá nhân giữ tiền. Vì thế nút góp có thể không bao giờ gọi được nhánh `contributeOnchain` dù hook đã hỗ trợ V2. Nội dung modal cũng luôn nói chủ ví nhận kiểm soát tiền.

Cần chọn địa chỉ và điều kiện thao tác theo custody adapter, hiển thị đúng recipient và điều khoản ở bước xác nhận.

### R05 — P1: Hoàn tiền, chính sách và pause/resume chưa được nối đến action on-chain

Nguồn: [GroupFinanceDashboard.tsx](../frontend/src/components/group-finance/GroupFinanceDashboard.tsx#L347), [RefundGoalModal.tsx](../frontend/src/components/group-finance/RefundGoalModal.tsx#L110), [PolicyGovernanceModal.tsx](../frontend/src/components/group-finance/PolicyGovernanceModal.tsx#L203), [EmergencyPauseModal.tsx](../frontend/src/components/group-finance/EmergencyPauseModal.tsx#L125), [groupFinanceRoutes.ts](../backend/src/routes/groupFinanceRoutes.ts#L141).

Dashboard mở ba modal nhưng không truyền các callback thực thi. Modal rơi xuống fallback POST `/refund`, `/governance/propose-policy`, `/governance/propose-action`, approve/execute governance. Router hiện có endpoint GET governance/eligibility và đăng ký contract, không có các mutation tương ứng. Kết quả là CTA hiện diện nhưng không hoàn thành được nghiệp vụ.

Còn có mismatch dữ liệu: emergency modal đọc `data.proposals` trong khi backend tách action vào `data.actions`. Policy modal giả định `approvers`, `approvals`, `readyAt`; response từ bảng proposal không có các trường đó theo shape mà modal đòi hỏi. Một proposal thật có thể làm lỗi `item.approvers.length`.

Cần nối action qua adapter và chuẩn hóa DTO trước render. Quỹ ví cá nhân chỉ được hiện các tính năng thực sự hỗ trợ; hiện toolbar quản trị/pause và thông điệp refund còn xuất hiện cả với quỹ ví cá nhân.

### R06 — P1: Đề nghị chi và quyền thanh toán V2 chưa khớp API hiện tại

Nguồn: [useFundV2.ts](../frontend/src/hooks/useFundV2.ts#L240), [groupFinanceService.ts](../backend/src/services/groupFinanceService.ts#L1026), dòng 974.

Sau khi đề nghị on-chain thành công, frontend gọi API tạo expense chung. Service đó gọi `requireCustody`, chỉ chấp nhận `SHARED_TREASURY`, nên nhánh V2 bị từ chối dù on-chain đã có đề nghị và reservation. Hook báo thất bại chung; người dùng có nguy cơ gửi lại để tạo đề nghị mới. `onchainExpenseId` và txHash gửi kèm cũng không được xử lý theo một contract API riêng ở đây. Chứng từ ở nhánh V2 gửi `receiptAttachmentUrl` trong khi endpoint này đọc `receiptImageBase64`.

Ngoài ra, API tính `canPay` bằng điều kiện caller bằng `treasuryWalletAddress`. Quỹ V2 không có trường này, khiến người có thể execute contract không nhận được CTA thanh toán.

Cần endpoint xác minh/đồng bộ V2 riêng có idempotency và capabilities đúng; không chạy lại transaction khi chỉ đồng bộ metadata thất bại. Giao diện review hiện nói hạn 48 giờ nhưng hook V2 mặc định 168 giờ: cần một cấu hình được review và dùng xuyên suốt.

### R07 — P1: Ngày giờ và thông tin quyền hoàn tiền bị biến đổi sai

Nguồn: [useGroupFinance.ts](../frontend/src/hooks/useGroupFinance.ts#L169), [GroupFundsList.tsx](../frontend/src/components/group-finance/GroupFundsList.tsx#L142), [RefundGoalModal.tsx](../frontend/src/components/group-finance/RefundGoalModal.tsx#L58), [groupFinanceService.ts](../backend/src/services/groupFinanceService.ts#L1850).

Hook format `targetDeadline` thành chuỗi tiếng Việt ngay trong model. Component lại parse chuỗi đó bằng `new Date` để quyết định hết hạn và mở refund. Ví dụ thực tế đã cho `Invalid Date`; phép so sánh deadline khi đó trả false. Cần giữ ISO/timestamp trong dữ liệu và chỉ format ở lớp hiển thị.

Modal refund đọc `contributedWei`/`contributedAvax`, nhưng API trả `contributedAmountWei`, `refundableAmountWei`, `eligible` và `hasClaimed`. Khi GET lỗi, modal còn dùng số dư toàn quỹ làm khoản góp cá nhân. Không được dùng fallback tài chính này: lỗi phải hiển thị rõ, điều kiện ký cần dựa trên dữ liệu đã xác minh hoặc truy vấn contract đúng ví.

### R08 — P1: V2 chưa lưu txHash ngay sau broadcast để phục hồi

Nguồn: [fundV2Client.ts](../frontend/src/lib/web3/fundV2Client.ts#L244), [useFundV2.ts](../frontend/src/hooks/useFundV2.ts#L186).

Hash chỉ trả từ client sau khi chờ receipt; hook mới lưu vào React state. Không có đường ghi journal/hàng đợi ngay sau broadcast như adapter legacy. Nếu người dùng reload hoặc điện thoại đóng tab khi chờ, UI không có hash durable để phục hồi cùng thao tác. Worker có thể index một số event về sau, nhưng điều đó không bảo đảm khôi phục draft/metadata hoặc chống người dùng gửi lại trước khi index xong.

Cần lưu hash và định danh operation ngay khi nhận từ ví, phục hồi qua server, retry đối soát theo hash cũ. Trạng thái UI cần tách chờ ký, đã gửi, chờ xác nhận, chờ đồng bộ, đã hoàn tất và thất bại.

### R09 — P1: Tự thêm người tạo vào danh sách người có quyền tài chính

Nguồn: [useFundV2.ts](../frontend/src/hooks/useFundV2.ts#L60), [CreateFundModal.tsx](../frontend/src/components/group-finance/CreateFundModal.tsx#L359).

Hook tự thêm ví người dùng vào `guardianSet` và cấp PROPOSE | APPROVE trong cấu hình mặc định. Bước review chỉ hiển thị người đã chọn và `selected.length`. Khi người tạo không có trong lựa chọn, cấu hình thật có thêm người duyệt không xuất hiện trong review.

Cần tạo cấu hình duy nhất từ lựa chọn đã xác nhận; nếu sản phẩm yêu cầu creator có quyền, phải hiển thị và giải thích trước ký. Workspace administration không tự tạo quyền ký quỹ.

### R10 — P1: Next.js đang khóa ở bản trước các security patch đã công bố

Nguồn nội bộ: [frontend/package.json](../frontend/package.json#L18); build xác nhận đang chạy Next.js 14.2.3.

[Thông báo bảo mật chính thức 11/12/2025](https://nextjs.org/blog/security-update-2025-12-11) liệt kê nhánh 14.x bị ảnh hưởng DoS qua App Router và bản vá 14.2.35 cho advisory đó. [Postmortem middleware bypass](https://vercel.com/blog/postmortem-on-next-js-middleware-bypass) ghi nhận bản vá 14.2.25 cho CVE-2025-29927 và phân biệt các môi trường hosting bị ảnh hưởng.

Cần nâng lên release còn được hỗ trợ và đã vá theo advisory hiện hành, kiểm tra lockfile và regression trước deploy. 14.2.35 được dẫn như mốc vá của advisory năm 2025, không phải khẳng định đó là bản mới nhất hoặc đầy đủ cho năm 2026. Backend hiện vẫn kiểm quyền độc lập; không kết luận có thể lấy tiền hoặc bypass toàn bộ hệ thống chỉ từ phiên bản frontend.

## Kiến trúc, hiệu năng và trải nghiệm cần cải thiện

### R11 — P2: Lỗi V2 có thể khóa dashboard dù bấm tải lại

[useGroupFinance.ts](../frontend/src/hooks/useGroupFinance.ts#L525) trả `error || fundV2.error`. Refresh chỉ xóa error của hook nhóm. `fundV2.clearError` được định nghĩa nhưng không dùng ở flow này. Dashboard ẩn mọi tab nội dung khi error tồn tại. Sau lỗi V2, bấm “Tải lại dữ liệu” có thể không khôi phục màn hình; cần tách lỗi mutation khỏi lỗi tải toàn trang và cung cấp retry đúng thao tác.

### R12 — P2: Điều hướng thay đổi giữa các màn hình và thiếu URL cho tác vụ chính

[GroupFinanceDashboard.tsx](../frontend/src/components/group-finance/GroupFinanceDashboard.tsx#L64) giữ tab hoàn toàn trong state. Refresh quay về overview; back/forward, bookmark và deep link không biểu diễn được quỹ, inbox hoặc activity đang xem. Từ quỹ nhóm sang [settings](../frontend/src/app/settings/page.tsx#L93), dock đổi sang [MobileNavBar](../frontend/src/components/navigation/MobileNavBar.tsx#L46) có 6 mục legacy, không có mục quỹ nhóm tương ứng.

Cần một khung điều hướng ổn định theo tác vụ, tối đa 4–5 mục trên điện thoại; lưu tab/filter/fund/request phù hợp trong URL. Giữ alias và adapter legacy tương thích, không đổi route/role đồng loạt chỉ để thống nhất tên.

### R13 — P2: Bundle và số request lớn hơn nhu cầu của từng màn hình

Build báo First Load JS: trang chủ 208 kB, login 207 kB, settings 250 kB, dashboard/catch-all 374 kB. Đây là số liệu build, không phải Lighthouse, LCP hay thời gian tương tác trên máy thật.

[Dashboard](../frontend/src/app/dashboard/page.tsx#L7) import trực tiếp nhiều portal; catch-all dùng lại cùng page. [AppProviders](../frontend/src/context/AppProviders.tsx#L12) bọc cả trang công khai bằng FamilyProvider và VaultCreationProvider. [useGroupFinance](../frontend/src/hooks/useGroupFinance.ts#L173) gọi 3 request đầu rồi 2 request cho mỗi quỹ; 20 quỹ tương ứng 43 request cho một refresh trước khi tính các request của FamilyContext. Một request chi tiết thất bại có thể làm mất toàn bộ dữ liệu hiển thị do Promise.all và nhánh reset chung. FamilyContext còn poll dữ liệu legacy mỗi 20 giây khi đăng nhập, kể cả đang dùng màn hình nhóm.

Cần tách route/provider theo miền chức năng, tải portal nặng khi cần, bổ sung API tổng hợp hoặc tải detail theo quỹ được mở. Giữ ràng buộc user/workspace cho mọi query và đánh dấu freshness rõ; không dùng cache cũ để quyết định ký tiền. Đo lại trên thiết bị chậm trước khi đặt ngân sách cuối cùng.

### R14 — P2: UI chưa nhất quán với chuẩn mobile và định hướng nhóm

Landing hiện tại có trọng tâm hơn: hai loại quỹ, minh họa có nhãn, FAQ bằng details, skip link và reduced motion. Tuy vậy, [AuthFrame](../frontend/src/components/auth/LoginView.tsx#L61) vẫn ghi “Avalanche Dual-Chain L1”, đặt khối slogan/badge gia đình trước form trên mobile và dùng branding cũ. Người dùng CLB bấm “Tạo nhóm” lại gặp “Tạo gia đình”. Nên ưu tiên form/tác vụ, dùng nội dung nhóm nhất quán và nêu mạng thực tế.

Các input auth dùng `text-sm` (14px), nút hiện mật khẩu chỉ có icon 16px và không có padding/min-size 44px; [MobileNavBar](../frontend/src/components/navigation/MobileNavBar.tsx#L148) có nhãn 9–10px. CSS của group finance chỉ nâng font trong phạm vi `.group-finance`, không áp dụng toàn bộ app. Native FinanceDialog là điểm tốt về focus/modal, nhưng form dài như tạo quỹ và governance nên có route riêng trên điện thoại theo chuẩn dự án.

Dashboard nhóm khóa chiều rộng ở `max-w-lg` cả desktop và giữ bottom dock; nên tận dụng thêm không gian desktop cho danh sách/chi tiết mà vẫn giữ đầy đủ thao tác điện thoại. Nhiều card có hai CTA chính rồi thêm quản trị, pause, chi tiết; cần phân cấp ưu tiên thay vì thêm nhiều nút cùng mức.

Theme và nội dung cũng chia thành nhiều hệ: group finance ép light, auth dark, portal theo role, CSS module và utility hardcode. Chọn một bộ semantic token và component dùng chung cho button, field, alert, status, amount và page shell; không sửa bằng selector toàn cục ép mọi `.text-xs` hoặc `overflow-x:hidden` rồi coi đó là bằng chứng đạt 320px.

Cần kiểm tra thực tế 320/360/390px, zoom 200%, bàn phím, safe area, focus, screen reader, tên dài và số lớn. Chưa có bằng chứng viewport nên báo cáo không kết luận layout hiện tại chắc chắn bị tràn hoặc đạt tương phản.

### R15 — P2: TypeScript strict nhưng contract dữ liệu và kiểm thử chưa theo kịp

`authRequest` trả dữ liệu không có schema runtime; nhiều adapter nhận `any`, `CreateFundModal` còn ép `as any`. Các DTO tự khai báo trong modal không gắn với response backend, dẫn đến các lỗi R05–R07 mà typecheck/build vẫn pass. Số tiền gốc đã giữ wei, đây là điểm nên bảo toàn; số `number` và `toFixed(2)` chỉ nên phục vụ hiển thị, cần mở được số chính xác khi review.

Các file lớn như FamilyContext (~1.234 dòng), VaultExperience (~1.647 dòng), SettingsView (~877 dòng) chứa nhiều trách nhiệm. Có component landing và navigation cũ không còn nằm trên đường trang chủ hiện tại; nên lập inventory consumer, tách presentation khỏi adapter, rồi loại bỏ code không dùng sau khi xác minh tương thích. Không đánh đồng nội dung ở component không được render với nội dung người dùng đang thấy.

Cần test hành vi cho receipt revert, thiếu mapping, account/workspace đổi giữa lúc ký, mất trang sau broadcast, API sync lỗi sau transaction thành công, GET governance/eligibility đúng shape và thao tác từng custody type. Bổ sung browser E2E và nghiệm thu Core Mobile; test contract hoặc render markup không thay thế được những bước này. Thêm error boundary ở phạm vi phù hợp để một lỗi render proposal không làm hỏng toàn dashboard.

## Những phần nên giữ

- Same-origin BFF có kiểm tra Origin, giới hạn payload, timeout và không chuyển chi tiết lỗi upstream cho client.
- Server kiểm quyền tài khoản/workspace; ownership không chỉ dựa vào nhãn ADMIN trong UI.
- Group hook dùng scope và request generation để tránh trả dữ liệu nhóm cũ sau chuyển nhóm.
- Đường legacy/personal-wallet có simulation, recheck, exact wei, lưu hash, phục hồi operation và đối soát mà không gửi tiền lần hai.
- Tách thông điệp đủ duyệt khỏi đã thanh toán ở nhiều màn hình; chứng từ và số tiền được review trước thao tác.
- FinanceDialog dùng native dialog, quản lý focus khi đóng và chặn đóng khi bận; CSS nhóm có safe-area và reduced-motion.
- Landing đang render đã bỏ nhiều nội dung quảng cáo quá mức của các component cũ và nói rõ dữ liệu minh họa/testnet.

## Thứ tự triển khai đề xuất

1. Xử lý R01–R03, R08–R10: executor, mapping, danh tính, journal, cấu hình được review và dependency. Bổ sung regression cho các lỗi đã tái hiện.
2. Hoàn thành một vòng V2 xuyên suốt: tạo → góp → đề nghị có chứng từ → duyệt → execute → đối soát → refund/governance đúng adapter. Xử lý R04–R07; chỉ hiện capability hoạt động.
3. Thống nhất route, lỗi, DTO và điều hướng; sau đó giảm bundle/request và tách provider lớn. Không viết lại toàn bộ UI cùng lúc.
4. Kiểm tra và lưu bằng chứng viewport/mobile wallet theo MOBILE_ACCEPTANCE; chỉ nghiệm thu môi trường thực sự đã chạy. Chưa dùng kết quả build/test hiện tại để xác nhận sẵn sàng tiền thật.

# Kiểm tra tình trạng sản phẩm — 18/11/2026

## Kết luận

Kinetix đã có nền tảng hợp đồng và nhiều luồng ứng dụng, nhưng **chưa hoàn tất một sản phẩm quỹ chung được nghiệm thu trên mobile web**. Contract V2 vượt qua các kiểm tra local; phần nối UI → API → indexer → contract còn lỗi ảnh hưởng đối tượng được duyệt, trạng thái quỹ, đối soát và thử lại giao dịch. Chưa đủ điều kiện thử nghiệm tiền thật.

Đây là kiểm tra source tại commit `2230fbd`, không phải xác nhận deployment hiện tại hoặc audit bảo mật độc lập. Không sửa ứng dụng, deploy, migration, ký giao dịch thật hoặc ghi database ứng dụng. Chỉ thêm báo cáo, script tái hiện với adapter giả lập và kết quả của script. Báo cáo 17/11 là bằng chứng lịch sử; không coi mọi lỗi cũ còn nguyên sau các sửa đổi mới.

## Bằng chứng mới

Môi trường: Windows, Node.js v24.19.0, Next.js 14.2.3; Hardhat local EVM. Đối chiếu PRODUCT_DIRECTION, GROUP_FINANCE_SPEC, MOBILE_UX_STANDARD, MOBILE_ACCEPTANCE, STATUS và ARCHITECTURE.

| Kiểm tra | Kết quả lần này | Giới hạn |
| --- | --- | --- |
| `npm test` | **432 passing, 20 pending, 0 failing** | 20 test tích hợp database/auth chưa chạy; không tính là pass |
| Root/backend/frontend typecheck | Cả ba đạt | Không xác minh DTO runtime hoặc hành vi điện thoại |
| Frontend build, `KINETIX_CONSTRAINED_BUILD=true` | Đạt | Không đo usability/Lighthouse |
| `node -r ts-node/register/transpile-only scripts/verify-v2-full-integration.ts` | **8/8 phase đạt** | Contract local, không chạy UI/API/database/Fuji thật |
| Probe trực tiếp mã ứng dụng | Tái hiện các lỗi mô tả bên dưới | Ví/RPC/DB giả lập, không phải browser E2E |
| Browser và ảnh viewport | **Chưa kiểm tra được** | Browser host unavailable; `cua.getApp` trả `Computer Use was not approved to use Google Chrome` |
| iOS Safari, Android Chrome, Core Mobile | **Chưa kiểm tra** | Chưa có bằng chứng bàn phím, safe area, app switching hoặc ký trên điện thoại thật |
| Deployment/RPC public | Không kiểm tra lại | Không suy từ manifest hoặc tài liệu thành bằng chứng live mới |

Script tái hiện: [audit-product-2026-11-18.cjs](../scripts/audit-product-2026-11-18.cjs). Kết quả lưu tại [product-review-2026-11-18.json](evidence/product-review-2026-11-18.json). Script chạy module TypeScript thật hoặc biểu thức trích bằng AST từ source, với các adapter giả lập; các kiểm tra nhằm ghi nhận lỗi tại ngày review và có thể phải đổi kỳ vọng sau khi sửa lỗi.

```powershell
$env:AUDIT_COMMIT = (git rev-parse --short HEAD)
node scripts/audit-product-2026-11-18.cjs
```

## Tình trạng theo hành trình người dùng

| Luồng | Có trong source | Đánh giá hiện tại |
| --- | --- | --- |
| Đăng ký/đăng nhập, liên kết ví, khôi phục truy cập | Password, proof ký ví, session, route guards và recovery | Có nền tảng và unit/regression tests; 20 test DB/auth vẫn pending trong lần này |
| Tạo/chuyển nhóm, mời và quản lý thành viên | API và màn `/dashboard/finance/members`, `/manage` | Có đường thao tác; chưa nghiệm thu nhiều người dùng trên điện thoại |
| Tạo Quỹ hoạt động/Quỹ mục tiêu | Hai custody adapter, factory V2, bước review | Contract local đạt; đăng ký contract/khôi phục khi DB sync lỗi chưa đủ chặt |
| Góp tiền | Ví cá nhân có intent/receipt recovery; V2 gọi deposit | V2 chọn đúng địa chỉ contract, nhưng retry và trạng thái đối soát còn lỗi A01/A02/A08 |
| Đề nghị chi có chứng từ | Form, preview, draft, API, reservation contract | V2 còn lỗi xác minh dữ liệu và sync chứng từ A03/A08 |
| Duyệt, từ chối, hủy | Contract và ứng dụng có các đường thực thi | Chưa đồng nhất custody; A05/A07 có thể khiến UI và chain bất nhất |
| Thanh toán và đối soát | Client V2 execute; adapter ví cá nhân có journal/resolve | Contract local đạt, nhưng recovery V2 và indexer còn chặn nghiệm thu |
| Chính sách và pause/resume | Modal, callbacks, API, contract có timelock/quorum | Đã nối callback so với review cũ; vẫn còn A05/A06 và dữ liệu policy hiển thị sai |
| Hoàn tiền mục tiêu thất bại | Contract, modal và callback | Contract local đạt; modal chưa dùng đầy đủ `eligible`/`hasClaimed`; chưa thử trên ví thật |
| Hoạt động và CSV | Ledger, tải thêm, lọc ngày, export | Có source; độ tin cậy báo cáo phụ thuộc indexer A04; tải/xem trên iOS/Android chưa kiểm tra |
| Nghĩa vụ góp theo kỳ, phân bổ thiếu/thừa | Có mô hình/endpoint một phần | Chưa có bằng chứng hoàn thành toàn bộ ma trận C12/C13 trong FUND_MODEL_ACCEPTANCE |
| Bàn giao, rời nhóm, đóng quỹ | Contract có một số primitive; UI/app chưa đủ chu trình | Chưa hoàn chỉnh theo luồng nghiệm thu sản phẩm; không coi xóa membership là đã thu hồi quyền on-chain |

## Lỗi ưu tiên trước pilot

P1 ở đây là lỗi cần sửa trước nghiệm thu luồng tài chính; không phải tuyên bố đã khai thác trên deployment public.

### A01 — P1: Gửi lại sau timeout có thể tạo giao dịch thứ hai

Nguồn: [fundV2Client.ts](../frontend/src/lib/web3/fundV2Client.ts), [useFundV2.ts](../frontend/src/hooks/useFundV2.ts), [useGroupFinance.ts](../frontend/src/hooks/useGroupFinance.ts).

V2 đã lưu hash sau broadcast vào sessionStorage, nhưng `getPendingV2Transactions` chưa có consumer trong ứng dụng. Không có đường recovery nối journal này với UI/server hoặc ngăn gửi lại cùng operation sau timeout. `mutate` chống thao tác đồng thời trong hook nhóm, nhưng kết thúc khi lần gọi báo lỗi; lần thử tiếp theo vẫn có thể gọi deposit/create/propose mới.

Probe gọi deposit, giả lập receipt timeout, rồi thử lại cùng nội dung: **hai lần `writeContract`**, dù journal có hash cũ. Đây là số lần gọi adapter ví giả lập, không phải hai khoản tiền đã chuyển thật. Với deposit thực tế, transaction thứ hai có thể là khoản góp bổ sung; với propose/create có thể tạo resource trùng.

Cần operation ID bền vững, scope user/workspace, lưu hash ngay sau broadcast, khôi phục/đối soát theo hash cũ trước retry, và phân biệt timeout với receipt revert. sessionStorage không đủ cho tình huống mất tab hoặc đổi thiết bị.

### A02 — P1: Chưa chặn đầy đủ ký khi ngắt ví hoặc chuyển nhóm giữa chừng

Nguồn: `getFundV2Wallet` tại [fundV2Client.ts](../frontend/src/lib/web3/fundV2Client.ts#L211).

Điều kiện `currentScope && currentScope !== expectedWorkspaceId` chấp nhận `null`; `walletWriteScope()` trả null khi UI tắt ví. Client cũng không recheck tài khoản/phiên/workspace sau `simulateContract` và trước `writeContract`.

Probe xác nhận cả **scope null** lẫn **scope đổi từ A sang B trong lúc simulation** vẫn đi đến broadcast. Kiểm tra ví liên kết khác tài khoản ngay từ đầu đã hoạt động; điều đó chưa bao phủ thay đổi bất đồng bộ hoặc UI disconnect. Contract vẫn tự kiểm quyền, nhưng UI có thể tiếp tục thao tác trong scope mà người dùng đã rời.

Cần fail closed với scope thiếu, yêu cầu linked wallet đã xác minh và kiểm tra lại danh tính, mạng, nhóm sau các bước bất đồng bộ ngay trước gửi.

### A03 — P1: API sync đề nghị V2 tin số tiền/người nhận từ client

Nguồn: [syncV2Expense](../backend/src/services/groupFinanceService.ts#L1943), `ExpenseProposed` trong [fundV2IndexerService.ts](../backend/src/services/fundV2IndexerService.ts), `approveExpenseOnchain` trong [fundV2Client.ts](../frontend/src/lib/web3/fundV2Client.ts).

Sau kiểm tra truy cập nhóm, service ghi `onchainExpenseId`, amount, recipient, proposer và deadline từ request; không xác minh event/receipt hoặc đọc đề nghị contract tương ứng. Probe sau access check giả lập đã lưu ID 777 và amount 1 wei **khi không có txHash và không có chain reader**. Probe không kiểm tra lại tenant isolation hoặc chứng minh một tài khoản ngoài nhóm truy cập được.

Indexer bỏ qua phần tạo/cập nhật nội dung nếu đã có bản ghi cùng on-chain ID. Client duyệt/thực thi gọi theo ID, không so sánh lại amount/recipient/epoch với dữ liệu người dùng vừa xem. Vì thế review có thể trình bày một khoản khác dữ liệu contract thực thi. Đây là rủi ro về tính toàn vẹn thông tin ký; không phải bằng chứng bypass quyền contract.

Cần xác minh deployment/chain/fund/event/ID và cố định các trường tài chính từ chain trước khi cho review/ký. Chỉ metadata được phép mới lấy từ client; sync phải có idempotency và ownership. Đường `registerOnchainFund` cũng cần xác minh factory receipt, bytecode và config thay vì chỉ tin địa chỉ/chính sách từ body.

### A04 — P1: Worker bỏ qua sự kiện khi RPC hoặc xử lý log lỗi

Nguồn: [fundV2IndexerService.ts](../backend/src/services/fundV2IndexerService.ts#L611), cập nhật cursor ở dòng 664.

Khối đọc/xử lý log bắt lỗi rồi vẫn đi đến ghi `nextBlock = toBlock + 1`. Probe cho `getLogs` throw với khoảng block 1–100: worker ghi **nextBlock 101**. Lần sau không tự đọc lại khoảng bị lỗi. Đọc lại aggregate balance sau đó không khôi phục được nội dung đề nghị, khoản góp, lịch sử hoặc phiếu đã bỏ qua.

Cần chỉ commit cursor sau khi cả batch đã xử lý thành công, transaction/idempotency theo event key, retry nguyên range khi lỗi và bài kiểm tra replay/reorg. Các audit event hiện không có dedup đồng nhất; retry cũng cần tránh nhân đôi lịch sử.

### A05 — P1: Index policy làm mất danh sách người duyệt

Nguồn: [PolicyApplied handler](../backend/src/services/fundV2IndexerService.ts#L573), `listExpenseRequests` và `getFundGovernance` trong [groupFinanceService.ts](../backend/src/services/groupFinanceService.ts).

Khi nhận PolicyApplied, indexer tạo policy version với **`signers: []`**. Probe event thật theo shape ABI tái hiện policy version 2 có zero signers. API và hook lấy policy mới nhất để tính `canApprove`, totalSigners và form quản trị. Sau áp dụng policy hoặc khi index event khởi tạo, UI có thể mất quyền duyệt dù contract vẫn có approvers hợp lệ.

Ngoài ra, handler GovernanceProposed tạo proposal policy với `quorum: 2`, daily limit 0; API hiển thị **người ký policy hiện tại** như người ký được đề xuất. Các trường này không chứng minh nội dung policy mới mà người dùng chuẩn bị duyệt.

Cần xây read model từ config/members/permissions chính xác của contract, lưu nội dung policy đề xuất đã xác minh và vote riêng từng ví. Không dùng giá trị mặc định tài chính để lấp dữ liệu thiếu.

### A06 — P1: Nút duyệt/thực thi pause/resume truyền sai ID

Nguồn: [EmergencyPauseModal.tsx](../frontend/src/components/group-finance/EmergencyPauseModal.tsx#L109), [GroupFinanceDashboard.tsx](../frontend/src/components/group-finance/GroupFinanceDashboard.tsx), `getFundGovernance`.

API trả `onchainProposalId`, nhưng modal đọc `onchainActionId || localId || id`; `id` là UUID DB. Dashboard chuyển bằng `Number(proposalId)`. Probe API DTO → biểu thức normalize thật → client: on-chain ID 7 thành UUID rồi **NaN**, duyệt bị lỗi trước ký. Đường execute dùng cùng mapping.

Modal còn lấy phần tử đầu làm active proposal mà chưa lọc status; bản ghi đã EXECUTED có thể tiếp tục chiếm giao diện đề xuất hiện hành. API hiện luôn trả `hasVoted: false`.

Cần một DTO dùng thống nhất `onchainProposalId`, ID validation, lọc proposal còn hiệu lực và quyền/vote từ chain. Test bằng response API thật thay vì fixture tự đặt tên trường khác.

### A07 — P1: Từ chối/hủy V2 mới thay sổ ứng dụng

Nguồn: [useGroupFinance.ts](../frontend/src/hooks/useGroupFinance.ts#L418), [releaseRequest](../backend/src/services/groupFinanceService.ts#L1193).

Approve và execute có nhánh ONCHAIN_V2, nhưng reject/cancel vẫn gọi endpoint chung. Backend đổi status DB và giảm reservedWei mà không gọi cancel/reject contract, không chặn custody V2. Source xác nhận không có transaction contract trên đường này; chưa chạy endpoint trên DB thật trong review.

Hệ quả: ứng dụng có thể báo đã hủy/từ chối trong khi đề nghị và reservation vẫn tồn tại on-chain. Worker có thể ghi lại tổng reserved từ chain nhưng không sửa ý nghĩa status đã báo. Không được dùng kết quả DB như bằng chứng request contract đã bị vô hiệu.

Cần adapter cancel/reject/settle V2 với receipt/event sync; nếu chưa hỗ trợ thì chặn action và nói rõ, không giả hoàn thành.

### A08 — P1: Chứng từ V2 có thể khiến sync lỗi sau khi đã tạo đề nghị on-chain

Nguồn: [ExpenseRequestModal.tsx](../frontend/src/components/group-finance/ExpenseRequestModal.tsx), [useFundV2.ts](../frontend/src/hooks/useFundV2.ts#L271), [groupFinanceService.ts](../backend/src/services/groupFinanceService.ts#L1990).

Form gửi ảnh chuẩn hóa dưới dạng data URL qua `receiptAttachmentUrl`. API sync xử lý trường này bằng `textInput(..., 500)`. Probe data URL **622 ký tự bị từ chối**, trước bước ghi DB. Ảnh thực tế rất dễ vượt ngưỡng này. Backend có nhánh `receiptImageBase64` riêng nhưng hook V2 không dùng nó.

Transaction đề nghị đã được gửi trước bước sync. Khi sync lỗi, hook fallback sang create expense chung vốn yêu cầu custody SHARED_TREASURY; lỗi cuối cùng có thể hiện như toàn bộ thao tác thất bại. Không có operation recovery gắn metadata nên thử lại có thể tạo đề nghị thứ hai.

Cần gửi ảnh theo contract API thống nhất, giữ metadata/draft gắn on-chain ID và retry riêng sync; transaction đã thành công phải được giữ nguyên, không đề nghị ký lại.

## Giao diện và sử dụng mobile web

Đánh giá dưới đây dựa trên source/render tests, **chưa phải kiểm tra hình ảnh thực tế**.

Các cải thiện hiện có so với review 17/11:

- Form auth ưu tiên nội dung đăng nhập trên mobile, nêu Fuji C-Chain; phần marketing ẩn bằng `hidden lg:block`. Input thường dùng `text-base` trên mobile, nút hiện mật khẩu có vùng 44×44.
- Finance có dock bốn mục, query `?tab=` và xử lý popstate. Callback refund/governance/pause đã nối; không còn kết luận mọi CTA đó chỉ gọi endpoint thiếu.
- Góp V2 chọn địa chỉ contract thay vì bắt buộc treasury wallet. Receipt revert bị client từ chối. Deadline model giữ ISO.
- Native FinanceDialog có label, nút đóng có accessible name, khóa đóng khi bận và trả focus; CSS có dynamic viewport, safe-area, 44px controls và reduced motion.
- Preview chứng từ, thay/xóa ảnh, draft, loading/error và CSV đã có source; UI đã tách nhiều trạng thái đủ duyệt khỏi đã thanh toán.

Các điểm P2 cần sửa/kiểm chứng:

| Vấn đề | Bằng chứng source và ảnh hưởng |
| --- | --- |
| Chưa có luồng pairing ví mobile hoàn chỉnh trong repo | `registerSessionProvider` được khai báo nhưng không có caller; provider hiện dựa injected Core hoặc provider được bên khác đăng ký. Không có SDK pairing/deep-link consumer đã nối. Safari/Chrome thông thường chưa có bằng chứng tự kết nối sang Core rồi quay lại tác vụ |
| Copy trộn custody | Inbox luôn nói phiếu không tạo multisig on-chain; payment luôn nói chỉ ví giữ tiền được ký. Với V2, contract giữ tiền và quy tắc on-chain quyết định execute. Cần copy theo adapter ở review, approvals, payment |
| Review hiển thị sai hạn | ExpenseRequestModal ghi 48 giờ; hook V2 mặc định 168 giờ; sync API khi thiếu deadline đặt 30 ngày. Cùng một đề nghị có ba cách mô tả thời hạn |
| Báo đối soát thành công quá sớm | Hook góp/approve/execute bỏ qua một số lỗi API sync rồi trả CONFIRMED; ContributionModal vẫn nói “đối soát thành công”. Receipt success và read model cập nhật là hai kết quả riêng |
| Refund chưa dùng đủ eligibility | Modal bỏ qua `eligible` và `hasClaimed`, ưu tiên contributedAmount thay refundableAmount. Có thể mời claim lại khoản đã hoàn; contract là lớp chặn cuối. GET governance lỗi cũng đang bị nuốt thành danh sách trống |
| Điều hướng settings quay về hệ legacy | Settings dùng MobileNavBar sáu mục với nhãn 9–10px, không có mục quỹ nhóm; link còn ghi “Về gia đình”. Không khớp bốn mục của finance và chuẩn 4–5 mục |
| Form dài nằm trong dialog | Tạo quỹ, đề nghị, governance nhiều trường cần kiểm chứng bàn phím/focus/scroll; chuẩn dự án ưu tiên trang riêng cho form dài. Chưa thể kết luận 320px đạt chỉ từ CSS `overflow-x: hidden` |
| Chữ chưa đồng đều | CSS finance nâng text-xs lên 14px và input lên 16px, nhưng nhiều đoạn nghiệp vụ vẫn 13–14px; nav legacy 9px. Cần kiểm font thực tế, tương phản, zoom 200%, số dài và vùng chạm theo từng màn |
| Hiệu năng trên máy yếu chưa được đo | Build: home 208 kB First Load JS; login 207 kB; settings 250 kB; dashboard 378 kB. Hook refresh gọi 3 request ban đầu + 2/quỹ; 20 quỹ là 43 request trước các request legacy. Đây là số liệu build/source, không phải LCP/INP trên điện thoại |
| Thông tin phát hành mâu thuẫn | Landing FAQ vẫn nói chỉ ví cá nhân và V2 chưa kích hoạt; login giới thiệu V2, UI cho chọn V2, STATUS và ARCHITECTURE cũng khác nhau về triển khai. Cần trạng thái capability/deployment dùng chung, tách source, manifest và nghiệm thu thật |

Phiên bản Next.js đang pin 14.2.3. Review 17/11 đã dẫn các advisory có bản vá sau mốc này; lần này chưa tra lại advisory hiện hành hoặc chạy audit dependency online. Cần chọn release được hỗ trợ, kiểm advisory/lockfile và regression trước public deploy; không coi build pass là đã kiểm bảo mật dependency.

## Giới hạn kiểm thử và bước tiếp theo

`FrontendReviewRegressions.test.ts` có nhiều helper tự viết ngay trong test (verify receipt, resolve ID, preflight, contribution target). Chúng không import đường thực thi production nên pass không chứng minh client/hook/modal đã đúng. Probe lần này dùng mã production và đã thấy scope null lọt dù test helper mô phỏng một guard chặt hơn. Cần chuyển regression thành test hành vi production, nhất là DTO, scope đổi giữa simulation, timeout/reload và sync lỗi sau receipt thành công.

Thứ tự xử lý đề xuất:

1. Sửa A01–A05 và A07/A08: operation recovery, recheck trước ký, xác minh dữ liệu chain, worker cursor/idempotency và read model quyền. Đây là nền để tin thông tin người dùng xem trước khi ký.
2. Sửa A06 và hoàn tất một vòng ứng dụng V2 với database riêng: tạo → góp → đề nghị có ảnh → duyệt → trả → đối soát → từ chối/hủy → governance/pause/refund. Kiểm tra cả lỗi giữa các bước; không chỉ gọi contract trong script.
3. Chuẩn hóa copy/DTO/capability theo custody, điều hướng finance/settings và form điện thoại. Hoàn thiện hoặc nêu rõ phần chưa hỗ trợ của bàn giao/rời nhóm/đóng quỹ.
4. Khi có browser được phép điều khiển: lưu ảnh 320/360/390/430px, kiểm overflow, zoom 200%, tương phản, focus, tên dài và số tiền chính xác. Sau đó chạy iOS Safari và Android Chrome với Core Mobile trên Fuji, ghi phiên bản thiết bị/ví, deployment, app-switching, account/network changes và timeout recovery.
5. Chỉ quyết định pilot sau khi các lỗi tài chính được đóng và nhóm thử tự hoàn thành thu–chi–đối soát. Chưa có dữ liệu thực nghiệm để chấm phần trăm hoàn thiện hay kết luận mobile đã dùng tốt.

Không đánh dấu lại MOBILE_ACCEPTANCE là đạt trong đợt review này. Báo cáo giữ riêng kết quả test local, phát hiện source/adapter và các môi trường chưa kiểm tra.

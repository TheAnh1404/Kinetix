# Hoàn thiện lần đầu sử dụng Kinetix

Ngày: 05/11/2026. Phạm vi: Admin tự đăng ký, Guardian được mời, Elderly/Child do
người bảo hộ tạo. Đây là kế hoạch hiện hành, thay sáu tài liệu kế hoạch/tiến độ phiên
cũ đã dọn. Người dùng yêu cầu triển khai ngay sau lập kế hoạch.

**Trạng thái bàn giao:** đã triển khai code A–E và kiểm chứng tích hợp trên PostgreSQL
cô lập + EVM cục bộ. Chưa nghiệm thu giao diện trên Chrome/Core thật hoặc deployment Fuji.

**Cập nhật mới nhất:** đã triển khai màn “Bắt đầu” riêng tại `/start` trước dashboard.
Xem phần bàn giao ở cuối tài liệu; các phần kế hoạch phía trước giữ làm đặc tả và lịch sử.

## Nền tảng giữ nguyên

- T1: AVAX/Fuji 43113, một chain; không bật token/bridge/yield/relayer.
- Username/password + Core cá nhân; credential tạm phải đổi trước liên kết ví.
  Không sinh ví hoặc giữ private key thay thành viên; không đăng nhập bằng PIN.
- Quyền từ session/membership + contract; Admin workspace không tự thành operator
  Hub hoặc Guardian hũ. Kết nối ví, xác minh ví và cấp quyền là các bước riêng.
- SHIELD giữ ngân sách ngày chung hũ; MILESTONE giữ thưởng/quorum; goal giữ semantics
  target/deadline; ROSCA một chu kỳ, chưa có default/refund. Không đổi policy tài sản.
- Migration 0006–0008 đã áp dụng sau sao lưu ở lượt sửa lỗi đăng ký; schema database
  cấu hình hiện không thiếu bảng/cột. Không reset/seed dữ liệu người dùng.
- Manifest vẫn configured/disabled. Việc tạo tài khoản và quản lý gia đình có thể
  tiếp tục; giao dịch chỉ mở khi deployment/receipt/quyền được xác minh thực tế.

## Kiểm tra đã thực hiện trước triển khai

Đọc `auth/service.ts`, `authRoutes`, `apiRoutes`, `useAuth`, middleware, activate,
dashboard, FamilyContext, màn quản lý/cấp quyền/tạo hũ và hai portal thành viên.
`npm run db:check`: không thiếu bảng/cột. `npm run test:auth`: 62 đạt, 15 integration
PostgreSQL pending. Đây là kiểm tra mã và lệnh cục bộ, chưa phải QA browser/Core.

| ID | Khoảng trống thực tế | Bằng chứng và hệ quả |
|---|---|---|
| F01 | Chưa có hành trình thiết lập sau tạo account | `registerGuardian` tạo credential+wallet và trả READY; `identity.redirectUrl` đến dashboard. Admin mới thấy các panel nghiệp vụ nhưng không có thứ tự làm |
| F02 | READY tài khoản đang dễ hiểu thành đủ quyền chi tiền | `onboarding()` chỉ kiểm credential, mật khẩu tạm, userWallet. Không kiểm deployment/allowlist/hũ/vốn |
| F03 | Hạ tầng triển khai trộn vào dashboard gia đình | `GuardianView` gắn `CoreDeploymentConsole`; workspace Admin có thể thấy 5 bước deploy khi manifest tắt. Operator hệ thống và quản trị gia đình là hai trách nhiệm khác nhau |
| F04 | Cấp quyền thiếu hướng dẫn theo người và workspace | `AccountStatus` kiểm mọi provisioning request, thông báo chung; `ProvisioningPanel` chỉ ở quản trị và ẩn khi deployment tắt |
| F05 | Chưa có status lần đầu từ server | Không có DTO tổng hợp account/workspace/deployment/allowlist/vault/task và next action. UI phải suy từ nhiều nguồn |
| F06 | Gia đình tạo trước activation có Hub null | `registerGuardian`/POST workspace chỉ gán Hub khi manifest enabled; activation không tự cập nhật workspace. Không được bỏ qua hoặc tự map hũ cũ để sửa |
| F07 | Tạo hũ mới chưa dẫn qua điều kiện thành viên | Modal lọc ví bằng địa chỉ hợp lệ; chưa giải thích đầy đủ member chưa linked/allowlisted, MILESTONE cần assignee không là Guardian |
| F08 | Empty state không phân biệt thiếu thiết lập | Elderly “chưa có hũ”, Kids “chưa có việc” chưa cho biết cần ai hỗ trợ và bước nào còn thiếu |
| F09 | Nhận lời mời còn nằm trong form tạo gia đình | Token nhập thủ công trong details, chưa có entry nhận lời mời rõ ràng, chưa có preview scope an toàn |
| F10 | Kiểm chứng first-use còn thiếu | 15 DB tests pending; chưa có bộ first-use riêng cho resume/switch workspace/mất kết nối/đăng nhập khác thiết bị |
| F11 | Bootstrap worker làm dừng cả ứng dụng | Worker thoát khi manifest disabled; `dev:all` dùng concurrently `-k`. Đã sửa worker chờ/retry xác minh, không mở indexing khi chưa đủ bằng chứng |

## Luồng đích

### Admin mới

Đăng ký bằng Core → vào dashboard có checklist gia đình → tạo tài khoản người thân
hoặc mời Guardian → theo dõi từng người đổi mật khẩu/liên kết ví → chờ deployment
được operator xác minh → nối workspace chưa cấu hình bằng hành động có kiểm quyền
→ cấp allowlist bằng operator → tạo SHIELD/MILESTONE với thành viên hợp lệ → nạp
AVAX → hoàn thành giao dịch đầu tiên có receipt. Có thể bỏ qua hướng dẫn và quay lại;
không bắt nạp tiền hay deploy contract để chỉ dùng tài khoản ứng dụng.

### Guardian được mời

Nhận token riêng → chọn nhận lời mời, xác minh đúng Core → tạo credential → vào đúng
workspace theo membership → thấy phạm vi được phân công và người cần liên hệ. Chưa
có management flag không được mở quản lý thành viên; chưa là Guardian on-chain
không được ký duyệt. Không tạo gia đình thứ hai ngoài ý muốn.

### Elderly/Child mới

Credential tạm → đổi mật khẩu → liên kết Core cá nhân → dashboard theo membership.
Hiển thị riêng: đã kích hoạt tài khoản / chờ cấp quyền / chờ hũ / chờ tiền hoặc nhiệm vụ.
Có liên hệ người bảo hộ được phân công và tải lại trạng thái. Sau đó đăng nhập bằng
password để xem dữ liệu, chỉ mở đúng Core khi ký; refresh không làm mất bước còn thiếu.

## Trình tự triển khai và tiêu chí nghiệm thu

| Đợt | Việc thực hiện | Nghiệm thu |
|---|---|---|
| A | DTO first-use và endpoint có guard theo workspace; policy xác định next action | Không đọc chéo tenant, không suy quyền từ role global, RPC lỗi thành UNKNOWN/UNAVAILABLE |
| B | Checklist dashboard theo vai trò, các CTA mở đúng quản lý/mời/cấp quyền/tạo hũ | Fresh account biết cần làm gì; chưa deploy vẫn quản lý gia đình được; không ép mọi Admin deploy |
| C | Đường nối workspace Hub null sau verify; cập nhật auth/context sau thao tác | Chỉ Admin; không ghi đè Hub khác hoặc sửa mapping hũ; receipt/deployment thật là điều kiện |
| D | Entry nhận lời mời và empty/wait/error/resume theo tài khoản | Admin, invited Guardian, Elderly, Child đều có route và CTA hợp lệ; reload/workspace/logout không lẫn trạng thái |
| E | Test policy/API guard/render/negative; typecheck/build; tài liệu bàn giao | Không báo paid khi chỉ broadcast; không mark first-use xong bằng localStorage; pending DB/Core được nêu rõ |

Không thêm bảng onboarding chỉ để giữ boolean “đã xong”. Trạng thái nghiệp vụ suy từ
dữ liệu đã xác minh; preference ẩn hướng dẫn (nếu thêm) không cấp quyền và không che blocker.
Không thêm write on-chain mới trước khi contract regression tương ứng đạt.

## Ma trận QA bắt buộc

1. Admin mới chỉ có một workspace, không có hũ/vốn: hiển thị 0 và hướng dẫn cụ thể.
2. Deployment disabled/RPC lỗi: có thể quản lý tài khoản; tài chính đóng và nêu nguyên nhân.
3. Member tạm, hết hạn, reset/revoked: API onboarding giới hạn, giữ bước sau refresh.
4. Link sai ví/trùng ví/replay/session khác: không tạo liên kết hoặc cấp quyền giả.
5. Guardian được mời đúng/sai token hoặc ví; không management flag; không Guardian hũ.
6. Elderly không có SHIELD; Child không có MILESTONE/task; không tự gán hũ của người khác.
7. Chọn workspace khác/thu hồi membership/logout chung thiết bị: không giữ status/CTA cũ.
8. Core hủy ký, sai chain, thiếu gas, receipt chưa final, API timeout: không báo thành công.
9. Workspace Hub null chỉ nối đúng deployment đã verified; Hub xung đột không tự sửa.
10. Không bắt có Core để chỉ xem dashboard sau kích hoạt; mobile chưa pairing nêu giới hạn.

DB integration chỉ chạy trên `TEST_DATABASE_URL` cô lập với opt-in reset. Bằng chứng
Fuji/Core/browser cần thu riêng trước công bố hoàn tất E2E. Không dùng DB ứng dụng
để chạy integration phá dữ liệu.

## Tài liệu giữ lại và backlog ngoài phạm vi

- [Runbook auth](AUTH_IMPLEMENTATION_RUNBOOK.md): vận hành tài khoản/session/migration.
- [Rà soát bảo mật lịch sử](KINETIX_REVIEW_2026-11-04.md): bằng chứng phát hiện cũ.
- [Workflow nghiệp vụ](../.docs/KINETIX_FUNCTIONAL_WORKFLOWS.md): luồng T1 liên quan.
- [Bàn giao T1](../.docs/T1_HANDOVER.md), [rà soát testnet](../CONTRACT_TESTNET_REVIEW.md):
  policy và bằng chứng lịch sử; không dùng số test cũ làm trạng thái hiện tại.

Recovery nhiều workspace, worker crash/race, monitoring/incident drills, ROSCA refund,
quản trị member/quorum, WalletConnect pairing, ERC20 và T2 vẫn là backlog riêng.

## Tiến độ triển khai

- [x] Rà soát mã và kiểm tra baseline, lập kế hoạch trước thay đổi chức năng.
- [x] Gộp/xóa sáu tài liệu kế hoạch cũ; giữ báo cáo và runbook.
- [x] A: backend readiness/policy/guard.
- [x] B–D: giao diện và đường hoàn tất/resume theo scope hiện tại.
- [x] E: regression/typecheck/build và PostgreSQL + local EVM; kết quả bên dưới.
- [ ] Nghiệm thu ngoài môi trường cục bộ: Chrome/Core desktop/mobile, HTTPS/Fuji thật.

## Bàn giao triển khai

| Thành phần | Hành vi đã triển khai |
|---|---|
| `shared/firstUse.ts` | Checklist suy từ facts; READY tài khoản không mở quyền tài chính; tách disabled/unknown/paused/quyền ví/hũ/vốn/nhiệm vụ |
| `firstUseService` + routes | GET status theo workspace, POST nối Hub chưa có, GET candidates; full-session/membership guard, đọc finalized, không sửa ledger/hũ |
| `useFirstUseStatus` + `FirstUseChecklist` | Trạng thái/CTA theo role dùng tại màn `/start`, chống kết quả cũ khi đổi scope; dashboard chỉ giữ `StartReminder` |
| Guardian dashboard | Mở trực tiếp quản lý/cấp quyền/tạo hũ; empty state 0; công cụ deploy chỉ mở khi chủ động chọn, không là bước bắt buộc của mọi gia đình |
| Nhận lời mời | Mode riêng `/login?mode=invite`, preview workspace/ví/hạn dùng, từ chối sai ví trước ký; backend kiểm lại token trong transaction đăng ký |
| Tạo hũ | Ví phải linked và live-allowlisted; thông báo thành viên chưa đủ điều kiện; chặn MILESTONE tự thưởng và hiển thị lỗi tại form |
| AccountStatus | Thông báo provisioning chỉ theo workspace hiện tại |
| Core deployment | Dùng `HUB_RPC_URL` riêng nếu cấu hình; vẫn kiểm chain và exact transaction; không tự kích hoạt candidate |
| Worker khi khởi tạo | Idle/retry khi chưa có deployment hoặc RPC chưa xác minh; API/frontend vẫn phục vụ tài khoản. Chỉ bắt đầu index sau `verifiedDeployment` |

Không thêm migration cho first-use và không thêm boolean cấp quyền/hoàn tất từ client.
Không gửi thông điệp/mời hộ qua dịch vụ bên ngoài, không giữ private key hoặc credential mới.
Lượt này chỉ đọc metadata database ứng dụng; các account/transaction kiểm thử đều ở DB/EVM riêng.

### Kết quả kiểm chứng

| Kiểm tra | Kết quả |
|---|---|
| `npm test` | **153 đạt**, 16 DB case bị skip khi không đặt test URL; 16 case đó đã chạy đạt trong lệnh local bên dưới |
| `npm run test:auth:local` | **96 đạt, không pending**, dùng PostgreSQL 18 riêng; gồm đăng ký/activation/nonce race/role/scope/invitation preview/onboarding guards |
| `npm run test:v2:local` | **10 kiểm tra đạt** với PostgreSQL + contract thật trên Hardhat: first-use theo vai trò, candidates, nối workspace idempotent không map lại hũ, money flow, recovery, five-step deployment candidate |
| Backend/frontend TypeScript | Đạt |
| Next production build | Đạt, output `.next-t1-check`; không dùng output này thay dev server |
| `npm run db:check` | Không thiếu bảng/cột trong DB ứng dụng |
| UI render | Checklist React thật, empty state/personal-data boundary đạt trong suite |
| HTTP ứng dụng đang chạy | `/login?mode=invite` trả 200 và có entry nhận lời mời; token sai trả 400 `INVITATION_INVALID` trên API 4000 và BFF 3000; first-use chưa đăng nhập trả 401 |
| Chrome thực tế | Chưa chạy: browser access host unavailable và công cụ không được cấp quyền dùng cửa sổ Chrome |

Các suite trùng nhau một phần; không cộng số case thành số test độc lập. Local EVM có
receipt thật trên chain test cục bộ, không phải receipt Fuji hoặc thao tác Core extension.
PostgreSQL kiểm thử đã dừng sau kiểm tra, port 55438 không còn phản hồi. Dữ liệu kiểm
thử nằm trong `.cache/` được gitignore, không nằm trong database ứng dụng.

### Chạy lại kiểm thử PostgreSQL cục bộ

Runner `scripts/run-local-postgres-tests.cjs` chỉ nhận URL loopback, yêu cầu opt-in
database có thể reset, từ chối URL trùng DB ứng dụng. WebSocket proxy chỉ tồn tại trong
process test để Neon driver kết nối PostgreSQL cục bộ; không thay đổi transport ứng dụng.

Khởi tạo cluster/database kiểm thử riêng một lần với PostgreSQL cài trên máy. Ví dụ
PowerShell; chỉ init thư mục mới, không chạy vào cluster đang giữ dữ liệu ứng dụng:

```powershell
$pgBin = "C:/Program Files/PostgreSQL/18/bin"
& "$pgBin/initdb.exe" -D "$PWD/.cache/pg-first-use" -U kinetix_test --auth=trust --encoding=UTF8 --locale=C
& "$pgBin/postgres.exe" -D "$PWD/.cache/pg-first-use" -h 127.0.0.1 -p 55438
```

Giữ server trên ở terminal riêng. Trong terminal khác, tạo DB (chỉ lần đầu), rồi chạy
hai bộ tuần tự vì chúng reset cùng DB:

```powershell
$pgBin = "C:/Program Files/PostgreSQL/18/bin"
& "$pgBin/createdb.exe" -h 127.0.0.1 -p 55438 -U kinetix_test kinetix_first_use_test
$env:TEST_DATABASE_URL = "postgresql://kinetix_test@127.0.0.1:55438/kinetix_first_use_test"
$env:AUTH_TEST_ALLOW_RESET = "true"
npm run compile
npm run test:auth:local
npm run test:v2:local
```

### Các bước kiểm trên sản phẩm

1. Admin mới đăng ký → `/dashboard/guardian`: thấy hướng dẫn, số dư 0, mở quản lý
   thành viên; nếu manifest disabled thì chờ vận hành, không bị bắt deploy/nạp tiền.
2. Admin tạo dependent → bàn giao credential một lần → dependent đăng nhập, đổi mật
   khẩu, link Core → dashboard đúng role; thiếu hũ/quyền có hướng dẫn và liên hệ thật.
3. Admin tạo invitation → người mới chọn nhận lời mời → preview → dùng đúng Core →
   vào workspace được mời. Guardian không management flag không thấy CTA quản lý.
4. Khi operator đã kích hoạt deployment thật: Admin nối workspace còn Hub null →
   xác nhận cấp quyền → tạo hũ với candidates hợp lệ → nạp/giao nhiệm vụ/rút theo policy.
   Mọi write vẫn qua transaction-context/simulation/receipt/finality hiện có.
5. Refresh/đổi workspace/logout/login lại: status tính lại từ server, không dùng
   cache của người trước, không mất theo dõi hash đã broadcast.

## Danh mục tài liệu đã dọn

Đã xóa hai plan cũ dưới `docs/` (upgrade/auth) và bốn tài liệu dưới `.docs/`
(contract upgrade plan, roadmap V2, T1 implementation, V2 progress). Quyết định auth/T1,
tiến độ và backlog cần giữ đã gộp tại tài liệu này; báo cáo bảo mật và runbook vẫn còn.
Các liên kết Markdown đang sử dụng đã đổi sang plan hiện hành.

### Bản kiểm tra đang chạy

Frontend production build tại `http://localhost:3000`, API tại port 4000; worker ở
trạng thái chờ deployment đã xác minh. Chưa có giao dịch Fuji nào được gửi.
Trong sandbox này, `npm run dev:all` bị `spawn EPERM` ở concurrently nên đã khởi chạy
ba process trực tiếp. Lệnh thường vẫn dành cho môi trường cho phép child process.
Lệnh thay thế (ba terminal riêng, từ root trừ khi có ghi chú):

```powershell
node -r ts-node/register/transpile-only backend/src/server.ts
node -r ts-node/register/transpile-only backend/src/workers/eventListener.ts
# Terminal frontend, chạy trong frontend/ sau khi build:
$env:KINETIX_BUILD_DIR = '.next-t1-check'
node node_modules/next/dist/bin/next start -p 3000
```

Đây là bản production để kiểm tra; muốn cập nhật mã giao diện tiếp tục cần rebuild
hoặc dùng Next dev trong môi trường cho phép. Các thay đổi giao diện trang chủ đang
có song song trong working tree đã được giữ lại.

## Đặc tả màn “Bắt đầu” riêng trước dashboard

Ngày đề xuất: 05/11/2026. Đặc tả này đã được triển khai theo yêu cầu “làm đi” ở lượt kế tiếp.
Thay vị trí onboarding hiện tại ở dashboard bằng một hành trình tập trung tại `/start`.
Giữ dashboard cho công việc hằng ngày và giữ `/activate` cho bước xác thực bắt buộc.

### 1. Luồng điều hướng

```text
Đăng ký / đăng nhập
  ├─ Chưa đổi mật khẩu hoặc chưa liên kết Core → /activate
  └─ Tài khoản READY
       ├─ Chưa đi qua hướng dẫn lần đầu → /start?workspace=<id>
       └─ Đã hoàn tất hoặc chọn thiết lập sau → dashboard theo membership
```

Admin mới đã tạo credential và xác minh Core sẽ vào `/start` trực tiếp. Guardian được
mời vào đúng workspace được mời; Elderly/Child hoàn tất `/activate` rồi mới vào `/start`.
Không đưa người đã dùng ứng dụng trở lại wizard ở mọi lần đăng nhập.

Hiện `auth/service.ts::identity()` trả `/dashboard` khi READY; `useAuth.finish()` dùng
redirect đó; middleware cũng chuyển tài khoản READY về dashboard. Phải sửa đồng bộ
cả ba điểm và guard của dashboard, tránh vòng lặp `/activate` ↔ `/start` ↔ dashboard.

### 2. Giao diện đề xuất

Màn riêng không có sidebar, bảng số dư, hàng loạt modal hoặc công cụ deploy. Desktop
có khối giới thiệu và nội dung bước; mobile dùng một cột. Header có tên gia đình,
tiến trình và Đăng xuất. Mỗi bước có một hành động chính; có Quay lại và bước tiếp theo.
Các bước người dùng tự làm được hiển thị trước phần phải chờ người khác.

| Màn | Nội dung và hành động |
|---|---|
| Chào mừng | Tên người dùng, gia đình, vai trò do server xác định; giải thích ngắn về tài khoản riêng và ví cá nhân. CTA “Bắt đầu thiết lập” |
| Gia đình của bạn | Admin tạo tài khoản người thân/mời Guardian bằng các API hiện có. Guardian được mời xem phạm vi được giao. Elderly/Child xem người bảo hộ được phân công |
| Sẵn sàng sử dụng | Hiển thị đã xác minh tài khoản/ví; phân biệt đang chờ hệ thống, cấp quyền hoặc hũ. Admin có hành động phù hợp để nối workspace/cấp quyền; thành viên có liên hệ người bảo hộ |
| Hoàn tất khởi đầu | Tóm tắt đã làm và việc còn chờ. CTA “Vào không gian của tôi”; không dùng lời hứa “đã sẵn sàng giao dịch” khi chưa có bằng chứng |

Điều chỉnh độ dài theo vai trò: Admin có đủ bốn màn; Guardian có thể rút gọn phần
gia đình; Elderly/Child dùng khoảng ba màn, chữ lớn, ít thuật ngữ. Không yêu cầu họ
tạo người thân, quản lý mạng, nhập receipt hoặc tự deploy contract.

Tạo hũ/nạp tiền là lựa chọn tiếp theo cho Admin sau khi đủ điều kiện, không phải điều
kiện bắt buộc để thoát onboarding. Nếu người dùng chọn thiết lập ngay, reuse form hiện
có trong bước tương ứng và giữ cơ chế simulation/receipt/finality.

### 3. Bắt buộc và có thể để sau

- Bắt buộc trước sử dụng thông thường: session hợp lệ, mật khẩu cá nhân, ví liên kết
  theo policy hiện tại và membership đang hoạt động. Đây vẫn là guard phía server.
- Có thể để sau: thêm người thân, tạo/nạp hũ, chờ operator hoặc chờ người bảo hộ giao
  việc. Luôn có “Sử dụng trước, thiết lập sau” khi tài khoản đã READY.
- Hoàn thành wizard nghĩa là hoàn thành phần giới thiệu/thiết lập ban đầu; không tự
  cấp allowlist, vai trò contract, số dư hoặc quyền chi tiền.
- Sau khi vào dashboard, checklist lớn hiện tại được thay bằng thẻ gọn “Tiếp tục thiết
  lập” nếu còn việc chờ. Luôn có lối mở lại `/start` từ tài khoản/cài đặt.

### 4. Trạng thái bền vững và phân biệt người mới/người cũ

Thêm migration additive cho trạng thái **trình bày onboarding**, tách khỏi readiness
tài chính. Đề xuất bảng `workspace_onboarding` với khóa duy nhất
`(user_id, workspace_id, flow_version)`, `status`, `last_step`, `updated_at`,
`completed_at` hoặc `deferred_at`. Các trạng thái: `IN_PROGRESS`, `COMPLETED`,
`DEFERRED`, `LEGACY`. Không lưu mật khẩu/token/chữ ký trong bảng này.

- Server kiểm membership và danh sách step hợp lệ theo vai trò khi ghi tiến độ.
  Client không được tự đổi user/workspace/role hoặc tự đánh dấu quyền on-chain.
- Refresh, đăng nhập thiết bị khác, đóng Core: tiếp tục bước đang làm từ server.
  Lưu step ngay sau khi bước hoàn tất; không phụ thuộc localStorage để quyết định gate.
- Migration đánh dấu membership đã tồn tại là LEGACY cho phiên bản đầu để người đang
  dùng không bị buộc xem lại. Membership mới sau migration bắt đầu hành trình mới.
  Khi rollout cần kiểm cửa sổ giữa migration và bật tính năng, không suy người mới
  chỉ từ việc thiếu row mà chưa xử lý nhóm tài khoản cũ.
- Đổi workspace tải trạng thái riêng; đổi role thì server chọn bước hợp lệ mới.
  Workspace đã rời/khóa không được tiếp tục đọc hoặc ghi progress.
- Chuẩn hóa workspace được chọn giữa server entry route, URL và FamilyContext.
  `?workspace=` phải được kiểm membership; không để middleware chọn một gia đình
  trong khi UI đang thiết lập gia đình khác từ sessionStorage cũ.

### 5. Phần mã dự kiến thay đổi

| Phần | Thay đổi |
|---|---|
| Next routes | Thêm `app/start/page.tsx`, shell/stepper theo vai trò; cập nhật matcher và redirect middleware |
| Auth identity | Trả entry route cùng workspace và trạng thái presentation; giữ `onboarding` security hiện tại để không làm sai guard |
| API progress | GET trạng thái hành trình và PATCH bước/complete/defer dưới workspace, qua full-session/membership guard; thao tác idempotent |
| First-use hiện có | Tách fetch/state thành hook dùng chung; reuse `firstUseStatus`, candidates, connect, invitation preview và transaction layer |
| Các form | Tách phần nội dung tạo member/mời/cấp quyền/tạo hũ để dùng được trong wizard và dashboard; không mount cả GuardianView ẩn để dùng modal |
| Dashboard | Thẻ nhắc tiếp tục nhỏ, route đúng vai trò; chưa hoàn tất hướng dẫn lần đầu thì chuyển `/start` trước khi render nghiệp vụ |
| Database | Bảng presentation + unique/FK; backfill cohort cũ; kiểm migration sạch/legacy và chạy lại an toàn |

### 6. Trình tự thực hiện và nghiệm thu

| Đợt | Đầu ra | Điều kiện hoàn tất |
|---|---|---|
| 1 | Chốt wireframe bốn vai trò, state/redirect matrix | Rõ bước bắt buộc, bước bỏ qua, cách xử lý người cũ và workspace |
| 2 | Migration, progress API và entry-route resolver chung | Không truy cập chéo user/tenant; PATCH idempotent; account chưa READY không bypass `/activate` |
| 3 | Shell `/start`, các bước theo role, form tái sử dụng | Thực hiện được từng CTA; loading/error/wait/retry đầy đủ; không bắt ký giao dịch không cần thiết |
| 4 | Redirect/middleware/dashboard/resume | Không loop, không mất bước, không ép xem lại khi login; đổi workspace đúng scope |
| 5 | Kiểm thử và bàn giao | PostgreSQL + local EVM, typecheck/build, browser responsive/keyboard; ghi riêng nghiệm thu Core/Fuji |

Ước lượng ban đầu: 4–6 ngày công cho mã và kiểm chứng cục bộ nhờ tái sử dụng API;
cần thêm thời gian QA trình duyệt/thiết bị và sửa lỗi phát sinh. Không bao gồm triển
khai hạ tầng Fuji, tích hợp WalletConnect mới hoặc thay policy contract.

### 7. Ca kiểm thử bắt buộc

1. Admin mới đăng ký → `/start` → thêm người thân hoặc để sau → đúng dashboard.
2. Guardian nhận lời mời → đúng gia đình, không có CTA quản lý nếu chưa được giao quyền.
3. Elderly/Child → đổi mật khẩu/link ví → `/start` dễ hiểu → đúng portal theo membership.
4. Refresh giữa các bước; logout/login; thiết bị khác: resume đúng scope, không cấp quyền giả.
5. Đi trực tiếp `/dashboard` hoặc `/start` khi chưa login/chưa activate/đã hoàn tất:
   chuyển đúng một đích, không loop và không lộ dữ liệu trước guard.
6. Người cũ sau migration không bị chặn; mở lại wizard chủ động vẫn được.
7. Deployment disabled, RPC lỗi, chưa có hũ, chưa có gas: vẫn vào dashboard đọc dữ liệu
   sau khi chọn thiết lập sau; không đánh dấu financial-ready.
8. Đổi workspace/role, bị khóa hoặc rời workspace giữa chừng: xóa state cũ và từ chối API.
9. Hủy ký, receipt pending, API timeout, bấm lặp: giữ hash và retry sync, không gửi tiền hai lần.
10. Keyboard/focus/aria, màn 360px, chữ lớn Elderly; không log token/credential hoặc đặt token
    mời trong URL. Các destination chuyển trang phải nằm trong allowlist nội bộ.

**Bước đầu khi triển khai:** wireframe và route/state matrix, sau đó migration/API;
chỉ gỡ checklist lớn trong dashboard khi `/start` đã có đủ CTA, resume và regression.

## Bàn giao màn `/start` — 05/11/2026

- [x] Route và shell riêng, không sidebar/dashboard. Admin/Guardian có bốn bước;
  Elderly/Child có ba bước, kiểu chữ/nút lớn cho Elderly.
- [x] Session/đổi mật khẩu/link ví vẫn là điều kiện bắt buộc tại `/activate`.
  Sau đó account mới vào `/start`, account đã xong/để sau/người cũ vào dashboard đúng role.
- [x] Tiến độ theo user + workspace + version, có revision chống ghi đè giữa tab/thiết bị,
  retry cùng thao tác idempotent, complete/defer/restart và kiểm step theo role server.
- [x] Member management/invitation preview/cấp quyền/tạo hũ tái sử dụng các form/API có sẵn.
  Quyền tài chính không được cấp bằng complete/defer. Khi form đang xử lý, khóa chuyển bước.
- [x] Dashboard thay checklist lớn bằng thẻ mở lại hướng dẫn; điều phối middleware,
  auth entry và FamilyContext cùng workspace được xác minh.
- [x] Workspace preference cookie gắn user ID và được server đối chiếu membership;
  URL scope bị cấm trả 403, không chọn nhầm gia đình từ cookie của người trước.
- [x] Migration `0009_workspace_onboarding`: thêm bảng presentation, unique/FK/check,
  backfill memberships hiện có thành LEGACY. Đã thử trên PostgreSQL riêng trước khi
  áp dụng database ứng dụng sau snapshot ở `.private/`; số row các bảng cũ không đổi.
- [x] Chạy migration lại trả 0 pending, `db:check` không thiếu bảng/cột.

### Kết quả cập nhật

| Kiểm tra | Kết quả |
|---|---|
| `npm test` | 165 đạt; 19 case DB được skip khi không đặt test URL và đã chạy riêng bên dưới |
| `npm run test:auth:local` | **111 đạt**, gồm 19 case PostgreSQL thực; không pending |
| `npm run test:v2:local` | 10 kiểm tra đạt, PostgreSQL + EVM cục bộ; không phải Fuji |
| Backend/frontend TypeScript | Đạt |
| Next production build | Đạt; có route `/start`, output `.next-t1-check` |
| Middleware và SSR | Đã kiểm redirect không loop, phiên chưa activate, scope cấm, auth lỗi, shell không dashboard, reminder gọn |

`START_SCREEN_ENABLED` là cổng trình bày backend (mặc định bật; có thể đặt false),
không bỏ guard bảo mật. Khi triển khai nơi khác: backup → migrate 0009 → cập nhật API
→ rebuild/restart frontend. Không cần nhập lại credential hoặc đổi ví của người cũ.

Người dùng cũ mở **Xem hướng dẫn** trên dashboard hoặc `/start`; chọn **Xem lại từ đầu**
để bắt đầu chủ động. Người chọn thiết lập sau có nút tiếp tục đúng bước đã lưu.
Chưa nghiệm thu thao tác Core extension/mobile hoặc ảnh chụp trình duyệt thực; giữ
giới hạn browser và deployment Fuji của bàn giao trước. Không gửi giao dịch Fuji mới.

Kiểm tra HTTP trên ứng dụng đang chạy: API port 4000 và BFF port 3000 đều báo
`startFlowVersion=1`; `/start` khi chưa đăng nhập trả 307 về `/login`. Các process dev
đang theo dõi mã đã nạp thay đổi; không dừng các process do người dùng khởi chạy.

# Kinetix Family Admin — nghiên cứu và kế hoạch production

Ngày nghiên cứu: 11/11/2026. Trạng thái: đề xuất, chưa triển khai thay đổi chức năng.

## 1. Đề xuất chính

Xây **Trung tâm Quản trị Gia đình** tại `/dashboard/admin`, chỉ dành cho tài khoản có membership `ADMIN` đang hoạt động trong đúng gia đình được chọn. Đây là quyền quản trị một workspace, không phải quyền quản trị toàn hệ thống.

Mục tiêu: quản lý thành viên và người bảo hộ; thiết lập quy tắc sử dụng quỹ; kiểm soát thay đổi nhạy cảm; đối soát tiền; xử lý sự cố; xuất báo cáo và kiểm toán. Giữ quyền giám hộ/duyệt hũ đã được giao cho Guardian ở các màn hình nghiệp vụ riêng, không biến Guardian thành Admin vì cùng nhìn thấy dashboard quản lý.

Phạm vi bản đầu là workspace loại `FAMILY`. Các loại workspace khác chỉ được mở rộng sau khi có capability tương ứng. Không dùng trường legacy `users.familyId` hay vai trò toàn cục để quyết định quyền admin của một gia đình.

**Ba quyền phải được phân biệt:** quản trị ứng dụng, duyệt nghiệp vụ, ký tài sản trên blockchain. Được làm Admin không tự có private key; người giữ ví không tự có quyền đọc dữ liệu của mọi gia đình; Admin không được thay quorum bằng một thao tác để tự chi tiền.

## 2. Phương pháp và nguồn nghiên cứu

Đã đọc các route/service quản trị, Settings, xác thực, recovery, treasury, workflow hũ, schema và điều hướng frontend hiện tại. Đây là rà soát mã nguồn, không phải báo cáo pentest hay chứng nhận production.

Skills: `kinetix-builder` cho phạm vi nghiệp vụ và Web3; `ui-ux-pro-max` cho luồng quản trị, lỗi biểu mẫu và điều hướng. Kết quả thiết kế tự động vẫn thiên về landing page/glassmorphism, nên đề xuất tiếp tục dùng token và phong cách nền sáng hiện có. Kết quả UX về thông báo lỗi, liên kết lỗi với input và focus của error summary phù hợp với form quản trị.

| Nguồn chính thức | Kết luận áp dụng cho Kinetix |
|---|---|
| [OWASP Authorization](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html) | Backend kiểm tra quyền trên từng request, mặc định từ chối, kiểm thử cả các trường hợp bị cấm. |
| [OWASP Multi-Tenant Security](https://cheatsheetseries.owasp.org/cheatsheets/Multi_Tenant_Security_Cheat_Sheet.html) | Workspace context phải gắn với phiên và membership đã xác minh; tenant ID do client gửi không tự tạo quyền. |
| [OWASP Transaction Authorization](https://cheatsheetseries.owasp.org/cheatsheets/Transaction_Authorization_Cheat_Sheet.html) | Người xác nhận phải thấy nội dung quan trọng của thao tác; bằng chứng phê duyệt phải gắn đúng thao tác đó. |
| [OWASP Authentication](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html), [MFA](https://cheatsheetseries.owasp.org/cheatsheets/Multifactor_Authentication_Cheat_Sheet.html) | Xác thực bổ sung khi đổi quyền, recovery hoặc thay đổi nhạy cảm; không coi phiên đăng nhập bình thường là đủ cho mọi thao tác. |
| [OWASP Logging](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html) | Ghi sự kiện quản trị có ngữ cảnh; tránh ghi mật khẩu, token và bí mật xác thực vào log. |
| [PostgreSQL 16 RLS](https://www.postgresql.org/docs/16/ddl-rowsecurity.html) | Có thể thêm lớp cô lập hàng dữ liệu; table owner và tài khoản có quyền bypass cần được xử lý riêng. |
| [PostgreSQL 16 PITR](https://www.postgresql.org/docs/16/continuous-archiving.html) | Backup cần có bài phục hồi thật; khả năng quay lại thời điểm cụ thể phụ thuộc base backup và chuỗi WAL phù hợp. |
| [Safe account architecture](https://docs.safe.global/advanced/smart-account-overview) | EOA phụ thuộc một private key; Safe hỗ trợ danh sách owner và ngưỡng chữ ký. |
| [Avalanche Safe/Ash setup](https://build.avax.network/academy/avalanche-l1/permissioned-l1s/06-multisig-setup/03-create-safe-wallet) | Có hướng triển khai multisig trên Avalanche; phải xác minh deployment và công cụ trên mạng mục tiêu của Kinetix. |
| [OWASP GitHub Actions Security](https://cheatsheetseries.owasp.org/cheatsheets/GitHub_Actions_Security_Cheat_Sheet.html) | Giới hạn quyền workflow, bảo vệ secrets và kiểm soát mã không tin cậy trong pipeline. |

Các chức năng, schema, ngưỡng và lịch triển khai bên dưới là đề xuất thiết kế cho repo; các nguồn trên không chứng nhận Kinetix đã an toàn hoặc production-ready.

## 3. Hiện trạng và khoảng trống cần xử lý

| Bằng chứng trong repo | Đánh giá | Ưu tiên |
|---|---|---|
| `auth/service.ts: membership()` kiểm tra membership hoạt động; `manage=true` cho Admin hoặc Guardian có `canManageMembers` | Nền tảng tốt cho quyền được giao; cần helper riêng cho admin-only, không tái dùng cờ manage như quyền Admin. | P0 |
| `settingsRoutes.ts` trả `isAdmin` cho cả `ADMIN` và `GUARDIAN`; `ZoneFamilySetup.tsx` cũng gộp hai vai trò | Cần tách capability và nhãn giao diện. | P0 |
| `dashboard/page.tsx` có biến `admin` gồm hai vai trò và alias `/dashboard/admin` sang guardian | Cần route admin thật, guard mới, và chuyển hướng tương thích. | P0 |
| `settingsRoutes.ts: confirm-sync` kiểm tra định dạng tx hash rồi ghi `SYNCED` | Đoạn code đã đọc chưa xác minh receipt, chain, contract, calldata/event và finality trước khi xác nhận. Phải thay bằng verifier trước khi coi Settings là nguồn bằng chứng. | P0 |
| Cập nhật `pendingLogId` trong confirm-sync lọc bằng ID | Cần buộc log cùng workspace, actor/intent và trạng thái được phép; không để ID của tài nguyên quyết định quyền. Chưa thực hiện thử khai thác. | P0 |
| Settings GET có khởi tạo allowance mặc định với trạng thái `SYNCED` | Tách việc khởi tạo khỏi GET và dùng trạng thái chưa xác minh đúng thực tế; phải phân biệt metadata với chính sách đang được thực thi. | P0 |
| `guardianManagementService.ts` có logic quyền rộng hơn service xác thực chính | Chưa thấy active caller qua tìm kiếm tham chiếu; cần xác nhận call graph rồi hợp nhất/loại bỏ đường cũ, không kết luận đây là endpoint đang khai thác được. | P1 |
| `requireRecent()` đã có cửa sổ Core reauthentication 5 phút cho một số thao tác | Tái sử dụng nền tảng, bổ sung binding workspace/action và kiểm tra lại trong transaction cho thao tác admin. | P0 |
| `shared/treasury.ts` có địa chỉ treasury cố định; service dùng địa chỉ đó cho mọi workspace | Phù hợp demo dự án; chưa đáp ứng tách custody cho nhiều gia đình production. | P0 trước tiền thật |
| `FamilyHub.familyAdmin`, `pause()` và `unpause()` áp dụng ở mức Hub | Nếu nhiều gia đình dùng cùng Hub, không ánh xạ nút “tạm dừng gia đình” thành global pause. | P0 |
| Recovery service chặn thay operator toàn Hub T1 | Chuyển Admin ứng dụng không đồng nghĩa chuyển operator contract; wizard phải hiển thị rõ hạn chế. | P1 |
| Audit nằm ở nhiều bảng; có bảng settings audit dùng cascade theo user/workspace | Cần luồng kiểm toán thống nhất và chính sách lưu giữ; không tự xóa bằng chứng tài chính khi archive gia đình. | P1 |
| CI/Docker đã có mã cấu hình; lần xác minh trước còn test DB/browser/container chưa chạy trong môi trường local | Chỉ cho phát hành sau khi có kết quả thực tế từ staging/CI, không dựa vào số test unit đã qua. | Gate phát hành |

## 4. Bộ chức năng dành riêng cho Admin

### A. Tổng quan quản trị

Một trang hành động, không chỉ gồm biểu đồ: yêu cầu đang chờ quản trị, thành viên chưa kích hoạt, guardian mất quyền, hũ thiếu người duyệt, giao dịch chờ ký/finality và các chênh lệch cần đối soát.

Hiển thị số liệu theo snapshot có thời điểm/block và trạng thái dữ liệu cũ. RPC không trả lời phải hiện “chưa kiểm tra được”, không thay số dư bằng 0 hoặc tự kết luận thất thoát. Chỉ dùng dữ liệu của gia đình hiện tại.

### B. Thành viên và phân quyền

- Tạo tài khoản phụ thuộc, mời Guardian bằng ví dự kiến, thu hồi lời mời và theo dõi kích hoạt; tái sử dụng luồng có sẵn thay vì tạo hệ xác thực thứ hai.
- Gán người giám hộ và quyền quản lý có phạm vi; xem ai có thể quản lý ai và ai duyệt hũ nào.
- Khóa/mở membership của gia đình; quyền khóa không đồng nghĩa khóa tài khoản đó ở tất cả workspace.
- Thu hồi quyền được giao có hiệu lực trên request tiếp theo; phát hiện hũ thiếu quorum trước khi thay đổi.
- Không reset mật khẩu của Admin/Guardian khác bằng cơ chế tài khoản phụ thuộc. Giữ nguyên ràng buộc người quản lý tài khoản khi reset credential có ảnh hưởng toàn cục.

### C. Chính sách tài chính và vòng đời hũ

- Thiết lập hạn mức, người thụ hưởng, guardian, quorum, ngưỡng duyệt và trạng thái vận hành của hũ.
- Mọi thay đổi có bản xem trước trước/sau, phiên bản và phạm vi áp dụng.
- Bản đầu không sửa số tiền/người nhận của yêu cầu đã được duyệt. Thay đổi làm mất hiệu lực approval cũ hoặc chỉ áp dụng cho yêu cầu mới, theo loại chính sách.
- ROSCA đã bắt đầu giữ nguyên mức góp và thứ tự nhận. Không cho Admin tự đổi người nhận giữa kỳ.
- Archive hũ thay vì xóa; không archive khi còn tiền, reservation hoặc nghiệp vụ chưa xử lý, trừ chế độ ngừng hoạt động vẫn theo dõi công nợ.

### D. Đối soát quỹ

Admin xem ledger của gia đình, khả dụng/giữ chỗ, tiền chưa phân bổ, phí gas, giao dịch trực tiếp ngoài ứng dụng và các khoản chưa xác định. Có hàng đợi xử lý exception với lý do, bằng chứng, người xử lý và lịch sử.

So sánh ledger và chain tại cùng finalized block. Reservation đã nằm trong số dư hũ, không được trừ thêm lần nữa khi tính tổng backing. Mô hình mục tiêu: số dư on-chain bằng tổng phân bổ hũ cộng tiền chưa phân bổ và khoản dự phòng gas đã được hạch toán.

Không có nút sửa số dư hoặc nhập tx hash để đánh dấu đã trả. Sai lệch kế toán được sửa bằng bút toán điều chỉnh có đối ứng và phê duyệt, không sửa/xóa bút toán lịch sử. Chi phí gas không được lẫn vào khoản người nhận đã nhận.

### E. An toàn và xử lý sự cố

- Tạm dừng tạo lệnh chi mới theo gia đình/hũ, có lý do và phạm vi rõ ràng.
- Chặn tạo intent/ký mới qua ứng dụng; vẫn tiếp tục nhận receipt và ghi sổ các giao dịch thực sự đã xảy ra.
- Hiển thị đúng giới hạn: tạm dừng ứng dụng không thể ngăn chủ private key EOA chuyển tiền ngoài ứng dụng, cũng không hủy được giao dịch đã broadcast.
- Quy trình khôi phục sau sự cố: kiểm tra quyền, ví, quorum, số dư và các intent còn sống; mở lại bằng step-up và phê duyệt phù hợp.
- Cảnh báo trong ứng dụng bằng outbox chống gửi trùng. Email/SMS chỉ bổ sung khi có kênh và cấu hình người nhận rõ ràng.

### F. Nhật ký và báo cáo

Timeline hợp nhất: thay quyền, lời mời, khóa thành viên, đổi chính sách, nạp/rút/chuyển nội bộ, duyệt, recovery, export và xử lý exception. Có actor, action, đối tượng, thời gian, trước/sau đã che dữ liệu nhạy cảm, request ID, phiên bản chính sách và tx hash khi thực sự có.

Xuất CSV và báo cáo kỳ theo gia đình, tài sản và múi giờ; dùng job nền khi dữ liệu lớn. Chống CSV formula injection; file tải có thời hạn và kiểm tra quyền lần tải. Mặc định không xuất ảnh trẻ em, secret hoặc raw session data.

### G. Chuyển giao và kết thúc quản trị

Chuyển quyền Admin là quy trình riêng: người hiện tại xác thực lại, người nhận xác nhận danh tính/ví, hệ thống kiểm tra quorum và tài sản liên quan. Không được hạ quyền hoặc khóa Admin cuối cùng.

Vai trò ứng dụng, owner ví và operator contract có các bước độc lập. Nếu deployment không hỗ trợ chuyển operator, hiển thị `BLOCKED_UNSUPPORTED` và yêu cầu migration riêng; không báo hoàn tất toàn bộ chỉ vì đã đổi role trong database.

Archive gia đình chỉ sau kiểm tra nghĩa vụ đang tồn tại. Không có thao tác xóa vĩnh viễn toàn bộ ledger từ trang Admin.

## 5. Ma trận quyền đề xuất

| Hành động | Admin đúng gia đình | Guardian | Thành viên phụ thuộc | Người ký tài sản |
|---|---|---|---|---|
| Vào Family Admin console | Có | Không | Không | Không tự có quyền |
| Quản lý cấu hình gia đình, mời Guardian, phân quyền | Có + step-up khi nhạy cảm | Không | Không | Không |
| Quản lý người phụ thuộc đã được giao | Có theo ràng buộc quản lý | Có nếu được giao, ở màn hình riêng | Không | Không |
| Tạo/đổi chính sách hũ | Đề nghị theo workflow, không bỏ qua quorum | Có thể tham gia duyệt được giao ngoài console | Không | Không tự có quyền |
| Duyệt yêu cầu tài chính | Chỉ nếu thuộc người duyệt của chính sách | Chỉ hũ được giao | Không | Không tự có quyền |
| Ký chi tiền | Chỉ nếu đồng thời có quyền ký on-chain | Tùy quyền ký on-chain | Không mặc định | Theo ví/contract và threshold |
| Xem toàn bộ báo cáo của gia đình | Có | Chỉ thông tin nghiệp vụ được giao | Thông tin cá nhân được phép | Không tự có quyền |
| Tạm dừng lệnh mới trong gia đình | Có + step-up | Không có quyền quản trị toàn gia đình | Không | Không tự có quyền |
| Đổi ví giữ tiền hoặc chuyển Admin | Workflow riêng, không tức thì | Chỉ xác nhận nếu chính sách yêu cầu | Không | Quyền ký xử lý riêng |
| Đọc dữ liệu gia đình khác | Không | Không | Không | Không |

Nguồn quyết định quyền là membership hiện hành trong workspace. Không tin role từ body, query, localStorage hoặc nút chuyển vai trò. Route guard và việc ẩn menu chỉ hỗ trợ trải nghiệm; backend/service vẫn kiểm tra riêng.

## 6. Kiến trúc bảo mật và thay đổi nhạy cảm

### Chuỗi kiểm tra backend

Phiên hợp lệ → tài khoản kích hoạt → workspace FAMILY → membership hoạt động → role ADMIN → capability phù hợp → step-up nếu cần → kiểm tra phiên bản/tài nguyên → transaction nghiệp vụ và audit/outbox.

Helper đề xuất: `requireFamilyAdmin(auth, workspaceId, tx)` và `authorizeAdminAction(...)`. Tách `canManageFamily`, `canManageAssignedMembers`, `canReviewVault`, `canSignTreasury`; bỏ ý nghĩa nhập nhằng của `isAdmin` chung.

Các service nhạy cảm phải đọc lại quyền bên trong transaction. Dùng lock theo workspace và revision để chống hai tab hoặc hai Admin thao tác ngược nhau. Không cache quyền nhạy cảm quá thời điểm thu hồi.

### Intent quản trị và xác thực bổ sung

Đề xuất bảng intent chứa actor, workspace, action type, tài nguyên, thay đổi trước/sau, policy/treasury version, nonce, expiresAt, request ID và hash nội dung. Step-up gắn với đúng intent, không tái dùng chữ ký cho gia đình hoặc thao tác khác.

Tái sử dụng challenge/nonce và Core reauthentication hiện có; thêm passkey/WebAuthn cho Admin như lớp bảo vệ tài khoản, với enrollment/recovery riêng. Kết nối ví hoặc một chữ ký thông điệp chung không tự được gọi là MFA chống phishing.

Giá trị mặc định đề xuất để thẩm định: intent nhạy cảm hết hạn sau 5 phút; chuyển giao quyền/ví có thời gian chờ 24 giờ khi không phải xử lý khẩn cấp. Đây là lựa chọn sản phẩm, không phải thời hạn bắt buộc do OWASP quy định. Thao tác đóng băng bảo vệ không nên phải chờ 24 giờ; mở lại/thay quyền cần kiểm tra nghiêm hơn.

Đổi nội dung intent phải xác nhận lại. Tăng quyền hoặc giảm quorum cần phê duyệt độc lập theo chính sách đã có, không cho người đề xuất tự trở thành người duyệt thứ hai. Gia đình chưa đủ người duyệt phải ở trạng thái chờ cấu hình, không tự bỏ điều kiện để tiếp tục.

## 7. Custody production cho từng gia đình

**Quyết định kiến trúc đề xuất:** tiếp tục dùng ví dự án cho demo Fuji; trước khi nhận tiền thật của nhiều gia đình, chuyển sang treasury riêng theo gia đình và phiên bản custody. Nghiên cứu/thử nghiệm Safe trên Fuji là hạng mục riêng trước khi chọn triển khai mainnet.

`workspace_treasuries` cần workspace, chain ID, địa chỉ, loại EOA/Safe/contract, version, thời điểm hiệu lực, verified block, trạng thái và nguồn bằng chứng. Intent thanh toán phải lưu treasury version tại lúc tạo để xoay ví không làm mất khả năng đối soát lệnh cũ.

Không chỉ thay hằng `TREASURY_ADDRESS` bằng địa chỉ Safe. Receipt EOA hiện kiểm tra top-level sender/recipient/value/nonce; Safe thực thi lời gọi nội bộ, nên cần adapter xác minh Safe transaction hash, Safe nonce, inner call, owner threshold và bằng chứng execution. Approval trong database không thay thế chữ ký Safe. Nếu sau này đăng nhập trực tiếp bằng smart account, đánh giá riêng EIP-1271.

Tuyệt đối không cho Family Admin đổi RPC tùy ý, nhập private key vào backend hoặc kích hoạt mainnet bằng một toggle. Cấu hình mạng/deployment thuộc quy trình vận hành phát hành, ngoài quyền quản trị gia đình.

Khi nhiều gia đình dùng chung Hub, global pause và đổi operator phải thuộc quy trình operator, không được xuất hiện như thao tác cô lập một gia đình. Không tự động thay đổi quyền của contract T1 khi chỉ sửa membership ứng dụng.

## 8. Cô lập dữ liệu và mô hình lưu trữ

### Tái sử dụng

Giữ `workspaces`, `workspaceMembers`, invitations, guardian links, sessions, recovery, treasury jobs/transfers/entries và financial operations. Xây read model hợp nhất trước, không tạo một bộ ledger quản trị song song.

### Bổ sung dự kiến

| Entity | Nội dung chính |
|---|---|
| `family_admin_settings` | Workspace, trạng thái ACTIVE/RESTRICTED/ARCHIVED, revision, cấu hình quản trị và người chịu trách nhiệm |
| `admin_action_intents` | Payload hash, actor, action, workspace, resource, version, expiry và idempotency key |
| `admin_action_approvals` | Người xác nhận độc lập, phương thức/bằng chứng, duy nhất theo intent và actor |
| `family_policy_versions` | Chính sách trước/sau, điều kiện có hiệu lực, intent nguồn và trạng thái áp dụng |
| `workspace_treasuries` | Mapping custody được xác minh và lịch sử xoay ví |
| `reconciliation_cases` | Snapshot/block, loại chênh lệch, bằng chứng, tình trạng xử lý và liên kết bút toán |
| `audit_events` | Envelope chuẩn cho audit; tham chiếu nguồn cũ, actor hệ thống hợp lệ, nội dung đã che dữ liệu nhạy cảm |
| `outbox_events` | Sự kiện phát sinh cùng transaction; retry, delivery status và deduplication key |
| `family_export_jobs` | Scope, cutoff/snapshot, định dạng, trạng thái, vị trí file bảo vệ và hết hạn |

Chốt migration sau khi kiểm tra schema thực tế; bảng nào đã có đủ dữ liệu sẽ tái sử dụng. Thêm composite unique/FK cho quan hệ workspace–resource quan trọng, không chỉ dựa vào ID toàn cục để bảo đảm cùng tenant.

RLS là lớp bảo vệ bổ sung. Với PostgreSQL 16, phải tách role migration khỏi runtime, không để runtime là superuser/table owner có thể bypass; dùng tenant context trong transaction và kiểm thử connection pool tái sử dụng. Worker xử lý từng workspace với quyền phù hợp, không dùng bypass toàn bộ như một giải pháp mặc định. [PostgreSQL RLS](https://www.postgresql.org/docs/16/ddl-rowsecurity.html).

## 9. Thiết kế khu quản trị

Các route đề xuất:

```text
/dashboard/admin/overview
/dashboard/admin/members
/dashboard/admin/permissions
/dashboard/admin/policies
/dashboard/admin/treasury
/dashboard/admin/incidents
/dashboard/admin/audit
/dashboard/admin/reports
/dashboard/admin/settings
```

Đầu trang luôn hiện gia đình đang quản trị, người dùng hiện tại, trạng thái ví/mạng và dữ liệu được kiểm tra lúc nào. Sidebar chỉ hiện mục thực sự được phép; Guardian mở URL trực tiếp nhận trang không đủ quyền, không được đọc payload admin rồi mới ẩn bằng CSS.

Tổng quan ưu tiên một hàng hành động cần xử lý, sau đó bốn chỉ số: khả dụng, giữ chỗ, yêu cầu chưa hoàn tất và exception đối soát. Biểu đồ chỉ thêm khi giúp quyết định; không gắn nhãn live hoặc security score nếu chưa có nguồn/thang đo đủ tin cậy.

Màn hình thay đổi nhạy cảm: chọn tài nguyên → chỉnh dữ liệu → xem trước ảnh hưởng và trước/sau → xác thực lại → chờ xác nhận độc lập nếu cần → theo dõi áp dụng → kiểm tra bằng chứng. Không trộn “đã lưu database”, “đã đủ duyệt” và “đã thực thi on-chain”.

Mobile dùng card chi tiết thay cho bảng bị cắt; desktop có bộ lọc và cột rõ ràng. Form giữ dữ liệu khi lỗi, có lỗi tại từng field và error summary có focus. Modal quản lý focus; hỗ trợ bàn phím, chữ lớn và reduced motion. Kế thừa hệ màu Inter/nền sáng hiện tại thay vì thêm một design system khác.

## 10. API và chống đường vòng

Prefix mới: `/api/workspaces/:workspaceId/admin/*`.

| API đề xuất | Hành vi |
|---|---|
| `GET /overview`, `/capabilities` | Snapshot và quyền hiện hành, không ghi dữ liệu trong GET |
| `GET /members`, `/permissions` | Dữ liệu quản trị có phân trang, không kèm secret |
| `POST /intents` | Validate đề nghị, trả payload chuẩn và các điều kiện xác nhận |
| `POST /intents/:id/approve` | Tiêu thụ proof phù hợp, kiểm tra người duyệt và phiên bản |
| `POST /intents/:id/execute` | Kiểm tra lại toàn bộ điều kiện và thực thi idempotent |
| `GET /reconciliation`, `/audit`, `/reports` | Lọc/pagination có scope, không nhận tenant từ filter chưa xác minh |
| `POST /exports`, `GET /exports/:id/download` | Job theo snapshot và kiểm tra quyền lúc tải |

Phải rà soát cả API cũ. Thêm guard cho route mới mà để route Settings cũ thực hiện cùng thao tác với quyền rộng hơn sẽ không tạo được chức năng admin-only. Định nghĩa error code thống nhất: `FAMILY_ADMIN_REQUIRED`, `STEP_UP_REQUIRED`, `ACTION_EXPIRED`, `POLICY_VERSION_CONFLICT`, `QUORUM_UNAVAILABLE`, `CUSTODY_NOT_VERIFIED`, `CHAIN_AUTHORITY_PENDING`.

## 11. Quy trình vận hành production

- TLS, cookie/session policy, Origin guard, rate limit theo actor/workspace/action và cảnh báo truy cập bị từ chối bất thường.
- Runtime database role ít quyền; secret trong hạ tầng quản lý bí mật, không trả về Admin console.
- Audit quan trọng ghi cùng transaction; bản sao kiểm toán ngoài database ứng dụng để đối chiếu. Chuỗi hash đơn lẻ không chứng minh DBA không thể sửa toàn bộ lịch sử nếu không có anchor độc lập.
- Retention là cấu hình đã được thẩm định; giữ quy tắc ảnh 7 ngày đang có. Không tự áp dụng thời hạn pháp lý cho dữ liệu tài chính khi chưa xác định thị trường triển khai.
- Backup mã hóa và bài restore sang môi trường riêng. RPO/RTO là mục tiêu phải đo được, đề xuất ban đầu RPO không quá 15 phút/RTO không quá 4 giờ sau khi có PITR phù hợp, không coi Docker volume là backup.
- Restore database không khôi phục private key hoặc đảo ngược blockchain. Sau restore phải đối soát/replay tới finalized block và khóa ghi cho đến khi nhất quán.
- Metrics: độ trễ API, lỗi quyền, heartbeat/lag worker, tuổi giao dịch pending, sai lệch backing, outbox chờ và restore gần nhất. Admin chỉ thấy tình trạng ảnh hưởng gia đình mình; dashboard hạ tầng toàn hệ thống thuộc operator.
- CI chạy test tenant/permission và workflow nhạy cảm trên database riêng; thêm kiểm tra dependency, image scan/SBOM/provenance và pin action theo commit khi phát hành production. Các phát hiện bảo mật phải có chính sách xử lý, không chỉ thêm scanner rồi bỏ qua kết quả.

## 12. Triển khai và migration không gián đoạn

1. Chụp inventory endpoint/call graph và dữ liệu role hiện tại. Không tự nâng mọi Guardian thành Admin khi backfill.
2. Thêm capability/intent/audit schema và read model; giữ tương thích route cũ nhưng buộc cùng service kiểm tra quyền.
3. Chạy kiểm tra chỉ đọc/shadow cho quyền mới, ghi nhận khác biệt và phân loại các delegation hợp lệ.
4. Bật Family Admin bằng feature flag cho một gia đình thử nghiệm trên Fuji; không nhập dữ liệu mẫu vào gia đình thật.
5. Chuẩn hóa Settings và vô hiệu đường xác nhận đồng bộ chưa xác minh sau khi adapter mới đã sẵn sàng.
6. Bổ sung versioned custody và adapter; diễn tập migration/rollback trước khi chuyển tiền. Không tự chuyển ví khi deploy UI.
7. Canary, đo lỗi và mở rộng. Rollback tắt chức năng ghi mới, giữ được đọc lịch sử và tiếp tục đối soát receipt.

Mỗi gia đình phải luôn còn ít nhất một Admin hoạt động. Nếu backfill phát hiện không có hoặc có cấu hình quản trị mâu thuẫn, đưa vào hàng đợi xác minh thay vì chọn ngẫu nhiên một người. Dùng lock/revision để hai thao tác đồng thời không làm mất Admin cuối cùng.

## 13. Kiểm thử và điều kiện phát hành

### Permission/tenant

- Admin A không đọc/ghi/xuất file hoặc đọc ảnh của gia đình B bằng cách đổi bất kỳ ID nào.
- Guardian có `canManageMembers` vẫn bị chặn toàn bộ Family Admin API; các quyền giám hộ được giao ngoài console vẫn hoạt động.
- Thu hồi/khóa membership có hiệu lực dù trình duyệt còn mở và có intent đã chuẩn bị.
- Không thể tự tăng role từ payload, session cũ, đường Settings cũ hoặc route alias.
- RLS/pool tests luân phiên nhiều tenant trên cùng connection; runtime không bypass policy.

### Thao tác nhạy cảm

- Proof hết hạn, dùng lại, đổi workspace, đổi payload hoặc chính sách đều bị từ chối.
- Hai request đồng thời không tạo hai thay đổi/chi tiền hoặc hạ quyền Admin cuối cùng.
- Admin không nằm trong guardian set không thể tự duyệt khoản chi của hũ.
- Hash giả, giao dịch sai chain/contract/calldata, reverted hoặc chưa finalized không được coi là synced.
- Freeze không làm mất receipt đã chi; unfreeze không tự phát lại lệnh cũ.

### Ledger/custody

- Backing được so sánh cùng block, gas và unallocated phân loại đúng, reservation không bị tính hai lần.
- Không có endpoint chỉnh số dư/xóa ledger để che chênh lệch.
- Safe adapter được test với EOA submitter, inner call, Safe nonce, threshold, replacement và execution failure.
- Chuyển Admin ứng dụng không âm thầm chuyển người ký ví/operator contract.

### Vận hành và giao diện

- E2E trình duyệt cho hai gia đình và bốn vai trò, ảnh responsive, keyboard/focus/đọc lỗi, stale/retry states.
- Chạy các acceptance test database đang pending và test mới trên PostgreSQL disposable.
- Docker build và smoke test stack chạy thật; GitHub Actions có run thành công cho đúng commit phát hành.
- Diễn tập restore/reconcile và sự cố mất một signer; mainnet cần đánh giá độc lập phần contract/custody và cấu hình triển khai.

Không dùng số lượng unit test hoặc việc build thành công làm bằng chứng duy nhất cho nhãn production-ready.

## 14. Backlog và thứ tự thực hiện

| Giai đoạn | Đầu ra | Ước lượng một kỹ sư |
|---|---|---|
| P0 — Khóa đường quyền cũ | Endpoint matrix, admin guard thống nhất, scope Settings/confirm-sync, test chặn vượt quyền | 2–3 ngày |
| P0 — Step-up và nền quản trị | Capability, intent/action binding, revision, audit/outbox, fixture nhiều gia đình | 4–6 ngày |
| P1 — Console và thành viên | Route admin thật, overview, members/permissions, workflow khóa/mời/thu hồi | 4–6 ngày |
| P1 — Quỹ và chính sách | Policy versioning, reconciliation cases, freeze đúng scope, xử lý exception | 5–7 ngày |
| P1 — Báo cáo/vận hành | Audit timeline, export bảo vệ, alert, retention và restore runbook | 3–5 ngày |
| Gate — QA/canary | E2E, PostgreSQL, Docker/CI, restore, review quyền và mở thử nghiệm Fuji | 4–6 ngày |

Khoảng dự kiến phần quản trị ứng dụng: **22–33 ngày làm việc**, cần điều chỉnh sau inventory P0. Tách custody theo gia đình và thử nghiệm/tích hợp Safe thêm khoảng **7–12 ngày**, phụ thuộc deployment và công cụ mạng; chưa bao gồm thời gian chờ audit độc lập. Không rút ngắn kiểm tra bằng cách gắn nhãn production cho demo EOA dùng chung.

Ưu tiên bản đầu: Admin-only thật → thay đổi có xác thực và audit → thành viên/quyền → đối soát và xử lý sự cố. Biểu đồ nâng cao, allowance tự động, thanh toán định kỳ, AI chấm điểm rủi ro và quản trị toàn nền tảng nằm ngoài bản đầu.

## 15. Quyết định mặc định cho bước triển khai sau

- Admin-only theo membership của đúng gia đình; Guardian không vào console mới.
- Tái sử dụng xác thực và ledger hiện có, không tạo login hoặc sổ tiền song song.
- Không giữ private key của gia đình trên server.
- Không cho Admin bỏ qua người duyệt hoặc sửa lịch sử tài chính.
- Giữ Fuji cho giai đoạn xây dựng/kiểm thử; việc nhận tiền thật cần gate custody và vận hành riêng.
- Phiên này chỉ tạo tài liệu kế hoạch, không đổi quyền, gọi API ghi dữ liệu, chạy migration hay chuyển tiền.

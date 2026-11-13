# Đánh giá mức độ hoàn thiện Kinetix — 13/11/2026

## Kết luận

Ước lượng **60/100 so với một sản phẩm tài chính dùng thực tế**, với khoảng bất định khoảng **55–65/100**. Kinetix đang ở giai đoạn **MVP testnet có nghiệp vụ và cơ chế bảo vệ đáng kể**. Điều kiện tiếp nhận tiền thật chưa đạt. Điểm số là đánh giá kỹ thuật và sản phẩm, không phải tỷ lệ test pass, chứng nhận an toàn hay phần trăm công việc còn lại.

Nếu chỉ xét mục tiêu trình diễn có người hướng dẫn, mức hoàn thiện khoảng **85/100**; nếu xét bản thử nghiệm Fuji giới hạn người dùng, khoảng **70–75/100**. Các điểm này dùng những tiêu chuẩn chấp nhận khác nhau, không cộng lại với nhau.

Chuẩn “sản phẩm thật” ở đây là: một gia đình mới tự đăng ký và thiết lập được, hiểu đúng nơi giữ tiền và quyền phê duyệt, thực hiện nghiệp vụ xuyên suốt, phục hồi khi lỗi, đồng thời có triển khai, kiểm toán, giám sát và hỗ trợ vận hành đủ tin cậy. Phạm vi chấm điểm chính là sản phẩm quản lý quỹ gia đình; toàn bộ tầm nhìn Dual-Chain/USDC/yield còn xa hơn phạm vi T1 hiện tại.

## Phạm vi và giới hạn bằng chứng

- Đọc cấu trúc frontend, backend, shared, contracts, tests, cấu hình CI/Docker và tài liệu trạng thái; kiểm tra các đường tạo hũ, xác thực, quản trị, ký giao dịch, sổ quỹ và worker.
- Chạy lại test, typecheck, production build, kiểm tra deployment Fuji, lint và kiểm tra tài liệu. Không sửa nghiệp vụ, chạy migration, tạo tài khoản, ký/chuyển tiền hoặc dùng database ứng dụng cho test phá dữ liệu.
- Đánh giá cả working tree hiện tại, gồm các thay đổi chưa commit ở wizard tạo hũ. Không sửa các thay đổi đó.
- Công cụ trình duyệt báo browser host không khả dụng và từ chối điều khiển Chrome. Không nghiệm thu trực quan, bàn phím, screen reader, mobile thật hay extension Core trong lần này. Điểm UX là tạm tính từ mã và kiểm thử component.
- Không chạy lại 20 bài tích hợp cần PostgreSQL riêng; không xác nhận Docker thực thi hay CI trên GitHub. Không có dữ liệu nghiên cứu người dùng, retention, tải thực hay sự cố vận hành để chứng minh chất lượng thương mại.

## Cách chấm điểm

| Hạng mục | Trọng số | Điểm /100 | Nhận định |
|---|---:|---:|---|
| Nghiệp vụ cốt lõi | 25% | 80 | Có tài khoản, workspace, vai trò, hũ, duyệt chi, nhiệm vụ, góp xoay vòng, mục tiêu và quản trị. Vẫn thiếu nghiệm thu xuyên suốt trên môi trường thật và xử lý một số tình huống tài chính. |
| Giao diện và khả năng tự sử dụng | 15% | 75 | Có màn hình theo vai trò, onboarding, trạng thái giao dịch và các luồng xác nhận. Chưa kiểm chứng trực quan; ký ví/phí mạng vẫn là rào cản và nội dung giới thiệu sai khả năng đang bật. |
| Blockchain và kế toán | 15% | 70 | T1 Fuji được xác minh lại; có bảo vệ mapping, receipt, finality, reservation và chống ghi trùng. Custody có nhiều mô hình, V1 còn hạn chế, tính năng mở rộng chưa hoạt động. |
| An toàn và quản trị tài sản | 20% | 45 | Có Argon2id, proof ví, phiên có phạm vi, quorum, epoch và kiểm tra quyền. Chưa audit độc lập; dependency có cảnh báo bảo mật; treasury EOA và quyền quản trị Hub còn tập trung. |
| Kiểm thử và bằng chứng chất lượng | 10% | 65 | 336 bài đạt nhưng 24 bị bỏ qua; có lỗi tái hiện được với gate CI. Chưa có nghiệm thu browser/Core/thiết bị và chạy tải trong lần này. |
| Triển khai và vận hành | 10% | 30 | Có Docker, CI, health/readiness và worker retry; chưa có bằng chứng vận hành public ổn định, cảnh báo, backup/restore drill hay quy trình sự cố đã diễn tập. |
| Kiểm chứng nhu cầu và thương mại | 5% | 20 | Repo thể hiện định hướng rõ; chưa có bằng chứng người dùng mục tiêu tự hoàn tất tác vụ, quay lại sử dụng hoặc mô hình kinh doanh đã được kiểm chứng. Điểm thấp phản ánh thiếu bằng chứng, không kết luận sản phẩm không có thị trường. |

Tổng có trọng số: **61,25/100**, làm tròn thành **khoảng 60%** để tránh tạo cảm giác chính xác giả.

## Những phần đã tương đối chắc

1. **Ứng dụng có nghiệp vụ thực.** Backend kiểm tra membership theo workspace; quản trị gia đình dành cho người tạo đúng gia đình. Các thay đổi nhạy cảm có intent, revision, thời hạn, chữ ký và audit trong transaction. Xem `backend/src/auth/service.ts`, `backend/src/services/familyAdminService.ts`.
2. **Đã chú ý đến tiền và trạng thái giao dịch.** Các luồng kiểm tra đúng sender, recipient, amount, nonce, memo, receipt và finality; không lấy tx hash do client nhập làm bằng chứng thanh toán. Có reservation, idempotency và bút toán đối ứng. Xem `backend/src/services/treasuryService.ts`, `backend/src/services/operationService.ts`, `shared/treasury.ts`.
3. **Có xử lý lỗi vượt happy path.** Kiểm thử bao gồm đổi gia đình giữa thao tác, đổi ví, nhấn hai lần, từ chối ký, timeout sau broadcast, khôi phục giao dịch và đối soát mà không gửi tiền lần hai.
4. **Deployment T1 là có thật.** `npm run check:testnet` trả `VERIFIED` trên chain 43113; kiểm tra runtime code, receipt và wiring qua RPC. Điều này xác minh deployment, không chứng minh toàn bộ sản phẩm đã được người dùng sử dụng thành công.
5. **Có nền tảng trải nghiệm nhiều vai trò.** Elderly/Kids/Guardian/Admin có màn hình và tác vụ riêng; có quản lý thành viên, lịch sử, thông báo trong ứng dụng, settings và recovery. Đây là nền tảng để thử nghiệm nhu cầu.

## Những khoảng trống quyết định

### 1. Nội dung giao diện không khớp khả năng thực tế — ưu tiên P0

Trang `/` dùng `LandingPageNew`, gồm Hero, Metrics, Architecture và Security. Các component đang quảng bá Dual-Chain, Family L1 miễn gas, lợi suất thực 8% APY, “An Toàn Tuyệt Đối”, số test cố định và nhãn liên quan kiểm toán. Một số nội dung tương tự còn nằm trong wizard tạo hũ hiện tại.

Trong khi đó `shared/deployment.json` và kiểm tra RPC xác nhận: `native=true`, `erc20=false`, `crossChain=false`, `yield=false`, `relayer=false`. `useYieldVault` từ chối tính năng lợi suất; `relayerService` từ chối tài trợ giao dịch. `FamilyYieldVault` là thí nghiệm dự trữ do operator cấp vốn, tính lãi đơn theo thời gian, không phải nguồn lợi suất DeFi đang hoạt động.

Đây là vấn đề về lời hứa sản phẩm và niềm tin. Cần sửa thông điệp theo deployment đang bật trước khi mở thử nghiệm công khai. `docs:check` hiện chỉ kiểm tra chín tài liệu, không kiểm tra các nội dung landing này, nên kết quả đạt không phát hiện được sai lệch.

Bằng chứng: `frontend/src/app/page.tsx`, `frontend/src/components/landing/LandingHero.tsx:39`, `LandingMetrics.tsx`, `LandingSecurity.tsx`, `frontend/src/components/vaults/create/designTokens.ts`, `shared/deployment.json`, `scripts/check-public-docs.cjs`.

### 2. Pipeline có lỗi chặn có thể tái hiện — ưu tiên P0

`test/VaultCreationRender.test.ts:8` dùng `describe.skip` cho bốn bài journey tạo vault. Job database-integration đặt `FORBID_PENDING_TESTS=true`, còn Hardhat ánh xạ biến này sang Mocha `forbidPending`.

Chạy riêng file đó với cùng cờ đã tái hiện `Error: Pending test forbidden`. Vì vậy không thể coi pipeline hiện tại là sẵn sàng chỉ vì bộ test local mặc định không có bài thất bại. Đây là lỗi gate độc lập với việc có database hay không.

Cần cập nhật hoặc thay thế các bài journey cho wizard đang dùng, chạy đủ bộ với database disposable và cờ CI, sau đó xác nhận job remote và Docker.

### 3. Dependency frontend cần xử lý bảo mật — ưu tiên P0 trước public

Build đang dùng **Next.js 14.2.3**, đúng với package khai báo. Advisory chính thức nêu các phiên bản Next 14 trước bản vá 14.2.35 thuộc phạm vi ảnh hưởng DoS của App Router. Đây là bằng chứng cần cập nhật dependency và kiểm thử hồi quy; chưa thực hiện khai thác hay kết luận dữ liệu đã bị truy cập.

Nguồn: [Next.js Security Update, 11/12/2025](https://nextjs.org/blog/security-update-2025-12-11). Bản 14.2.35 là mốc vá trong advisory này, không phải khẳng định đó là phiên bản mới nhất hoặc đủ mọi bản vá tại ngày đánh giá. Cần rà soát phiên bản còn được hỗ trợ và advisory hiện hành trước khi chọn đích nâng cấp.

### 4. Quyền giữ tiền chưa đồng nhất với mô hình “gia đình cùng quản lý” — P0 trước tiền thật

Core treasury dùng một địa chỉ cố định trong `shared/treasury.ts`. Người giữ private key có thể chuyển tài sản ngoài ứng dụng; lượt duyệt trong database không biến EOA thành multisig on-chain. Việc phân hũ trong PostgreSQL không tách ví giữ tiền theo gia đình.

FamilyHub có một `familyAdmin` cấp deployment để allowlist, cấu hình và pause; source hiện không có hàm chuyển địa chỉ admin. Quyền chủ nhà trong ứng dụng là phạm vi khác với quyền operator hợp đồng. Phải quyết định rõ mô hình custody, phân tách tài sản và phương án giữ/khôi phục quyền quản trị; audit theo đúng mô hình đã chọn.

### 5. Trải nghiệm “người thân không cần biết Web3” chưa được chứng minh — ưu tiên P1

`useMemberTransaction` vẫn kết nối Core, lấy wallet client và ký transaction. Relayer bị tắt, Fuji có phí. Adapter `registerSessionProvider` là điểm tích hợp, không chứng minh đã có pairing SDK mobile hoàn chỉnh.

Giao diện chữ lớn hoặc một nút bấm chưa đủ để bảo đảm ông bà/trẻ nhỏ tự hoàn thành luồng thực. Cần thử với người dùng mục tiêu: tạo tài khoản, nhận lời mời, liên kết ví, nhận tiền, bị từ chối ký, thiếu gas và phục hồi khi mất kết nối. Chưa có kết quả nghiên cứu đó trong phạm vi đã kiểm tra.

### 6. Các mô hình tài chính chưa khép kín vòng đời — ưu tiên P1

- ROSCA có góp và trả theo lượt, nhưng chưa có cơ chế tự động hủy/hoàn tiền khi thành viên ngừng góp như đã nêu trong STATUS. Cần chính sách default, tranh chấp và xử lý tiền kẹt.
- V1 là nhánh thực nghiệm riêng, chưa bật bởi manifest T1; sửa thành viên/chuyển hũ đơn phương bị chặn khi cần nhiều phê duyệt. Đó là hạn chế có chủ đích, không phải tính năng quản trị đầy đủ.
- USDC, cầu tài sản liên chuỗi, yield thật, zero-fee Family L1, passkeys, VietQR và PWA chưa thuộc sản phẩm đang hoạt động. Không nên lấy số lượng màn hình hay mã thử nghiệm làm bằng chứng đã hoàn tất chúng.

### 7. Vận hành chưa có đủ bằng chứng — ưu tiên P1

Có health/readiness và worker định kỳ, nhưng `/api/ready` chỉ kiểm tra database. Worker bắt lỗi rồi log/retry; chưa thấy cơ chế cảnh báo liveness, độ trễ index và chênh lệch sổ quỹ hoàn chỉnh trong phần mã đã đọc. API khỏe không tự chứng minh hệ thống đối soát đang khỏe.

Chưa có kết quả phục hồi backup, diễn tập mất RPC/database, rollback release, tải đồng thời và theo dõi staging dài ngày. Docker CLI không khả dụng trong môi trường đánh giá này. Tài liệu Docker còn mô tả runner compile JS/prune dependencies, trong khi Dockerfile hiện dùng source TypeScript và `tsx`; deployment console đọc artifacts nhưng image không copy/compile artifacts. Đó là khoảng lệch cần nghiệm thu, chưa kết luận toàn bộ container không khởi động được.

## Kết quả chạy lại

| Kiểm tra | Kết quả lần này |
|---|---|
| `npm test` với TEST_DATABASE_URL rỗng và không cho reset | **336 passing, 24 pending, 0 failing**, Mocha khoảng 29 giây. |
| Phân loại bài bị bỏ qua | 20 bài cần database riêng; 4 bài journey tạo vault bị skip vô điều kiện. |
| Root/backend/frontend `typecheck` | Đạt cả ba. |
| Frontend production build | Đạt, `KINETIX_CONSTRAINED_BUILD=true`, output tách riêng. Dashboard First Load JS khoảng 351 kB; chưa đo Lighthouse/Web Vitals hay tốc độ trên điện thoại. |
| `npm run compile` | Đạt; artifacts hiện tại đã up to date, không compile mới. |
| `npm run sol:lint` | 0 errors, **671 warnings**. Warnings là nợ kỹ thuật, không tự chứng minh có lỗ hổng. |
| `npm run docs:check` | Đạt chín tài liệu; chưa bao phủ thông điệp UI. |
| `npm run check:testnet` | **VERIFIED**, chain 43113, T1 single-chain; chỉ native AVAX bật. |
| Journey test với `FORBID_PENDING_TESTS=true` | Tái hiện lỗi `Pending test forbidden`. |
| PostgreSQL integration / Docker / Core thật / mobile thật | Chưa chạy trong lần đánh giá này. |

Không dùng số test lịch sử trong README/landing để thay cho kết quả trên. Production build tự thêm đường types vào tsconfig; thay đổi phụ đó đã được hoàn nguyên sau kiểm tra.

## Thứ tự hoàn thiện đề xuất

1. **Đưa lời hứa về đúng T1:** AVAX/Fuji, có phí, không yield và không cross-chain; nói rõ custody và trạng thái chưa audit. Cập nhật cả landing, wizard và demo CTA theo cờ môi trường.
2. **Khôi phục gate phát hành đáng tin:** sửa journey bị skip; chạy PostgreSQL disposable với chính cờ CI; cập nhật dependency bảo mật; xác nhận CI và Docker trên remote.
3. **Nghiệm thu một vòng đời gia đình đầy đủ:** chủ nhà mới → mời hai guardian → thêm thành viên → tạo/nạp hũ → yêu cầu/duyệt/rút → nhận tiền → đối soát, rồi thử từ chối ký, thiếu gas, đổi workspace, mất mạng và restart worker. Lưu bằng chứng và tiêu chí đạt.
4. **Chốt kiến trúc custody và quyền admin:** lựa chọn cơ chế giữ tiền đúng lời hứa, quản lý khóa/quorum, xử lý admin mất quyền, ROSCA ngừng góp và funds bị giữ. Audit độc lập và khắc phục trước tiền thật.
5. **Vận hành beta giới hạn:** staging public có giám sát, cảnh báo, backup và thử restore, runbook sự cố; cho một nhóm nhỏ gia đình mục tiêu dùng với testnet và đo tỷ lệ tự hoàn thành tác vụ, lỗi ký, thời gian xử lý và nhu cầu quay lại.
6. **Mở rộng sau khi luồng chính ổn định:** chỉ ưu tiên USDC, pairing mobile, passkeys hoặc yield/cross-chain khi dữ liệu thử nghiệm chứng minh chúng cần thiết. Không coi thêm tính năng là cách thay thế cho việc khép kín nghiệp vụ và vận hành.

Điều kiện để nâng nhận định lên 75–80/100 là các gate kỹ thuật đạt, có nghiệm thu xuyên suốt và bằng chứng beta người dùng. Muốn tiến gần production 90/100 cần thêm kiến trúc custody đã được review, audit/remediation, phục hồi sự cố đã thử và hoạt động vận hành được đo; không thể bảo đảm các điều kiện đó chỉ bằng thêm unit test hoặc chỉnh UI.

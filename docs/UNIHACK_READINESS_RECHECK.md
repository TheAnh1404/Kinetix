# Đối chiếu bản vá UniHack — 11/11/2026

Đối chiếu thủ công theo báo cáo 61/100 do người dùng cung cấp. Không tìm thấy
skill `kinetix-readiness-auditor` trong repository, thư mục skill Codex hoặc
thư mục skill Antigravity; vì vậy đây không phải kết quả chạy skill đó hay điểm
do ban giám khảo cấp.

## Kết quả kiểm chứng

| Kiểm tra | Kết quả |
| --- | --- |
| `npx hardhat test`, gồm PostgreSQL cô lập | **287 passing, 0 failing, 0 pending** |
| `npm run typecheck` | PASS |
| `npm --prefix frontend run typecheck` | PASS |
| Production build, bật demo, chế độ constrained | PASS; route `/demo` được build |
| Deploy Vault → seed reserve trên EVM cục bộ chain ID 43113 | PASS |
| Deploy Hub/Cashflow/Forwarder trên EVM cục bộ chain ID 99999, gas price 0 | PASS |
| Wiring hai RPC, xác thực Hub/Vault/Cashflow và reserve | PASS; reserve **0.1 AVAX** |
| Chạy lại deploy và wiring | PASS; không gửi transaction mới, không seed reserve lần hai |
| ABI năm event so với artifacts và tên sáu bảng Drizzle | PASS |
| Browser E2E / screenshot | Chưa chạy: browser host không khả dụng và công cụ không cấp quyền Chrome |

Log chạy cục bộ được lưu ở `.private/unihack-hardhat-full.log`,
`.private/unihack-frontend-build.log`, `.private/unihack-deploy-fuji.log`,
`.private/unihack-deploy-family.log`, `.private/unihack-wire.log` và
`.private/unihack-wire-rerun.log`. Đây là bằng chứng thử nghiệm cục bộ; địa chỉ
trong các log không phải địa chỉ testnet công khai để đưa vào hồ sơ nộp bài.

## Ma trận 100 điểm được đối chiếu

| Nhóm | Điểm tối đa của báo cáo | Trạng thái bản vá mã nguồn | Bằng chứng và giới hạn |
| --- | ---: | --- | --- |
| Smart Contracts & Teleporter | 30 | Đã vá các mục 1.1–1.7 | Năm lỗi bảo mật, alias reserve, funded/unfunded message, rollback thanh khoản và tỷ lệ 0/1000/2000/10000 có test. Tỷ lệ được lưu, chưa tự chuyển tài sản giữa mạng. |
| Deploy & wiring | 20 | Đã khôi phục các mục 2.1–2.2 | Hai nhánh deploy, seed, journal, preflight và postcondition đã chạy trên hai RPC cục bộ. Chưa triển khai hoặc nghiệm thu trên Fuji/Family L1 thật. |
| Backend Worker & Database | 20 | Giữ nguyên và đồng bộ các mục 3.1–3.2 | ABI được xuất lại từ artifacts, giữ cả ABI Vault V1; sáu bảng tồn tại. 20 integration tests chạy trên PostgreSQL mới, không dùng database ứng dụng. Tỷ lệ 2300 bps được lưu và khôi phục qua API. |
| Frontend UX & Web3 Hooks | 15 | Đã bổ sung các mục 4.1–4.3 | Switcher ba vai, định danh chung với seed, 56px ở giao diện Ông Nội, slider 0–100% và truyền bps tới calldata. Demo cục bộ không cấp quyền phiên hoặc ký thay ví thật. Chưa chứng nhận WCAG AAA. |
| Tests & hồ sơ | 15 | Đã bổ sung các mục 5.1–5.2 | Alias `FamilyHub.test.ts`, đủ test bảo mật, walkthrough ba phút và hướng dẫn deploy. Toàn bộ 287 test đã pass, không bỏ qua integration tests. |
| **Tổng khung đánh giá** | **100** | **Các vị trí vá được chỉ định đã xử lý** | **Điểm readiness vận hành 100/100 chưa được xác nhận.** |

## Đối chiếu chi tiết

- **1.1–1.3:** `FamilyYieldVault.receiveTeleporterMessage` kiểm tra messenger,
  cấu hình khác zero, blockchain ID và Hub theo đúng thứ tự. Lỗi tương ứng:
  `OnlyTeleporterMessenger`, `TeleporterNotConfigured`, `InvalidOriginChain`,
  `UnauthorizedSender`. Giữ `InvalidChainID` và các lỗi cũ để tương thích ABI.
- **1.4:** `depositYieldReserve` giữ nguyên tên và trở thành `public` để alias
  `seedYieldReserve` gọi nội bộ; cả hai dùng cùng kiểm tra zero, pause và reentrancy.
  Reserve không được dùng để ghi nhận principal của thông điệp ICM.
- **1.5:** Kiểm tra `InsufficientContractBalance(available, requested)` trước khi
  trừ sổ cái/chuyển tiền. Test làm cạn balance và kiểm tra checkpoint/principal
  không thay đổi khi giao dịch revert.
- **1.6:** Hợp đồng tính lãi từ `block.timestamp`; không thêm entry point thay đổi
  thời gian. Time helpers chỉ được dùng trong EVM kiểm thử.
- **1.7:** Hub/Cashflow chấp nhận toàn bộ 0–10000 bps, giữ tỷ lệ đúng trong ledger.
  Không ghi principal remote bằng cách đổi nhãn một khoản tiền vẫn còn tại L1.
- **2.1–2.2:** Chọn nhánh bằng chain ID cấu hình và đối chiếu RPC thực. Kiểm tra
  messenger có code, blockchain IDs bytes32 khác zero, owner/admin/controller,
  địa chỉ Hub/Vault/Cashflow và reserve dương. Chỉ ghi kết quả `verified` sau
  postcondition. Wiring có thể chạy tiếp khi gián đoạn, không hứa rollback
  nguyên tử giữa hai blockchain. Địa chỉ xuất ra file cấu hình công khai riêng,
  không tự thay manifest T1 đang hoạt động.
- **3.1–3.2:** Event signatures không đổi. `scripts/export-abis.ts` xuất đầy đủ
  bảy ABI, bao gồm hợp đồng Vault V1 để không làm mất API đã có. Seed dùng chung
  `shared/demoPersonas.ts` với switcher, không cần reset database để mở demo.
- **4.1:** Ba vai diễn giữ tiến trình rút nhanh, yêu cầu 2/3, báo/duyệt nhiệm vụ
  và tạo hũ trong state cục bộ. Mọi thao tác đều có nhãn demo; không sửa cookie
  đăng nhập, không thay tài khoản Core và không gọi API tài chính thật.
- **4.2:** Giữ hai hooks và kiểm tra allowlist hiện có; tests tiếp tục chặn ví
  khác với ví đã liên kết và kiểm tra quyền trước khi broadcast.
- **4.3:** Mặc định 1000 bps; slider hiển thị tỷ lệ hai phía, có label,
  `aria-valuetext` và thao tác bàn phím. Shared validation từ chối số âm, số
  thập phân, quá 10000, NaN và giá trị sai kiểu. Bản nháp cũ chưa có bps phải
  lưu/kiểm tra cấu hình lại trước ký; không dùng lại preflight cũ âm thầm.
- **5.1:** Test alias không làm Mocha chạy trùng bộ chính. Integration phát hiện
  một assertion route Admin lỗi thời; sửa kỳ vọng sang `/dashboard/admin` và
  kiểm tra kèm membership ADMIN, không đổi quyền hoặc logic ứng dụng để ép pass.
- **5.2:** README có walkthrough từng phút, lệnh deploy/wiring, cách bật `/demo`,
  lệnh chạy integration và phân biệt AVAX/USDC, demo/receipt thật.

## Điều kiện còn thiếu để xác nhận readiness vận hành 100/100

1. **Chuyển tài sản thật:** ICM chỉ truyền thông điệp. `fundCrossChainPrincipal`
   hỗ trợ operator cấp vốn tại Fuji trước khi receiver ghi sổ; đó chưa phải
   adapter ICTT tự động chuyển 90% AVAX từ Family L1. Luồng deposit hiện tại vẫn
   giữ vốn tại kho địa phương; callback phản hồi của Hub và các cờ cross-chain/yield
   của T1 vẫn không đại diện một bridge đang hoạt động. Cần tích hợp adapter,
   xác minh tài sản nhận và nghiệm thu rút liên chuỗi trước khi công bố luồng này.
2. **Deployment thật:** Cần receipt/code hash/wiring của hai mạng triển khai
   thực tế, allowlist precompile, cấu hình zero-fee và kiểm chứng end-to-end.
   Hai EVM cục bộ không thay thế các bằng chứng đó.
3. **UX thực tế:** Chạy browser E2E, keyboard, screen reader, zoom/mobile và
   đánh giá WCAG AAA; chữ 56px và tương phản cao riêng lẻ chưa phải chứng nhận.
4. **Chấm điểm:** Cần skill auditor thực hoặc đơn vị chấm lại. Không tự phát
   hành kết quả "100/100" chỉ vì các kiểm thử cục bộ pass.

Không thay đổi database ứng dụng, không gửi giao dịch lên testnet công khai,
không commit khóa/môi trường thật và không thay hai thay đổi đã có sẵn của người
dùng trong `docs/FAMILY_ADMIN_IMPLEMENTATION.md` và `frontend/tsconfig.json`.

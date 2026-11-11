> **Historical engineering note.** This document may describe superseded plans or validation results. See the [current project status](../docs/STATUS.md) for supported behavior and deployment evidence.

# Bàn giao nâng cấp T1 Fuji — 05/11/2026

## Trạng thái thực tế

Đã triển khai thay đổi mã nguồn cho T1 một chain theo lựa chọn của người dùng.
**Chưa hoàn tất nghiệm thu T1 trên testnet.** Lệnh deploy thật dừng ở bước kết nối
RPC Fuji với `HH108: Cannot connect to the network fuji`. Không có giao dịch deploy,
wiring, tạo hũ, nạp hoặc rút Fuji nào được gửi trong lần triển khai này.

`shared/deployment.json` giữ `enabled=false`, `status=configured`, không điền địa chỉ,
hash giao dịch hoặc block giả. Doctor trả `DEPLOYMENT_NOT_ENABLED`, exit code 1.
Không sửa `.env` thật, không chạy seed/reset/migration trên database người dùng,
không gắn các hũ cũ vào deployment mới bằng suy đoán ID.

## Thay đổi có thể rà soát

- `FamilyHub`: không auto-create khi nạp; tỷ lệ T1 10000; mọi vốn ở chain Hub và
  remote principal bằng 0. Creator và members cần allowlist do admin cấp trước.
  Chặn zero/duplicate/quorum không hợp lệ, giới hạn danh sách 32 Guardian/64 beneficiary.
- SHIELD: chỉ beneficiary của đúng hũ được rút; hạn mức cố định, tổng rút nhanh theo
  ngày UTC của block tối đa 2 × hạn mức. Creator/admin không tự có quyền rút hoặc phiếu duyệt.
- MILESTONE: giữ chỗ thưởng, không vượt số dư; assignee phải là beneficiary và không
  là Guardian của hũ; đủ quorum mới chi. Hủy chỉ giải phóng khoản giữ chỗ; trạng thái
  `CANCELLED` được worker/UI nhận diện. Một chữ ký đầu tiên không bị báo thành đã chi thưởng.
- SHARED_GOAL: kiểm mục tiêu/deadline ở cả tạo request và lúc duyệt/thực thi. Hết hạn
  cho phép quyết toán có quorum; không hứa tự động hoàn tiền theo người góp.
- ROSCA: góp đúng một khoản/người/kỳ; không nạp qua đường donation; đủ tất cả khoản
  và tới hạn mới chi đủ, chỉ một chu kỳ hữu hạn. Thiếu khoản tiếp tục chờ; chưa có
  rời nhóm, hủy chu kỳ hoặc hoàn tiền tự động. Đây là hạn chế vận hành cần người dùng hiểu trước khi góp.
- Recovery: quorum, cập nhật arrays/mappings, chuyển identity góp ROSCA và assignee
  nhiệm vụ; membership epoch vô hiệu request/chữ ký và phiếu thưởng cũ. Không trả về
  ví đã thu hồi. Recovery của contract không tự thay danh tính tài khoản Web2.
- `VaultCashflow`: chỉ Hub controller được nạp/chi; owner không bypass policy; wiring
  một lần trước tạo hũ, không thay nơi giữ vốn khi có vốn/ledger.
- `KinetixForwarder`: kế thừa OpenZeppelin Contracts **5.6.1** đã ghim; EIP712 deadline
  `uint48`, nonce từ `nonces(address)`, signature nằm trong request. ABI cũ không còn tương thích.
- Relayer service khóa cứng trong T1, trả `RELAYER_DISABLED_T1` trước tạo wallet/broadcast.
  Không fallback khóa deployer. Budget/nonce journal tài trợ chưa được triển khai và chưa được bật.
- YieldVault không được deploy/bật ở T1. Mã độc lập chỉ nhận principal của operator,
  ICM không tạo được vốn; compound/chi lãi cần reserve; checkpoint giữ remainder.
  TVL chỉ hiển thị principal đã bảo chứng. Đây là mô hình reserve, chưa phải strategy DeFi.
- API: kiểm manifest/runtime code hash/deployment receipt/wiring/finality trước write;
  giữ guard 409, đối chiếu rule, creator và receipt `VaultCreated`; lưu transaction/log
  bằng chứng. Nhận diện signer của lời gọi forwarder thay vì coi broadcaster là creator.
- Worker: đọc từ deployment block tới block `finalized`, cursor riêng theo deployment/hũ,
  checkpoint sau xử lý receipt; replay không tăng tiền lần hai nhờ khóa event duy nhất.
  Hũ đăng ký muộn có thể backfill từ deployment block. Không tạo membership từ event lạ.
- Frontend dùng cùng manifest; input nạp/hạn mức/mục tiêu/khoản góp giữ chuỗi thập phân.
  Bỏ tỷ giá USD/VND cố định, số đo latency giả, lịch ROSCA/tên người nhận mẫu, thông báo
  APY và địa chỉ fixture. Hũ chưa có evidence hiển thị chưa đối soát.
- Script `sync-real-data.ts` cũ đã bị khóa vì tạo dữ liệu fixture; script wiring T2
  cũng bị khóa. Script deploy mới không seed người dùng/hũ hoặc cập nhật DB.

## Schema và cấu hình

Migration `backend/drizzle/0003_t1_vault_evidence.sql` thêm hai cột receipt tạo hũ,
unique event index, ràng buộc cặp evidence và trạng thái chore `CANCELLED`. Snapshot
và journal đi kèm. Không backfill các row cũ thiếu bằng chứng.

Nguồn cấu hình công khai: `shared/deployment.json`. RPC chứa credential chỉ đặt trong
`HUB_RPC_URL`; manifest công khai không chứa khóa hoặc credential. Nếu còn đặt
`FAMILY_HUB_ADDRESS`/`HUB_CHAIN_ID`, chúng phải khớp manifest đang enabled. Frontend
không còn lấy địa chỉ từ các biến `NEXT_PUBLIC_*` cũ; cần rebuild sau đổi manifest.

Compiler cục bộ ghim solc **0.8.26**, optimizer 200, viaIR, EVM **Cancun**, phù hợp với
[hướng dẫn Avalanche](https://build.avax.network/docs/primary-network/verify-contract/hardhat).
Contracts giữ pragma `^0.8.20`. Forwarder dùng
[OpenZeppelin ERC2771Forwarder](https://docs.openzeppelin.com/contracts/5.x/api/metatx).

## Kiểm tra

| Kiểm tra đã chạy | Kết quả |
|---|---|
| `npm run compile` | Đạt; solc 0.8.26/Cancun; runtime Hub 21.336 byte, dưới giới hạn EIP-170 |
| `npm test` | **116 đạt, 15 pending**; gồm audit, contract, receipt, callback/reentrancy và auth/Web3/render/mapping |
| 14 case AUD-01…14 | Đạt theo hành vi an toàn; AUD-03/08/10 kiểm tính năng bị khóa trong T1 |
| `npm run test:auth` | 52 đạt, 15 pending ở lần chạy riêng; suite đầy đủ sau đó cũng đạt |
| `npm run typecheck` | Đạt sau đồng bộ artifacts/ABI |
| Frontend TypeScript và production build | Đạt với `KINETIX_CONSTRAINED_BUILD=true`, `KINETIX_BUILD_DIR=.next-t1-check`; không ghi đè dev build |
| `npm run sol:lint` | 0 lỗi, **351 cảnh báo**; chưa làm sạch toàn bộ NatSpec/style warnings |
| `git diff --check` | Đạt, không có lỗi whitespace |
| `npm run check:testnet` | Exit 1, `DEPLOYMENT_NOT_ENABLED`, đúng trạng thái chưa deploy |
| Deploy Fuji thật | Thất bại ở kết nối RPC (`HH108`), trước broadcast |

15 test pending đều cần PostgreSQL test cô lập; không dùng database ứng dụng để
làm xanh test. Không có `TEST_DATABASE_URL` và không tìm thấy CLI PostgreSQL/Docker
để khởi tạo DB cô lập trong môi trường này. Migration mới chưa được kiểm chứng trên
PostgreSQL thật. Các log cục bộ nằm ở `.cache/`; chúng là bằng chứng test/build,
không phải receipt testnet. Chưa chạy Core desktop/mobile, staging HTTPS hoặc kiểm tra
giao diện bằng trình duyệt/thiết bị thật. Mã đã kiểm thử cục bộ chưa thay thế kiểm toán độc lập.

## Các bước còn lại để nghiệm thu thật

1. Cấp kết nối RPC Fuji cho môi trường chạy. Giữ key trong `.env`, không gửi qua chat.
   Chạy `npm run compile`, `node -r ts-node/register/transpile-only scripts/export-abis.ts`,
   rồi `npm run deploy:fuji`. Trong môi trường chặn child process nhưng có RPC, dùng:

   ```powershell
   $env:HARDHAT_NETWORK = "fuji"
   node -r ts-node/register/transpile-only scripts/deploy.ts
   ```

   Script kiểm chain 43113, yêu cầu số dư đủ gas theo fee cap, lưu journal từng hash tại
   `deployments/fuji/<sourceHash>/journal.json`. Chạy lại cùng source/signing account sẽ
   đối soát hash đã gửi, không tự gửi lại bước đã có hash. Nếu transaction lỗi, dừng để
   đối soát journal; không xóa hash đang pending. Chỉ kích hoạt manifest sau wiring thành công.

2. Thử migration trên **database test cô lập** trước; chạy DB integration bằng
   `TEST_DATABASE_URL`, `AUTH_TEST_ALLOW_RESET=true` theo `scripts/auth-test-safety.cjs`.
   Chưa chạy migration lên database ứng dụng trong phiên này. Khi đã nghiệm thu DB,
   sao lưu và áp dụng migration theo quy trình vận hành.
3. Đồng bộ cấu hình thực với manifest, chạy `npm run check:testnet`, rebuild frontend,
   khởi động lại API/worker. Không chuyển người dùng về contract cũ có P0 đã biết.
4. Dùng tài khoản Core thật tạo **workspace/hũ mới**, chọn thành viên đã allowlist,
   ký `VaultCreated`, đăng ký qua `/api/vaults`. Các hũ cũ tiếp tục được lưu, bị khóa
   giao dịch cho tới khi có đối soát riêng. Không chuyển tài sản bằng cập nhật ledger DB.
5. Chạy Core desktop/mobile: tạo → nạp → receipt/finality → API/worker sync → SHIELD
   rút nhanh và rút đủ quorum → MILESTONE duyệt nhiều người → kiểm ROSCA/goal. Lưu
   chain, transaction hash, block, receipt và balance diff cho mỗi kịch bản.
6. Thử từ chối ký, sai tài khoản/mạng, RPC mất kết nối, API trễ, click lặp, refresh,
   retry sync. Giao dịch đã broadcast phải theo dõi hash cũ. Queue chỉ chứa yêu cầu
   đồng bộ; API xác minh receipt độc lập.

## Vận hành và phục hồi

- Sự cố: pause Hub và Cashflow bằng admin/owner đúng quyền, giữ nguyên bằng chứng các
  giao dịch đã gửi; dừng mở write API bằng manifest nếu cần. Pause không đảo ngược tx đã mined.
- Treasury: đối chiếu `balance >= totalLiabilities` và từng ledger. AVAX chuyển thẳng
  là surplus chưa phân bổ, không tự cộng vào hũ. Owner không có hàm rút surplus.
- Worker: theo dõi lỗi `Worker reconciliation failed`. Dừng worker trước replay; sao
  lưu cursor, đặt `next_block` của đúng khóa `<chain>:<hub>:<vault UUID>` về deployment
  block rồi chạy lại. Event unique index chống nhân đôi; không sửa số dư bằng tay.
- Không xóa history/receipt/journal để che lỗi. Nếu thiếu schema, API trả
  `DATABASE_SCHEMA_OUTDATED`; nếu manifest/RPC sai, write tiếp tục đóng.
- Chưa có auto-monitor/alert dịch vụ bên ngoài hoặc kiểm toán độc lập. Cần vận hành
  staging HTTPS và thiết bị thật trước khi nghiệm thu. T2 chưa nằm trong phạm vi được bật.

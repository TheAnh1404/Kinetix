> **Historical engineering note.** This document may describe superseded plans or validation results. See the [current project status](STATUS.md) for supported behavior and deployment evidence.

# Hũ tiền với ví Core chung trên Fuji

Ví giữ tiền: `0xD1e826De79445C0F7BDB112A98E4114e0F603edD`.
Tài sản: native AVAX, Fuji C-Chain `43113` ([Avalanche network configuration](https://build.avax.network/docs/primary-network)).

Đây là mô hình lưu ký: người giữ Core kiểm soát tiền thực. Hũ ví chung là sổ phân bổ trong PostgreSQL, độc lập với hũ smart contract FamilyHub và các chính sách multisig/ROSCA/yield của contract. Không cần private key trên server. Không tự chuyển tiền đang có trong contract sang ví này.

## Chạy và thao tác

1. Chạy `npm run db:migrate` rồi `npm run dev:all`. Cần cả API và worker; worker đối soát mỗi 15 giây ngay cả khi FamilyHub chưa deploy.
2. Vào `/dashboard/guardian`, phần **Hũ tiền · Ví chung Fuji**. Admin workspace tạo hũ, ban đầu số dư bằng 0.
3. Tạo yêu cầu nạp, chọn hũ và số AVAX. Bấm **Ký bằng Core** ở yêu cầu chờ ký, dùng đúng ví cá nhân đã liên kết. Ví chung không tự nạp cho chính nó.
4. Admin tạo yêu cầu rút với địa chỉ nhận. Số tiền được giữ chỗ ngay. Chủ ví chung ký bằng Core, bằng một tài khoản có quyền admin trong workspace đó. Số dư chỉ giảm khi receipt finalized thành công.
5. Chuyển giữa các hũ trong cùng workspace được ghi hai bút toán đối ứng, nguyên tử. Không chuyển tiền blockchain và không tạo tx hash giả; dùng mã yêu cầu UUID để kiểm toán.
6. Có thể ký hủy bằng Core: giao dịch 0 AVAX về chính ví ký, cùng nonce, memo hủy riêng. Tốn gas. Tiền giữ chỗ chỉ được giải phóng khi một receipt finalized cho thấy hủy hoặc revert. Nếu lệnh chi thắng cuộc đua với lệnh hủy, hệ thống vẫn ghi khoản chi thật.

Ký các yêu cầu theo thứ tự nonce. Nonce được cố định trước khi ký để thử lại một yêu cầu không thể trả tiền hai lần. Yêu cầu chưa ký cần ký thực hiện hoặc ký hủy để không tạo khoảng trống nonce. Nếu Core thay thế hash, dán hash mới vào **Đối soát**. Không chỉnh recipient, value, nonce hoặc data trong Core. Phí gas lấy từ ví ký, ngoài số dư hũ; ví chung nên giữ một khoản AVAX riêng cho gas.

Tiền gửi trực tiếp từ Core vào địa chỉ chung không chứa mã yêu cầu sẽ không tự được gán vào hũ. Nạp qua ứng dụng để có đủ bằng chứng. Tiền đã có trước khi dùng hệ thống là khoản chưa phân bổ, không tự nhận là tiền của một workspace. Nếu một nonce bị dùng bởi giao dịch ngoài ứng dụng, cần đối soát thủ công; ứng dụng giữ nguyên reservation thay vì tự coi khoản tiền đó đã được chi hoặc hoàn lại.

## Bằng chứng và dữ liệu

- `treasury_jars`: số dư wei và số tiền giữ chỗ, giới hạn `0 <= reserved <= balance`.
- `treasury_transfers`: yêu cầu bất biến về workspace, hũ, số tiền, sender, recipient, nonce; trạng thái `READY/SUBMITTED/CONFIRMED/REVERTED/CANCELLED`; tx hash thắng, block number và block hash.
- `treasury_attempts`: lưu mọi hash thanh toán/thay thế/hủy của một yêu cầu, tránh bỏ sót khoản chi khi hủy cùng nonce.
- `treasury_entries`: bút toán tăng/giảm, unique theo yêu cầu và hũ. Chỉ có bút toán nếu chuyển nội bộ hoặc receipt thanh toán finalized thành công.

API kiểm tra chain ID, sender, recipient, giá trị wei chính xác, nonce và memo `Kinetix:<requestId>` hoặc `Kinetix:cancel:<requestId>`. Receipt phải thành công, finalized và khớp block canonical. Tx hash unique; nonce unique theo sender và chain. Transaction PostgreSQL và advisory lock chung bảo vệ số dư, reservation và việc ghi một lần. HTTP tạo yêu cầu dùng `requestId` UUID làm khóa idempotency và từ chối tái sử dụng ID với nội dung khác.

Thành viên workspace xem các hũ của workspace và tạo nạp cho chính mình; admin mới được tạo hũ, rút hoặc chuyển nội bộ. Thông tin tổng tiền on-chain và tổng phân bổ mọi workspace chỉ hiển thị với tài khoản liên kết ví giữ tiền. Chênh lệch có thể gồm tiền chưa phân bổ, gas, giao dịch ngoài ứng dụng hoặc worker chưa đồng bộ; không phải lợi nhuận.

## Kiểm tra

```sh
npm run typecheck
npx tsc --noEmit -p frontend/tsconfig.json
npx hardhat test --no-compile test/Treasury.test.ts test/Kinetix.test.ts test/SecurityHardening.test.ts
node -r ts-node/register/transpile-only scripts/check-treasury.ts
```

Production build trong PowerShell khi môi trường hạn chế tạo tiến trình con:

```powershell
$env:KINETIX_CONSTRAINED_BUILD="true"
$env:KINETIX_BUILD_DIR=".next-treasury-check"
npm --prefix frontend run build
```

`Treasury.test.ts` chạy service thật với biên PostgreSQL/RPC được mô phỏng; kiểm tra quyền, receipt, finality, idempotency, reservation và bút toán. Các bài contract dùng EVM Hardhat. Chưa thay thế acceptance test ký Core và chuyển AVAX thật trên Fuji. Không dùng database đang chạy ứng dụng cho bài test sửa dữ liệu.

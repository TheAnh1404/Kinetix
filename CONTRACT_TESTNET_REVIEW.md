# Rà soát contract và kế hoạch sẵn sàng testnet

Ngày kiểm tra: 04/11/2026. Phạm vi: mã hiện tại trong working tree, RPC cấu hình,
Fuji chain 43113 và workspace `ea1f9bdc-44b8-454d-a4d6-e2a171b6fd6d`.
Đây là rà soát kỹ thuật có kiểm thử tái hiện, chưa phải kiểm toán độc lập.

Cập nhật 05/11/2026: mã nâng cấp trong phạm vi T1 đã được triển khai và kiểm thử
cục bộ. Xem [bàn giao T1](.docs/T1_HANDOVER.md). Chưa có receipt deployment/E2E Fuji;
các phát hiện bên dưới mô tả phiên bản trước nâng cấp và không phải trạng thái triển khai mới.
Các kế hoạch phiên cũ đã gộp tại [kế hoạch lần đầu sử dụng](docs/FIRST_USE_PLAN.md). Báo cáo này giữ làm bằng chứng lịch sử.

## Kết luận và lỗi 409

Chưa đủ điều kiện nghiệm thu luồng tài chính testnet. Lỗi 409 xảy ra trước khi
ký/gửi giao dịch: `vaultAccess(..., financial=true)` từ chối hũ chưa đối soát.
Không được bỏ guard hoặc điền địa chỉ/chain vào database chỉ để vượt lỗi.

Đối chiếu chỉ đọc đã thực hiện:

| Lớp | Kết quả |
|---|---|
| Backend | Không đặt HUB_CHAIN_ID/HUB_RPC_URL; rơi về Family L1 99999, RPC 127.0.0.1:9650 không kết nối được |
| Frontend | Không đặt NEXT_PUBLIC_HUB_CHAIN_ID/FAMILY_L1_RPC; cũng rơi về cấu hình Family L1 mặc định |
| Hũ database | Các hũ 0, 1, 2, 4 đều thiếu onchain_chain_id/onchain_hub; hũ 1 là MILESTONE |
| Workspace Hub | 0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0; chưa xác nhận là FamilyHub đúng trên mạng đích |
| Workspace Yield | 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512 không có bytecode trên Fuji |
| Hub từ .env | 0x2873c3B76364E6377912F174e3754AFdfCeae1F6 có code trên Fuji, vaultCounter=4, cashflow=0, không đọc được trustedForwarder bằng ABI mới |

Fuji Hub từ `.env` trả rule của hũ 1 = SHIELD (0), hũ 2 = MILESTONE (1),
hũ 4 = SHARED_GOAL (3); hũ 0 không hoạt động. Database đang ghi hũ 1 = MILESTONE
và hũ 2 = ROSCA. Vì vậy chỉ chép Hub/chain vào các row hiện tại có thể chuyển
tiền tới hũ sai chính sách. Workspace Hub có bytecode khác, nhưng các getter
familyAdmin/vaultCounter không đọc được; chưa xác định được danh tính contract đó.

Địa chỉ Hub có bytecode không chứng minh khớp source hiện tại. Không có giao
dịch triển khai, cấp quyền, nạp hoặc rút testnet nào được gửi trong đợt rà soát.

## Danh sách việc trước khi sửa mã contract

- [x] Đọc Hub, Cashflow, YieldVault, Forwarder, relayer và deployment scripts.
- [x] Đối chiếu database, backend/frontend config và bytecode qua RPC chỉ đọc.
- [x] Chạy bộ test hiện có và thêm bằng chứng tái hiện các điểm yếu.
- [x] Phân loại mức độ, chốt lộ trình và điều kiện nghiệm thu từng giai đoạn.
- [x] Bổ sung chẩn đoán 409 và công cụ kiểm tra cấu hình chỉ đọc.
- [x] Typecheck backend/frontend, hồi quy auth/Web3 và build production.

## Phát hiện cần xử lý

1. **P0 — Dòng tiền liên chuỗi chưa đúng.** ICM hiện chỉ gửi thông điệp cộng/trừ
   principal; native token vẫn ở Hub/Cashflow. YieldVault có thể ghi nhận vốn
   không được chuyển tới. Khi rút vượt đệm, L1 trả toàn bộ trong khi C-Chain
   cũng có thể trả phần thiếu trực tiếp cho cùng người nhận. Cần bridge tài sản,
   operation ID, xác nhận funding và một điểm chi trả duy nhất.
2. **P0 — Relayer chưa giới hạn tài trợ.** Client truyền forwarder/to/value/gas;
   backend không ràng buộc deployment, workspace, selector, ngân sách hay chain
   RPC thực tế trước khi dùng khóa relayer. Không dùng khóa deployer làm fallback.
3. **P0 — Forwarder thiếu đối chiếu msg.value.** execute chuyển req.value từ số
   dư hợp đồng mà không yêu cầu msg.value tương ứng. Dùng triển khai chuẩn đã
   kiểm toán, có xác minh value/gas/target và chữ ký chuẩn.
4. **P0 — Policy hũ có đường vượt.** fastWithdraw không giới hạn SHIELD;
   fastWithdrawToken không áp hạn mức/quorum/mục tiêu. Nạp vào vaultId chưa có
   còn tự tạo SHIELD không có Guardians nhưng requiredApprovals=2. createChore
   không giới hạn MILESTONE: một Guardian có thể tự giao việc, claim và duyệt
   trả toàn bộ số dư SHIELD cho mình, vượt M/N của hũ.
5. **P0 — Bảo chứng YieldVault.** compoundYield tăng principal khi reserve thiếu;
   _handleWithdrawal vẫn có thể chi lãi bằng tiền của hũ khác khi reserve thiếu.
   Cần invariant tài sản bảo chứng và hạch toán reserve chặt chẽ.
6. **P1 — Sender liên chuỗi không thống nhất.** Cashflow gửi message nhưng
   YieldVault chỉ chấp nhận originSender=Hub; mock nuốt lỗi callback nên test
   phía gửi có thể xanh dù phía nhận thất bại.
7. **P1 — Cấu hình và deployment.** Script tạo blockchain ID bằng hash của nhãn
   hoặc EVM chainId; phải dùng blockchain ID thật của Avalanche. Script wiring
   bắt lỗi rồi vẫn báo hoàn tất; không atomic giữa hai chain. Không hardcode địa
   chỉ, người nhận, ví fixture hay tiếp tục khi RPC/code/config sai.
8. **P0/P1 — Thành viên và recovery.** Guardian trùng lặp chưa bị chặn; recovery đổi
   mapping nhưng không đổi mảng Guardians/Beneficiaries và assignee/pending
   recipient. Đã tái hiện ROSCA trả tiền về ví cũ sau recovery. Cần phiên bản
   quyền và quy tắc invalidation đối với phiếu/chữ ký cũ.
9. **P1 — Reserve nhiệm vụ/ROSCA.** Tạo nhiều nhiệm vụ có thể vượt tổng thanh
   khoản cam kết. ROSCA payout chưa đòi đủ contribution của kỳ và chưa chốt kết
   thúc một chu kỳ thành viên; cần chính sách thiếu khoản/hoàn tiền rõ ràng.
10. **P1 — Trợ năng không thay quyền contract.** CHILD là beneficiary vẫn có thể
    gọi những hàm rút được contract cho phép dù UI ẩn. Giới hạn tuổi/guardian
    phải là chính sách tài khoản/contract nếu sản phẩm cần bảo đảm đó.
11. **P0 — Đổi Cashflow làm mất liên kết tài sản.** setVaultCashflow không có
    migration vốn/ledger và không khóa khi hũ đã có tiền. Sau khi gắn Cashflow
    trống, getVault báo 0 trong khi tiền vẫn nằm ở Hub cũ.

Các điểm bổ sung cần xử lý trong B: Hub dùng IERC20.transferFrom/approve thay
SafeERC20; chưa kiểm token fee-on-transfer/rebasing và decimals 6; getter
allowlist chưa được áp thành modifier cho các write on-chain; một Guardian
có thể sửa daily limit; owner Cashflow được giải ngân trực tiếp ngoài Hub.
Hai điểm sau là quyền đặc biệt cần ghi rõ trong mô hình tin cậy hoặc thay bằng
quản trị M/N. Không thể hứa bảo vệ M/N chống lại chính owner nếu vẫn giữ bypass đó.

## Bằng chứng kiểm thử và giới hạn

Bộ hiện có: **53/53 đạt** trên Hardhat, không chứng minh E2E hai chain. Solhint:
**0 lỗi, 319 cảnh báo**. Hồi quy auth/API/Web3/render/mapping: **52 đạt, 15 bài
DB integration chưa chạy** vì không có database test cô lập. Typecheck đạt;
build production dùng `KINETIX_CONSTRAINED_BUILD=true` và distDir riêng để
không ghi đè server dev đang chạy.

`test/ContractReadinessAudit.test.ts` có **14 case tái hiện đạt**. Trong bộ này,
“đạt” nghĩa là đã chứng minh hành vi sai ở bản hiện tại. Khi sửa contract,
phải đổi chúng sang kỳ vọng từ chối hoặc invariant đúng; không dùng số xanh
của suite này làm cổng nghiệm thu an toàn.

| Case | Bằng chứng ở bản hiện tại | Regression cần đạt sau sửa |
|---|---|---|
| AUD-01 | Deposit vào ID chưa tồn tại tự tạo hũ không Guardians | Revert VaultNotFound; không đổi counter/ledger |
| AUD-02 | Fast native rút SHARED_GOAL chưa đạt mục tiêu | Chỉ SHIELD được rút nhanh |
| AUD-03 | Token rút toàn bộ dù hạn mức native = 0 và là hũ goal | Policy riêng theo token/decimals; không vượt goal/quorum |
| AUD-04 | Chữ ký attacker dùng 1 AVAX tồn trong Forwarder, msg.value=0 | Revert mismatch value; target phải tin forwarder |
| AUD-05 | Compound với reserve=0 làm principal lớn hơn tài sản | Không tăng nghĩa vụ khi thiếu reserve |
| AUD-06 | Deposit 1 wei, chờ 1000s rồi nạp 100 token nhận lãi hồi tố | Vốn mới bắt đầu tính từ block nạp; lưu remainder chính xác |
| AUD-07 | Request 60 nhưng được trả 60 tại Hub và 50 tại YieldVault | Một operation chỉ trả đúng 60, trên chain đã chọn |
| AUD-08 | Cashflow ghi remote principal nhưng receiver không nhận do sender mismatch | Đối soát sender đúng; message thất bại không thành vốn đã xác nhận |
| AUD-09 | Guardian trùng vẫn cho tạo quorum vượt số signer khác nhau | Từ chối zero/duplicate và threshold không thể đạt |
| AUD-10 | Mock RPC cho thấy relayer chấp nhận forwarder/to/value tùy ý, không đọc chain | Whitelist deployment/selector; zero sponsored value mặc định; kiểm chain và budget |
| AUD-11 | Gắn Cashflow trống làm getter về 0 dù Hub vẫn giữ tiền | Cấm đổi khi đã có vốn hoặc migration nguyên tử, có đối soát |
| AUD-12 | Trả lãi hũ 1 khi reserve=0 làm thiếu bảo chứng cho hũ 2 | Bảo toàn backing hũ khác; reserve thiếu thì chờ hoặc revert |
| AUD-13 | ROSCA trả cho ví cũ sau recover | Recipient mới hoặc pause/review bắt buộc; không trả ví đã thu hồi |
| AUD-14 | Một Guardian dùng chore route rút hết SHIELD cần 2 chữ ký | createChore chỉ MILESTONE, không vượt policy hũ nguồn |

AUD-10 là kiểm thử biên service với RPC/wallet mock; các case còn lại chạy
contract thật trên EVM cục bộ. Không thử khai thác trên Fuji.

Các lệnh tái hiện chính:

```powershell
npx hardhat test test/Kinetix.test.ts test/SecurityHardening.test.ts test/ChainReceipt.test.ts test/KinetixAdvancedFlows.test.ts
npx hardhat test test/ContractReadinessAudit.test.ts
npm run test:auth
npm run typecheck
npm run check:testnet -- --workspace ea1f9bdc-44b8-454d-a4d6-e2a171b6fd6d
```

Lệnh cuối hiện trả exit code 1 vì phát hiện blocker, đây là kết quả chẩn đoán
được kỳ vọng với cấu hình đang có. Chỉ chạy DB integration trên database test
cô lập; không dùng database người dùng để đạt đủ số test.

## Chẩn đoán và thay đổi đã làm trong đợt review

- Thêm `shared/vaultMapping.ts`: phân biệt VAULT_NOT_RECONCILED,
  VAULT_CHAIN_MISMATCH, VAULT_HUB_MISMATCH; ID 0 bị chặn.
- Backend giữ status 409 khi mapping chưa hợp lệ, trả hướng xử lý rõ ràng.
- Modal nạp không dùng hũ giả khi danh sách trống, khóa xác nhận cho hũ chưa
  đối soát, hiển thị tên chain cấu hình thay vì luôn ghi Fuji.
- `npm run check:testnet -- --workspace <UUID>`: kiểm tra chỉ đọc; không dùng
  khóa ký hoặc cập nhật DB/.env. Với workspace đang báo lỗi: **5 blocker**
  (4 hũ chưa mapping, RPC Hub không truy cập được).
- Không sửa/redeploy contract tài chính hay tự nối các hũ seed vào Hub cũ.

## Kế hoạch nâng cấp

| Giai đoạn | Công việc và đầu ra | Điều kiện hoàn tất |
|---|---|---|
| A — Cấu hình và dữ liệu | Chọn mạng triển khai; manifest chainId/RPC/Hub/Cashflow/Forwarder/version/block; không dùng fixture; API đăng ký hũ bằng receipt VaultCreated đúng actor; tách các hũ chưa xác minh | Doctor không có lỗi; frontend/backend/DB cùng mạng; mọi hũ dùng được có mapping verified |
| B — P0 contract và relayer | Bỏ auto-create khi deposit; validate rule/unique members; policy ERC20 theo decimals; forwarder chuẩn; relayer allowlist và ngân sách; reserve bảo chứng; kiểm soát đổi Cashflow khi đã có vốn | Tất cả kiểm thử đối kháng chuyển thành kỳ vọng từ chối; không có đường rút vượt policy hoặc dùng tiền hũ khác |
| C — Testnet một chain có nhãn rõ | Triển khai mới Hub/Cashflow hardened trên Fuji; tài sản thật chỉ trên Fuji; không bật tính năng liên chuỗi/real yield khi chưa có bridge và chiến lược lợi suất | Core ký nạp → receipt → API sync → rút/duyệt thưởng bằng tài khoản thật; không gọi nguồn vốn nội bộ là vốn C-Chain |
| D — Dual chain | Family L1 có validator/RPC/allowlist thực; ICTT TokenHome/Remote hoặc adapter tương đương; xác nhận nguồn/đích, retry/idempotency, timeout/refund, không trả hai lần | E2E hai mạng độc lập; chứng minh tổng tài sản bảo chứng, message trễ/thất bại không làm sai ledger |
| E — Nghiệm thu | Kiểm toán bổ sung, regression quyền/pause/recovery/token bất thường, race và replay; staging HTTPS/Core Mobile; monitoring/liquidity/runbook | Bằng chứng tx/receipt ở mạng đích, kiểm thử thiết bị và người dùng; operator có quy trình phục hồi |

Ưu tiên B trước khi triển khai nhận tiền của người dùng. Giai đoạn C là phương
án demo testnet giới hạn, không thay thế D. A–C dự kiến 7–12 ngày công sau khi
chốt policy tài sản; D thêm 10–20 ngày công tùy hạ tầng L1/ICTT và yêu cầu đối
soát. Đây là ước lượng, không phải cam kết trước khi chạy spike bridge.

## Nguồn đối chiếu

- [Avalanche ICTT: TokenHome/Remote, collateral và sendAndCall](https://build.avax.network/docs/cross-chain/interchain-token-transfer/overview)
- [OpenZeppelin ERC2771Forwarder](https://docs.openzeppelin.com/contracts/5.x/api/metatx)
- [ERC-2771: mô hình trusted forwarder](https://eips.ethereum.org/EIPS/eip-2771)
- [Avalanche Info RPC: lấy blockchain ID thật](https://build.avax.network/docs/rpcs/other/info-rpc)
- [ITeleporterMessenger chính thức](https://github.com/ava-labs/icm-contracts/blob/main/contracts/teleporter/ITeleporterMessenger.sol)

Interface cục bộ đang khai báo messageID trả về uint256, interface chính thức
là bytes32. Cùng kích thước ABI 32 byte nên riêng khác biệt này không đủ kết
luận gửi message sẽ revert, nhưng cần dùng interface/version chuẩn trong D.

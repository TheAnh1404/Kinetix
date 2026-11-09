# Phương án thiết kế lại smart contract cho các Hũ Kinetix

Ngày: 09/11/2026  
Trạng thái: đề xuất kiến trúc; chưa thay mã Solidity hoặc triển khai lên mạng.

## 1. Mục tiêu

Mỗi Hũ phải có địa chỉ smart contract riêng để tự giữ tài sản, áp dụng chính sách, xác thực quyền, quản lý yêu cầu và phát ra bằng chứng giao dịch. Giao dịch chỉ được coi là thành công khi có receipt thành công và event phù hợp trên đúng chain, đúng contract.

Yêu cầu về lịch sử được đáp ứng bằng event log bất biến trên blockchain và indexer dựng lịch sử để ứng dụng tra cứu. Contract lưu trạng thái hiện tại, quyền và các thao tác còn hiệu lực; không ghi một mảng lịch sử đầy đủ vào storage vì chi phí cao và contract không thể tự truy vấn lại log cũ.

Thiết kế giai đoạn đầu chỉ hỗ trợ AVAX trên một chain. Không bật ERC20, yield, bridge hoặc relayer cho đến khi từng luồng có tài sản bảo chứng, threat model và kiểm thử độc lập.

## 2. Hiện trạng đã rà soát

| Contract hiện có | Vai trò hiện tại | Vấn đề kiến trúc cần giải quyết |
|---|---|---|
| FamilyHub | Một contract quản lý nhiều vaultId, policy, membership, request và task | Policy, quyền và accounting cùng nằm trong một contract; nhiều Hũ dùng chung bề mặt lỗi và storage; một số state phụ thuộc Cashflow |
| VaultCashflow | Sổ ledger/kho AVAX do Hub điều khiển | Balance và liability nằm khác địa chỉ với policy; thay wiring có thể làm mất liên kết ledger với vốn; tạo thêm điểm cần đối soát |
| FamilyYieldVault | Principal, reserve và tính lãi mô phỏng | Không phải chiến lược yield DeFi; không nên nhận tiền người dùng ở T1; bridge message không tự chứng minh tài sản đã được chuyển |
| KinetixForwarder | Forward giao dịch EIP-2771 | Có thể giữ ngoài luồng tài chính; relayer phải bị khóa cho tới khi có allowlist target/selector và giới hạn ngân sách |
| ITeleporterMessenger | Interface callback liên chuỗi | Chỉ là giao tiếp, không phải cơ chế chuyển tài sản hoặc bảo chứng; tách khỏi core Hũ |
| contracts/mocks | Mô phỏng contract trong test | Chỉ dùng trong test; không deploy hoặc coi mock là bằng chứng ICM/receiver thực hoạt động |

Các review trước đã chỉ ra thêm các rủi ro cần giữ làm tiêu chí thiết kế: policy SHARED_GOAL/MILESTONE có đường chi phải đồng nhất, không được nạp để tự tạo Hũ, ROSCA phải ghi nhận góp từng thành viên/kỳ, thay thành viên phải vô hiệu chữ ký cũ, task phải giữ chỗ thưởng và indexer phải chống replay. T1 hiện chưa được deploy; manifest đang disabled và các địa chỉ contract còn null.

## 3. Các lựa chọn kiến trúc

| Phương án | Chi phí tạo Hũ | Cô lập tài sản/trạng thái | Rủi ro nâng cấp | Đánh giá |
|---|---:|---|---|---|
| Một FamilyHub giữ mọi Hũ và mọi ledger | Thấp nhất | Thấp; lỗi policy/accounting có thể ảnh hưởng toàn bộ | Có thể sửa nhanh nhưng blast radius lớn | Không chọn cho kiến trúc mới |
| Factory tạo EIP-1167 clone cho từng Hũ | Thấp hơn deploy full contract; mỗi Hũ có address và storage riêng | Cao giữa các Hũ; cùng dùng một implementation đã audit | Clone không tự upgrade; cần phát hành version mới | Khuyến nghị cho V1 native AVAX |
| Deploy full bytecode riêng cho mỗi Hũ | Cao | Cao | Mỗi bản độc lập, nhưng khó vận hành và cập nhật | Chỉ chọn nếu audit yêu cầu code khác nhau cho từng Hũ |
| Beacon/proxy cho các Hũ | Thấp khi tạo; có thể đổi code đồng loạt | Thấp khi nâng cấp | Một lần upgrade có thể đổi policy của mọi Hũ | Không dùng để giữ tiền ở V1 |

### Phương án được chọn

Triển khai một KinetixVaultFactory cho từng phiên bản. Factory tạo một EIP-1167 clone cho mỗi Hũ và khởi tạo clone ngay trong cùng transaction. Mỗi clone là địa chỉ giữ AVAX, state và quyền độc lập; cùng trỏ tới implementation bất biến của version đó. Nếu cần thay code, deploy implementation/factory version mới; Hũ cũ tiếp tục chạy code cũ cho đến khi người dùng chủ động chuyển tài sản theo quy trình đã audit.

Đây là cân bằng hợp lý giữa phí tạo Hũ, khả năng cô lập vốn, chi phí audit và khả năng đối soát. Clone phải kiểm implementation có bytecode, initializer chỉ gọi được một lần, implementation không thể bị initialize, và factory phải tạo + initialize nguyên tử để không có clone trống cho người khác chiếm quyền khởi tạo.

## 4. Bộ contract đích

### KinetixVaultFactoryV1

- Chọn implementation cố định khi deploy; không có hàm thay implementation cho các Hũ đã tạo.
- Kiểm tra cấu hình: template, địa chỉ duy nhất/không zero, M không vượt số guardian, giới hạn thành viên, thông số target/deadline/ROSCA hợp lệ.
- Tạo clone, initialize toàn bộ policy và thành viên rồi phát VaultCreated trong cùng transaction.
- Là registry để API/indexer xác minh clone nào do factory chính thức tạo. Khóa định danh ứng dụng là chainId + vaultAddress + version; vaultId chỉ để hiển thị.
- Không giữ tiền, không được rút tiền, không được cấp quyền chi thay Guardian.
- Admin chỉ có thể dừng tạo Hũ mới hoặc thay cấu hình mở factory theo quy trình multisig/timelock; không có quyền đổi người nhận hoặc rút vốn của clone.

### KinetixVaultV1

- Mỗi clone giữ AVAX ngay tại địa chỉ của Hũ; bỏ ledger thứ hai của VaultCashflow trong V1.
- Có template SHIELD, MILESTONE, ROSCA hoặc SHARED_GOAL được khóa sau initialize.
- Lưu current balance/liabilities, role mapping, policy, membership epoch, request đang mở và reservation cần thiết.
- Các entrypoint ghi tiền có kiểm tra template và quyền trong contract; ẩn nút trong UI không được xem là kiểm soát bảo mật.
- Không có owner đơn lẻ, familyAdmin hoặc relayer nào có quyền rút tiền ngoài policy của Hũ.
- Từ chối receive/fallback không có calldata deposit để tránh AVAX gửi nhầm được ghi nhận là tiền của Hũ. AVAX bị ép vào contract vẫn được coi là surplus chưa phân bổ, không tự cộng vào balance và không có hàm admin sweep.

### Interface và module bổ sung

- IKinetixVault: ABI ổn định dùng chung cho frontend, backend, worker và các version sau.
- KinetixForwarder: giữ là tùy chọn ngoài luồng cốt lõi; tắt relayer ở V1. Khi bật phải ràng buộc target, selector, chain, nonce, deadline, msg.value và ngân sách từng người dùng.
- VaultCashflow: không dùng cho Hũ mới vì clone đã là nơi giữ tiền và accounting. Không chuyển địa chỉ controller sang hệ mới hoặc coi ledger cũ là tài sản của clone.
- FamilyYieldVault: không deploy trong V1. Chỉ bổ sung YieldAdapter/strategy riêng khi nguồn yield thật được xác định, có giới hạn rủi ro và invariant tổng tài sản bảo chứng.
- Teleporter/ICTT: không gắn vào KinetixVaultV1. Cross-chain phải là module/luồng riêng có lock/mint hoặc burn/release thực, message ID, replay protection, trạng thái pending/settled và đối soát hai chiều.

## 5. Sổ tiền và trạng thái cần lưu

Mỗi Hũ có một invariant native-asset:

    address(vault).balance >= accountedVaultBalance + totalClaimable

accountedVaultBalance là AVAX đã được ghi nhận và còn nằm trong Hũ; totalClaimable là tiền đã quyết toán cho người nhận nhưng chưa được claim. Reservation cho task, withdrawal và ROSCA là các phần bị khóa bên trong accountedVaultBalance, không cộng thêm lần nữa vào tổng nghĩa vụ. Số dư khả dụng được tính bằng accountedVaultBalance trừ các reservation còn hiệu lực. Mọi chuyển trạng thái phải giữ invariant trước và sau external call.

Các request được lưu trong mapping theo requestId với trạng thái PENDING, APPROVED, EXECUTED, CANCELLED hoặc EXPIRED. Request ghi số tiền, người tạo, người nhận cố định, epoch quyền, hạn hết hiệu lực, số phiếu duyệt và memoHash. Không lưu ảnh, tên trẻ, số điện thoại, lý do riêng tư hoặc URI công khai lên chain.

Task lưu assignee, reward, trạng thái và số tiền giữ chỗ. ROSCA lưu round, thành viên đã góp round đó, khoản phải góp, thứ tự người nhận và trạng thái chi. Mỗi Hũ dùng ID request/round nội bộ, tránh dùng một requestId toàn cục không kèm địa chỉ contract.

Không lưu lịch sử deposit/withdraw bằng mảng storage. Event log là lịch sử công khai; DB/indexer chỉ là read model có thể dựng lại từ deployment block. Định danh event trong DB là chainId + contractAddress + transactionHash + logIndex; worker xử lý idempotent, lưu cursor theo deployment và chỉ đánh dấu hoàn tất sau finality/đối soát.

## 6. Luồng người dùng: tạo Hũ và nạp tiền

### Tạo Hũ

1. Guardian chọn loại Hũ, wallet Guardian/beneficiary, quorum và tham số policy trong ứng dụng.
2. Client kiểm đúng network, factory/version đang hoạt động, địa chỉ thành viên và policy; mô phỏng transaction.
3. Wallet ký createVault. Factory validate, tạo clone, gọi initialize nguyên tử và phát VaultCreated(vaultId, vaultAddress, creator, template, version, configHash).
4. Frontend hiển thị trạng thái đang chờ receipt. Backend không tạo mapping tài chính chỉ từ payload của client.
5. Sau receipt thành công, API/worker kiểm chain, factory, event và state đọc lại từ clone; lưu mapping bằng chainId + vaultAddress + creationTx + logIndex. Sau finality mới đánh dấu VERIFIED.

### Nạp AVAX

1. Người dùng mở Hũ đã VERIFIED, nhập số AVAX; frontend parse thành wei bằng bigint, không qua JS Number.
2. Client kiểm đúng chain, đúng địa chỉ clone, trạng thái Hũ và quyền nạp; mô phỏng deposit.
3. Wallet ký gọi deposit() với msg.value đúng số tiền.
4. Contract kiểm Hũ active, số tiền > 0; cộng amount vào accounting của Hũ và phát Deposited(depositor, amount, balanceAfter). Không có đường nạp tự tạo Hũ.
5. Receipt revert: không có tiền nào được ghi nhận, UI báo thất bại. Receipt success: UI báo đã nạp sau khi đọc event và balance on-chain; indexer ghi transaction với khóa event duy nhất.
6. Nếu RPC/DB lỗi sau khi tx đã được broadcast, UI giữ txHash ở trạng thái tracking và truy vấn chính tx đó; không gửi lại transaction nạp.

Kết quả: AVAX đi thẳng từ wallet vào contract của Hũ đó; không đi qua Hub tổng hoặc Cashflow trung gian.

## 7. Luồng người dùng: rút tiền về ví

### Rút nhanh SHIELD

1. Beneficiary nhập amount và recipient; mặc định recipient là wallet đã đăng ký. Contract không nhận số tiền/quorum do API tính sẵn.
2. Client mô phỏng withdrawFast(amount, recipient), nhưng contract tự kiểm caller là beneficiary của Hũ, loại SHIELD, hạn mức mỗi lần, ngân sách rút nhanh cộng dồn trong ngày và số dư khả dụng.
3. Nếu tất cả điều kiện đúng, contract trừ balance/accounting trước khi gọi recipient bằng native call, có nonReentrant. Nếu recipient call thất bại, transaction revert nguyên tử và balance vẫn còn nguyên.
4. Event WithdrawalExecuted(requestId hoặc operationId, recipient, amount, balanceAfter) chỉ phát khi chuyển AVAX thành công. UI chờ receipt success và event rồi mới báo đã nhận tiền.

Không cho admin/creator tự rút thay beneficiary. Hạn mức ngày phải cộng dồn mọi lần rút nhanh của Hũ; nhiều giao dịch nhỏ không được vượt trần.

### Rút cần Guardian M/N

1. Người có quyền theo policy gọi requestWithdrawal(amount, recipient, memoHash). Người nhận được khóa trong request; Guardian duyệt không được đổi recipient.
2. Contract kiểm số dư khả dụng rồi reserve amount để các request khác/task không chiếm cùng số dư; ghi deadline và membershipEpoch; phát WithdrawalRequested.
3. Mỗi Guardian hợp lệ gọi approveWithdrawal(requestId) một lần. Contract tự kiểm guardian của chính Hũ, không nhận phiếu do backend gửi. Phát WithdrawalApproved cho từng signer và số phiếu hiện tại.
4. Khi đủ M/N, trạng thái thành APPROVED. Người dùng hoặc bất kỳ keeper nào gọi executeWithdrawal(requestId); quyền caller không thể đổi amount/recipient.
5. Contract kiểm lại expiry, epoch, trạng thái, reservation và policy tại thời điểm thực thi; đánh dấu EXECUTED, giải phóng reservation và trừ accountedVaultBalance trước external call theo checks-effects-interactions + nonReentrant.
6. Chỉ khi call thành công mới phát WithdrawalExecuted. Nếu recipient từ chối nhận, cả transaction execute revert; request vẫn ở trạng thái có thể xử lý lại. Sau hết hạn, requester hủy hoặc bất kỳ ai expire để giải phóng reservation; thay recipient cần request mới và quorum mới.
7. Backend/worker đối chiếu event thực chi rồi mới ghi trạng thái PAID. Đủ phiếu trong DB không phải bằng chứng đã nhận tiền.

Nếu muốn hỗ trợ recipient là smart wallet có logic nhận tiền phức tạp, có thể chọn claimable payout: đủ quorum chỉ chuyển amount sang claimable của recipient; recipient gọi claim() để nhận AVAX. Cách này chịu lỗi receiver tốt hơn nhưng thêm một transaction/gas. Đề xuất V1 dùng execute trực tiếp để giảm số bước; đổi sang claimable chỉ sau khi UX và accounting claim được đặc tả rõ.

### Chuyển tiền từ Hũ này sang Hũ khác

Đây là thao tác khác với rút về ví ngoài. V1 chỉ cho chuyển giữa hai clone chính thức cùng chain và cùng factory/version; nguồn tiền vẫn chịu policy của Hũ nguồn, mặc định cần M/N.

1. Thành viên có quyền tạo transfer request trên Hũ nguồn với destinationVault và amount cố định.
2. Guardian Hũ nguồn duyệt đủ M/N. Người nhận ở đây là contract Hũ đích, không phải địa chỉ do người gọi tùy ý nhập lúc thực thi.
3. executeVaultTransfer kiểm tra hai địa chỉ đều được factory đăng ký, không cùng một Hũ, cùng chain/version, đủ reservation và quorum.
4. Trong một transaction, Hũ nguồn đánh dấu request đã thực thi và trừ accountedVaultBalance trước khi gọi depositFromVault{value: amount}(source, transferId) của Hũ đích. Hũ đích chỉ chấp nhận caller là vault hợp lệ; destination cộng amount và phát VaultTransferIn; source phát VaultTransferOut sau khi lời gọi thành công.
5. Nếu Hũ đích từ chối, toàn bộ transaction revert, nên không thể trừ tiền ở nguồn mà chưa cộng ở đích. Hai event cùng transactionHash được indexer ghép bằng transferId.

Không dùng luồng này để giả lập chuyển liên chuỗi. Chuyển sang chain khác cần ICTT hoặc cơ chế bridge có collateral và settlement được xác minh độc lập.

## 8. Chính sách theo loại Hũ

| Template | Quy tắc bắt buộc trong contract |
|---|---|
| SHIELD | Beneficiary rút nhanh trong giới hạn mỗi lần và cộng dồn mỗi ngày; khoản vượt giới hạn tạo request M/N. Không có đường fastWithdraw dùng chung cho các template khác. |
| MILESTONE | Guardian tạo task và giữ chỗ reward trước khi task được giao; assignee phải là beneficiary và không có quyền duyệt reward của chính mình; reward chỉ chi sau quorum; cancel giải phóng reservation đúng một lần. |
| ROSCA | round và thứ tự người nhận cố định trước khi nhận góp; mỗi thành viên góp đúng một lần/round và đúng amount; payout chỉ một lần khi đủ khoản và đến hạn; chu kỳ hữu hạn. Trước khi mở cho người dùng phải đặc tả rõ missed contribution, cancel và refund. |
| SHARED_GOAL | Cùng một kiểm tra target/deadline/quorum ở lúc request và execute; người nhận cố định; không có đường rút nhanh; phải chốt goal mở khóa một lần hay điều kiện lặp lại trước khi tạo Hũ. |

Wallet của trẻ/người già không có logic đặc biệt chỉ vì tuổi. Contract nhận Guardian/Beneficiary; PII, mời bằng referral code, đăng nhập và thông tin giám hộ thuộc hệ thống tài khoản riêng. Nếu account là custodial/embedded wallet thì người quản lý khóa và recovery phải được threat-model riêng.

## 9. Sự kiện và đồng bộ lịch sử

Các event tối thiểu nên chuẩn hóa: VaultCreated, MemberAdded/MemberRemoved, PolicyChanged, Deposited, WithdrawalRequested, WithdrawalApproved, WithdrawalCancelled/Expired, WithdrawalExecuted, ChoreCreated/Claimed/Approved/Rewarded/Cancelled, RoscaContributed, RoscaRoundPaid, VaultTransferOut/In, WalletRecovered, Paused/Unpaused.

Event cần có vault address (implicit từ log address), loại hành động, actor, request/operation ID, amount, recipient khi có, epoch hoặc version khi liên quan policy. Memo riêng tư chỉ lưu hash. Block number, timestamp, txHash và logIndex được lấy từ receipt/RPC để indexer lưu bằng chứng. Tối đa ba indexed fields ngoài signature topic; chọn vault/request/actor theo khả năng lọc.

Luồng đọc lịch sử: chain logs → worker từ deployment block đến finalized block → kiểm đúng factory/version/address → decode event → unique insert theo chain/contract/tx/log → cập nhật read model → API trả history kèm block/checkedAt/stale status. Retry chỉ replay index, không phát lại giao dịch tài chính. Nếu DB mất, có thể backfill từ event và state; DB không bao giờ là nguồn cấp phép rút.

## 10. Quản trị và bảo mật

- Guardian/Beneficiary được kiểm bằng mapping trong đúng vault clone. Danh sách phải chặn zero/duplicate và giới hạn kích thước; mọi quyền thay đổi qua đề xuất/duyệt, không sửa array/mapping lệch nhau.
- Membership epoch tăng khi thay ví/thành viên/quorum; request và chữ ký dùng epoch cũ không thực thi được. Request stale phải có đường permissionless giải phóng reservation.
- Operator/factory admin không được duyệt giao dịch hoặc đổi recipient. Quyền quản trị factory nên là multisig; upgrade không đổi code của clone cũ.
- Dùng checks-effects-interactions, ReentrancyGuard, custom errors, SafeCast khi thu hẹp kiểu; kiểm tra mọi đường chi, kể cả task, ROSCA, recovery và chuyển Hũ.
- Pause theo vault chỉ do quorum Guardian của Hũ. Pause phải có semantics rõ: chặn chức năng nào, request đang giữ tiền ra sao và ai được unpause. Global admin chỉ dừng tạo clone mới; không có quyền đóng băng/rút từng vault tùy ý.
- Không lưu ảnh/nội dung việc nhà, email hoặc tên thật trong event. Dữ liệu công khai là địa chỉ, số tiền, người nhận và thời điểm.

## 11. Tối ưu phí và độ phức tạp

1. Dùng clone EIP-1167 thay deploy bytecode đầy đủ cho từng Hũ; deploy implementation một lần mỗi version.
2. Dùng event log cho lịch sử; chỉ lưu request đang mở, role mapping, số dư và reservation cần kiểm soát trực tiếp.
3. Bỏ string name/reason trên chain; lưu metadata ngoài chain có quyền riêng tư và neo bằng configHash/memoHash nếu cần kiểm toàn vẹn.
4. Dùng uint256 cho amount wei để tránh giới hạn âm thầm; chỉ pack enum/version/timestamp nhỏ khi domain range được chứng minh.
5. Giữ native AVAX đơn giản ở V1. ERC20 phải có contract/asset allowlist, SafeERC20, accounting theo số token thực nhận, xử lý decimals/fee-on-transfer và kiểm toán riêng; không bật token tùy ý.
6. Không tối ưu gas bằng cách bỏ kiểm policy, bỏ event audit hoặc dùng proxy nâng cấp đồng loạt. So sánh gas của clone/template chỉ sau khi hoàn thiện invariant.

## 12. Lộ trình thay thế contract

### Phase A — Đặc tả

- Chốt schema của request, reservation, role/epoch, event, quyền pause và hành vi khi recipient revert.
- Chốt missed-contribution/default/refund cho ROSCA và semantics deadline của SHARED_GOAL.
- Chốt policy migration: Hũ cũ không tự động map sang clone mới.

### Phase B — Core native vault

- Viết IKinetixVault, KinetixVaultV1 implementation bất biến và KinetixVaultFactoryV1.
- Chuyển bốn policy vào contract clone; một sổ tiền duy nhất per vault.
- Giữ forwarder, ERC20, yield và Teleporter disabled.

### Phase C — Tích hợp ứng dụng

- Sinh ABI mới từ artifact; cập nhật deployment manifest theo factory/version/implementation.
- Cập nhật frontend để gọi đúng vaultAddress thay vì coi Hub là nơi giữ tiền.
- Cập nhật backend/worker nhận VaultCreated, quét event từng clone, đối soát receipt và chống replay.
- Giữ database làm read model; không tự sửa balance/member/quorum từ request HTTP.

### Phase D — Điều kiện trước testnet

- Kiểm thử invariant: liabilities được bảo chứng, không chi vượt policy, request không chi hai lần, reservation release đúng một lần, transfer giữa Hũ atomic, recovery vô hiệu quyền cũ, indexer replay không nhân đôi.
- Fuzz từng state machine; kiểm reentrancy, receiver revert, duplicate signer, hết hạn, member change khi request mở, ROSCA thiếu góp, task over-reservation.
- Compile/size check, static analysis, review deployment bytecode/codehash và diễn tập pause/recovery.
- Deploy factory + implementation mới trên Fuji bằng account test riêng; xác minh source, addresses, event và state trước khi bật manifest.

### Phase E — Dữ liệu và phiên bản cũ

- Không sửa database để gắn Hũ cũ vào địa chỉ mới.
- Đối soát từng Hũ cũ: chain, address, source/runtime code, số dư tài sản, nghĩa vụ và policy.
- Nếu có vốn cần chuyển, tạo kế hoạch migration theo từng Hũ, có phê duyệt người dùng và receipt từ contract cũ lẫn contract mới; không dùng số dư database làm bằng chứng.
- Để deployment T1 cũ disabled cho tới khi deployment mới và E2E Fuji được xác minh.
- Giữ FamilyHub/VaultCashflow T1 là deployment cũ; không thêm Hũ mới vào đó sau khi chuyển sang Factory V1.

## 13. Quyết định đề xuất

Triển khai **Factory + EIP-1167 clone riêng cho mỗi Hũ + một contract clone trực tiếp giữ AVAX**, dùng event logs cho lịch sử và indexer cho truy vấn. Loại VaultCashflow khỏi đường tiền mới; giữ FamilyYieldVault, bridge, ERC20 và relayer ngoài phạm vi V1. Mỗi lần rút phải do contract thực thi theo policy; database và UI chỉ phản ánh kết quả đã có receipt/event.

Đề xuất này chưa phải audit và chưa được triển khai. Các nguồn kỹ thuật chính cần tuân theo khi hiện thực hóa: [OpenZeppelin Clones](https://docs.openzeppelin.com/contracts/5.x/api/proxy#Clones), [OpenZeppelin ReentrancyGuard và tiện ích bảo mật](https://docs.openzeppelin.com/contracts/5.x/api/utils#ReentrancyGuard), [Solidity Events](https://docs.soliditylang.org/en/latest/contracts.html#events), [Avalanche ICTT overview](https://build.avax.network/docs/cross-chain/interchain-token-transfer/overview).

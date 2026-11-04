# KINETIX — Kế hoạch nâng cấp contract và hoàn thiện testnet

- Ngày lập: 04/11/2026.
- Trạng thái: kế hoạch triển khai; các hạng mục chưa đánh dấu chưa được thực hiện.
- Căn cứ: [báo cáo rà soát và kiểm thử](../CONTRACT_TESTNET_REVIEW.md).
- Phạm vi: Solidity, relayer, cấu hình mạng, database mapping, event worker, API và giao diện ký giao dịch.
- Mục tiêu: nạp/rút đúng hũ, đúng mạng, đúng quyền; bảo toàn tài sản; có bằng chứng giao dịch và quy trình phục hồi.

## 1. Kết luận hiện trạng

Luồng tài chính hiện tại chưa đủ điều kiện nghiệm thu testnet. Đánh giá này dựa trên mã và kết quả đối chiếu ngày 04/11/2026; phải chạy lại chẩn đoán khi môi trường thay đổi.

Lỗi `409 Conflict` tại `transaction-context?functionName=depositToVault&resourceId=1` xuất hiện trước khi ký: backend từ chối hũ chưa có mapping on-chain đã xác minh. Các hũ của workspace `ea1f9bdc-44b8-454d-a4d6-e2a171b6fd6d` thiếu `onchain_chain_id` và `onchain_hub`. Backend/frontend rơi về Family L1 `99999`, RPC không kết nối được. Hub được kiểm tra riêng trên Fuji có rule của hũ 1 là SHIELD, trong khi database ghi MILESTONE.

Không bỏ guard 409 hoặc cập nhật hàng loạt địa chỉ/chain để vượt lỗi. Sự trùng nhau của `vaultId` giữa hai deployment không chứng minh đó là cùng một hũ.

Đã hoàn thành trong đợt rà soát:

- [x] Kiểm tra Hub, Cashflow, YieldVault, Forwarder, relayer và deployment scripts.
- [x] Đối chiếu database/cấu hình và đọc RPC; không gửi giao dịch testnet.
- [x] Thêm phân loại lỗi mapping và chặn xác nhận nạp cho hũ chưa đối soát.
- [x] Thêm công cụ chỉ đọc `scripts/check-testnet.ts`.
- [x] Thêm 14 case tái hiện vấn đề tại `test/ContractReadinessAudit.test.ts`.

Các test tái hiện đang xanh vì xác nhận được hành vi sai. Khi sửa, phải chuyển chúng thành kiểm thử yêu cầu hành vi đúng; không giữ việc khai thác thành công làm tiêu chí đạt.

## 2. Phương án triển khai

Triển khai theo hai mốc độc lập:

1. **Mốc T1 — Fuji một chain:** Hub/Cashflow được sửa, triển khai mới và chạy nạp/rút thực bằng token testnet. Tắt luồng liên chuỗi và phần quảng bá lợi suất chưa có nguồn bảo chứng. T1 là bản testnet giới hạn, chưa hoàn thành kiến trúc hai chain.
2. **Mốc T2 — Family L1 và Fuji:** chỉ mở khi chuyển tài sản, xác nhận funding, chống xử lý trùng và đối soát hai chain đã được kiểm thử E2E.

Ưu tiên triển khai contract mới có version rõ ràng. Không giả định contract hiện tại hỗ trợ proxy upgrade. Kiểm kê quyền sở hữu, khả năng pause và tài sản thực tế trước khi chọn cách chuyển đổi deployment cũ.

## 3. Nguyên tắc bắt buộc

- Database xác định quyền truy cập ứng dụng; contract phải tự thực thi quyền tài chính. Ẩn nút trên giao diện không thay thế kiểm tra on-chain.
- Mọi số tiền dùng đơn vị nhỏ nhất bằng `bigint` hoặc chuỗi thập phân; không dùng JavaScript `number` để tính số tiền ký giao dịch.
- Hạn mức phải gắn với tài sản và decimals. Không coi 50 AVAX tương đương 50 USDC.
- Một yêu cầu chi trả chỉ được hoàn tất một lần, với tổng tiền đúng số được phê duyệt.
- Chỉ ghi nhận vốn ở chain đích khi có bằng chứng tài sản đã được nhận; trạng thái gửi message chưa phải trạng thái đã có vốn.
- Tổng tài sản bảo chứng phải đủ cho nghĩa vụ có thể rút; không dùng gốc của hũ khác để bù lãi.
- Khóa relayer riêng, có giới hạn ngân sách; không fallback sang khóa deployer.
- Mọi migration dữ liệu phải có bản đối chiếu trước/sau, khả năng chạy lại và phương án phục hồi.

## 4. Giai đoạn A — Chuẩn hóa cấu hình và đối soát dữ liệu

### A1. Manifest triển khai

- [ ] Tạo manifest theo môi trường và version, là nguồn cấu hình thống nhất cho backend, frontend, worker và scripts.
- [ ] Ghi: EVM chain ID, Avalanche blockchain ID khi dùng liên chuỗi, RPC công khai, explorer, địa chỉ Hub/Cashflow/YieldVault/Forwarder, deployment transaction, block triển khai, compiler và ABI/source version.
- [ ] Tách khóa bí mật và RPC chứa thông tin xác thực khỏi manifest công khai.
- [ ] Kiểm tra actual RPC chain ID, bytecode và các getter/quyền quản trị trước khi bật write API.
- [ ] Xóa fallback địa chỉ fixture và sửa các chú thích khẳng định deployment đã verified khi chưa có bằng chứng.
- [ ] Phân biệt trạng thái `configured`, `reachable`, `verified` và `enabled`; không suy trạng thái cuối từ việc có địa chỉ.

Các cấu hình hiện có cần đồng bộ: `HUB_CHAIN_ID`, `HUB_RPC_URL`, `FAMILY_HUB_ADDRESS`, `NEXT_PUBLIC_HUB_CHAIN_ID`, `NEXT_PUBLIC_FAMILY_HUB_ADDRESS`. Với Family L1, kiểm tra thêm `FAMILY_L1_CHAIN_ID`, `FAMILY_L1_RPC_URL`, `NEXT_PUBLIC_FAMILY_L1_CHAIN_ID`, `NEXT_PUBLIC_FAMILY_L1_RPC`. Chuẩn hóa tên biến trong quá trình triển khai và cập nhật `.env.example` tương ứng.

### A2. Mapping hũ có bằng chứng

- [ ] Kiểm kê từng hũ: workspace, ID database, ID contract, rule, creator, Guardians, beneficiaries, threshold, token, chain và Hub.
- [ ] Phân loại hũ seed, hũ chưa xác minh và hũ có tài sản; không xóa hũ có tài sản để làm sạch giao diện.
- [ ] Đăng ký hũ bằng receipt tạo hũ thành công: đúng chain, contract phát event, actor và tham số hũ.
- [ ] Với giao dịch được relayer gửi, xác minh signer/creator từ dữ liệu và event đúng mô hình forwarder; không mặc định `receipt.from` luôn là người dùng.
- [ ] Chống dùng lại receipt/log cho hũ hoặc workspace khác; thiết kế khóa duy nhất theo chain, contract và định danh event.
- [ ] Đối chiếu lại `getVault` và rule trước khi chuyển mapping sang verified.
- [ ] Bổ sung quy trình quản trị đối soát có bản xem trước thay đổi; hũ chưa xác minh tiếp tục bị chặn nạp/rút.

**Nghiệm thu A:** frontend/backend/worker dùng cùng deployment; RPC đúng mạng; doctor không còn blocker cấu hình; mỗi hũ được bật giao dịch có bằng chứng mapping. Doctor không có lỗi chưa đồng nghĩa contract đã an toàn.

## 5. Giai đoạn B — Sửa contract và relayer

### B1. FamilyHub: tồn tại hũ, loại hũ và quyền chi trả — P0

File chính: `contracts/FamilyHub.sol`.

- [ ] Deposit vào ID không tồn tại phải revert, không tự tạo hũ và không tăng counter.
- [ ] Xác thực creator/members theo mô hình quyền được chọn; từ chối địa chỉ zero, Guardian trùng và threshold không thể đạt.
- [ ] Chỉ cho SHIELD dùng luồng rút nhanh; áp hạn mức theo người nhận/tài sản/kỳ và tính cả giao dịch đã thực thi.
- [ ] Luồng rút ERC20 phải chịu cùng policy với native token; không dùng đường token để vượt quorum hoặc mục tiêu.
- [ ] `createChore` chỉ áp dụng MILESTONE; assignee đúng thành viên được phép, số thưởng hợp lệ và có đủ thanh khoản được giữ chỗ.
- [ ] Chốt policy tự duyệt nhiệm vụ, quorum thưởng và quyền sửa hạn mức; không cho một Guardian thay policy để vượt bảo vệ M/N.
- [ ] Chuẩn hóa state transition của request/chore; chặn duyệt, claim hoặc thực thi lặp, kể cả khi callback gọi lại.
- [ ] Goal chỉ giải ngân theo điều kiện đạt mục tiêu/hạn chót và policy hủy/hoàn tiền đã công bố.

**Nghiệm thu:** AUD-01/02/03/09/14 chuyển sang hành vi từ chối đúng; đường gọi trực tiếp contract và đường relayer có cùng giới hạn quyền.

### B2. Forwarder và relayer — P0

File chính: `contracts/KinetixForwarder.sol`, `backend/src/services/relayerService.ts` và API gọi relayer.

- [ ] Đánh giá thay forwarder tự viết bằng OpenZeppelin ERC2771Forwarder phiên bản cố định; cập nhật tương thích ABI, EIP-712 domain, nonce, deadline và trusted forwarder ở Hub.
- [ ] Với lời gọi đơn phải đối chiếu `msg.value` và giá trị request; nếu hỗ trợ batch phải xác minh tổng value/refund đúng semantics của thư viện. Không cho request tùy ý sử dụng số dư cũ.
- [ ] Forwarder và target phải thuộc manifest đang bật; kiểm tra target tin forwarder.
- [ ] Backend kiểm actual chain ID, signer gắn với session, nonce, deadline, chữ ký, workspace, vault và policy trước khi tài trợ.
- [ ] Allowlist selector cùng tham số nghiệp vụ; không coi selector được phép là đủ khi người gọi có thể đổi vault/recipient.
- [ ] Mặc định không tài trợ native value; nạp có value dùng ví người dùng, trừ khi có chính sách tài trợ riêng được thiết kế và nghiệm thu.
- [ ] Giới hạn gas, phí, request đang chờ và ngân sách theo người dùng/workspace/toàn hệ thống; mô phỏng trước gửi.
- [ ] Xử lý nonce đồng thời, retry có đối soát transaction hash; phân biệt nhận yêu cầu, đã broadcast và receipt thành công.
- [ ] Loại bỏ fallback khóa deployer; có cơ chế tắt tài trợ khi ngân sách hoặc cấu hình không hợp lệ.

**Nghiệm thu:** AUD-04/10 được sửa; request sai chain/target/selector/value/nonce/quyền bị từ chối trước broadcast; retry không tài trợ hai lần.

### B3. Cashflow và thay đổi nơi giữ vốn — P0

File chính: `contracts/VaultCashflow.sol`, `contracts/FamilyHub.sol`.

- [ ] Chốt một nơi giữ vốn và ledger có thẩm quyền cho từng mode; tránh hai contract cùng có thể chi cùng một nghĩa vụ.
- [ ] Cấm gắn/thay Cashflow khi đã có vốn, hoặc cung cấp migration nguyên tử có chuyển tài sản và ledger được kiểm chứng.
- [ ] Với chuyển đổi qua nhiều giao dịch, dùng trạng thái migration khóa write và đối soát từng bước; không gọi đây là thao tác nguyên tử.
- [ ] Kiểm tra controller/owner và quyền giải ngân trực tiếp. Để bảo đảm M/N, loại bỏ bypass đơn phương hoặc đưa quyền đặc biệt vào cơ chế quản trị tương ứng.
- [ ] Áp dụng checks-effects-interactions và bảo vệ reentrancy cho native/ERC20 withdrawal.

**Nghiệm thu:** AUD-11 được sửa; getter và tài sản thực khớp trước/sau chuyển đổi; không có đường chi vượt policy Hub qua Cashflow.

### B4. YieldVault và tài sản bảo chứng — P0

File chính: `contracts/FamilyYieldVault.sol`.

- [ ] Tách gốc, nghĩa vụ lãi đã ghi nhận, reserve trả lãi và vốn đang chuyển; định nghĩa invariant cho từng trạng thái.
- [ ] Compound chỉ được ghi tăng nghĩa vụ khi có nguồn bảo chứng tương ứng; reserve thiếu phải revert hoặc giữ ở trạng thái chưa được bảo chứng, không báo số tiền có thể rút.
- [ ] Không thanh toán lãi bằng gốc của hũ khác.
- [ ] Checkpoint lãi trước mỗi thay đổi gốc; xử lý phần dư làm tròn để khoản nạp mới không nhận lãi hồi tố.
- [ ] Làm rõ quyền sở hữu khoản nạp trực tiếp và quyền rút; tắt entry point không có mô hình sở hữu nhất quán.
- [ ] UI công bố rõ lợi suất mô phỏng từ reserve nếu dùng mô hình này; chỉ mô tả lợi suất thực khi có strategy và nguồn tiền kiểm chứng.

**Nghiệm thu:** AUD-05/06/12 được sửa; nhiều hũ, reserve bằng 0, rút đồng thời và giá trị rất nhỏ đều bảo toàn backing.

### B5. Recovery, ROSCA và ERC20 — P1, bắt buộc trước mở tính năng

- [ ] Recovery đồng bộ mapping và mảng members; xử lý pending requests, approvals, task assignees và recipients.
- [ ] Dùng phiên bản quyền hoặc cơ chế tương đương để vô hiệu chữ ký/approval cũ; không chuyển quyền nhạy cảm chỉ bằng thay địa chỉ hiển thị.
- [ ] ROSCA có round ID, thời hạn, số tiền phải góp, chống góp/chi trùng, điều kiện đủ kỳ và kết thúc chu kỳ.
- [ ] Định nghĩa thiếu khoản, thành viên rời nhóm, pause, hủy và hoàn tiền; không tự chọn policy khi triển khai mà không ghi vào đặc tả.
- [ ] Giữ chỗ phần thưởng nhiệm vụ; hủy/từ chối/chi trả giải phóng reservation đúng một lần.
- [ ] Dùng SafeERC20; test decimals 6 và 18. Từ chối token fee-on-transfer/rebasing mặc định cho tới khi có accounting tương ứng.
- [ ] Vai trò CHILD/beneficiary và giới hạn người nhận phải được contract thực thi nếu đây là cam kết của sản phẩm.

**Nghiệm thu:** AUD-13 được sửa; ví cũ không còn quyền hoặc nhận payout sau recovery; policy ROSCA/token/CHILD có test gọi trực tiếp contract.

## 6. Giai đoạn C — Hoàn thiện API, worker, UI và chạy T1

### Đồng bộ giao dịch

- [ ] API trả lỗi có mã ổn định: chưa đối soát, sai mạng, sai Hub, thiếu quyền, RPC không sẵn sàng và contract revert; không biến mọi lỗi thành 500.
- [ ] `transaction-context` chỉ trả context từ deployment verified, đúng workspace và đúng tài nguyên.
- [ ] Backend xác minh receipt/event/amount/asset/recipient thay vì tin số dư hay trạng thái frontend gửi lên.
- [ ] Worker bắt đầu từ deployment block, lưu checkpoint, chống event trùng và hỗ trợ replay; xử lý log bị loại/reorg theo đặc tính mạng.
- [ ] Indexing lỗi phải có retry/đối soát; không báo giao dịch thất bại chỉ vì API chưa đồng bộ kịp.

### Giao diện

- [ ] Phân biệt: hũ chưa sẵn sàng, cần đổi mạng, chờ ký, đã gửi, receipt thành công, đang đồng bộ, hoàn tất và thất bại.
- [ ] Trước ký hiển thị đúng hũ, tài sản, số tiền và mạng; người dùng từ chối ký có thể thử lại.
- [ ] Dùng parseUnits/formatUnits theo tài sản; bỏ tính toán tiền bằng số thực và quy đổi USD cố định.
- [ ] Explorer lấy từ manifest; không ghép mọi transaction vào Fuji explorer khi Hub ở mạng khác.
- [ ] Tắt thông báo vốn đã chuyển C-Chain hoặc sinh lãi thực khi T1 chưa triển khai chức năng đó.
- [ ] Người già/trẻ em có thông báo dễ hiểu; chi tiết kỹ thuật nằm trong phần mở rộng khi cần xử lý lỗi.

### Triển khai T1

- [ ] Hoàn tất A và các mục B áp dụng cho tính năng được bật; tính năng chưa đạt bị tắt ở cả backend và contract bằng cơ chế phù hợp.
- [ ] Deploy mới trên Fuji, lưu manifest/receipt, cấu hình quyền, xác minh code và export ABI từ đúng artifact.
- [ ] Tạo hũ mới bằng giao dịch thực, đăng ký qua receipt và đối soát mapping; không tái sử dụng ID seed theo suy đoán.
- [ ] Chạy Core desktop/mobile: tạo hũ → nạp → receipt → API/worker sync → rút đúng policy → kiểm số dư.
- [ ] Thử lỗi từ chối ký, sai mạng, RPC gián đoạn, API trễ, click lặp và refresh trang.

**Nghiệm thu C/T1:** lưu transaction hash, chain, block, receipt và kết quả đối soát cho từng kịch bản; không còn P0 trong phạm vi tính năng được bật. Local test/build xanh chưa thay thế bằng chứng này.

## 7. Giai đoạn D — Chuyển tài sản hai chain và chạy T2

- [ ] Chuẩn bị Family L1 có RPC, validator và quyền gửi giao dịch thực; lấy Avalanche blockchain ID thật. Không hash EVM chain ID để thay blockchain ID.
- [ ] Thử nghiệm ICTT TokenHome/TokenRemote hoặc adapter tương đương trước khi chốt thiết kế; xác định native/wrapped/token representation và decimals.
- [ ] Dùng interface ICM/Teleporter chính thức theo version cố định; xác thực cả blockchain nguồn và contract gửi thực tế.
- [ ] Thống nhất sender Hub/Cashflow; mô hình xác thực ở receiver phải khớp kiến trúc đã chọn.
- [ ] Operation có ID duy nhất, nguồn/đích, vault, asset, amount, recipient và trạng thái được persist.
- [ ] Thiết kế trạng thái tối thiểu: khởi tạo → tài sản đã khóa/gửi → đã nhận tại đích → đã hạch toán → hoàn tất. Thất bại/chờ/hoàn tiền có quy tắc riêng.
- [ ] Rút chỉ có một điểm trả tiền cuối cùng. Nếu thiếu thanh khoản, chuyển trạng thái chờ thay vì vừa trả đủ tại Hub vừa yêu cầu YieldVault trả thêm.
- [ ] Duplicate, replay, message đảo thứ tự hoặc callback lặp không thay đổi nghĩa vụ lần hai.
- [ ] Timeout không tự động hoàn tiền khi chưa loại trừ khả năng chain đích đã nhận/chi; cần đối soát và protocol phục hồi rõ ràng.
- [ ] Mock phải cho phép quan sát lỗi receiver; thêm integration test trên hai mạng độc lập và kiểm tổng tài sản trước/sau.

**Nghiệm thu D/T2:** AUD-07/08 được sửa; cả happy path và message trễ/thất bại/retry đều có E2E receipt hai chain, không tạo vốn giả và không chi hai lần.

## 8. Ma trận hồi quy bắt buộc

| Bằng chứng hiện tại | Hành vi cần đạt sau nâng cấp | Giai đoạn |
|---|---|---|
| AUD-01 | Nạp vào hũ chưa tồn tại revert, không tạo ledger/counter | B1 |
| AUD-02 | SHARED_GOAL chưa đủ điều kiện không được fast native withdrawal | B1 |
| AUD-03 | Token không vượt policy hạn mức/quorum/goal | B1, B5 |
| AUD-04 | Request không sử dụng được số dư cũ của forwarder | B2 |
| AUD-05 | Compound không tạo nghĩa vụ thiếu bảo chứng | B4 |
| AUD-06 | Khoản nạp mới không nhận lãi của thời gian trước nạp | B4 |
| AUD-07 | Một yêu cầu rút chỉ trả đúng số tiền được duyệt | B3, D |
| AUD-08 | Sender đúng và funding được xác nhận trước khi ghi remote principal | D |
| AUD-09 | Duplicate/zero Guardian và threshold bất khả thi bị từ chối | B1 |
| AUD-10 | Relayer từ chối chain/forwarder/target/value ngoài policy | B2 |
| AUD-11 | Đổi Cashflow không làm mất khả năng truy xuất vốn/ledger | B3 |
| AUD-12 | Trả lãi không lấy gốc bảo chứng của hũ khác | B4 |
| AUD-13 | Recovery không để ROSCA trả về ví bị thu hồi | B5 |
| AUD-14 | Chore không vượt M/N của hũ SHIELD | B1 |

Test bổ sung phải bao phủ authorization âm, replay, reentrancy, pause, race approvals, boundary hạn mức, decimals, reservations và event/receipt không hợp lệ. Các tính năng tắt ở T1 phải có test chứng minh không gọi được.

## 9. Migration, chuyển đổi và phục hồi

1. Kiểm kê và xuất bản đối chiếu deployment, vault, role và tài sản; sao lưu database theo quy trình vận hành, không đưa dữ liệu bí mật vào repository.
2. Tách hũ seed khỏi hũ có tiền; lập bảng mapping cũ/mới và cách xử lý tài sản cho từng hũ.
3. Thử migration trên database cô lập và mạng local; kiểm số bản ghi/quyền/số dư trước và sau.
4. Deploy mới, xác minh code và quyền. Chưa chuyển traffic khi manifest/mapping chưa đạt.
5. Chuyển cấu hình theo deployment version; worker có checkpoint và phạm vi contract rõ ràng.
6. Chỉ chuyển tài sản khi có cơ chế hợp lệ và quyền cần thiết; không sửa ledger database để giả lập việc chuyển on-chain.
7. Nếu nghiệm thu thất bại, ngừng mở giao dịch mới và đối soát giao dịch đã gửi. Đổi cấu hình về bản trước không đảo ngược transaction đã mined; không chuyển người dùng về deployment có lỗi đã biết.

## 10. Lệnh kiểm tra và bằng chứng bàn giao

Các lệnh tham khảo, chạy trên môi trường đúng mục đích:

```powershell
npm run compile
npm run sol:lint
npx hardhat test test/Kinetix.test.ts test/SecurityHardening.test.ts test/ChainReceipt.test.ts test/KinetixAdvancedFlows.test.ts
npx hardhat test test/ContractReadinessAudit.test.ts
npm run test:auth
npm run typecheck
npm --prefix frontend run build
npm run check:testnet -- --workspace ea1f9bdc-44b8-454d-a4d6-e2a171b6fd6d
```

Chỉ chạy test DB integration và migration trên database test cô lập trước. Doctor hiện có thể trả exit code 1 do cấu hình chưa đạt; đây là tín hiệu cần xử lý. Sau khi thay deployment phải dùng workspace đã đối soát tương ứng.

Hồ sơ bàn giao cho từng mốc:

- [ ] Source commit/version, ABI và manifest không chứa bí mật.
- [ ] Danh sách thay đổi quyền, schema, cấu hình và tính năng bật/tắt.
- [ ] Kết quả regression, invariant và integration; ghi rõ test bị skip cùng lý do.
- [ ] Receipt triển khai, wiring, tạo hũ và giao dịch E2E.
- [ ] Bảng đối chiếu tài sản/ledger, mapping và quyền quản trị.
- [ ] Hướng dẫn vận hành, pause, cảnh báo relayer/reserve, replay worker và phục hồi.
- [ ] Danh sách vấn đề còn lại; không chấp nhận P0 đang mở trong phạm vi được bật.

## 11. Phụ thuộc, ước lượng và thứ tự thực thi

Thứ tự: **A → B → C/T1 → D/T2 → nghiệm thu toàn hệ thống**. Có thể thiết kế bridge trong lúc sửa B, nhưng chỉ bật giao dịch sau khi các điều kiện phụ thuộc đã đạt.

Ước lượng ban đầu: A–C khoảng 7–12 ngày công; D và nghiệm thu hai chain thêm 10–20 ngày công, phụ thuộc hạ tầng L1, tài sản và kết quả thử nghiệm bridge. Đây là ước lượng lập kế hoạch, cần điều chỉnh sau khi chốt policy và thiết kế kỹ thuật.

Các quyết định phải được ghi nhận trước khi triển khai phần liên quan:

- Tài sản đầu tiên được hỗ trợ và đơn vị hạn mức.
- Quyền đặc biệt của owner/admin, quorum và cơ chế thay policy.
- Quy tắc nhiệm vụ, ROSCA, goal, recovery và người dùng CHILD.
- Lợi suất mô phỏng bằng reserve hay strategy có tài sản thực.
- Chain nhận tiền cuối cùng khi rút, bridge và quy trình xử lý giao dịch dở dang.

Tài liệu này mô tả công việc nâng cấp; không xác nhận các hạng mục chưa đánh dấu đã được sửa hoặc deployment hiện tại đã an toàn.

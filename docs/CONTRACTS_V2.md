# Contracts V2: quỹ hoạt động và quỹ mục tiêu

V2 là phiên bản contract riêng được triển khai trong source, không nâng cấp T1/V1. Chưa có deployment public hoặc adapter backend/frontend V2 được kích hoạt. Chỉ hỗ trợ native AVAX trên chain triển khai. Đây không phải kết quả kiểm toán độc lập.

## Thành phần

| Contract | Trách nhiệm |
| --- | --- |
| `KinetixFundFactoryV2` | Tạo implementation bất biến trong constructor, clone và initialize nguyên tử, registry fundId/address |
| `KinetixFundV2` | Giữ tiền riêng, quyền theo quỹ, góp/chi, reservation, governance và hoàn mục tiêu thất bại |
| `IKinetixFundV2` | Types, lỗi, events và giao diện nghiệp vụ; ABI riêng với V1 |

Factory không có owner, quyền pause toàn hệ thống hay quyền rút tiền. `creator` chỉ là provenance, không được cấp quyền ngầm. Không có proxy upgrade, generic external call, ERC20, yield, cross-chain hoặc relayer. Clone trỏ cố định tới implementation của factory; không nhận implementation tùy ý từ người triển khai.

## Cấu hình và quyền

`InitParams` gồm kind, goalTarget, goalDeadline, termsHash, policy và members. `termsHash` bắt buộc khác zero; ứng dụng phải lưu/hiển thị điều khoản tương ứng trước khi góp. Contract không kiểm chứng nội dung off-chain đúng sự thật. `FundCreated.configurationHash = keccak256(abi.encode(params))` cho phép đối chiếu đúng cấu hình đã ký.

Permissions là bitmask: PROPOSE=1, APPROVE=2, SPEND=4; có thể kết hợp. `dailyAllowance` chỉ dành cho SPEND. Tối đa 32 địa chỉ không trùng, không zero và không là chính quỹ. Không có quyền theo tuổi, loại nhóm hoặc số tiền góp. Mọi người có thể góp qua deposit; contributor không tự trở thành member.

Policy gồm quorum, transactionLimit, dailyLimit. Ít nhất hai approver và `1 <= quorum < số approver`; như vậy vẫn có đủ phiếu độc lập khi người nhận là một approver. Quorum 1 cho phép một người duyệt khoản trả cho bên khác; ứng dụng cần hiển thị rõ và có thể khuyến nghị 2/3. Không quảng cáo mọi quỹ đều là 2/3.

Contract chỉ phân biệt địa chỉ, không chứng minh mỗi địa chỉ thuộc một người độc lập. Quorum thông đồng vẫn có thể chi tiền hoặc thay quyền theo chính sách; không có bảo đảm chống thông đồng hoặc phục hồi khi không còn đủ người ký.

## Luồng tiền

`deposit(referenceHash)` nhận AVAX và ghi contribution của `msg.sender`. Không có deposit thay tên người khác. Plain transfer bị từ chối để tránh mất định danh. Chứng từ/mô tả riêng tư không đưa vào hash dưới dạng dữ liệu rõ; hash của thông tin dễ đoán vẫn có thể bị dò.

`proposeExpense(recipient, amount, deadline, memoHash)` yêu cầu PROPOSE, giữ chỗ ngay và chốt người nhận/số tiền/epoch. Hạn phải ở tương lai và không quá 30 ngày. Quỹ mục tiêu chỉ cho đề nghị sau khi đạt mục tiêu. Không có sửa đề nghị hoặc đổi người nhận sau duyệt.

`approveExpense(id)` yêu cầu APPROVE, mỗi địa chỉ một phiếu, người nhận không được duyệt. Người đề nghị có quyền APPROVE vẫn có thể duyệt nếu không phải người nhận. Đủ phiếu không tự chuyển tiền. Bất kỳ ai gọi `executeExpense(id)` sau quorum để trả đúng người nhận cố định, không có execution fee.

Người đề nghị tự `cancelExpense`; một approver khác người nhận có thể `rejectExpense`, kể cả đã đủ phiếu nhưng chưa thực thi. Cơ chế veto này ưu tiên kiểm soát chi; một approver có thể làm chậm luồng bằng cách từ chối. Quorum có thể thay danh sách qua governance, nhưng không thể bảo đảm liveness khi không còn đủ người ký hợp tác.

`settleExpense` cho mọi người dọn yêu cầu hết hạn hoặc mất hiệu lực. Hết hạn có hiệu lực ở `timestamp >= deadline`; reservation cùng epoch được giải phóng khi cleanup. Quỹ không tự chạy theo đồng hồ: client/worker cần gọi cleanup nếu muốn lấy lại số khả dụng của các khoản hết hạn.

`spend` chỉ cho OPERATING và SPEND. Áp dụng đồng thời transactionLimit, allowance theo thành viên và tổng dailyLimit của quỹ; ngày là UTC `block.timestamp / 86400`, không phải cửa sổ 24 giờ trượt. Có thể chi sát hai phía ranh giới ngày; UI không được mô tả đây là rolling limit. Không dùng số dư đã giữ chỗ. Các khoản được quorum duyệt không chịu hạn mức chi nhanh này.

## Quỹ mục tiêu

Target và deadline cố định lúc tạo. GOAL không có SPEND hoặc hạn mức chi nhanh. Chỉ nhận góp trước deadline. Khi số dư ghi nhận đạt target, `goalReached` giữ true vĩnh viễn; sau đó chi vẫn cần quorum nhưng không cần giữ số dư luôn lớn hơn target. Deadline là hạn nhận góp, không phải hạn bắt buộc giải ngân.

Nếu chưa từng đạt target mà hết hạn, `refundFailedGoal()` trả toàn bộ contribution còn ghi nhận cho chính caller. Không ai đổi người nhận hoàn hoặc lấy phần góp của người khác. Không có chi trước target nên các claim có đủ backing; forced surplus không làm target thành công. Pause chặn cả refund; quorum vẫn có thể resume. Ví contract không nhận được AVAX cần khôi phục khả năng nhận ở ví đó; không có admin đổi nơi nhận claim.

Sau khi đạt target, không có quyền hoàn tự động hoặc sở hữu theo tỷ lệ. Quỹ hoạt động cũng không có quyền hoàn tự động. Refund/tiền dư của các quỹ này phải qua chi được duyệt theo điều khoản. Không có shares, lợi nhuận hoặc tự động chia số dư khi rời nhóm.

## Quản trị và phục hồi

`proposePolicy(policy, members, termsHash)` thay toàn bộ danh sách quyền và chính sách bằng quorum hiện hành. Đề xuất không có phiếu tự động. Sau phiếu đạt quorum, chờ đủ 24 giờ; proposal hết hạn sau 7 ngày từ lúc tạo. Nếu đạt quorum quá muộn, proposal có thể hết hạn trước khi hết timelock và cần tạo lại. Target/deadline/kind không thay đổi.

Apply policy tăng `policyEpoch`. Tất cả đề nghị chi và governance cũ chưa hoàn tất mất hiệu lực, reservation của epoch cũ được giải phóng O(1). Daily counters không bị reset, contribution/refund claim không đổi. Recovery ví mất là policy thay địa chỉ bằng quorum cũ; không có đường backdoor nếu mất quorum.

`proposeAction` hỗ trợ PAUSE, RESUME, CLOSE, SURPLUS. Pause/resume cần quorum nhưng không timelock; nonce trạng thái vô hiệu hóa các lệnh pause/resume cũ sau mỗi lần chuyển trạng thái. Pause chặn deposit, duyệt/thực thi chi, chi nhanh, refund và surplus; không chặn governance, hủy/từ chối hoặc cleanup. Resume được quorum, không do một admin.

Close cần quorum + 24 giờ, quỹ không pause, accountedBalance=0 và reservedBalance=0. Không mở lại. Surplus bị ép gửi vào quỹ có thể trả kể cả sau close bằng proposal riêng: cần quorum độc lập với người nhận, 24 giờ, kiểm lại surplus lúc thực thi. Không thể dùng đường này lấy tiền đã ghi sổ. Token ERC20 gửi nhầm không được hỗ trợ thu hồi.

Mọi governance có thể bị người đề xuất hủy hoặc approver độc lập từ chối. Policy mới vô hiệu hóa governance cũ; close vô hiệu hóa proposal không phải surplus. `settleGovernance` ghi nhận trạng thái hết hạn/vô hiệu một lần.

## Accounting và tích hợp

Invariant: `reservedBalance <= accountedBalance <= address(fund).balance`. `availableBalance = accountedBalance - reservedBalance`. Không có nghĩa vụ pull-payment tách khỏi accountedBalance. Transfer thất bại revert toàn bộ state/event; dùng CEI và nonReentrant cho mọi entrypoint thay state sau initialize.

Đọc `getExpense`/`getGovernance` để có effective status: NONE, PENDING, APPROVED, EXECUTED, CANCELLED, REJECTED, EXPIRED, INVALIDATED. Không suy ra thành công từ số phiếu. `PolicyApplied` làm mất hiệu lực nhiều yêu cầu trong một event, không phát từng ExpenseFinalized; indexer phải cập nhật theo epoch và có thể rebuild từ event + state.

Khóa dữ liệu: chainId + fundAddress + entityType + localId; khóa event thêm txHash/logIndex. `referenceHash`/memoHash không phải idempotency key và có thể lặp. Backend/client phải lưu transaction intent/hash để không tạo lại proposal/deposit khi timeout; V2 không có `clientRequestId` chống gửi trùng ở cấp nghiệp vụ. Một expense ID không thể thực thi hai lần. Phải xác minh factory registry, chain, code identity, receipt và finality trước khi đánh dấu thanh toán.

ABI xuất chung bằng `npm run export:abis`: `KINETIX_FUND_V2_ABI` và `KINETIX_FUND_FACTORY_V2_ABI` trong shared/frontend. Việc có ABI không bật adapter mới. Client dùng bigint/wei, mô phỏng giao dịch, hiện đúng termsHash/policy, số tiền/người nhận/mạng/phí trước ký. Không có chữ ký off-chain hoặc gas sponsorship riêng trong V2; phí mạng vẫn cần AVAX.

## Triển khai và kiểm tra

```bash
npm run compile
npx hardhat test test/KinetixFundV2.test.ts
npm run export:abis
npx hardhat run scripts/deploy-fund-v2.ts --network hardhat
```

Script chỉ cho chain 31337 hoặc Fuji 43113, ghi evidence riêng với `enabled: false`, không sửa `shared/deployment.json`. Local Hardhat deployment chỉ là rehearsal và mất state khi tiến trình kết thúc. Khi chủ động triển khai Fuji, cần signer/RPC đúng và xác minh độc lập source/bytecode/receipt canonical; script kiểm receipt và code presence, chưa phải công cụ xác nhận đầy đủ.

Nếu Windows chặn subprocess của `hardhat run` với `spawn EPERM`, có thể chạy rehearsal trong cùng tiến trình sau khi compile: `node -r ts-node/register scripts/deploy-fund-v2.ts`. Lệnh này dùng mạng Hardhat mặc định; không dùng làm lệnh thay thế triển khai Fuji nếu chưa cấu hình/chọn mạng một cách rõ ràng.

Quỹ T1/V1 cũ không tự biến thành V2. Tạo V2, đối chiếu quyền, chuyển tài sản bằng luồng hợp lệ của quỹ cũ và đối soát hai đầu; không đổi mapping database để giả lập migration. Chưa triển khai public, chuyển tài sản hoặc audit trong nhiệm vụ này.

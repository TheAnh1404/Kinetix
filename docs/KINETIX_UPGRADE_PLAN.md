# Kinetix — Kế hoạch nâng cấp có tiêu chí nghiệm thu

Ngày lập: 04/11/2026. Căn cứ: [báo cáo rà soát](KINETIX_REVIEW_2026-11-04.md).

## 1. Giả định và thứ tự triển khai

Mục tiêu: một beta testnet có số dư, quyền và giao dịch kiểm chứng được; sau đó mới đánh giá mức sẵn sàng dùng tiền thật. Giữ định hướng Family L1 + C-Chain. Triển khai SHIELD/MILESTONE xuyên suốt trước, rồi hoàn thiện ROSCA/SHARED_GOAL.

Đây là kế hoạch đề xuất, chưa phải thay đổi đã triển khai. Các ước lượng là ngày công kỹ thuật, không phải cam kết tiến độ; phụ thuộc hạ tầng L1, lựa chọn signer, giao thức yield và kết quả audit. Không tính thời gian chờ đối tác, audit độc lập hoặc đánh giá pháp lý sản phẩm.

## 2. Bảng công việc chi tiết

| Mã / ưu tiên | Công việc và phạm vi | Đầu ra cụ thể | Phụ thuộc | Phụ trách phù hợp | Ngày công | Tiêu chí nghiệm thu |
|---|---|---|---|---|---|---|
| A / P0 | Cô lập credential, khóa các API thiếu guard và endpoint family-login; bỏ secret fallback, chặn tự nâng role | Bản vá bảo mật, env validation, danh mục secret cần thay, HTTP regression tests | Không | Full-stack/security | 6–9 | Request không session trả 401; sai tenant/quyền trả 403; thiếu secret không khởi động; profile không đổi role; không còn credential cụ thể trong mã mới |
| B / P1 | Chốt authority, threat model và trust model; hợp nhất schema/service/package; registry chain/deployment | ADR, permission matrix, typed domain DTO và registry | A | Tech lead/full-stack | 4–6 | Một nguồn schema; một luồng nghiệp vụ; role theo workspace; mọi vault có khóa chain + contract + ID |
| C / P0 | Sửa policy contracts, auto-init, guardian trùng, recovery; loại owner bypass ngoài thiết kế; chuẩn ngân sách SHIELD và expiry/timelock | Contract v2, migration/deployment design, invariant tests | B | Solidity engineer | 10–15 | Không rút SHARED_GOAL qua fast/chore; chỉ MILESTONE có chore; vault không tồn tại bị từ chối; recovery cập nhật đầy đủ; quorum theo signer hợp lệ |
| D / P0 | Thiết kế và tích hợp asset bridge/settlement; chain ID và blockchain ID thật; sender đúng; ACK/retry | Bridge adapter, cấu hình L1/relayer, deployment manifest, bài test hai chain | B, C | Web3 infrastructure | 10–16 | Nạp 100 chỉ tạo đúng 100 nghĩa vụ được bảo chứng; rút 70 tổng chỉ chi 70; đích lỗi/chậm không xác nhận giả; retry không chi trùng |
| E / P0 | Thay mô hình yield; adapter giao thức hoặc reserve trợ cấp rõ ràng; liquidity/risk caps | Yield interface, accounting specification, giới hạn và thông tin lợi suất | C, D | Solidity/DeFi engineer | 6–10 | Không compound/chi lãi vượt tài sản bảo chứng; không dùng principal hũ khác trả lãi; APY/APR hiển thị đúng mô hình; rút khi thiếu thanh khoản có trạng thái rõ |
| F / P1 | Migrations chuẩn, precision bigint, unique/index/FK; event log, cursor, backfill, idempotency, reconciliation | Shared database package và indexer có phục hồi | B, C; tích hợp cuối với D/E | Backend/data engineer | 7–11 | DB rỗng migrate thành công; nâng schema không mất dữ liệu; replay log không đổi kết quả; worker restart bắt đủ event; cache khớp chain |
| G / P1 | Hợp nhất lớp Web3 và API client; tách FamilyContext; receipt status, event IDs, error/timeout states | Transaction state machine và typed hooks được UI dùng thực sự | C, F; hoàn thiện cross-chain sau D/E | Frontend Web3 engineer | 8–12 | Từ chối ký/revert không báo thành công; ID lấy từ event; signer đúng session; không PATCH balance từ client; đổi account/chain/workspace không lẫn dữ liệu |
| H / P1 | SIWE chuẩn, nonce nguyên tử, hash PIN + hạn chế thử; session revocation; passkey/embedded signer có recovery | Auth service thống nhất, key ownership specification, flow ký/khôi phục | B, C, G | Identity/Web3 security | 7–12 | Replay/nonce sai/domain sai bị từ chối; PIN không lưu rõ; user có signer dùng được; mất thiết bị khôi phục đúng thiết kế; không sinh rồi bỏ khóa |
| I / P1–P2 | Dọn dữ liệu giả; hoàn thiện ROSCA/goal; UI responsive và trợ năng; notification/audit thật | Empty/loading/error states, sổ giao dịch thật, flow theo vai trò | C–H | Product/frontend | 4–7 | User mới có số dư 0; không video/hash/latency xác minh giả; guardian duyệt được đúng hũ; ROSCA theo kỳ thực và contribution ledger; số dư/tiền tệ nhất quán |
| J / P1 | HTTP integration, fuzz/invariant, E2E, CI, dependency upgrades, deployment/runbooks/monitoring; chuẩn bị audit độc lập | Release pipeline, bộ regression, dashboard vận hành và incident drill | Tích hợp A–I | QA/security/DevOps | 8–12 | Build/lint/typecheck/test tự động; kiểm thử hai chain pass; không còn P0/P1 ảnh hưởng tài sản/quyền chưa xử lý; có diễn tập pause, khôi phục indexer và restore DB |

Tổng cơ sở: **70–110 ngày công**. Một người làm tuần tự tương đương khoảng **14–22 tuần làm việc**, nên dành thêm khoảng 20% dự phòng, thành **17–27 tuần**. Nhóm 3 người có năng lực Solidity, backend và frontend phù hợp có thể lên lịch khoảng **10–14 tuần**, nhưng cần lập lại lịch sau khi chốt D/E/H; không chia đơn giản tổng ngày công cho số người.

Hạng mục I chỉ khả thi trong 4–7 ngày nếu tập trung sửa flow trên giao diện hiện có; thiết kế lại toàn bộ UI hoặc xây dịch vụ video xác minh sẽ là phạm vi bổ sung. Hạng mục J gồm chuẩn bị audit và xử lý vòng lỗi nội bộ, chưa bao gồm thời gian/công của đơn vị audit ngoài.

## 3. Mốc bàn giao và điều kiện chuyển giai đoạn

| Mốc | Nội dung review được | Điều kiện hoàn tất |
|---|---|---|
| M0: đóng lỗ hổng truy cập | A và permission matrix ban đầu | Không còn đường cấp session thiếu xác thực, sửa balance không quyền hoặc tự nâng role |
| M1: lõi tài sản đúng | C và mô hình D/E đã chốt | Regression cho mọi phát hiện contract, invariant tài sản và policy đều pass |
| M2: luồng hai chain đúng | D/E/F trên môi trường testnet riêng | Nạp/rút có asset receipt, ACK, retry; nguồn và đích đối soát được; lỗi relayer không gây trả trùng |
| M3: beta cho người dùng thử | G/H/I | SHIELD và MILESTONE chạy đầu-cuối bằng signer thật; user mới, ví mới và khôi phục thiết bị đều hoạt động |
| M4: ứng viên phát hành | J và hoàn thiện ROSCA/goal | Review bảo mật độc lập phù hợp phạm vi; xử lý phát hiện; giới hạn TVL/quyền rõ; vận hành có cảnh báo và runbook |

Không chuyển qua mốc kế tiếp chỉ vì UI hiển thị đúng hoặc unit test happy path xanh. Công việc chuẩn bị độc lập có thể làm đồng thời, nhưng tích hợp phải tôn trọng các điều kiện trên.

## 4. Backlog nghiệm thu bắt buộc

| Nhóm | Tình huống cần kiểm tra |
|---|---|
| Auth | Không session, JWT sai, user bị thu hồi, thiếu/sai/hết hạn/tái dùng nonce; domain/URI/chain sai; PIN brute force; đổi PIN cần xác thực lại |
| Quyền | Gia đình A không đọc/sửa dữ liệu B; guardian hũ A không duyệt hũ B; preference không đổi quyền; tài khoản rời workspace mất quyền API |
| Nạp tiền | Vault không tồn tại; ID bị gán trùng; receipt revert; RPC timeout; worker cùng client quan sát một giao dịch; tiền 1 wei; nạp trực tiếp ngoài Hub |
| Rút tiền | Số tiền âm/0/ngoài phạm vi; chia nhỏ vượt ngân sách; ký trùng; thiếu quorum; thiếu đệm; quá hạn; recipient lỗi; không đủ tài sản ở đích |
| Cross-chain | Sai sender/chain; gửi thành công nhưng xử lý đích thất bại; tài sản tới trước/sau message; replay/retry; đích pause; ACK chậm; đối soát tổng tài sản |
| Yield | Reserve 0/thiếu; compound nhiều lần; principal về 0 rồi nạp lại; rounding; liquidity unavailable; giới hạn rủi ro và không ăn vào vốn hũ khác |
| Recovery | Đổi guardian/beneficiary/creator; recipient và task cũ; ROSCA sau đổi ví; yêu cầu chồng lấn, hết hạn, hủy, trùng địa chỉ |
| Dữ liệu | Event trùng/ngược thứ tự; restart; reorg theo finality policy; deploy contract mới; migration từ DB rỗng và bản cũ; restore/backfill cho kết quả giống nhau |
| UI/E2E | Thiết bị nhỏ, keyboard/screen reader, loading/error/empty, nhiều workspace, đổi ví/mạng, refresh sau xác nhận, browser mất kết nối |

## 5. Các quyết định cần chốt trong thiết kế

1. Tài sản gốc là native AVAX hay stablecoin; nếu tiếp tục AVAX, loại bỏ nội dung USDC còn sót và công khai rủi ro biến động. Không tự chuyển asset chỉ bằng đổi nhãn.
2. Family L1 có hạ tầng thật, operator/validator và nguồn phí nào; bằng chứng genesis/precompile/relayer/deployment phải được quản lý cùng release.
3. Quyền tối cao có được phép chi tài sản hay chỉ pause/config; owner có multisig, timelock và hạn mức nào.
4. Lợi suất từ giao thức nào, ai chịu rủi ro/thanh khoản, hay chỉ là chương trình trợ cấp testnet với reserve hữu hạn.
5. Passkey điều khiển smart account, signer nhúng hoặc giải pháp custody nào; quy trình recovery và chi phí vận hành tương ứng.
6. ROSCA là quỹ xoay vòng đã góp đủ, không được mô tả như bảo đảm tín dụng nếu chưa có cơ chế xử lý người ngừng đóng.

Không thêm token riêng, NFT, DAO, AI chấm điểm hay kiến trúc microservices trước khi các quyết định và luồng tài sản tối thiểu này hoàn tất.

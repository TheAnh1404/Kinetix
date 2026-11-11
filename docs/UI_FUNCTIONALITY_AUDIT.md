# Rà soát chức năng và giao diện — 2026-11-11

Đối chiếu App Router, components, hooks, các router Express và hai thế hệ hợp đồng. Phạm vi triển khai giao diện trong đợt này là các nghiệp vụ đã có API xác thực/đối soát; không triển khai hợp đồng hoặc thay đổi dữ liệu tài chính thật.

| Nhóm chức năng | Giao diện sử dụng | Kết quả rà soát |
| --- | --- | --- |
| Đăng nhập, liên kết Core, kích hoạt và hướng dẫn lần đầu | `/login`, `/activate`, `/start` | Đã có challenge, bằng chứng ví và hướng dẫn theo vai trò. |
| Gia đình, thành viên, lời mời, khóa truy cập | Quản trị → Thành viên; Cài đặt → Gia đình | Đã có; chỉ chủ nhà quản trị. Người bảo hộ có quyền ký hũ không mặc nhiên thành chủ nhà. |
| Tạo hũ, bản nháp, kiểm tra phí, tiếp tục giao dịch | Tạo hũ trong bảng quản trị và trang trải nghiệm tương ứng | Đã có; tiếp tục dùng bản nháp để khôi phục giao dịch tạo hũ. |
| Nạp hũ Core và smart contract | Khu số dư, biểu mẫu nạp; nút Nạp Quỹ từng hũ | Đã bổ sung ở đợt trước; sửa đọc phản hồi `transfer` và chọn đúng hũ từ thẻ quản trị trong đợt này. |
| Nhận tiền an sinh, yêu cầu, duyệt và thanh toán Core | `/dashboard/elderly`, `/dashboard/member` | Đã có; sửa nhận diện người ký theo `linkedWallet`, không suy ra từ trường ví cũ trong user. |
| Việc nhà, ảnh, góp ý làm lại, duyệt thưởng, phân bổ heo đất | `/dashboard/kids` | Đã có; sửa các liên kết để giữ nguồn smart contract khi mở danh sách/chi tiết. |
| Mục tiêu heo đất cá nhân | Heo đất → mục tiêu, yêu cầu nhận tiền | Đã có, dùng chính sách SAVINGS của sổ Core. |
| Góp vốn, thứ tự nhận và giải ngân ROSCA | `/dashboard/rosca` | Đã có cho cả hai nguồn; góp và chi vẫn kiểm tra điều kiện nghiệp vụ. |
| Duyệt smart contract cho người bảo hộ | `/dashboard/tools?section=approvals` | **Mới:** có lối vào cho GUARDIAN; kiểm tra capability từng hũ. Thêm thành viên hũ, duyệt rút, thưởng và hủy việc dùng giao diện/receipt đã có. |
| Duyệt EIP-712 và chi bằng chữ ký đã thu thập | Ký duyệt → hũ → yêu cầu → Duyệt bằng chữ ký | **Mới:** đọc lại request finalized, ký đúng domain/request/wei, sao chép thủ công, nhập danh sách chữ ký và xem lại trước khi gửi. Không tự chuyển chữ ký cho người khác. |
| Hũ mục tiêu chung SHARED_GOAL | `/dashboard/tools?section=goals` | **Mới:** lối vào cho mọi thành viên được cấp quyền; nạp, xem mục tiêu/hạn chót, đề xuất chi và duyệt qua bàn điều khiển. Không tạo chính sách Core tương đương vì API chưa hỗ trợ. |
| Giao dịch còn chờ, khôi phục tx hash, đồng bộ sổ | `/dashboard/tools?section=activity` | **Mới:** danh sách operation theo user/gia đình, lọc trạng thái, đối soát từng giao dịch hoặc toàn danh sách, nhập hash. Dùng hàng đợi và API đối soát sẵn có, không phát lại giao dịch chuyển tiền. |
| Sổ Core và khoản thanh toán còn chờ | Công cụ → Giao dịch → Ví chung | **Mới:** thành viên có lối vào sổ Core được backend lọc quyền. Chỉ ví nguồn thấy nút ký/ký hủy; chủ nhà vẫn quản lý hũ và phân bổ tiền. |
| Lịch sử giao dịch cá nhân | Công cụ → Giao dịch; Sổ giao dịch | Đã có; reset phân trang và dữ liệu khi đổi tài khoản/gia đình. |
| Nhật ký chữ ký xác thực tài khoản | Công cụ → Giao dịch → Nhật ký chữ ký | **Mới:** đọc `/api/signatures` khi mở; phân biệt chữ ký xác thực với chữ ký duyệt chi. |
| Thông báo và đánh dấu đã đọc | `/dashboard/tools?section=notifications` | **Mới:** lối vào chung cho cả người bảo hộ và các vai trò thành viên. Dùng nguồn thông báo cá nhân hiện có. |
| Hồ sơ, mật khẩu, phiên đăng nhập, tùy chọn | `/settings` | Đã có giao diện. Không phục hồi các endpoint metadata-only đã bị API trả 410. |
| Khôi phục ví, cấp quyền mạng | Trạng thái tài khoản; quản trị/thành viên | Đã có WalletRecoveryPanel và ProvisioningPanel. |
| Triển khai hệ thống qua Core | Quản trị → cấu hình triển khai | Đã có console từng bước. Candidate vẫn cần được xác minh/kích hoạt và rebuild. |
| Báo cáo, hạn mức Core, lưu trữ hũ/gia đình | Quản trị → báo cáo/hũ/cấu hình | Đã có xác nhận bằng chữ ký; không thay cấu hình smart contract. |

## Những phần chưa thể bật chỉ bằng sửa giao diện

- Manifest hiện `enabled: false`, chưa có địa chỉ hợp đồng được xác minh. Các chức năng smart contract hiển thị trạng thái chặn; không tự thay manifest để cho ký.
- Clone V1 có các hàm riêng như pause/unpause, thay Guardian/Beneficiary, cancel/execute withdrawal và chuyển trực tiếp giữa clone. API vận hành hiện xác minh FamilyHub và các event của Hub, chưa cung cấp vòng đối soát đầy đủ cho clone. Không thêm các nút ký không có backend hỗ trợ.
- Đã thay biểu mẫu chuyển trực tiếp V1 đang gây hiểu nhầm bằng thông báo chưa hỗ trợ và liên kết đến sổ Core. `PATCH /vaults` chỉ chấp nhận DEPOSIT/WITHDRAW, chưa chấp nhận TRANSFER. Luân chuyển hũ Core thông thường vẫn dùng TreasuryPanel; hũ có chính sách phải đi qua nghiệp vụ đã duyệt.
- Daily limit on-chain là chính sách cố định (`setVaultDailyLimit` revert). Giao diện đổi hạn mức quản trị chỉ áp dụng sổ Core.
- Các lệnh pause/unpause Hub và sửa wiring của operator chưa có nhánh cấp phép trong `transaction-context`. Tạm dừng yêu cầu chi ở giao diện quản trị hiện chỉ áp dụng nghiệp vụ ứng dụng, không thay trạng thái pause hợp đồng.
- ERC-20, cross-chain, yield và relayer đều bị tắt trong manifest hiện tại. Không thêm giao diện gợi ý các chức năng này đang hoạt động.

## Xác minh

Các bài kiểm thử mới chạy handlers/hook của code thật với biên API/Core có kiểm soát, bao gồm response envelope thật của Treasury API, quyền theo vai trò, cách ly workspace, dữ liệu về trễ, giá trị wei và chữ ký. Không xem các bài test này là chuyển AVAX thật hoặc E2E trình duyệt. Kiểm tra trực quan Chrome ở phiên trước bị từ chối quyền truy cập ứng dụng; đợt này không thử vượt qua giới hạn đó.

- Bộ hồi quy chọn lọc: **223 bài đạt**, gồm tools/funding/member rendering, bảo mật Web3, Core treasury/workflows, quyền chủ nhà, tạo hũ và các hợp đồng T1/V1.
- Bộ công cụ sau khi bổ sung sổ Core: **15 bài đạt**, gồm 13 trường hợp đã nằm trong bộ hồi quy và 2 trường hợp mới về lối vào sổ Core/quyền ký theo ví nguồn.
- `npm --prefix frontend run typecheck`: đạt.
- `npm run typecheck` tại root: đạt.
- Production build với `KINETIX_CONSTRAINED_BUILD=true`: đạt. Build dùng thư mục tạm `.next-t1-check` để tách khỏi tiến trình dev.

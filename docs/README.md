# Danh mục tài liệu Kinetix

Cập nhật: 17/11/2026. Đọc theo thứ tự dưới đây. Tài liệu mục tiêu không xác nhận tính năng đã triển khai; báo cáo lịch sử không quyết định backlog mới.

## Định hướng và thực thi

| Tài liệu | Dùng để quyết định |
| --- | --- |
| [Định hướng sản phẩm](PRODUCT_DIRECTION.md) | Người dùng, vấn đề, phạm vi, giả thuyết pilot |
| [Mô hình hoạt động quỹ](FUND_OPERATING_MODEL.md) | Khung chung: mục đích, cơ chế, quyền, tiền và vòng đời |
| [Hoạt động và Mục tiêu](FUND_MODELS_CORE.md) | Quy tắc từng loại, điều kiện chi/hoàn và ví dụ số dư |
| [Nhiệm vụ và Xoay vòng](FUND_MODELS_EXTENSIONS.md) | Bảo đảm riêng, trường hợp thất bại và gate mở rộng |
| [Tạo và quản lý chung](FUND_CREATION_MANAGEMENT.md) | Wizard điện thoại, capability, dữ liệu và trạng thái giao dịch |
| [Nghiệm thu mô hình quỹ](FUND_MODEL_ACCEPTANCE.md) | Quyết định mặc định, khoảng cách V2, case tests và backlog |
| [Đặc tả quỹ chung](GROUP_FINANCE_SPEC.md) | Contracts, backend, frontend, quyền và migration |
| [Contracts V2](CONTRACTS_V2.md) | API đã triển khai trong source, điều kiện chi/hoàn và tích hợp |
| [Kế hoạch và kiểm chứng contracts V2](CONTRACTS_V2_IMPLEMENTATION.md) | Quyết định triển khai và kết quả kiểm tra theo đợt |
| [Chuẩn UX điện thoại](MOBILE_UX_STANDARD.md) | Bố cục, mật độ nội dung, ngôn ngữ và ký ví |
| [Nghiệm thu điện thoại](MOBILE_ACCEPTANCE.md) | Thiết bị, trạng thái lỗi và bằng chứng |
| [Lộ trình](ROADMAP.md) | Trình tự và đầu ra từng giai đoạn |

## Hiện trạng và vận hành

- [STATUS.md](STATUS.md): trạng thái/bằng chứng theo ngày, chưa phải kết quả cho kiến trúc mới.
- [ARCHITECTURE.md](ARCHITECTURE.md): T1, V1, ví chung và ranh giới giữ tiền hiện tại.
- [Chuyển demo sang dữ liệu thật, 16/11/2026](DEMO_TO_LIVE_2026-11-16.md): adapter lưu ký ví cá nhân, thay đổi UI/API, migration và các phần chưa nghiệm thu.
- [FUJI_DEPLOYMENT.md](FUJI_DEPLOYMENT.md): địa chỉ và giao dịch T1 ngày 12/11/2026; không phải deployment V2.
- [CONTRIBUTING.md](../CONTRIBUTING.md), [SECURITY.md](../SECURITY.md), [AGENTS.md](../AGENTS.md): quy trình phát triển, bảo mật và hướng dẫn agent.
- [REPOSITORY_METADATA.md](REPOSITORY_METADATA.md): mô tả GitHub đề xuất; chưa áp dụng lên dịch vụ.
- [Đặc tả wizard tạo quỹ](../frontend/src/components/vaults/create/UX_SPECIFICATION.md): chuẩn mục tiêu cho component.
- [Hướng dẫn agent chờ áp dụng](agent-guidance/README.md): bản thay thế cho `.agents` hiện bị chặn ghi.

## Hồ sơ kỹ thuật lịch sử

Các file sau giữ nội dung theo thời điểm để đối chiếu code, sự cố và luồng cũ. Banner đầu file dẫn về định hướng mới. Không chạy lại lệnh deployment/migration cũ nếu chưa đối chiếu manifest, phiên bản và môi trường.

| Nhóm | Tài liệu |
| --- | --- |
| Auth và vận hành | [Auth runbook](AUTH_IMPLEMENTATION_RUNBOOK.md), [Docker/CI](DOCKER_CICD.md) |
| Quản trị cũ | [Implementation](FAMILY_ADMIN_IMPLEMENTATION.md) |
| Vault và treasury | [Treasury](PROJECT_TREASURY.md), [Experience handover](VAULT_EXPERIENCE_HANDOVER.md) |
| Rà soát | [04/11](KINETIX_REVIEW_2026-11-04.md), [06/11](RECHECK_2026-11-06.md), [13/11](PRODUCT_READINESS_2026-11-13.md), [UI audit](UI_FUNCTIONALITY_AUDIT.md), [Contract testnet review](../CONTRACT_TESTNET_REVIEW.md) |
| Hackathon | [Readiness recheck](UNIHACK_READINESS_RECHECK.md) |
| Bàn giao trước đây | [Functional workflows](../.docs/KINETIX_FUNCTIONAL_WORKFLOWS.md), [T1 handover](../.docs/T1_HANDOVER.md) |

## Quy tắc bảo trì

Ngày 17/11/2026 đã xóa bốn bản kế hoạch cũ về quản trị gia đình, contract V1, giao diện hũ và vá UniHack. Dùng bộ đặc tả và lộ trình hiện hành để lập công việc mới; các báo cáo triển khai, bàn giao và kiểm chứng lịch sử vẫn được giữ. Chi tiết thay thế nằm trong [bảng rà soát tài liệu](DOCUMENTATION_AUDIT.md).

Sửa định hướng ở PRODUCT_DIRECTION, đặc tả ở GROUP_FINANCE_SPEC, UX ở MOBILE_UX_STANDARD; tài liệu khác dẫn link thay vì sao chép nhiều bản. Mọi tính năng mới ghi rõ mục tiêu/đã triển khai/đã kiểm chứng. Không cập nhật số test hoặc deployment nếu chưa chạy kiểm chứng tương ứng. Ghi ngày và giới hạn bằng chứng khi báo cáo kết quả.

Thư viện kỹ năng thiết kế tổng quát trong `.agents/skills/` là tài nguyên dùng lại, không phải mô tả sản phẩm. Các rule dự án và skill Kinetix cũ cần được thay bằng bản đã chuẩn bị khi có quyền ghi. [Bảng rà soát Markdown](DOCUMENTATION_AUDIT.md) ghi phạm vi và cách xử lý từng file.

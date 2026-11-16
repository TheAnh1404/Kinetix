# Rà soát tài liệu Markdown

Ngày: 15/11/2026. Phạm vi gồm tài liệu dự án, hồ sơ lịch sử, hướng dẫn agent và thư viện skill được quản lý trong repository. Không bao gồm node_modules, output sinh tự động hoặc `.git`.

## Kết quả và giới hạn

- Đã chuẩn hóa định hướng, đặc tả kỹ thuật, quy chuẩn điện thoại, nội dung và checklist nghiệm thu.
- Báo cáo cũ được giữ phần bằng chứng và thêm nhãn lịch sử để không biến kết quả cũ thành nghiệm thu mới.
- `.agents` bị chính sách môi trường chặn ghi. Bản thay thế 3 rule và skill Kinetix được chuẩn bị tại [agent-guidance](agent-guidance/README.md); file gốc chưa thay đổi.
- Thư viện skill thiết kế tổng quát giữ nguyên vì là tài nguyên tái sử dụng, không phải nội dung định vị Kinetix. Yêu cầu dự án mới nằm trong AGENTS và bộ spec hiện hành.
- Đợt này chỉ sửa Markdown. Chưa sửa runtime UI, contracts, schema, API hoặc manifest; chưa thực hiện migration, deployment hoặc nghiệm thu máy thật.

## Danh mục

| File | Xử lý |
| --- | --- |
| `.agents/rules/blockchain-contracts.md` | Giữ gốc do chặn ghi; đã chuẩn bị bản thay thế |
| `.agents/rules/frontend-web3.md` | Giữ gốc do chặn ghi; đã chuẩn bị bản thay thế |
| `.agents/rules/kinetix-core.md` | Giữ gốc do chặn ghi; đã chuẩn bị bản thay thế |
| `.agents/skills/banner-design/SKILL.md` | Giữ thư viện skill tổng quát; không dùng làm định vị sản phẩm |
| `.agents/skills/banner-design/references/banner-sizes-and-styles.md` | Giữ thư viện skill tổng quát; không dùng làm định vị sản phẩm |
| `.agents/skills/brand/SKILL.md` | Giữ thư viện skill tổng quát; không dùng làm định vị sản phẩm |
| `.agents/skills/brand/references/approval-checklist.md` | Giữ thư viện skill tổng quát; không dùng làm định vị sản phẩm |
| `.agents/skills/brand/references/asset-organization.md` | Giữ thư viện skill tổng quát; không dùng làm định vị sản phẩm |
| `.agents/skills/brand/references/brand-guideline-template.md` | Giữ thư viện skill tổng quát; không dùng làm định vị sản phẩm |
| `.agents/skills/brand/references/color-palette-management.md` | Giữ thư viện skill tổng quát; không dùng làm định vị sản phẩm |
| `.agents/skills/brand/references/consistency-checklist.md` | Giữ thư viện skill tổng quát; không dùng làm định vị sản phẩm |
| `.agents/skills/brand/references/logo-usage-rules.md` | Giữ thư viện skill tổng quát; không dùng làm định vị sản phẩm |
| `.agents/skills/brand/references/messaging-framework.md` | Giữ thư viện skill tổng quát; không dùng làm định vị sản phẩm |
| `.agents/skills/brand/references/typography-specifications.md` | Giữ thư viện skill tổng quát; không dùng làm định vị sản phẩm |
| `.agents/skills/brand/references/update.md` | Giữ thư viện skill tổng quát; không dùng làm định vị sản phẩm |
| `.agents/skills/brand/references/visual-identity.md` | Giữ thư viện skill tổng quát; không dùng làm định vị sản phẩm |
| `.agents/skills/brand/references/voice-framework.md` | Giữ thư viện skill tổng quát; không dùng làm định vị sản phẩm |
| `.agents/skills/brand/templates/brand-guidelines-starter.md` | Giữ thư viện skill tổng quát; không dùng làm định vị sản phẩm |
| `.agents/skills/design-system/SKILL.md` | Giữ thư viện skill tổng quát; không dùng làm định vị sản phẩm |
| `.agents/skills/design-system/references/component-specs.md` | Giữ thư viện skill tổng quát; không dùng làm định vị sản phẩm |
| `.agents/skills/design-system/references/component-tokens.md` | Giữ thư viện skill tổng quát; không dùng làm định vị sản phẩm |
| `.agents/skills/design-system/references/primitive-tokens.md` | Giữ thư viện skill tổng quát; không dùng làm định vị sản phẩm |
| `.agents/skills/design-system/references/semantic-tokens.md` | Giữ thư viện skill tổng quát; không dùng làm định vị sản phẩm |
| `.agents/skills/design-system/references/states-and-variants.md` | Giữ thư viện skill tổng quát; không dùng làm định vị sản phẩm |
| `.agents/skills/design-system/references/tailwind-integration.md` | Giữ thư viện skill tổng quát; không dùng làm định vị sản phẩm |
| `.agents/skills/design-system/references/token-architecture.md` | Giữ thư viện skill tổng quát; không dùng làm định vị sản phẩm |
| `.agents/skills/design/SKILL.md` | Giữ thư viện skill tổng quát; không dùng làm định vị sản phẩm |
| `.agents/skills/design/references/banner-sizes-and-styles.md` | Giữ thư viện skill tổng quát; không dùng làm định vị sản phẩm |
| `.agents/skills/design/references/cip-deliverable-guide.md` | Giữ thư viện skill tổng quát; không dùng làm định vị sản phẩm |
| `.agents/skills/design/references/cip-design.md` | Giữ thư viện skill tổng quát; không dùng làm định vị sản phẩm |
| `.agents/skills/design/references/cip-prompt-engineering.md` | Giữ thư viện skill tổng quát; không dùng làm định vị sản phẩm |
| `.agents/skills/design/references/cip-style-guide.md` | Giữ thư viện skill tổng quát; không dùng làm định vị sản phẩm |
| `.agents/skills/design/references/design-routing.md` | Giữ thư viện skill tổng quát; không dùng làm định vị sản phẩm |
| `.agents/skills/design/references/icon-design.md` | Giữ thư viện skill tổng quát; không dùng làm định vị sản phẩm |
| `.agents/skills/design/references/logo-color-psychology.md` | Giữ thư viện skill tổng quát; không dùng làm định vị sản phẩm |
| `.agents/skills/design/references/logo-design.md` | Giữ thư viện skill tổng quát; không dùng làm định vị sản phẩm |
| `.agents/skills/design/references/logo-prompt-engineering.md` | Giữ thư viện skill tổng quát; không dùng làm định vị sản phẩm |
| `.agents/skills/design/references/logo-style-guide.md` | Giữ thư viện skill tổng quát; không dùng làm định vị sản phẩm |
| `.agents/skills/design/references/slides-copywriting-formulas.md` | Giữ thư viện skill tổng quát; không dùng làm định vị sản phẩm |
| `.agents/skills/design/references/slides-create.md` | Giữ thư viện skill tổng quát; không dùng làm định vị sản phẩm |
| `.agents/skills/design/references/slides-html-template.md` | Giữ thư viện skill tổng quát; không dùng làm định vị sản phẩm |
| `.agents/skills/design/references/slides-layout-patterns.md` | Giữ thư viện skill tổng quát; không dùng làm định vị sản phẩm |
| `.agents/skills/design/references/slides-strategies.md` | Giữ thư viện skill tổng quát; không dùng làm định vị sản phẩm |
| `.agents/skills/design/references/slides.md` | Giữ thư viện skill tổng quát; không dùng làm định vị sản phẩm |
| `.agents/skills/design/references/social-photos-design.md` | Giữ thư viện skill tổng quát; không dùng làm định vị sản phẩm |
| `.agents/skills/kinetix-builder/SKILL.md` | Giữ gốc do chặn ghi; đã chuẩn bị bản thay thế |
| `.agents/skills/slides/SKILL.md` | Giữ thư viện skill tổng quát; không dùng làm định vị sản phẩm |
| `.agents/skills/slides/references/copywriting-formulas.md` | Giữ thư viện skill tổng quát; không dùng làm định vị sản phẩm |
| `.agents/skills/slides/references/create.md` | Giữ thư viện skill tổng quát; không dùng làm định vị sản phẩm |
| `.agents/skills/slides/references/html-template.md` | Giữ thư viện skill tổng quát; không dùng làm định vị sản phẩm |
| `.agents/skills/slides/references/layout-patterns.md` | Giữ thư viện skill tổng quát; không dùng làm định vị sản phẩm |
| `.agents/skills/slides/references/slide-strategies.md` | Giữ thư viện skill tổng quát; không dùng làm định vị sản phẩm |
| `.agents/skills/ui-styling/SKILL.md` | Giữ thư viện skill tổng quát; không dùng làm định vị sản phẩm |
| `.agents/skills/ui-styling/references/canvas-design-system.md` | Giữ thư viện skill tổng quát; không dùng làm định vị sản phẩm |
| `.agents/skills/ui-styling/references/shadcn-accessibility.md` | Giữ thư viện skill tổng quát; không dùng làm định vị sản phẩm |
| `.agents/skills/ui-styling/references/shadcn-components.md` | Giữ thư viện skill tổng quát; không dùng làm định vị sản phẩm |
| `.agents/skills/ui-styling/references/shadcn-theming.md` | Giữ thư viện skill tổng quát; không dùng làm định vị sản phẩm |
| `.agents/skills/ui-styling/references/tailwind-customization.md` | Giữ thư viện skill tổng quát; không dùng làm định vị sản phẩm |
| `.agents/skills/ui-styling/references/tailwind-responsive.md` | Giữ thư viện skill tổng quát; không dùng làm định vị sản phẩm |
| `.agents/skills/ui-styling/references/tailwind-utilities.md` | Giữ thư viện skill tổng quát; không dùng làm định vị sản phẩm |
| `.agents/skills/ui-ux-pro-max/SKILL.md` | Giữ thư viện skill tổng quát; không dùng làm định vị sản phẩm |
| `.docs/KINETIX_FUNCTIONAL_WORKFLOWS.md` | Thêm nhãn lịch sử và link chuẩn mới; giữ bằng chứng cũ |
| `.docs/T1_HANDOVER.md` | Thêm nhãn lịch sử và link chuẩn mới; giữ bằng chứng cũ |
| `.github/PULL_REQUEST_TEMPLATE.md` | Chuẩn hóa tài liệu hiện hành hoặc thêm đặc tả mục tiêu |
| `AGENTS.md` | Chuẩn hóa tài liệu hiện hành hoặc thêm đặc tả mục tiêu |
| `CONTRACT_TESTNET_REVIEW.md` | Thêm nhãn lịch sử và link chuẩn mới; giữ bằng chứng cũ |
| `CONTRIBUTING.md` | Chuẩn hóa tài liệu hiện hành hoặc thêm đặc tả mục tiêu |
| `README.md` | Chuẩn hóa tài liệu hiện hành hoặc thêm đặc tả mục tiêu |
| `SECURITY.md` | Chuẩn hóa tài liệu hiện hành hoặc thêm đặc tả mục tiêu |
| `docs/ARCHITECTURE.md` | Chuẩn hóa tài liệu hiện hành hoặc thêm đặc tả mục tiêu |
| `docs/AUTH_IMPLEMENTATION_RUNBOOK.md` | Thêm nhãn lịch sử và link chuẩn mới; giữ bằng chứng cũ |
| `docs/DOCKER_CICD.md` | Thêm nhãn lịch sử và link chuẩn mới; giữ bằng chứng cũ |
| `docs/FAMILY_ADMIN_IMPLEMENTATION.md` | Thêm nhãn lịch sử và link chuẩn mới; giữ bằng chứng cũ |
| `docs/FAMILY_ADMIN_PRODUCTION_PLAN.md` | Thêm nhãn lịch sử và link chuẩn mới; giữ bằng chứng cũ |
| `docs/FUJI_DEPLOYMENT.md` | Giữ địa chỉ/receipt; làm rõ phạm vi T1 theo ngày |
| `docs/GROUP_FINANCE_SPEC.md` | Chuẩn hóa tài liệu hiện hành hoặc thêm đặc tả mục tiêu |
| `docs/KINETIX_REVIEW_2026-11-04.md` | Thêm nhãn lịch sử và link chuẩn mới; giữ bằng chứng cũ |
| `docs/KINETIX_VAULT_CONTRACT_REDESIGN.md` | Thêm nhãn lịch sử và link chuẩn mới; giữ bằng chứng cũ |
| `docs/MOBILE_ACCEPTANCE.md` | Chuẩn hóa tài liệu hiện hành hoặc thêm đặc tả mục tiêu |
| `docs/MOBILE_UX_STANDARD.md` | Chuẩn hóa tài liệu hiện hành hoặc thêm đặc tả mục tiêu |
| `docs/PRODUCT_DIRECTION.md` | Chuẩn hóa tài liệu hiện hành hoặc thêm đặc tả mục tiêu |
| `docs/PRODUCT_READINESS_2026-11-13.md` | Thêm nhãn lịch sử và link chuẩn mới; giữ bằng chứng cũ |
| `docs/PROJECT_TREASURY.md` | Thêm nhãn lịch sử và link chuẩn mới; giữ bằng chứng cũ |
| `docs/README.md` | Chuẩn hóa tài liệu hiện hành hoặc thêm đặc tả mục tiêu |
| `docs/RECHECK_2026-11-06.md` | Thêm nhãn lịch sử và link chuẩn mới; giữ bằng chứng cũ |
| `docs/REPOSITORY_METADATA.md` | Chuẩn hóa tài liệu hiện hành hoặc thêm đặc tả mục tiêu |
| `docs/ROADMAP.md` | Chuẩn hóa tài liệu hiện hành hoặc thêm đặc tả mục tiêu |
| `docs/STATUS.md` | Thêm định hướng mới; giữ snapshot kiểm chứng cũ |
| `docs/UI_FUNCTIONALITY_AUDIT.md` | Thêm nhãn lịch sử và link chuẩn mới; giữ bằng chứng cũ |
| `docs/UNIHACK_PATCH_PLAN.md` | Thêm nhãn lịch sử và link chuẩn mới; giữ bằng chứng cũ |
| `docs/UNIHACK_READINESS_RECHECK.md` | Thêm nhãn lịch sử và link chuẩn mới; giữ bằng chứng cũ |
| `docs/VAULT_EXPERIENCE_HANDOVER.md` | Thêm nhãn lịch sử và link chuẩn mới; giữ bằng chứng cũ |
| `docs/VAULT_UI_REDESIGN_PLAN.md` | Thêm nhãn lịch sử và link chuẩn mới; giữ bằng chứng cũ |
| `docs/agent-guidance/README.md` | Bản chuẩn bị chờ áp dụng vào thư mục được bảo vệ |
| `docs/agent-guidance/blockchain-contracts.md` | Bản chuẩn bị chờ áp dụng vào thư mục được bảo vệ |
| `docs/agent-guidance/frontend-web3.md` | Bản chuẩn bị chờ áp dụng vào thư mục được bảo vệ |
| `docs/agent-guidance/kinetix-builder.SKILL.md` | Bản chuẩn bị chờ áp dụng vào thư mục được bảo vệ |
| `docs/agent-guidance/kinetix-core.md` | Bản chuẩn bị chờ áp dụng vào thư mục được bảo vệ |
| `frontend/src/components/vaults/create/UX_SPECIFICATION.md` | Chuẩn hóa tài liệu hiện hành hoặc thêm đặc tả mục tiêu |
| `docs/DOCUMENTATION_AUDIT.md` | Danh mục phạm vi, xử lý và giới hạn của đợt chuẩn hóa |

## Kiểm tra đợt tài liệu

- `npm run docs:check`: đạt; checker hiện có bao phủ 9 tài liệu public cũ.
- Kiểm tra bổ sung tất cả Markdown mới/sửa: UTF-8, liên kết tương đối và phạm vi chỉ sửa `.md`.
- `git diff --check`: đạt.
- Chưa chạy build/test runtime hoặc kiểm tra máy thật vì không thay mã thực thi. Checklist mobile là yêu cầu cho đợt triển khai tiếp theo, chưa được đánh dấu đạt.

Đã bỏ một URL kết nối database có thông tin xác thực khỏi ví dụ trong VAULT_EXPERIENCE_HANDOVER.md; thay bằng hướng dẫn cấu hình riêng. Không kiểm tra tính hoạt động của giá trị đó, không thay đổi môi trường hoặc Git history.

## Bổ sung mô hình quỹ chuyên sâu — 15/11/2026

| File | Phạm vi |
| --- | --- |
| [FUND_OPERATING_MODEL.md](FUND_OPERATING_MODEL.md) | Mô hình chung, nguồn quyền, accounting và trạng thái |
| [FUND_MODELS_CORE.md](FUND_MODELS_CORE.md) | Hoạt động/Mục tiêu, điều kiện góp/chi/hoàn và case số dư |
| [FUND_MODELS_EXTENSIONS.md](FUND_MODELS_EXTENSIONS.md) | Nhiệm vụ/ROSCA, bảo đảm, dispute/default và settlement |
| [FUND_CREATION_MANAGEMENT.md](FUND_CREATION_MANAGEMENT.md) | Wizard bốn bước, khung quản lý điện thoại, capability và dữ liệu |
| [FUND_MODEL_ACCEPTANCE.md](FUND_MODEL_ACCEPTANCE.md) | Quyết định baseline, gap V2 và ma trận nghiệm thu |

Cập nhật link trong PRODUCT_DIRECTION, GROUP_FINANCE_SPEC, ROADMAP, README của docs và đặc tả wizard. Đợt này chỉ thay tài liệu; các thay đổi backend/frontend song song không được sửa hoặc nghiệm thu như một phần của mô hình. `git diff --check` toàn workspace có thể phản ánh lỗi whitespace từ thay đổi song song; kiểm tra riêng phạm vi tài liệu của đợt này khi báo cáo kết quả.

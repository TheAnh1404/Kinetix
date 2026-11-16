# Kinetix

**Góp tiền, duyệt chi và theo dõi quỹ chung trên điện thoại.**

Kinetix dành cho câu lạc bộ, cộng đồng, nhóm bạn, anh em và gia đình. Mỗi nhóm có thành viên, quỹ theo mục đích và quy tắc sử dụng tiền rõ ràng. Hướng phát triển ưu tiên là Quỹ hoạt động và Quỹ mục tiêu, với toàn bộ luồng sử dụng trên điện thoại.

> **Hiện trạng:** phần mềm thử nghiệm trên Avalanche Fuji (43113), dùng AVAX. Deployment T1 đã được ghi nhận trong repository; chưa có kiểm toán độc lập. Contracts V2 đã có trong source; backend/frontend V2 và deployment public chưa được kích hoạt. USDC/ERC20, cross-chain và yield đang tắt.

## Luồng sản phẩm mục tiêu

Tạo nhóm → mời thành viên → thống nhất quy tắc quỹ → góp tiền → đề nghị chi → duyệt → thanh toán → đối soát.

Quyền quản lý nhóm và quyền sử dụng tiền tách biệt. Tiền đã góp không tự tạo quyền rút lại. Mỗi quỹ công bố nơi giữ tiền, người được duyệt và điều kiện chi/hoàn tiền. Quỹ ví chung do chủ ví kiểm soát không có cùng bảo đảm với quỹ smart contract.

Nhóm thử nghiệm ưu tiên là CLB/cộng đồng nhỏ có thành viên trưởng thành và quen dùng ví. Đây là giả thuyết cần kiểm chứng.

## Tài liệu

- [Định hướng sản phẩm](docs/PRODUCT_DIRECTION.md).
- [Đặc tả contracts, backend, frontend và chuyển đổi](docs/GROUP_FINANCE_SPEC.md).
- [Contracts V2: API, quyền và điều kiện tài chính](docs/CONTRACTS_V2.md).
- [Chuẩn giao diện điện thoại và nội dung](docs/MOBILE_UX_STANDARD.md).
- [Checklist nghiệm thu trên điện thoại](docs/MOBILE_ACCEPTANCE.md).
- [Hiện trạng](docs/STATUS.md), [kiến trúc hiện tại](docs/ARCHITECTURE.md), [lộ trình](docs/ROADMAP.md).
- [Danh mục tài liệu](docs/README.md), [đóng góp](CONTRIBUTING.md), [bảo mật](SECURITY.md).

## Chạy cục bộ

Dùng Node.js 24.7 trở lên trong dòng Node 24. Cấu hình từ `.env.example` và `frontend/.env.example`, dùng database phát triển riêng và BFF secret riêng. Không commit file môi trường.

```bash
npm ci
npm --prefix backend ci
npm --prefix frontend ci
npm run db:migrate
npm run dev:all
```

Frontend chạy cổng 3000, API mặc định 4000. Chỉ chạy migration sau khi kiểm tra đúng database. Để xem UI mô phỏng, đặt `NEXT_PUBLIC_DEMO_MODE=true` trong môi trường frontend, chạy `npm run dev:frontend` và mở `/demo`. Demo không chuyển tiền thật.

## Công nghệ và giới hạn

Next.js/React/TypeScript cho frontend; Express, PostgreSQL và Drizzle cho backend; Solidity trên Avalanche cho các luồng contract. Worker đối soát receipt/event; bản ghi database không chứng minh đã thanh toán.

T1 FamilyHub, vault clone V1 và ví chung Core là các đường quản lý tiền khác nhau. FamilyYieldVault là thí nghiệm tích lũy từ quỹ dự phòng của operator, không phải nguồn yield DeFi đang hoạt động. Xem [bằng chứng triển khai](docs/FUJI_DEPLOYMENT.md).

## Giấy phép

[MIT](LICENSE).

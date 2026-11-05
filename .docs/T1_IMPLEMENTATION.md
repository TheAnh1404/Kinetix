# Triển khai T1 Fuji — 05/11/2026

Phạm vi đã được người dùng chọn: T1 Fuji một chain theo kế hoạch nâng cấp.
T2 không được bật trong bản này. Không tạo receipt, mapping hoặc số dư giả.

## Quyết định chính sách

- AVAX là tài sản T1 duy nhất, đơn vị wei; ERC20 bị khóa ở contract/API cho đến khi có policy theo tài sản và quorum đầy đủ.
- Tài sản gửi nằm 100% tại chain Hub; `cChainPrincipal = 0`. `bufferRatioBps` phải là 10000 ở deployment T1 mới. Không dùng message ICM để ghi nhận tiền.
- Cashflow chỉ chấp nhận Hub controller; controller và liên kết Cashflow khóa trước khi tạo hũ đầu tiên. Admin có quyền pause/allowlist, không có phiếu Guardian bổ sung hoặc đường giải ngân đặc biệt.
- Hạn mức SHIELD cố định lúc tạo; hạn mức ngày không thể nâng bằng một Guardian. MILESTONE giữ chỗ tiền thưởng, cần quorum của hũ; assignee không được tự duyệt.
- ROSCA: mỗi thành viên đóng đúng một khoản/kỳ, chỉ chi khi đủ toàn bộ khoản, một chu kỳ hữu hạn. Kỳ thiếu khoản chờ, không chi một phần; không tự đổi thành viên hoặc hoàn tiền. Recovery chuyển quyền và khoản đóng sang ví mới.
- SHARED_GOAL: yêu cầu và thực thi chỉ khi đạt target hoặc hết deadline, luôn cần quorum. Sau deadline, quorum có quyền giải ngân số dư theo request; không hứa hoàn tiền tự động theo người góp.
- Recovery cần quorum, thay mapping và mảng; vô hiệu mọi request/chữ ký trước phiên bản quyền mới. Task đang mở được chuyển sang ví mới, phiếu duyệt task cũ bị vô hiệu.
- CHILD là beneficiary ở MILESTONE và chỉ nhận thưởng; T1 không cam kết phân loại tuổi ở các hũ khác, API phải duy trì quy tắc vai trò ứng dụng.
- YieldVault độc lập là mô hình lãi từ reserve, không phải strategy DeFi; không triển khai/bật cho T1. Chặn ICM không có funding, bảo toàn backing và checkpoint.
- Relayer bị khóa cứng tại service T1, kể cả khi đặt biến môi trường bật tài trợ. Không tạo wallet client hoặc broadcast. Chỉ có khóa relayer riêng được chấp nhận trong helper; không fallback deployer. Ngân sách bền vững, selector/tham số/session/workspace và nonce journal là điều kiện cho bản triển khai tài trợ sau này.

## Trình tự và checklist

1. [x] Mã A: manifest versioned, write gate kiểm actual chain/code/wiring, cấu hình thống nhất, đăng ký mapping bằng receipt. Manifest chưa enabled vì chưa deploy thật.
2. [x] Mã B trong phạm vi T1: hardening Hub/Cashflow/Forwarder/YieldVault, sửa 14 regression và kiểm thử bổ sung; ERC20/bridge/relayer/yield không mở.
3. [x] Mã C: đồng bộ ABI/API/worker/UI T1, bỏ thông báo dòng vốn/lợi suất sai. Chưa nghiệm thu tích hợp PostgreSQL/thiết bị thật.
4. [x] Kiểm compile, contract tests, auth tests không DB, typecheck, lint, frontend build. Kết quả cuối ở hồ sơ bàn giao.
5. [ ] Deploy Fuji mới khi cấu hình ký/network thực tế đủ; lưu receipt và manifest, không tự tạo hũ seed.
6. [ ] Đối soát doctor và bằng chứng E2E thật; ghi rõ phần cần Core Wallet desktop/mobile của người dùng.

## Nguồn kỹ thuật

- OpenZeppelin ERC2771Forwarder v5.6.1 (phiên bản hiện có, ghim chính xác trong lockfile). Dùng solc 0.8.26 tương thích pragma ^0.8.20 của dự án; compiler cục bộ được ghim, không phụ thuộc tải compiler. Không tải được 5.0.2 do môi trường chặn registry.
- Avalanche ICTT: https://build.avax.network/docs/cross-chain/interchain-token-transfer/overview

Kết quả và giới hạn thực tế sẽ được ghi tại `.docs/T1_HANDOVER.md` sau kiểm thử.

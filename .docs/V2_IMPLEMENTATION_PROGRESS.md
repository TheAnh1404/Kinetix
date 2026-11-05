# Theo dõi triển khai roadmap V2

Ngày bắt đầu: 05/11/2026. Người dùng yêu cầu thực thi roadmap V2.

## Phạm vi và quyết định thực thi

- Giữ T1 Fuji/AVAX, username/password + Core, quorum thực ở contract. R2/R3 có phụ thuộc/policy riêng, không tự bật bridge, token hoặc tài trợ khi chưa đủ điều kiện.
- Giữ hạn mức ngày SHIELD chung toàn hũ và policy goal hiện tại; UI phải mô tả đúng thay vì âm thầm thay semantics.
- Nối đầy đủ các entry point đã có (cancel chore, goal settlement, ROSCA cho beneficiary), không dùng recovery để thêm thành viên mới.
- Recovery cần bằng chứng ví mới và receipt từng hũ, không thay ví bằng reset mật khẩu hay cập nhật DB đơn phương.
- Testnet/DB/mobile chỉ đánh dấu nghiệm thu khi chạy thật; không sửa manifest hoặc dữ liệu để làm xanh kiểm tra.

## Checklist thực thi

- [ ] S1: cấu hình chain/provisioning và capabilities app + contract.
- [ ] S2: retry/finality, operation journal, indexer/backfill và provenance.
- [ ] S3: contract policy/feature gates và regression.
- [ ] S4: workflow UI/API/worker đầy đủ cho feature T1.
- [ ] S5: recovery có scope/evidence và trạng thái partial.
- [ ] S6: compile/tests/typecheck/build, migration DB cô lập, Core/HTTPS/E2E.
- [ ] S7: candidate/verify/activation, doctor/readiness và runbook.

Các kết quả, lệnh kiểm tra và phụ thuộc còn thiếu được cập nhật theo từng giai đoạn.

# Docker và CI/CD Kinetix

## Khởi chạy

Từ thư mục gốc monorepo, với Docker Engine và Compose v2:

```sh
docker compose up -d --build
docker compose ps -a
docker compose logs --tail=100 backend worker migrate
```

Sau lần build đầu có thể dùng `docker compose up -d`. Frontend ở `http://localhost:3000`, API ở `http://localhost:4000/api/health`. `/api/ready` kiểm tra thêm kết nối database. Database và gateway không publish cổng ra máy host. Stack mới chưa có tài khoản; đăng ký và liên kết Core theo luồng ứng dụng. Không seed mật khẩu hoặc khóa ví thật trong image.

Cấu hình tùy chọn:

```powershell
Copy-Item .env.docker.example .env.docker
docker compose --env-file .env.docker up -d --build
```

`.env.docker` đã được Git ignore. Mật khẩu mặc định chỉ dành cho demo cục bộ; đặt mật khẩu riêng trước khi host. Nếu dùng ký tự đặc biệt trong PostgreSQL password, URL connection phải percent-encode tương ứng; bản Compose mặc định thích hợp với mật khẩu URL-safe. Đổi domain hoặc cổng frontend thì cập nhật `APP_ORIGIN` cho đúng origin được truy cập. `BACKEND_INTERNAL_URL` là tên biến BFF thật của repo; không dùng `BACKEND_API_BASE_URL` không được ứng dụng đọc.

## Topology và lựa chọn triển khai

```text
Browser -> frontend:3000 -> backend:4000 -> pgproxy:8080 -> postgres:5432
                                              ^
                                  worker / migrate
backend và worker -> Avalanche Fuji RPC
```

Có sáu service: postgres, pgproxy, migrate, backend, worker, frontend. PostgreSQL chờ healthy → gateway chờ healthy → migration chạy thành công → API/worker khởi động → frontend chờ API ready.

Project hiện dùng `@neondatabase/serverless` với giao thức PostgreSQL qua WebSocket. PostgreSQL Docker thông thường không cung cấp WebSocket. Vì vậy gateway cố định đích được thêm trên mạng nội bộ, dùng `ws` sẵn có, không cần thay driver cloud hay thêm dependency chưa được khóa. Không dùng gateway này như open proxy: đích TCP cố định từ cấu hình service, không nhận host/port từ người gọi. PostgreSQL vẫn xác thực từng kết nối.

`LOCAL_PG_WS_PROXY` chỉ dành cho mạng container tin cậy. Không cấu hình tùy chọn này khi dùng Neon cloud; kết nối cloud vẫn dùng transport bảo mật mặc định. Khi triển khai nhiều máy qua mạng không tin cậy, dùng kết nối database TLS/cloud phù hợp thay vì đưa gateway nội bộ ra Internet.

Hai Dockerfile đều có build context là thư mục gốc để giữ nguyên import `shared/`:

- Frontend: npm ci theo frontend lockfile, build Next standalone, trace root monorepo, copy cả static/public, chạy non-root. Runner bắt đầu bằng `node frontend/server.js`.
- Backend: npm ci theo root lockfile (root chứa công cụ compile và toàn bộ dependency backend), compile Solidity và TypeScript; prune dev dependencies; runner chỉ dùng JS đã compile. API, worker, migration và gateway dùng chung image. Các artifacts tạo trong builder được giữ để console triển khai Core hiện có không mất chức năng.
- Dùng Node 24 vì xác thực trong repo yêu cầu native Argon2 từ Node >=24.7; Node 20/22 trong bản kế hoạch ban đầu không phù hợp với mã hiện tại.

Standalone và static layout tuân theo [Next.js 14 output tracing](https://nextjs.org/docs/14/pages/api-reference/next-config-js/output). Điều kiện khởi động theo [Docker Compose startup order](https://docs.docker.com/compose/how-tos/startup-order). Kích thước image cần đo sau build; không coi 150 MB là số đã xác minh.

## Dữ liệu và migration

Volume `kinetix_pgdata` giữ PostgreSQL qua các lần recreate container. Service migration là tác vụ một lần và phải thành công trước khi ứng dụng chạy; migration runner có advisory lock và bảng lịch sử, chạy lại không nhân đôi migration.

```sh
docker compose exec backend npm run db:migrate
docker compose exec postgres pg_isready -U kinetix -d kinetix_db
docker compose stop
```

Không dùng `docker compose down -v` nếu cần giữ dữ liệu: `-v` xóa volume. CI dùng `-v` vì database của CI là disposable. Sao lưu trước khi nâng phiên bản database hoặc cập nhật schema trên môi trường vận hành.

Khi đổi deployment manifest, rebuild image để frontend/backend dùng cùng cấu hình `shared/deployment.json`. Container không nhận private key Core; giao dịch ví chung ký ở client. Nhật ký triển khai Core trong filesystem container cần được mount/sao lưu riêng nếu dùng chức năng triển khai contract qua console trên môi trường chạy lâu dài.

## Pipeline

`.github/workflows/ci.yml` chạy trên push/PR main/develop và có thể được gọi lại bởi workflow phát hành:

1. Compile, Solhint, toàn bộ Hardhat tests và root TypeScript.
2. Backend TypeScript, auth/backend acceptance với PostgreSQL service riêng, treasury PostgreSQL acceptance, treasury unit tests.
3. Frontend TypeScript và production standalone build.
4. Build hai image bằng Buildx cache; kiểm tra Compose; chạy stack; kiểm tra API, login, chặn API thiếu phiên đăng nhập và migration idempotency; dọn stack test kể cả khi lỗi.

Solhint hiện có các cảnh báo tồn tại trước thay đổi; gate chặn lỗi, không tự tắt rule hoặc giấu cảnh báo để tạo kết quả xanh. Test runner từ chối dùng database ứng dụng làm database test. Không có private key, wallet signature hay token triển khai production trong pipeline kiểm tra PR.

`.github/workflows/release-images.yml` được kích hoạt bằng tag `v*` hoặc thủ công. Nó gọi toàn bộ quality pipeline trước, build và smoke-test stack, rồi publish hai image vào GHCR bằng GITHUB_TOKEN giới hạn quyền `packages: write`. Image được gắn tag commit SHA để có thể chọn lại bản cũ. Không tự SSH hoặc triển khai vào máy chủ chưa được cấu hình.

```text
ghcr.io/<owner>/<repository>-frontend:sha-<commit>
ghcr.io/<owner>/<repository>-backend:sha-<commit>
```

Chưa push code/tag hoặc kích hoạt workflow trong phiên làm việc này. GitHub Actions phải chạy trên remote trước khi có thể khẳng định pipeline/container đã qua kiểm chứng thực tế.

## Kiểm tra thủ công khi có Docker

```sh
docker compose config --quiet
docker build -f docker/backend.Dockerfile -t kinetix-backend:test .
docker build -f docker/frontend.Dockerfile -t kinetix-frontend:test .
docker compose up -d --build --wait --wait-timeout 180
docker compose ps -a
curl http://localhost:4000/api/health
curl http://localhost:4000/api/ready
curl http://localhost:3000/login
docker compose exec backend npm run db:migrate
```

Máy làm việc hiện tại không có Docker CLI; không thể chạy `docker build`, `docker compose config` hoặc stack ở đây. YAML đã được parse cục bộ, TypeScript và Next standalone đã được build; các kiểm tra container thực tế nằm trong CI, không được coi là đã chạy.

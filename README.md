# Ban Mai Studio Booking

Ứng dụng đặt lịch chụp cho Ban Mai Studio, gồm frontend React/Vite và backend Node.js/Express.

## Thành phần chính

- Khách hàng: đăng ký, xác thực email, chọn gói và khung giờ, giữ lịch, thanh toán cọc và phần còn lại.
- Admin: quản lý booking, gói chụp, bộ ảnh, photographer, lịch studio, khoản thu và hàng đợi tích hợp.
- Photographer: xem lịch và các ca được phân công.
- SePay: nhận webhook giao dịch và tự động đối soát nội dung chuyển khoản.
- Supabase PostgreSQL: lưu dữ liệu ứng dụng qua `DATA_MODE=postgres`.
- Supabase Storage: lưu ảnh công khai khi `IMAGE_STORAGE=supabase`.
- Google Sheets và email SMTP: chạy qua worker/outbox của backend.

## Cấu trúc thư mục

```text
client/                 React/Vite frontend
server/                 Express API, database, integrations và worker
server/migrations/      Database migrations
server/scripts/         Kiểm tra DB, bootstrap admin, migrate ảnh
tests/                  E2E và test hợp đồng
docs/                   Hướng dẫn vận hành
```

## Yêu cầu

- Node.js 20 trở lên
- npm 10 trở lên
- Supabase project hiện tại
- PostgreSQL connection string trong `server/.env`

Không commit `server/.env`, file `.data` hoặc service-role key.

## Chạy local

```bash
npm install
npm run dev
```

- Frontend: <http://localhost:5173>
- Backend: <http://localhost:3000>
- Health check: <http://localhost:3000/api/health>

Chạy riêng từng workspace:

```bash
npm run dev --workspace client
npm run dev --workspace server
```

Khi `WORKER_MODE=in-process`, backend tự chạy worker hết hạn hold và xử lý outbox. Không chạy thêm `worker:dev` trong cùng cấu hình này.

## Chạy bằng Docker

Docker Compose chạy frontend qua Nginx và backend Node.js phía sau cùng một origin. `/api/*` và `/media/*` được Nginx chuyển tiếp tới service `api`, còn các route SPA được trả về `index.html`.

Chuẩn bị file `server/.env` với các giá trị của môi trường cần chạy, sau đó:

```bash
docker compose build
docker compose up -d
docker compose ps
```

Ứng dụng sẽ mở tại `http://localhost` và health check tại `http://localhost/health`. Xem log:

```bash
docker compose logs -f api
docker compose logs -f web
```

Nếu cổng 80 đã được sử dụng, chạy `WEB_PORT=8080 docker compose up -d` và mở `http://localhost:8080`.

Dừng hoặc dựng lại image:

```bash
docker compose down
docker compose up -d --build
```

Compose không dựng PostgreSQL vì dữ liệu đang dùng Supabase. Volume `banmai-media` chỉ giữ ảnh local trong trường hợp fallback; cấu hình hiện tại dùng Supabase Storage nên ảnh public không phụ thuộc container. Trước khi mở cổng Internet, đặt reverse proxy/HTTPS ở phía trước và đổi `PUBLIC_ORIGIN` sang domain thật.

## Biến môi trường quan trọng

Tạo `server/.env` từ môi trường triển khai và điền giá trị thật:

```env
NODE_ENV=development
PORT=3000
DATA_MODE=postgres
DATABASE_URL=...

IMAGE_STORAGE=supabase
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...
SUPABASE_STORAGE_BUCKET=studio-media

EMAIL_MODE=smtp
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=...
SMTP_PASSWORD=...
MAIL_FROM=...

PAYMENT_MODE=sepay
SEPAY_API_KEY=...
SEPAY_BANK_ACCOUNT=...
SEPAY_BANK_NAME=VietinBank
SEPAY_ACCOUNT_HOLDER=...

SHEETS_MODE=google
GOOGLE_APPLICATION_CREDENTIALS=...
SHEETS_SPREADSHEET_ID=...
SHEETS_TAB=Bookings
WORKER_MODE=in-process
```

`SUPABASE_SERVICE_ROLE_KEY` chỉ được đọc ở backend. Không đưa key này vào frontend, log, README hoặc mã nguồn public.

SMS hiện chưa được cấu hình và không nằm trong luồng xác nhận booking. Khi bật `NODE_ENV=production`, không để các integration ở chế độ mock; hãy cấu hình provider tương ứng hoặc cập nhật chính sách triển khai trước khi khởi động server.

Ảnh package và portfolio được upload vào bucket `studio-media` với URL công khai. Sau khi đổi từ local storage sang Supabase, có thể chạy:

```bash
npm run storage:migrate-images --workspace server
```

Script này có tính lặp lại an toàn và cập nhật URL ảnh trong catalog.

## SePay webhook

Webhook cần trỏ tới:

```text
https://<public-domain>/api/v1/payments/webhook
```

SePay phải gửi nội dung chuyển khoản có mã booking do hệ thống sinh ra, thường bắt đầu bằng `SEVQR`. Server trả HTTP 2xx khi webhook hợp lệ; kiểm tra log/ngrok và mục đối soát trong Admin nếu giao dịch chưa khớp.

## Luồng sử dụng nhanh

1. Customer đăng ký và xác thực email.
2. Customer chọn gói, ngày giờ và tạo booking giữ chỗ.
3. Customer chuyển khoản đúng số tiền và nội dung trên QR.
4. SePay gửi webhook, server xác minh và chuyển booking sang đã nhận cọc.
5. Admin phân photographer, hoàn tất buổi chụp và hệ thống tạo QR cho phần còn lại.
6. Giao dịch tiếp theo được đối soát để chuyển booking sang đã thanh toán đủ.

## Kiểm tra trước khi bàn giao

```bash
npm run build
npm run test:unit --workspace server
npm run test:integration --workspace server
npm run test:contract --workspace server
npm run db:check --workspace server
npm audit --omit=dev
```

Kiểm tra thủ công thêm:

- `/api/health` trả 200.
- Tạo booking mới và xác nhận QR hiển thị đúng số tiền, tài khoản và mã `SEVQR`.
- Gửi một webhook SePay thử và kiểm tra booking, số tiền đã thu, số dư còn lại.
- Hoàn tất buổi chụp ở Admin và xác nhận trang Customer hiển thị QR phần còn lại.
- Upload một ảnh package và một ảnh portfolio, sau đó mở URL public ở Supabase Storage.
- Xác nhận worker chỉ chạy một lần và không có outbox bị kẹt.

## Giao diện

UI hiện hành nằm trong `client/src/components/public`, `client/src/pages/public`, `client/src/pages/customer` và `client/src/pages/admin`. Theme chính là `studio-design.css` và `photographic-art.css`.

`client/src/styles.css` và `client/src/components/showcase` là prototype cũ, không được mount trong ứng dụng hiện tại.

Ảnh/font tĩnh của landing nằm trong `client/public`; danh sách nguồn được ghi tại [client/public/ASSETS.md](client/public/ASSETS.md).

## Tài liệu vận hành

- [docs/operations.md](docs/operations.md): email, database, worker và các thao tác vận hành.
- [client/public/ASSETS.md](client/public/ASSETS.md): nguồn ảnh và font giao diện.

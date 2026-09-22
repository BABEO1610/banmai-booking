# Ban Mai · Studio Booking Phase 1 demo

Monorepo gồm frontend React/Vite và backend Node.js/Express.

## Cấu trúc frontend

Các thư mục chính nằm trong `client/src`: `components`, `pages`, `layouts`, `hooks`, `services`, `contexts`, `constants`, `utils` và `assets`.

## Chạy dự án

```bash
npm install
npm run dev
```

Lệnh trên khởi chạy cả hai ứng dụng cùng lúc.

Khi `SHEETS_MODE=google` và `WORKER_MODE=in-process`, API tự chạy worker expiry/outbox và đồng bộ Google Sheets sau khi khởi động. Không chạy thêm `worker:dev` trong cấu hình này; worker tách tiến trình chỉ dùng sau khi triển khai cơ chế database lock/claim cho outbox.

- Frontend: http://localhost:5173
- Backend: http://localhost:3000
- Health check: http://localhost:3000/api/health

Backend có fallback `DATA_MODE=mock`, nhưng `server/.env` hiện đã được cấu hình `DATA_MODE=postgres`: state demo được lưu trong Supabase schema `app.demo_state` để restart không làm mất booking. Đây vẫn là demo state store, không phải mô hình production hoàn chỉnh. Không đưa file `.env` hoặc `.data` vào commit.

Tài khoản demo dùng chung mật khẩu `Demo1234!`:

- Admin: `admin@banmai.test`
- Photographer: `photographer.a@banmai.test`, `photographer.b@banmai.test`
- Customer: `customer.x@banmai.test`, `customer.y@banmai.test`

Admin mở `/admin`, nhập giới hạn nhận khách (ví dụ `2`) trước khi Customer đặt lịch. Customer mở `/book`, tạo hold 15 phút; Admin dùng `Mô phỏng cọc 500k` để chuyển booking sang `CONFIRMED`, rồi phân Photographer và có thể hoàn tất buổi chụp. Payment, SMS và Sheets vẫn là mock; email đăng ký/login dùng OTP qua Gmail SMTP trong `server/.env`; nút Customer không xác nhận tiền.

## Auth local

Auth relational dùng Supabase PostgreSQL qua Express session cookie. Đăng ký public luôn tạo Customer ở trạng thái pending; mã OTP gửi qua email và phải xác thực trước login. Account Admin/Photographer được tạo trong `/admin`, người nhận kích hoạt tại `/activate` bằng OTP rồi tự đặt mật khẩu.

Bootstrap Admin đầu tiên bằng email đã cấu hình trong `BOOTSTRAP_ADMIN_EMAIL`:

```bash
npm run auth:bootstrap-admin --workspace server
```

Lệnh idempotent, không reset hoặc seed database. Admin nhận mã kích hoạt qua email; không đặt mật khẩu qua script. Kiểm tra SMTP mà không gửi thư bằng `npm run mail:check --workspace server`; gửi thư thử có chủ đích theo hướng dẫn trong [docs/operations.md](docs/operations.md). Không commit `server/.env`.

## Bản thử giao diện studio

Trang mặc định là landing độc lập nền trắng/hồng sen với máy ảnh mirrorless 3D tương tác, nút tạm dừng và chụp thử minh họa; tôn trọng giảm chuyển động. Bộ ảnh và gói chụp ở các route riêng. Portfolio có chuyển concept và bộ sưu tập nhiều ảnh, mở xem toàn khung bằng bàn phím/mobile.

Chạy `npm run dev` ở thư mục gốc rồi mở http://localhost:5173. Thử Đổi góc nhìn để xem mặt trước/nghiêng/sau, hoặc mở `/portfolio` để xem bộ sưu tập. Chụp thử không dùng webcam/lưu ảnh. Tên và ảnh hiện dùng làm mẫu; nguồn ảnh/font nằm trong [client/public/ASSETS.md](client/public/ASSETS.md). Workflow booking demo được mô tả ở trên, thanh toán chưa thu tiền thật.

UI hiện hành ở `client/src/components/public`, `client/src/pages/public`, theme `studio-design.css` và `photographic-art.css`. `components/showcase`/`styles.css` là prototype lịch sử, không được mount trên landing hiện hành.

## Cấu hình chăm sóc khách hàng

Điền URL Zalo và Facebook chính thức vào [client/public/studio-contact.json](client/public/studio-contact.json), hai trường `zalo` và `facebook`. Dùng HTTPS: Zalo host `zalo.me`; Facebook `facebook.com`, `www.facebook.com`, `m.facebook.com` hoặc `fb.me`, kèm đường dẫn tới tài khoản/trang. Không đưa token, mật khẩu hay thông tin bí mật vào file công khai này. Hai giá trị hiện để trống vì chưa được cung cấp tài khoản chính thức.

Khu vực Liên hệ có trên footer chung và menu mọi trang. Kênh thiếu/sai cấu hình hiển thị chưa khả dụng, không tạo link giả. Link hợp lệ mở tab mới; không nhúng social SDK/tracker. Khi deploy, file nằm ở `dist/studio-contact.json`: sửa file public rồi build/deploy lại, hoặc cập nhật riêng file JSON trên static host. Đảm bảo host không rewrite đường dẫn JSON sang HTML và cấu hình CDN không giữ bản cũ.

## Kiểm tra

```bash
npm run build
npm run test:unit --workspace server
npm run test:e2e
```

`npm run db:check --workspace server` và `npm run db:migrate --workspace server` sẽ báo prerequisite rõ ràng khi `DATA_MODE=mock`. PostgreSQL/Supabase chỉ bật sau khi cấu hình dedicated DB, CA và migration URL trong `server/.env`; mock provider không được dùng cho production.

## Build frontend

```bash
npm run build
```

# Triển khai Ban Mai

## Thay đổi trước deploy

- Các trang và tab admin tải theo nhu cầu; trang đầu không tải Three.js. Nút “Khám phá máy ảnh 3D” giữ trải nghiệm tương tác.
- Nhân vật nhiếp ảnh gia mới là WebP nền trong suốt khoảng 20 kB. Không có vòng requestAnimationFrame, đi bộ hoặc lời thoại tự bật. Bấm để mở lời chào; có nút ẩn và hỗ trợ bàn phím.
- Gói chụp không dùng dữ liệu giả khi API lỗi. Đã bỏ tài khoản mẫu, nút mô phỏng cọc và copy demo khỏi giao diện chính.
- Admin tải dữ liệu theo tab; booking phân trang 25 mục, tối đa 100 mục/request. Calendar tải các trang trong khoảng lịch đang xem, bao gồm booking qua đêm.
- Upload album gửi từng ảnh; cả API giới hạn hai request upload đồng thời, 10 MB/ảnh. Sharp xác thực nội dung, giới hạn 25 megapixel, xoay theo EXIF, resize tối đa 2000px và lưu WebP. Nginx nhận tối đa 11 MB để đủ multipart overhead. Ảnh gốc cần được Studio lưu riêng nếu dùng làm nguồn chỉnh sửa.
- Font WOFF2 giữ đủ glyph tiếng Việt; ảnh stock có biến thể WebP 400/800px. Không thay đổi nguồn/quyền sử dụng của ảnh stock.
- Worker chỉ claim tối đa 5 sự kiện/lần; I/O Google Sheets chạy ngoài hàng đợi mutation. Claim có lease để khôi phục sau restart; không đánh dấu đã gửi qua fake adapter trong production.
- Snapshot PostgreSQL dùng compare-and-swap theo `updated_at`, trả 409 khi writer dùng phiên bản cũ. Worker nhàn rỗi không clone/stringify toàn bộ state mỗi 5 giây.
- Docker dùng Node 22 để tương thích yêu cầu của googleapis hiện tại; không copy test/source thiết kế vào runtime server. Nginx bật gzip, cache asset có hash một năm; HTML phải revalidate.

## Cấu hình bắt buộc

Giữ secret trong `server/.env` hoặc secret manager, không commit. Không dùng `.env.example` như cấu hình production nguyên trạng.

```dotenv
NODE_ENV=production
DATA_MODE=postgres
EMAIL_MODE=smtp
PAYMENT_MODE=sepay
SMS_MODE=disabled
SHEETS_MODE=google
WORKER_MODE=in-process
PUBLIC_ORIGIN=https://your-domain.example
TRUST_PROXY=true
```

Cần DATABASE_URL, SESSION_SECRET và EMAIL_CODE_HMAC_SECRET ngẫu nhiên ít nhất 32 ký tự, cấu hình SMTP, SEPAY_API_KEY, SEPAY_BANK_ACCOUNT và SEPAY_ACCOUNT_HOLDER. Nếu dùng Sheets: SHEETS_SPREADSHEET_ID và GOOGLE_APPLICATION_CREDENTIALS phải là đường dẫn **bên trong container** đến credentials được mount read-only. Có thể đặt SHEETS_MODE=disabled khi chưa sử dụng; các sự kiện được giữ chờ và không giả báo thành công.

Compose ép NODE_ENV=production và worker in-process. Web mặc định chỉ bind 127.0.0.1:80: dùng reverse proxy có HTTPS phía trước, chuyển Host và X-Forwarded-Proto đúng. Có thể đổi WEB_PORT; chỉ đổi WEB_BIND khi đã xác định rõ network ingress. Nginx chỉ nhận X-Forwarded-Proto=https từ ingress IP thuộc dải private/loopback. Không expose listener HTTP này trực tiếp Internet. Nếu TLS terminate bằng một container khác, nối vào network web và giữ listener nội bộ.

Cookie production dùng secure=true. Cần kiểm tra login/logout/CSRF qua chính domain HTTPS trước khi nhận khách. Nginx health hoặc build thành công chưa chứng minh TLS và session thực tế hoạt động.

Khởi tạo DB bằng migrations và bootstrap admin theo README. Production mới không tự seed tài khoản demo, ảnh mẫu hoặc tự ghi đè giá gói khi restart. Dữ liệu demo đã tồn tại phải được đối soát trước khi xóa; thay đổi này không tự xóa dữ liệu trong database.

## Giới hạn dữ liệu còn lại

**Chỉ vận hành một API instance với worker in-process trong giai đoạn này.** Compare-and-swap ngăn ghi đè snapshot nhưng không biến cache in-memory thành kiến trúc nhiều instance: đọc có thể cũ và mutation xung đột sẽ phải thử lại. Không chạy worker riêng hoặc scale replica.

Booking/payment/assignment vẫn nằm trong `app.demo_state`. Đây là giới hạn đã biết, chưa phải migration sang bảng quan hệ. Mỗi mutation có thay đổi vẫn clone/serialize state. Việc chuyển bảng cần backup, rehearsal với bản sao DB, đối soát tổng tiền và lịch, chiến lược cutover/rollback. Không tự chạy migration phá vỡ dữ liệu thật trong đợt cleanup này.

Audit và outbox chưa có retention tự động: không xóa lịch sử thu tiền để tiết kiệm dung lượng. Bước tiếp theo là tách các bảng nghiệp vụ/outbox/audit, index theo trạng thái/ngày, archive theo chính sách Studio. Trang danh sách đã giới hạn payload; truy vấn vẫn lọc trên snapshot in-memory.

Ảnh hero/stock và trang chính sách cần nội dung Studio duyệt; `studio-contact.json` cần URL liên hệ thật. Cấu hình/thiết kế này không tự xác nhận quyền sử dụng hoặc công bố chính sách kinh doanh.

## Kiểm tra

Kết quả tại ngày 2026-09-23:

- Build JS chính: 282.35 kB / gzip 90.29 kB (trước đó 531.01 / 166.20 kB). CSS chính: 67.23 kB. Vite vẫn cảnh báo chunk 3D 762.85 kB, nhưng chunk này chỉ tải khi bấm mở trải nghiệm.
- 50 unit/contract tests đạt; 1 test PostgreSQL thật trên container DB cô lập đạt (writer cũ không ghi đè writer mới).
- Bộ 96 ca e2e: lượt đầy đủ đạt 88 ca; sửa/cập nhật 8 ca còn lại và chạy lại 13 ca liên quan, tất cả đạt. Đã xem ảnh desktop 1440px và mobile 390px; kiểm tra layout thêm 320px.
- Hai Docker image build thành công trên Node 22; `nginx -t` đạt.
- Smoke qua Nginx container đạt: HTML no-cache, gzip/immutable JS, login/CSRF trong môi trường test, upload PNG trên 1 MB thành WebP, đọc media và chặn request 12 MB bằng 413.
- Chưa chạy trên domain HTTPS hoặc gọi SMTP/SePay/Google Sheets thật. Chưa đo tải production/Lighthouse; các số liệu bundle không phải kết luận về latency thực tế.

```powershell
npm run build
# Bộ e2e dùng API mock local, thư mục dữ liệu tạm, port 3107/4175;
# không sử dụng DATABASE_URL hoặc dữ liệu ứng dụng đang chạy.
npx playwright test --config playwright.production.config.js
docker build -f docker/server.Dockerfile -t banmai-api .
docker build -f docker/client.Dockerfile -t banmai-web .
```

Unit/contract tests phải chạy với NODE_ENV=test, DATA_MODE/EMAIL_MODE/PAYMENT_MODE/SHEETS_MODE/SMS_MODE=mock và BANMAI_DATA_DIR là thư mục tạm riêng. Test PostgreSQL bổ sung chỉ dùng BANMAI_REVIEW_DATABASE_URL trỏ database cô lập tên `banmai_review_test`; không dùng DATABASE_URL production.

API GET `/api/v1/bookings` và `/api/v1/admin/bookings` trả `data: { items, page, pageSize, total, pages }`; consumer ngoài repo cần cập nhật nếu có.

## Nhân vật

Asset cuối: `client/public/images/studio-photographer-v2.webp`. Tạo bằng công cụ imagegen tích hợp, sau đó resize/encode WebP bằng Sharp; không thay thế ảnh nhân sự thật.

Prompt đã dùng:

> Create a production website character asset, isolated on genuinely transparent background, full body entirely visible including shoes. A young adult Vietnamese male studio photographer, friendly subtle smile, natural adult body proportions with slightly expressive illustrated head, dark softly tousled hair, warm believable face and hands, burgundy wine linen overshirt over ivory tee, charcoal straight trousers and brown leather shoes, holding a small black vintage-style mirrorless camera with both hands at waist/chest, relaxed three-quarter standing pose. Artistic sophisticated editorial gouache and colored pencil illustration with soft realistic volume, delicate textured brushwork, warm natural studio light. Restrained ivory, dusty rose, burgundy, warm skin and charcoal palette suitable for elegant Ban Mai photography studio website. Readable silhouette at 110px tall. Single person only, no scenery, no floor, no text, no speech bubble, no border, no watermark, no pixel art, no chibi, no cartoon huge eyes. Center character with narrow transparent margin, portrait composition. Save usable transparent PNG asset.

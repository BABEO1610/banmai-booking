# Deploy Ban Mai lên Netlify bằng kéo thả

## Gói này gồm gì

`netlify-drop/` là frontend React đã build. Bạn có thể kéo cả thư mục này vào Netlify Drop, hoặc giải nén `BanMai-Netlify.zip` rồi kéo các file bên trong ZIP vào trang Netlify Drop.

## Cần có backend trước khi website hoạt động đầy đủ

Netlify chỉ phục vụ giao diện tĩnh trong gói này. API Express, PostgreSQL, email, thanh toán SePay và worker không nằm trong gói và không chạy trên Netlify Drop. Hãy deploy backend riêng (ví dụ VPS hoặc nền tảng chạy Node.js liên tục), cấu hình PostgreSQL/Supabase và các biến môi trường production theo `PRODUCTION.md`.

Trước khi upload, mở `netlify-drop/netlify-config.js` và đặt URL API công khai:

```js
window.BANMAI_API_BASE_URL = 'https://api.example.com'
```

Dùng HTTPS. Không đặt secret, DATABASE_URL hoặc Supabase service-role key ở file này.

## CORS, cookie và domain

Trên backend, đặt `PUBLIC_ORIGIN` đúng bằng URL site Netlify, chẳng hạn `https://banmai-studio.netlify.app`, rồi restart API. `PUBLIC_ORIGIN` cũng là origin CORS được backend cho phép.

Phiên đăng nhập dùng cookie `SameSite=Lax`. Hãy ưu tiên gắn domain riêng cùng site cho frontend và API, ví dụ `www.example.com` và `api.example.com`. Nếu dùng domain Netlify và API trên một domain hoàn toàn khác, trình duyệt có thể chặn cookie phiên bên thứ ba và đăng nhập không duy trì được.

## Deploy

1. Deploy và kiểm tra backend: `https://api.example.com/api/health` phải trả lời.
2. Sửa `netlify-drop/netlify-config.js` với URL API thật.
3. Kéo thả toàn bộ nội dung `netlify-drop/` lên Netlify Drop.
4. Cấu hình `PUBLIC_ORIGIN` backend theo domain site Netlify cuối cùng.
5. Mở site, thử tải trang chủ, đăng nhập và kiểm tra DevTools không báo lỗi CORS/cookie.

File `_redirects` trong gói hỗ trợ React Router bằng cách trả `index.html` cho các URL trang con.

# Assets của bản thử giao diện

Ban Mai là tên minh họa trong prototype, chưa xác nhận nhận diện Studio. Ảnh stock dưới đây dùng thử giao diện, không là portfolio Studio. Đã download local để frontend không phụ thuộc CDN ảnh.

| File | Nguồn |
| --- | --- |
| images/daylight.jpg | https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=1100&q=85 |
| images/portrait.jpg | https://images.unsplash.com/photo-1531123897727-8f129e1688ce?auto=format&fit=crop&w=1100&q=85 |
| images/together.jpg | https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1100&q=85 |
| images/portrait-soft.jpg | https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?auto=format&fit=crop&w=1000&q=82 |
| images/portrait-close.jpg | https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=1000&q=82 |
| images/color-fashion.jpg | https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&w=1000&q=82 |
| images/color-street.jpg | https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1000&q=82 |
| images/together-close.jpg | https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?auto=format&fit=crop&w=1000&q=82 |
| images/together-ceremony.jpg | https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=1000&q=82 |

License: [Unsplash](https://unsplash.com/license), kiểm tra lại 2026-09-17. Thay bằng ảnh Studio có quyền sử dụng trước khi coi prototype là portfolio thật. Bộ sưu tập demo dùng 3 ảnh khác nhau/concept, không giả các crop của cùng một ảnh thành nhiều sản phẩm.

Máy ảnh mirrorless 3D được dựng bằng geometry gốc trong code, không dùng model tải ngoài hay sao chép model của hãng. Texture cao su/nhãn/màn hình sinh bằng canvas tại máy; môi trường phản chiếu dùng RoomEnvironment/PMREM của Three.js, không dùng file HDR hoặc dịch vụ asset ngoài. Minh họa photographer SVG là đồ họa gốc dùng khi WebGL không khả dụng. Không truy cập webcam hay tạo ảnh thật. Đây là minh họa thiết bị, không phải ảnh sản phẩm thật.

Font Be Vietnam Pro Regular/SemiBold từ [Google Fonts repository](https://github.com/google/fonts/tree/main/ofl/bevietnampro), self-host TTF đủ glyph tiếng Việt. SIL Open Font License đính kèm fonts/OFL-BeVietnamPro.txt; có thể chuyển WOFF2/subset khi tối ưu production.

Font trưng bày Playfair Display regular/italic variable từ [Google Fonts repository](https://github.com/google/fonts/tree/main/ofl/playfairdisplay), self-host TTF để tiêu đề tiếng Việt không bị trộn glyph từ font hệ thống. SIL Open Font License đính kèm fonts/OFL-PlayfairDisplay.txt.

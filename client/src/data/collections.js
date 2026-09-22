// Local stock collections, explicitly NOT Studio work. API galleries take precedence.
const photo = (src, alt, caption) => ({ src: `/images/${src}.jpg`, alt: `Ảnh minh họa: ${alt}`, caption, demo: true })
const collections = {
  portrait: {
    story: 'Một ánh nhìn, một khoảng lặng. Những gợi ý chân dung từ ánh sáng mềm đến ánh xanh có chiều sâu — để bạn tìm ra cách thể hiện mình thích nhất.',
    mood: ['Chân dung', 'Ánh sáng mềm', 'Cảm xúc'],
    images: [photo('daylight', 'người phụ nữ trên phông tối', 'Một khoảng lặng'), photo('portrait-close', 'chân dung người phụ nữ dưới ánh xanh', 'Ánh sáng kể chuyện'), photo('portrait-soft', 'chân dung ngoài trời bên khung cửa xanh', 'Tự nhiên, rất riêng')],
  },
  color: {
    story: 'Màu sắc, trang phục và thần thái cùng kể một câu chuyện. Khám phá những gợi ý thời trang nổi bật, từ sắc hồng vui tươi đến những góc phố đầy cá tính.',
    mood: ['Thời trang', 'Cá tính', 'Màu sắc'],
    images: [photo('portrait', 'người phụ nữ mặc áo nhiều màu trên nền hồng', 'Tự tin là chính mình'), photo('color-fashion', 'người phụ nữ với phong cách thời trang ngoài trời', 'Một dấu ấn khác biệt'), photo('color-street', 'người phụ nữ mặc áo khoác, kính râm giữa phố', 'Sắc riêng nơi phố')],
  },
  together: {
    story: 'Một cái nắm tay, một nụ cười, một ngày muốn nhớ. Bộ ảnh cảm hứng về sự gắn kết, khoảnh khắc đời thường và những dịp đặc biệt của hai người.',
    mood: ['Chung đôi', 'Ấm áp', 'Tự nhiên'],
    images: [photo('together', 'đôi uyên ương và bó hoa trong nắng', 'Ngày có nhau'), photo('together-close', 'hai người tạo hình trái tim bằng tay trước hoàng hôn', 'Giữ một khoảnh khắc'), photo('together-ceremony', 'cặp đôi trong lễ cưới ngoài trời với bóng bay', 'Một ngày muốn nhớ')],
  },
}

export function getCollection(item) {
  if (Array.isArray(item.images) && item.images.length) {
    const images = item.images.map((image) => typeof image === 'string' ? { src: image, alt: item.name, caption: item.name } : image).filter((image) => image?.src)
    if (images.length) return { story: item.description, mood: item.mood || [], images, demo: images.some((image) => image.demo) }
  }
  // Only supplement the known seed covers. Do not mix stock into an unknown real collection.
  const cover = { portrait: '/images/daylight.jpg', color: '/images/portrait.jpg', together: '/images/together.jpg' }[item.id]
  if (cover === item.image && collections[item.id]) return { ...collections[item.id], demo: true }
  return { story: item.description, mood: [], images: [{ src: item.image, alt: item.alt || item.name, caption: item.name }], demo: !!item.demo }
}

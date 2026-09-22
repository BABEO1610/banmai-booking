import { Link } from 'react-router-dom'
import { vnd } from '../../hooks/useCatalog.js'
import { getCollection } from '../../data/collections.js'

export function PortfolioGrid({ items }) {
  return <div className="editorial-grid">{items.map((item, index) => <Link className={`editorial-card editorial-${index % 3}`} to={`/portfolio?concept=${encodeURIComponent(item.id)}`} key={item.id}>
    <div className="editorial-image"><img src={item.image} alt={item.name} loading="lazy" width="600" height="800" /><span className="image-open" aria-hidden="true">↗</span></div>
    <div className="editorial-label"><span className="frame-number">0{index + 1}</span><h3>{item.name}</h3><span aria-hidden="true">↗</span></div><p className="collection-card-note">{getCollection(item).images.length} ảnh · Khám phá bộ sưu tập</p>
  </Link>)}</div>
}

export function PackageCards({ items }) {
  const groups = [...new Map(items.map((pkg) => [pkg.peopleCount || pkg.id, items.filter((item) => (item.peopleCount || item.id) === (pkg.peopleCount || pkg.id))])).values()]
  return <><div className="package-constellation">{groups.map((group, index) => {
    const first = group[0]
    return <article className="package-orbit" key={first.peopleCount || first.id}>
      <div className="package-orbit-image"><img src={first.image || '/images/portrait-soft.jpg'} alt="" loading="lazy" /><span className="package-orbit-number">0{index + 1}</span></div>
      <div className="package-orbit-body"><div className="package-meta"><span>{first.peopleCount === 1 ? 'Cá nhân' : first.peopleCount ? `Nhóm ${first.peopleCount} người` : 'Gói mới'}</span><span>{first.peopleCount ? 'Giá trọn nhóm' : 'Gói tùy chỉnh'}</span></div><h3>{first.peopleCount === 1 ? 'Một khoảng riêng' : first.peopleCount ? 'Cùng nhau giữ hình' : first.name}</h3><p className="package-description">{first.description}</p>
        <div className="package-variant-list">{group.map((pkg) => <div className={`package-variant ${pkg.bookable ? '' : 'is-closed'}`} key={pkg.id}><div><strong>{pkg.period === 'half' ? 'Nửa ngày' : 'Cả ngày'}</strong><small>{pkg.timeLabel}</small></div><b>{vnd(pkg.price.amount)}</b>{pkg.bookable ? <Link className="package-variant-link" to={`/book?package=${encodeURIComponent(pkg.id)}`}>Chọn ↗</Link> : <span className="package-closed-label">Chưa mở</span>}</div>)}</div>
        <details className="package-benefits"><summary>Xem những gì đã bao gồm</summary><ul>{first.benefits?.map((benefit) => <li key={benefit}>{benefit}</li>)}</ul></details>
      </div>
    </article>
  })}</div><p className="footnote">Cọc giữ lịch: 500.000đ · Giá hiển thị là giá trọn nhóm.</p></>
}

export function CatalogNotice({ offline }) {
  return offline ? <p className="catalog-notice" role="status">Chưa tải được dữ liệu Studio. Đang hiển thị nội dung minh họa; vui lòng thử lại trước khi đặt lịch.</p> : null
}

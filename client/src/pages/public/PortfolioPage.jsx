import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { Link, useSearchParams } from 'react-router-dom'
import PublicLayout from '../../components/public/PublicLayout.jsx'
import { PortfolioGrid } from '../../components/public/CatalogSections.jsx'
import CollectionLightbox from '../../components/public/CollectionLightbox.jsx'
import StudioIcon from '../../components/public/StudioIcon.jsx'
import { getCollection } from '../../data/collections.js'
import usePortfolio from '../../hooks/usePortfolio.js'

function Collection({ item, previous, next, choose }) {
  const collection = getCollection(item)
  const [openPhoto, setOpenPhoto] = useState(null)
  const cover = collection.images[0]
  const photoButton = (image, index, className) => <button className={`collection-photo ${className || ''}`} onClick={() => setOpenPhoto(index)} aria-label={`Xem ảnh lớn: ${image.caption || item.name} (${index + 1}/${collection.images.length})`} key={image.src}>
    <img src={image.src} alt={image.alt} loading={index ? 'lazy' : 'eager'} width="1000" height="1250" /><span className="photo-expand" aria-hidden="true"><StudioIcon /> Xem ảnh</span>
  </button>
  return <section className="concept-collection" aria-labelledby="collection-title">
    <div className="collection-navigation"><span>{collection.images.length} khung hình {collection.demo ? 'cảm hứng' : 'trong bộ sưu tập'}</span><div><button className="concept-prev" disabled={!previous} onClick={() => choose(previous.id)} aria-label={`Concept trước${previous ? `: ${previous.name}` : ''}`}><StudioIcon /><span>Concept trước</span></button><button disabled={!next} onClick={() => choose(next.id)} aria-label={`Concept tiếp theo${next ? `: ${next.name}` : ''}`}><span>Concept sau</span><StudioIcon /></button></div></div>
    <div className="collection-opening">{photoButton(cover, 0, 'collection-cover')}<div className="collection-story"><p className="studio-kicker">Một bộ sưu tập, một cảm xúc</p><h2 id="collection-title">{item.name}</h2><p>{collection.story || 'Tìm góc nhìn và cảm hứng cho buổi chụp của bạn.'}</p><ul className="mood-tags" aria-label="Phong cách">{collection.mood.map((mood) => <li key={mood}>{mood}</li>)}</ul><Link className="primary-button" to="/book">Hẹn buổi chụp của bạn <StudioIcon /></Link>{collection.demo && <p className="collection-disclaimer">Ảnh stock minh họa để tham khảo vibe, chưa phải tác phẩm của Studio hay cam kết thành phẩm.</p>}</div></div>
    <div className="collection-photographs">{collection.images.slice(1).map((image, i) => <figure key={image.src}>{photoButton(image, i + 1)}<figcaption><span>{String(i + 2).padStart(2, '0')}</span>{image.caption}</figcaption></figure>)}</div>
    <p className="collection-endnote">Bạn thích góc nhìn này? Hãy mang cảm hứng đó đến buổi chụp — chúng mình sẽ cùng tìm cách kể câu chuyện của riêng bạn.</p>
    {openPhoto !== null && <CollectionLightbox collection={collection} name={item.name} initialIndex={openPhoto} onClose={() => setOpenPhoto(null)} />}
  </section>
}

export default function PortfolioPage() {
  const { items, loading, error, retry } = usePortfolio()
  const catalog = { portfolio: items }
  const [params, setParams] = useSearchParams()
  const index = catalog.portfolio.findIndex((item) => item.id === params.get('concept'))
  const selected = catalog.portfolio[index]
  const previousIndex = useRef(index)
  const [direction, setDirection] = useState(1)
  const reduced = useReducedMotion()
  useEffect(() => { setDirection(index >= previousIndex.current ? 1 : -1); previousIndex.current = index }, [index])
  const choose = (id) => {
    const nextIndex = catalog.portfolio.findIndex((item) => item.id === id)
    setDirection(nextIndex >= index ? 1 : -1)
    setParams(id ? { concept: id } : {})
  }
  const key = selected?.id || 'all'
  return <PublicLayout><main className="catalog-page portfolio-page"><div className="page-heading"><p className="eyebrow">Bộ ảnh / Cảm hứng cho buổi chụp</p><h1>Một khung hình.<br /><em>Nhiều cảm xúc.</em></h1><p>Chọn một concept. Dạo qua từng khung hình. Tìm cảm giác thuộc về bạn.</p><p className="muted-note">Các bộ sưu tập mặc định dùng ảnh minh họa; bộ ảnh thật sẽ được Studio cập nhật.</p></div>{error && <div className="catalog-notice" role="alert">{error} <button type="button" onClick={retry} disabled={loading}>Thử lại</button></div>}
    {loading && <p role="status">Đang tải bộ ảnh…</p>}
    {!loading && !error && !items.length && <p role="status">Chưa có bộ ảnh được xuất bản.</p>}
    <div className="filter-tabs portfolio-tabs" role="group" aria-label="Lọc concept"><button className={!selected ? 'active' : ''} aria-pressed={!selected} onClick={() => choose(null)}>{!selected && <motion.span className="concept-tab-highlight" layoutId="concept-highlight" transition={{ duration: reduced ? 0 : .25 }} />}<span>Tất cả</span></button>{catalog.portfolio.map((item) => <button className={selected?.id === item.id ? 'active' : ''} aria-pressed={selected?.id === item.id} onClick={() => choose(item.id)} key={item.id}>{selected?.id === item.id && <motion.span className="concept-tab-highlight" layoutId="concept-highlight" transition={{ duration: reduced ? 0 : .25 }} />}<span>{item.name}</span></button>)}</div>
    <div className="portfolio-transition"><AnimatePresence mode="wait" custom={direction} initial={false}><motion.div key={key} className="concept-transition" data-concept={key} custom={direction} variants={{ enter: (d) => ({ opacity: 0, x: reduced ? 0 : d * 40 }), center: { opacity: 1, x: 0 }, exit: (d) => ({ opacity: 0, x: reduced ? 0 : -d * 28 }) }} initial="enter" animate="center" exit="exit" transition={{ duration: reduced ? 0 : .24, ease: [.22, 1, .36, 1] }}>
      {selected ? <Collection item={selected} previous={catalog.portfolio[(index - 1 + catalog.portfolio.length) % catalog.portfolio.length]} next={catalog.portfolio[(index + 1) % catalog.portfolio.length]} choose={choose} /> : <PortfolioGrid items={catalog.portfolio} />}
    </motion.div></AnimatePresence></div>
  </main></PublicLayout>
}

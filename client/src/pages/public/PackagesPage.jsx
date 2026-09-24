import PublicLayout from '../../components/public/PublicLayout.jsx'
import { CatalogNotice, PackageCards } from '../../components/public/CatalogSections.jsx'
import useCatalog from '../../hooks/useCatalog.js'

export default function PackagesPage() {
  const { catalog, offline, loading, retry } = useCatalog()
  return <PublicLayout><main className="catalog-page"><div className="page-heading"><p className="eyebrow">Gói chụp / Ban Mai Studio</p><h1>Dành thời gian<br />cho <em>những điều đẹp.</em></h1><p>Chụp không giới hạn số ảnh. Quota chỉnh ảnh tính riêng theo từng gói.</p></div><CatalogNotice offline={offline} />{offline && <button className="secondary-button" onClick={retry}>Thử lại</button>}{loading ? <p role="status">Đang tải gói chụp…</p> : !offline && <PackageCards items={catalog.packages} />}</main></PublicLayout>
}

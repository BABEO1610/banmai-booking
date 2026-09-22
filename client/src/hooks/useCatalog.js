import { useEffect, useState } from 'react'
import api from '../services/api.js'
import { concepts } from '../data/showcase.js'
import { bookingPackages } from '../../../shared/booking-packages.js'

export const demoCatalog = {
  packages: bookingPackages.map((pkg) => ({ ...pkg, bookable: false, bookableReason: 'Vui lòng tải lại dữ liệu để kiểm tra lịch', price: { amount: String(pkg.priceVnd), currency: 'VND' } })),
  portfolio: concepts,
}

export const vnd = (amount) => `${new Intl.NumberFormat('vi-VN').format(Number(amount))}đ`

export default function useCatalog() {
  const [catalog, setCatalog] = useState(demoCatalog)
  const [offline, setOffline] = useState(false)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    let active = true
    api.catalog().then((data) => { if (active) { setCatalog(data); setOffline(false) } })
      .catch(() => { if (active) setOffline(true) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])
  return { catalog, offline, loading }
}

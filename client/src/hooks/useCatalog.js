import { useCallback, useEffect, useState } from 'react'
import api from '../services/api.js'
export const vnd = (amount) => `${new Intl.NumberFormat('vi-VN').format(Number(amount))}đ`
export default function useCatalog() {
  const [catalog, setCatalog] = useState({ packages: [] })
  const [offline, setOffline] = useState(false)
  const [loading, setLoading] = useState(true)
  const [revision, setRevision] = useState(0)
  const retry = useCallback(() => setRevision(value => value + 1), [])
  useEffect(() => {
    let active = true
    setLoading(true); setOffline(false)
    api.request('/packages').then(packages => { if (active) setCatalog({ packages }) })
      .catch(() => { if (active) { setCatalog({ packages: [] }); setOffline(true) } })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [revision])
  return { catalog, offline, loading, retry }
}

import { useCallback, useEffect, useState } from 'react'
import api from '../services/api.js'

export default function usePortfolio() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [revision, setRevision] = useState(0)
  const retry = useCallback(() => setRevision((value) => value + 1), [])

  useEffect(() => {
    let active = true
    let pending = false
    const refresh = async () => {
      if (pending) return
      pending = true
      setLoading(true)
      try {
        const data = await api.request('/portfolio')
        if (active) { setItems(data); setError('') }
      } catch {
        if (active) setError('Không tải được bộ ảnh mới nhất. Vui lòng thử lại.')
      } finally {
        pending = false
        if (active) setLoading(false)
      }
    }
    const onVisible = () => { if (document.visibilityState === 'visible') refresh() }
    refresh()
    window.addEventListener('focus', refresh)
    window.addEventListener('online', refresh)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      active = false
      window.removeEventListener('focus', refresh)
      window.removeEventListener('online', refresh)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [revision])

  return { items, loading, error, retry }
}

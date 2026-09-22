import { AppError } from '../middleware/error.middleware.js'

export function normalizeLocation(input = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new AppError(400, 'INVALID_LOCATION', 'Địa điểm không hợp lệ')
  const text = (key, max) => {
    if (input[key] != null && (typeof input[key] !== 'string' || input[key].length > max)) throw new AppError(400, 'INVALID_LOCATION', `Thông tin ${key} quá dài hoặc không hợp lệ`)
    return (input[key] || '').trim()
  }
  const location = { name: text('name', 250), address: text('address', 1000), mapsUrl: text('mapsUrl', 2000), meetingNotes: text('meetingNotes', 1000), source: text('source', 30) || 'manual' }
  if (!['manual', 'osm', 'pin', 'undecided'].includes(location.source)) throw new AppError(400, 'INVALID_LOCATION', 'Nguồn địa điểm không hợp lệ')
  if (input.lat != null || input.lng != null) {
    if (typeof input.lat !== 'number' || typeof input.lng !== 'number' || !Number.isFinite(input.lat) || !Number.isFinite(input.lng) || Math.abs(input.lat) > 90 || Math.abs(input.lng) > 180) throw new AppError(400, 'INVALID_LOCATION', 'Tọa độ không hợp lệ')
    location.lat = input.lat; location.lng = input.lng
    location.mapsUrl = `https://www.openstreetmap.org/?mlat=${input.lat}&mlon=${input.lng}#map=16/${input.lat}/${input.lng}`
    location.osmId = text('osmId', 80)
  } else if (location.mapsUrl) {
    let url
    try { url = new URL(location.mapsUrl) } catch { throw new AppError(400, 'INVALID_LOCATION', 'Link bản đồ không hợp lệ') }
    if (url.protocol !== 'https:' || url.username || url.password || !['www.openstreetmap.org', 'openstreetmap.org', 'maps.google.com', 'google.com', 'www.google.com', 'maps.app.goo.gl', 'goo.gl'].includes(url.hostname)) throw new AppError(400, 'INVALID_LOCATION', 'Chỉ dùng link HTTPS của OpenStreetMap hoặc Google Maps')
  }
  return location
}

export function createLocationSearch({ fetcher = fetch, clock = Date.now, endpoint = 'https://nominatim.openstreetmap.org/search', userAgent = 'BanMaiStudioBooking/1.0' } = {}) {
  const cache = new Map()
  let nextAllowed = 0
  let busy = false
  return async (query) => {
    if (typeof query !== 'string' || query.trim().length < 3 || query.trim().length > 150) throw new AppError(400, 'INVALID_QUERY', 'Nhập tên địa điểm từ 3 đến 150 ký tự')
    const q = query.trim().replace(/\s+/g, ' ')
    const key = q.toLocaleLowerCase('vi')
    const cached = cache.get(key)
    if (cached && cached.expires > clock()) return cached.value
    if (busy || clock() < nextAllowed) throw new AppError(429, 'SEARCH_BUSY', 'Đang có lượt tìm kiếm khác. Vui lòng thử lại sau vài giây.')
    busy = true; nextAllowed = clock() + 1100
    try {
      const url = new URL(endpoint)
      url.search = new URLSearchParams({ q, format: 'jsonv2', limit: '5', countrycodes: 'vn', 'accept-language': 'vi' }).toString()
      const response = await fetcher(url, { headers: { 'User-Agent': userAgent, Accept: 'application/json' }, signal: AbortSignal.timeout(8000) })
      if (!response.ok) throw new Error('Map provider unavailable')
      const body = await response.json()
      if (!Array.isArray(body)) throw new Error('Invalid map response')
      const value = body.filter((p) => Number.isFinite(Number(p.lat)) && Number.isFinite(Number(p.lon)) && Math.abs(Number(p.lat)) <= 90 && Math.abs(Number(p.lon)) <= 180).slice(0, 5).map((p) => ({ name: String(p.name || p.display_name || '').slice(0, 250), address: String(p.display_name || '').slice(0, 1000), lat: Number(p.lat), lng: Number(p.lon), osmId: `${p.osm_type || ''}:${p.osm_id || ''}`, source: 'osm' }))
      if (cache.size >= 300) cache.delete(cache.keys().next().value)
      cache.set(key, { value, expires: clock() + 86400000 })
      return value
    } catch {
      throw new AppError(503, 'MAP_SEARCH_UNAVAILABLE', 'Chưa tìm được địa điểm lúc này. Bạn có thể thử lại hoặc nhập địa chỉ thủ công.')
    } finally { busy = false }
  }
}

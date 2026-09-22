// Public social links only; never put access tokens or server credentials here.
const hosts = { zalo: ['zalo.me'], facebook: ['facebook.com', 'www.facebook.com', 'm.facebook.com', 'fb.me'] }
export function socialUrl(channel, value) {
  if (typeof value !== 'string' || !hosts[channel]) return null
  try {
    const url = new URL(value.trim())
    if (url.protocol !== 'https:' || url.username || url.password || url.port || !hosts[channel].includes(url.hostname)) return null
    if (url.pathname === '/' && !url.search) return null
    return url.href
  } catch { return null }
}

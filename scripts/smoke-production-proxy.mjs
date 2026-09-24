import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import sharp from 'sharp'

const origin = process.env.REVIEW_ORIGIN || 'http://127.0.0.1:4186'
if (!['127.0.0.1', 'localhost'].includes(new URL(origin).hostname)) throw Error('Review smoke test is local-only')
const home = await fetch(origin)
assert.equal(home.headers.get('cache-control'), 'no-cache')
const html = await home.text()
const asset = /src="(\/assets\/[^" ]+\.js)"/.exec(html)[1]
const js = await fetch(origin + asset, { headers: { 'accept-encoding': 'gzip' } })
assert.equal(js.headers.get('content-encoding'), 'gzip')
assert.match(js.headers.get('cache-control'), /immutable/)
const health = await (await fetch(origin + '/api/health')).json()
assert.equal(health.environment, 'test', 'Never authenticate demo users against a real deployment')
assert.equal(health.dataMode, 'mock')
const login = await fetch(origin + '/api/v1/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: 'admin@banmai.test', password: 'Demo1234!' }) })
assert.equal(login.status, 200)
const { data } = await login.json()
const cookie = login.headers.getSetCookie().map(value => value.split(';')[0]).join('; ')
const bytes = await sharp(crypto.randomBytes(1200 * 1000 * 3), { raw: { width: 1200, height: 1000, channels: 3 } }).png().toBuffer()
assert.ok(bytes.length > 1024 * 1024)
const form = new FormData()
form.append('image', new Blob([bytes], { type: 'image/png' }), 'review.png')
const uploaded = await fetch(origin + '/api/v1/admin/catalog/packages/image', { method: 'POST', headers: { cookie, 'x-csrf-token': data.csrfToken }, body: form })
assert.equal(uploaded.status, 201, await uploaded.clone().text())
const image = await uploaded.json()
assert.match(image.data.image, /\.webp$/)
assert.equal((await fetch(origin + image.data.image)).status, 200)
const tooLarge = await fetch(origin + '/api/v1/admin/catalog/packages/image', { method: 'POST', headers: { cookie, 'x-csrf-token': data.csrfToken }, body: Buffer.alloc(12 * 1024 * 1024) })
assert.equal(tooLarge.status, 413)
console.log('PASS: HTML revalidation, gzip, immutable JS, session/CSRF, >1MB upload converted to WebP, media retrieval, proxy 413 limit')

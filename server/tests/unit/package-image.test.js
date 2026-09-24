import sharp from 'sharp'
import test from 'node:test'
import assert from 'node:assert/strict'
import express from 'express'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { createPackageImageRouter } from '../../src/routes/package-image.routes.js'
import { errorHandler } from '../../src/middleware/error.middleware.js'
import { detectImageExtension, uploadPublicImage } from '../../src/services/storage/public-image.storage.js'
import { config } from '../../src/config/env.js'

test('public image detector accepts only supported image signatures', () => {
  assert.equal(detectImageExtension(Buffer.from([0xff, 0xd8, 0xff])), 'jpg')
  assert.equal(detectImageExtension(Buffer.from([137,80,78,71,13,10,26,10])), 'png')
  assert.equal(detectImageExtension(Buffer.from('RIFFxxxxWEBP')), 'webp')
  assert.equal(detectImageExtension(Buffer.from('<svg/>')), null)
})

test('Supabase mode uploads to a public bucket and returns a public URL', async () => {
  const previous = { imageStorage: config.imageStorage, supabaseUrl: config.supabaseUrl, supabaseServiceRoleKey: config.supabaseServiceRoleKey, storageBucket: config.storageBucket, fetch: globalThis.fetch }
  const calls = []
  Object.assign(config, { imageStorage: 'supabase', supabaseUrl: 'https://demo.supabase.co', supabaseServiceRoleKey: 'service-role', storageBucket: 'studio-media' })
  globalThis.fetch = async (url, options) => { calls.push({ url, options }); return { ok: true, status: 200 } }
  try {
    const result = await uploadPublicImage({ bytes: await sharp({ create: { width: 10, height: 10, channels: 3, background: '#fff' } }).png().toBuffer(), prefix: 'packages', localDir: 'unused' })
    assert.match(result.image, /^https:\/\/demo\.supabase\.co\/storage\/v1\/object\/public\/studio-media\/packages\//)
    assert.equal(calls.length, 3)
    assert.equal(calls[2].options.headers.authorization, 'Bearer service-role')
    assert.equal(calls[2].options.headers['content-type'], 'image/webp')
  } finally { Object.assign(config, previous); globalThis.fetch = previous.fetch }
})

test('package images require admin and CSRF, persist image bytes, and reject invalid files', async t => {
  const previousStorage = config.imageStorage
  config.imageStorage = 'local'
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'banmai-package-image-'))
  const app = express()
  app.use((req, _res, next) => { req.session = { csrf: 'test' }; if (req.get('x-test-role')) req.authUser = { role: req.get('x-test-role') }; next() })
  app.use(createPackageImageRouter(dir)); app.use(errorHandler)
  const server = app.listen(0, '127.0.0.1')
  await new Promise(resolve => server.once('listening', resolve))
  t.after(async () => { await new Promise(resolve => server.close(resolve)); await fs.rm(dir, { recursive: true, force: true }) })
  const png = await sharp({ create: { width: 10, height: 10, channels: 3, background: '#fff' } }).png().toBuffer()
  const send = (bytes, role = 'ADMIN', csrf = 'test') => {
    const body = new FormData(); body.append('image', new Blob([bytes], { type: 'image/png' }), 'photo.html')
    return fetch(`http://127.0.0.1:${server.address().port}/image`, { method: 'POST', headers: { 'x-test-role': role, 'x-csrf-token': csrf }, body })
  }
  assert.equal((await send(png, '')).status, 401)
  assert.equal((await send(png, 'CUSTOMER')).status, 403)
  assert.equal((await send(png, 'ADMIN', 'wrong')).status, 403)
  assert.equal((await send('<script>bad</script>')).status, 400)
  assert.equal((await send(Buffer.alloc(10 * 1024 * 1024 + 1))).status, 400)
  const response = await send(png)
  assert.equal(response.status, 201)
  const { data } = await response.json()
  assert.match(data.image, /^\/media\/packages-[\w-]+\.webp$/)
  assert.equal((await sharp(await fs.readFile(path.join(dir, path.basename(data.image)))).metadata()).format, 'webp')
  assert.equal((await fs.readdir(dir)).length, 1)
  config.imageStorage = previousStorage
})

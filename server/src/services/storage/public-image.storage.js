import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import { config } from '../../config/env.js'
import { AppError } from '../../middleware/error.middleware.js'

const mimeByExtension = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' }

export function detectImageExtension(bytes) {
  if (!Buffer.isBuffer(bytes)) return null
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'jpg'
  if (bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return 'png'
  if (bytes.subarray(0, 4).toString() === 'RIFF' && bytes.subarray(8, 12).toString() === 'WEBP') return 'webp'
  return null
}

const supabaseConfigured = () => Boolean(config.supabaseUrl && config.supabaseServiceRoleKey && config.storageBucket)
const publicUrl = (objectPath) => `${config.supabaseUrl.replace(/\/$/, '')}/storage/v1/object/public/${encodeURIComponent(config.storageBucket)}/${objectPath.split('/').map(encodeURIComponent).join('/')}`

async function ensureBucket() {
  const base = config.supabaseUrl.replace(/\/$/, '')
  const existing = await fetch(`${base}/storage/v1/bucket/${encodeURIComponent(config.storageBucket)}`, { headers: { authorization: `Bearer ${config.supabaseServiceRoleKey}`, apikey: config.supabaseServiceRoleKey } })
  if (existing.ok) {
    const update = await fetch(`${base}/storage/v1/bucket/${encodeURIComponent(config.storageBucket)}`, {
      method: 'PUT', headers: { authorization: `Bearer ${config.supabaseServiceRoleKey}`, apikey: config.supabaseServiceRoleKey, 'content-type': 'application/json' }, body: JSON.stringify({ public: true }),
    })
    if (!update.ok) throw new Error(`Bucket Supabase chưa được đặt public (${update.status})`)
    return
  }
  if (existing.status !== 404) throw new Error(`Không kiểm tra được bucket Supabase (${existing.status})`)
  const response = await fetch(`${config.supabaseUrl.replace(/\/$/, '')}/storage/v1/bucket`, {
    method: 'POST', headers: { authorization: `Bearer ${config.supabaseServiceRoleKey}`, apikey: config.supabaseServiceRoleKey, 'content-type': 'application/json' },
    body: JSON.stringify({ id: config.storageBucket, name: config.storageBucket, public: true }),
  })
  if (response.status === 409) {
    const update = await fetch(`${config.supabaseUrl.replace(/\/$/, '')}/storage/v1/bucket/${encodeURIComponent(config.storageBucket)}`, {
      method: 'PUT', headers: { authorization: `Bearer ${config.supabaseServiceRoleKey}`, apikey: config.supabaseServiceRoleKey, 'content-type': 'application/json' }, body: JSON.stringify({ public: true }),
    })
    if (!update.ok) throw new Error(`Bucket Supabase chưa được đặt public (${update.status})`)
  } else if (!response.ok) throw new Error(`Không tạo được bucket Supabase (${response.status})`)
}

export async function uploadPublicImage({ bytes, prefix = 'images', localDir }) {
  const extension = detectImageExtension(bytes)
  if (!extension) throw new AppError(400, 'INVALID_IMAGE', 'File không phải ảnh JPEG, PNG hoặc WebP hợp lệ')
  const name = `${prefix}/${crypto.randomUUID()}.${extension}`
  if (config.imageStorage === 'supabase') {
    if (!supabaseConfigured()) throw new AppError(503, 'STORAGE_NOT_CONFIGURED', 'Chưa cấu hình Supabase Storage cho ảnh')
    await ensureBucket()
    const response = await fetch(`${config.supabaseUrl.replace(/\/$/, '')}/storage/v1/object/${encodeURIComponent(config.storageBucket)}/${name.split('/').map(encodeURIComponent).join('/')}`, {
      method: 'POST', headers: { authorization: `Bearer ${config.supabaseServiceRoleKey}`, apikey: config.supabaseServiceRoleKey, 'content-type': mimeByExtension[extension], 'cache-control': '31536000', 'x-upsert': 'false' }, body: bytes,
    })
    if (!response.ok) throw new Error(`Không tải được ảnh lên Supabase Storage (${response.status})`)
    return { image: publicUrl(name), objectPath: name, storage: 'supabase' }
  }
  if (!localDir) throw new AppError(500, 'STORAGE_NOT_CONFIGURED', 'Thiếu thư mục lưu ảnh local')
  const filename = `${name.replace('/', '-')}`
  await fs.mkdir(localDir, { recursive: true }); await fs.writeFile(path.join(localDir, filename), bytes, { flag: 'wx' })
  return { image: `/media/${filename}`, filename, storage: 'local' }
}

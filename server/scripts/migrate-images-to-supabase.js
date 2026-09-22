import path from 'node:path'
import fs from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { config } from '../src/config/env.js'
import { createPool } from '../src/db/pool.js'
import { uploadPublicImage } from '../src/services/storage/public-image.storage.js'

if (config.imageStorage !== 'supabase') throw new Error('Đặt IMAGE_STORAGE=supabase trước khi chạy chuyển ảnh')
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const publicImages = path.join(root, 'client', 'public', 'images')
const localMedia = path.join(root, 'server', '.data', 'media')
const pool = createPool()
if (!pool) throw new Error('Cần DATA_MODE=postgres và DATABASE_URL để cập nhật URL ảnh trong state')

async function filesIn(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true }).catch(() => [])
  return (await Promise.all(entries.map(async entry => entry.isDirectory() ? filesIn(path.join(directory, entry.name)) : [path.join(directory, entry.name)]))).flat()
}
const stateRow = (await pool.query('select state from app.demo_state where id=1')).rows[0]
if (!stateRow?.state) throw new Error('Không tìm thấy app.demo_state')
const state = stateRow.state
const mapping = new Map()
for (const [directory, prefix] of [[publicImages, 'public'], [localMedia, 'media']]) {
  for (const file of await filesIn(directory)) {
    const bytes = await fs.readFile(file)
    const result = await uploadPublicImage({ bytes, prefix: `migrated/${prefix}`, localDir: localMedia })
    const relativePath = path.relative(directory, file).replaceAll('\\', '/')
    const relative = directory === publicImages ? `/images/${relativePath}` : `/media/${relativePath}`
    mapping.set(relative, result.image)
    console.log(`${relative} -> ${result.image}`)
  }
}
const rewrite = value => typeof value === 'string' ? [...mapping.entries()].reduce((text, [from, to]) => text === from ? to : text, value) : value
for (const pkg of state.packages || []) pkg.image = rewrite(pkg.image)
for (const item of state.portfolio || []) {
  item.image = rewrite(item.image); item.coverImage = rewrite(item.coverImage)
  for (const image of item.images || []) image.src = rewrite(image.src)
}
await pool.query('update app.demo_state set state=$1::jsonb, updated_at=now() where id=1', [JSON.stringify(state)])
await pool.end()
console.log(`Đã chuyển ${mapping.size} ảnh. File local được giữ nguyên để rollback.`)

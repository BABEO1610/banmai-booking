import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { config } from '../config/env.js'
import { paymentRequest } from '../services/payment/payment-request.js'
import { applyPackagePrices, bookingPackages, enableFullDayBooking, occupiedMinutes } from '../../../shared/booking-packages.js'
import { normalizeLocation } from '../services/location.service.js'
import { createPool } from '../db/pool.js'
import { processOutboxBatch } from '../jobs/process-outbox.job.js'
import { DurableState } from '../db/durable-state.js'
import { AppError } from '../middleware/error.middleware.js'
import { hashCode, hashPassword, randomCode, verifyPassword } from '../utils/crypto.js'

const dataDir = process.env.BANMAI_DATA_DIR ? path.resolve(process.env.BANMAI_DATA_DIR) : path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../.data')
const dataFile = path.join(dataDir, 'demo.json')
const mediaDir = path.join(dataDir, 'media')
const now = () => new Date().toISOString()
const id = (prefix) => `${prefix}_${cryptoRandom()}`
const cryptoRandom = () => Math.random().toString(36).slice(2, 10)
const clone = (value) => JSON.parse(JSON.stringify(value))
const normalized = (email) => String(email || '').trim().toLowerCase()
const publicUser = (user) => ({ id: user.id, email: user.email, role: user.role, status: user.status, emailVerified: user.emailVerified, name: user.name })
const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds))

export class DemoStore {
  durableState = new DurableState()
  get state() { return this.durableState.value }
  set state(value) { this.durableState ??= new DurableState(); this.durableState.value = value }
  constructor() {
    this.state = { users: [], challenges: [], mail: [], packages: [], addons: [], portfolio: [], contents: [], policies: [], bookings: [], payments: [], receipts: [], assignments: [], blocks: [], audits: [], outbox: [], settings: null, idempotency: {} }
    this.pool = config.dataMode === 'postgres' ? createPool() : null
    this.ready = this.load().then(async () => {
      const pricesChanged = config.nodeEnv !== 'production' && applyPackagePrices(this.state)
      const scheduleChanged = config.nodeEnv !== 'production' && enableFullDayBooking(this.state)
      if (pricesChanged || scheduleChanged) await this.persist()
    })
  }

  async load() {
    await fs.promises.mkdir(dataDir, { recursive: true })
    await fs.promises.mkdir(mediaDir, { recursive: true })
    if (this.pool) {
      let result
      for (let attempt = 1; attempt <= 3; attempt += 1) {
        try { result = await this.pool.query('select state, updated_at::text as revision from app.demo_state where id = 1'); break } catch (error) { if (attempt === 3) throw error; await wait(attempt * 1000) }
      }
      if (result.rows[0]?.state) { this.revision = result.rows[0].revision; this.state = { ...this.state, ...result.rows[0].state }; this.normalizePortfolioState(); return }
      await this.seed()
      return
    }
    try { this.state = { ...this.state, ...JSON.parse(await fs.promises.readFile(dataFile, 'utf8')) } } catch { await this.seed() }
    if (!this.state.settings && process.env.NODE_ENV === 'test') this.state.settings = { maxConcurrentBookings: 2, bufferBeforeMinutes: 0, bufferAfterMinutes: 0, timezone: config.timezone, version: 1, updatedAt: now() }
    this.normalizePortfolioState()
  }

  async persist(state = this.state) {
    if (this.pool) {
      const serialized = JSON.stringify(state)
      const result = this.revision
        ? await this.pool.query('update app.demo_state set state = $1::jsonb, updated_at = clock_timestamp() where id = 1 and updated_at = $2::timestamptz returning updated_at::text as revision', [serialized, this.revision])
        : await this.pool.query('insert into app.demo_state (id, state, updated_at) values (1, $1::jsonb, clock_timestamp()) on conflict (id) do nothing returning updated_at::text as revision', [serialized])
      if (!result.rows.length) throw new AppError(409, 'STATE_CONFLICT', 'Dữ liệu vừa được cập nhật. Vui lòng tải lại và thử lại.')
      this.revision = result.rows[0].revision
    } else {
      const temporary = `${dataFile}.tmp`
      await fs.promises.writeFile(temporary, JSON.stringify(state), 'utf8')
      await fs.promises.rename(temporary, dataFile)
    }
  }
  async mutate(fn) {
    return this.durableState.run(fn, {
      ready: this.ready,
      persist: state => this.persist(state),
      reload: async () => {
        if (this.pool) {
          const result = await this.pool.query('select state, updated_at::text as revision from app.demo_state where id = 1')
          if (!result.rows[0]?.state) throw new Error('Cannot reconcile persisted state')
          this.revision = result.rows[0].revision
          return result.rows[0].state
        }
        return JSON.parse(await fs.promises.readFile(dataFile, 'utf8'))
      },
    })
  }
  userById(userId) { return this.state.users.find((item) => item.id === userId) }
  userByEmail(email) { return this.state.users.find((item) => item.email === normalized(email)) }
  async syncAuthUser(user) {
    if (!user?.legacyId) return
    return this.mutate(async () => {
      const existing = this.userById(user.legacyId)
      const projection = { id: user.legacyId, email: user.email, role: user.role, name: user.name || 'Khách hàng', status: user.status, emailVerified: Boolean(user.emailVerified), passwordHash: user.passwordHash || existing?.passwordHash, createdAt: existing?.createdAt || now() }
      if (existing) Object.assign(existing, projection)
      else this.state.users.push(projection)
      return projection
    })
  }
  audit(actorId, action, entityType, entityId, before, after, reason = null) { this.state.audits.push({ id: id('audit'), actorId, action, entityType, entityId, before: clone(before), after: clone(after), reason, createdAt: now() }) }
  outbox(type, payload, bookingId = null) { const channel = ['booking.created', 'booking.expired'].includes(type) ? 'internal' : 'sheets'; this.state.outbox.push({ id: id('evt'), type, channel, bookingId, payload: clone(payload), status: 'PENDING', attempts: 0, availableAt: now(), createdAt: now() }) }

  async seed() {
    if (config.nodeEnv === 'production') {
      // A fresh production database must never receive demo credentials or stock galleries.
      await this.persist()
      return
    }
    const passwordHash = await hashPassword(process.env.DEMO_PASSWORD || 'Demo1234!')
    const makeUser = (email, role, name, status = 'ACTIVE', verified = true) => ({ id: id('usr'), email, role, name, status, emailVerified: verified, passwordHash, createdAt: now() })
    this.state.users = [
      makeUser('admin@banmai.test', 'ADMIN', 'Chủ Studio'),
      makeUser('photographer.a@banmai.test', 'PHOTOGRAPHER', 'Nhiếp ảnh A'),
      makeUser('photographer.b@banmai.test', 'PHOTOGRAPHER', 'Nhiếp ảnh B'),
      makeUser('photographer.c@banmai.test', 'PHOTOGRAPHER', 'Nhiếp ảnh C', 'INACTIVE'),
      makeUser('customer.x@banmai.test', 'CUSTOMER', 'Khách X'),
      makeUser('customer.y@banmai.test', 'CUSTOMER', 'Khách Y'),
    ]
    this.state.packages = structuredClone(bookingPackages)
    this.state.addons = [{ id: 'extra-hour', name: 'Giờ phát sinh', priceVnd: 300000, unit: 'giờ / người', visible: true, published: true, note: 'Mức hiển thị demo; cách tính phần lẻ chờ Studio xác nhận.' }]
    this.state.portfolio = [
      { id: 'portrait', name: 'Chân dung', description: 'Một khoảng lặng rất riêng', image: '/images/daylight.jpg', visible: true, published: true, featured: true },
      { id: 'color', name: 'Sắc riêng', description: 'Tự tin là chính mình', image: '/images/portrait.jpg', visible: true, published: true, featured: false },
      { id: 'together', name: 'Chung đôi', description: 'Cùng nhau giữ một khoảnh khắc', image: '/images/together.jpg', visible: true, published: true, featured: true },
    ]
    this.state.contents = [{ id: 'home-intro', key: 'home_intro', title: 'Một góc nhìn rất riêng về bạn.', body: 'Một chút ánh sáng, một chút tự nhiên. Để mỗi khung hình giữ lại đúng cảm xúc của bạn.', image: '/images/daylight.jpg', published: true, version: 1 }]
    this.state.policies = [{ id: 'policy-demo', key: 'booking', title: 'Chính sách đang chờ công bố', body: 'Các mốc hủy, hoàn cọc và dời lịch sẽ hiển thị sau khi Studio xác nhận chính sách.', published: true, version: 1 }]
    this.state.settings = null
    await this.persist()
  }

  normalizePortfolioState() {
    this.state.portfolio = (this.state.portfolio || []).map((item) => {
      const images = Array.isArray(item.images) && item.images.length
        ? item.images.map((image, index) => typeof image === 'string' ? { id: `${item.id}-image-${index + 1}`, src: image, alt: item.name, caption: item.name, position: index } : { ...image, position: image.position ?? index })
        : item.image ? [{ id: `${item.id}-cover`, src: item.image, alt: item.alt || item.name, caption: item.name, position: 0 }] : []
      return { ...item, images, coverImage: item.coverImage || images[0]?.src || item.image || null, mood: Array.isArray(item.mood) ? item.mood : [], version: item.version || 1 }
    })
  }
  publicCatalog() { return { packages: this.state.packages.filter((p) => p.visible && p.published).map((p) => ({ ...p, price: { amount: String(p.priceVnd), currency: 'VND' } })), addons: this.state.addons.filter((p) => p.visible && p.published).map((p) => ({ ...p, price: { amount: String(p.priceVnd), currency: 'VND' } })), portfolio: this.state.portfolio.filter((p) => p.visible && p.published).map((p) => ({ ...p, image: p.coverImage || p.image, images: p.images || [] })), contents: this.state.contents.filter((p) => p.published), policies: this.state.policies.filter((p) => p.published) } }
  adminCatalog() { return clone({ packages: this.state.packages, addons: this.state.addons, portfolio: this.state.portfolio, contents: this.state.contents, policies: this.state.policies }) }
  normalizeContent(input, existing = {}) { const title = String(input.title ?? existing.title ?? '').trim(); const body = String(input.body ?? existing.body ?? '').trim(); const image = String(input.image ?? existing.image ?? '').trim(); if (!title || title.length > 160) throw new AppError(400, 'VALIDATION_ERROR', 'Tiêu đề nội dung bắt buộc và tối đa 160 ký tự'); if (body.length > 2000) throw new AppError(400, 'VALIDATION_ERROR', 'Nội dung tối đa 2000 ký tự'); if (image && !(/^\/(?!\/)/.test(image) || /^https?:\/\//i.test(image))) throw new AppError(400, 'VALIDATION_ERROR', 'Ảnh phải là đường dẫn nội bộ hoặc URL http(s)'); return { ...existing, title, body, image: image || null, published: input.published ?? existing.published ?? true, version: (existing.version || 0) + 1 } }
  async updateContent(contentId, patch, actorId, expectedVersion) { return this.mutate(async () => { const item = this.state.contents.find((entry) => entry.id === contentId || entry.key === contentId); if (!item) throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy nội dung'); if (expectedVersion != null && Number(expectedVersion) !== item.version) throw new AppError(409, 'VERSION_CONFLICT', 'Nội dung đã được cập nhật, vui lòng tải lại'); const before = clone(item); Object.assign(item, this.normalizeContent(patch, item)); this.audit(actorId, 'CONTENT_UPDATED', 'content', item.id, before, item); return clone(item) }) }
  normalizePackage(input, existing = {}) {
    const name = String(input.name ?? existing.name ?? '').trim()
    const priceVnd = Number(input.priceVnd ?? existing.priceVnd)
    const durationMinutes = Number(input.durationMinutes ?? existing.durationMinutes)
    const image = String(input.image ?? existing.image ?? '').trim()
    const peopleCount = input.peopleCount ?? existing.peopleCount
    const period = input.period ?? existing.period
    if (!name || name.length > 120) throw new AppError(400, 'VALIDATION_ERROR', 'Tên gói là bắt buộc và tối đa 120 ký tự')
    if (!Number.isSafeInteger(priceVnd) || priceVnd < 0) throw new AppError(400, 'VALIDATION_ERROR', 'Giá phải là số nguyên VND không âm')
    if (!Number.isInteger(durationMinutes) || durationMinutes < 30 || durationMinutes > 1440) throw new AppError(400, 'VALIDATION_ERROR', 'Thời lượng phải từ 30 đến 1440 phút')
    if (peopleCount != null && (!Number.isInteger(Number(peopleCount)) || Number(peopleCount) < 1 || Number(peopleCount) > 50)) throw new AppError(400, 'VALIDATION_ERROR', 'Số người phải từ 1 đến 50')
    if (period != null && !['half', 'full'].includes(period)) throw new AppError(400, 'VALIDATION_ERROR', 'Biến thể thời lượng không hợp lệ')
    if (image && !(/^\/(?!\/)/.test(image) || /^https?:\/\//i.test(image))) throw new AppError(400, 'VALIDATION_ERROR', 'Ảnh phải là đường dẫn nội bộ hoặc URL http(s)')
    const options = Array.isArray(input.optionGroups ?? existing.optionGroups) ? clone(input.optionGroups ?? existing.optionGroups) : []
    if (new Set(options.map((group) => group.id)).size !== options.length) throw new AppError(400, 'VALIDATION_ERROR', 'Mã nhóm option bị trùng')
    for (const group of options) {
      if (!group.id || !group.name || !Array.isArray(group.choices)) throw new AppError(400, 'VALIDATION_ERROR', 'Option group không hợp lệ')
      if (!['single', 'multi'].includes(group.type || 'multi')) throw new AppError(400, 'VALIDATION_ERROR', 'Kiểu option không hợp lệ')
      if (new Set(group.choices.map((choice) => choice.id)).size !== group.choices.length) throw new AppError(400, 'VALIDATION_ERROR', 'Mã option bị trùng')
      for (const choice of group.choices) if (!choice.id || !choice.name || !Number.isSafeInteger(Number(choice.priceVnd)) || Number(choice.priceVnd) < 0) throw new AppError(400, 'VALIDATION_ERROR', 'Option phải có mã, tên và giá VND hợp lệ')
    }
    return { ...existing, ...input, name, image: image || null, peopleCount: peopleCount == null ? null : Number(peopleCount), period, priceVnd, durationMinutes, benefits: Array.isArray(input.benefits ?? existing.benefits) ? (input.benefits ?? existing.benefits).map((item) => String(item).trim()).filter(Boolean).slice(0, 12) : [], optionGroups: options, version: (existing.version || 0) + 1 }
  }
  async createPackage(input, actorId) { return this.mutate(async () => { const packageId = String(input.id || `pkg-${cryptoRandom()}`).trim().toLowerCase(); if (!/^[a-z0-9][a-z0-9-]*$/.test(packageId) || this.state.packages.some((item) => item.id === packageId)) throw new AppError(409, 'PACKAGE_EXISTS', 'Mã gói không hợp lệ hoặc đã tồn tại'); const item = this.normalizePackage({ ...input, id: packageId, visible: false, published: false }, { id: packageId, version: 0, optionGroups: [] }); this.state.packages.push(item); this.audit(actorId, 'PACKAGE_CREATED', 'package', item.id, null, item); return item }) }
  async updateCatalog(collection, itemId, patch, actorId, expectedVersion) { return this.mutate(async () => { const item = this.state[collection]?.find((entry) => entry.id === itemId); if (!item) throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy mục catalog'); if (expectedVersion != null && Number(expectedVersion) !== item.version) throw new AppError(409, 'VERSION_CONFLICT', 'Catalog đã được cập nhật, vui lòng tải lại'); const before = clone(item); const next = collection === 'packages' ? this.normalizePackage(patch, item) : { ...item, ...patch, version: (item.version || 0) + 1 }; if (collection !== 'packages' && next.priceVnd != null && (!Number.isInteger(Number(next.priceVnd)) || Number(next.priceVnd) < 0)) throw new AppError(400, 'VALIDATION_ERROR', 'Giá phải là số nguyên không âm'); Object.assign(item, next); this.audit(actorId, collection === 'packages' ? 'PACKAGE_UPDATED' : 'ADDON_UPDATED', collection === 'packages' ? 'package' : 'addon', item.id, before, item); return clone(item) }) }
  async publishPackage(itemId, actorId, published = true) { return this.mutate(async () => { const item = this.state.packages.find((entry) => entry.id === itemId); if (!item) throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy gói'); if (published && (!item.name || !Number.isSafeInteger(item.priceVnd) || item.priceVnd < 500000 || !item.durationMinutes || !Array.isArray(item.benefits) || !item.benefits.length)) throw new AppError(400, 'VALIDATION_ERROR', 'Gói phải có giá tối thiểu 500.000đ và quyền lợi trước khi xuất bản'); const before = { published: item.published, visible: item.visible }; item.archived = false; item.published = published; item.visible = published; item.version = (item.version || 0) + 1; this.audit(actorId, published ? 'PACKAGE_PUBLISHED' : 'PACKAGE_UNPUBLISHED', 'package', item.id, before, { published: item.published, visible: item.visible }); return clone(item) }) }
  async archivePackage(itemId, actorId) { return this.mutate(async () => { const item = this.state.packages.find((entry) => entry.id === itemId); if (!item) throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy gói'); const before = { archived: item.archived, published: item.published, visible: item.visible }; item.archived = true; item.published = false; item.visible = false; item.bookable = false; item.version = (item.version || 0) + 1; this.audit(actorId, 'PACKAGE_ARCHIVED', 'package', item.id, before, { archived: true, published: false, visible: false }); return clone(item) }) }
  async duplicatePackage(itemId, actorId) { return this.mutate(async () => { const source = this.state.packages.find((entry) => entry.id === itemId); if (!source) throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy gói'); const copy = clone(source); copy.id = `${source.id}-copy-${cryptoRandom()}`; copy.name = `${source.name} · Bản nháp`; copy.visible = false; copy.published = false; copy.version = 1; this.state.packages.push(copy); this.audit(actorId, 'PACKAGE_DUPLICATED', 'package', copy.id, null, copy); return copy }) }

  normalizePortfolio(input, existing = {}) {
    const name = String(input.name ?? existing.name ?? '').trim()
    const description = String(input.description ?? existing.description ?? '').trim()
    const mood = Array.isArray(input.mood ?? existing.mood) ? (input.mood ?? existing.mood).map((item) => String(item).trim()).filter(Boolean).slice(0, 12) : []
    const images = Array.isArray(input.images ?? existing.images) ? (input.images ?? existing.images).map((image, index) => ({ id: image.id || `${existing.id || 'portfolio'}-image-${cryptoRandom()}`, src: String(image.src || '').trim(), alt: String(image.alt || name).trim(), caption: String(image.caption || name).trim(), position: index })).filter((image) => image.src) : []
    if (!name || name.length > 120) throw new AppError(400, 'VALIDATION_ERROR', 'Tên bộ ảnh là bắt buộc và tối đa 120 ký tự')
    if (description.length > 1000) throw new AppError(400, 'VALIDATION_ERROR', 'Mô tả bộ ảnh tối đa 1000 ký tự')
    const coverImage = String(input.coverImage ?? existing.coverImage ?? images[0]?.src ?? '').trim() || null
    if (coverImage && !images.some((image) => image.src === coverImage)) throw new AppError(400, 'VALIDATION_ERROR', 'Ảnh bìa phải thuộc bộ ảnh')
    return { ...existing, ...input, name, description, mood, images, coverImage, image: coverImage, version: (existing.version || 0) + 1 }
  }
  async createPortfolio(input, actorId) { return this.mutate(async () => { const portfolioId = String(input.id || `portfolio-${cryptoRandom()}`).trim().toLowerCase(); if (!/^[a-z0-9][a-z0-9-]*$/.test(portfolioId) || this.state.portfolio.some((item) => item.id === portfolioId)) throw new AppError(409, 'PORTFOLIO_EXISTS', 'Mã bộ ảnh không hợp lệ hoặc đã tồn tại'); const item = this.normalizePortfolio({ ...input, id: portfolioId, visible: false, published: false }, { id: portfolioId, version: 0, images: [] }); this.state.portfolio.push(item); this.audit(actorId, 'PORTFOLIO_CREATED', 'portfolio', item.id, null, item); return clone(item) }) }
  async updatePortfolio(itemId, patch, actorId, expectedVersion) { return this.mutate(async () => { const item = this.state.portfolio.find((entry) => entry.id === itemId); if (!item) throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy bộ ảnh'); if (expectedVersion != null && Number(expectedVersion) !== item.version) throw new AppError(409, 'VERSION_CONFLICT', 'Bộ ảnh đã được cập nhật, vui lòng tải lại'); const before = clone(item); const next = this.normalizePortfolio(patch, item); if (item.published && (!next.images.length || !next.coverImage)) throw new AppError(400, 'VALIDATION_ERROR', 'Bộ ảnh đang xuất bản phải có ít nhất một ảnh và ảnh bìa'); Object.assign(item, next); this.audit(actorId, 'PORTFOLIO_UPDATED', 'portfolio', item.id, before, item); return clone(item) }) }
  async publishPortfolio(itemId, actorId, published = true) { return this.mutate(async () => { const item = this.state.portfolio.find((entry) => entry.id === itemId); if (!item) throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy bộ ảnh'); if (published && (!item.name || !item.images?.length || !item.coverImage)) throw new AppError(400, 'VALIDATION_ERROR', 'Bộ ảnh cần tên, ít nhất một ảnh và ảnh bìa trước khi xuất bản'); const before = { published: item.published, visible: item.visible }; item.published = published; item.visible = published; item.version = (item.version || 0) + 1; this.audit(actorId, published ? 'PORTFOLIO_PUBLISHED' : 'PORTFOLIO_UNPUBLISHED', 'portfolio', item.id, before, { published: item.published, visible: item.visible }); return clone(item) }) }
  async addPortfolioImages(itemId, files, actorId, expectedVersion) { return this.mutate(async () => { const item = this.state.portfolio.find((entry) => entry.id === itemId); if (!item) throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy bộ ảnh'); if (expectedVersion != null && Number(expectedVersion) !== item.version) throw new AppError(409, 'VERSION_CONFLICT', 'Bộ ảnh đã được cập nhật, vui lòng tải lại'); const before = clone(item); const images = [...(item.images || [])]; for (const file of files) images.push({ id: `img-${cryptoRandom()}`, src: file.publicUrl || `/media/${file.filename}`, alt: item.name, caption: item.name, position: images.length }); item.images = images; item.coverImage = item.coverImage || images[0]?.src || null; item.image = item.coverImage; item.version = (item.version || 0) + 1; this.audit(actorId, 'PORTFOLIO_IMAGES_ADDED', 'portfolio', item.id, before, item); return clone(item) }) }

  async register({ email, password, name }) { return this.mutate(async () => { const address = normalized(email); if (!address || !password || password.length < 8) throw new AppError(400, 'VALIDATION_ERROR', 'Email và mật khẩu tối thiểu 8 ký tự là bắt buộc'); if (this.userByEmail(address)) throw new AppError(409, 'EMAIL_EXISTS', 'Email đã được đăng ký'); const user = { id: id('usr'), email: address, role: 'CUSTOMER', name: name || 'Khách hàng', status: 'ACTIVE', emailVerified: false, passwordHash: await hashPassword(password), createdAt: now() }; this.state.users.push(user); const code = randomCode(); const challenge = { id: id('challenge'), userId: user.id, purpose: 'EMAIL_VERIFY', hash: hashCode(code, config.emailCodeSecret), expiresAt: new Date(Date.now() + 15 * 60_000).toISOString(), attempts: 0, consumedAt: null }; this.state.challenges.push(challenge); this.state.mail.push({ id: id('mail'), to: address, subject: 'Mã xác thực Ban Mai', code, challengeId: challenge.id, createdAt: now(), read: false }); return { challengeId: challenge.id, email: address, expiresAt: challenge.expiresAt } }) }
  async verify({ challengeId, code }) { return this.mutate(async () => { const challenge = this.state.challenges.find((item) => item.id === challengeId && item.purpose === 'EMAIL_VERIFY'); if (!challenge || challenge.consumedAt || new Date(challenge.expiresAt) < new Date() || challenge.attempts >= 5 || hashCode(code, config.emailCodeSecret) !== challenge.hash) throw new AppError(400, 'INVALID_CHALLENGE', 'Mã xác thực không hợp lệ hoặc đã hết hạn'); challenge.consumedAt = now(); const user = this.userById(challenge.userId); user.emailVerified = true; this.audit(user.id, 'EMAIL_VERIFIED', 'user', user.id, { emailVerified: false }, { emailVerified: true }); return publicUser(user) }) }
  async login({ email, password }) { await this.ready; const user = this.userByEmail(email); if (!user || !(await verifyPassword(password, user.passwordHash))) throw new AppError(401, 'INVALID_CREDENTIALS', 'Email hoặc mật khẩu không đúng'); if (user.status !== 'ACTIVE') throw new AppError(403, 'ACCOUNT_INACTIVE', 'Tài khoản đã bị khóa'); return publicUser(user) }
  async requestPasswordReset(email) { return this.mutate(async () => { const found = this.userByEmail(email); if (found) { const code = randomCode(); const challenge = { id: id('challenge'), userId: found.id, purpose: 'PASSWORD_RESET', hash: hashCode(code, config.emailCodeSecret), expiresAt: new Date(Date.now() + 15 * 60_000).toISOString(), attempts: 0, consumedAt: null }; this.state.challenges.push(challenge); this.state.mail.push({ id: id('mail'), to: found.email, subject: 'Đặt lại mật khẩu Ban Mai', code, challengeId: challenge.id, createdAt: now(), read: false }) } return { message: 'Nếu email tồn tại, hướng dẫn đặt lại mật khẩu đã được gửi.' } }) }
  async resetPassword({ challengeId, code, newPassword }) { return this.mutate(async () => { const challenge = this.state.challenges.find((item) => item.id === challengeId && item.purpose === 'PASSWORD_RESET'); if (!challenge || challenge.consumedAt || new Date(challenge.expiresAt) < new Date() || challenge.attempts >= 5 || hashCode(code, config.emailCodeSecret) !== challenge.hash || String(newPassword).length < 8) throw new AppError(400, 'INVALID_CHALLENGE', 'Mã đặt lại mật khẩu không hợp lệ hoặc đã hết hạn'); challenge.consumedAt = now(); const found = this.userById(challenge.userId); found.passwordHash = await hashPassword(newPassword); this.audit(found.id, 'PASSWORD_RESET', 'user', found.id, null, { passwordChanged: true }); return { reset: true } }) }
  mail(email, token) { if (token !== config.demoMailToken) throw new AppError(403, 'DEMO_MAIL_FORBIDDEN', 'Hộp thư demo cần mã truy cập local'); return this.state.mail.filter((item) => item.to === normalized(email)).slice(-10).map(({ code, ...item }) => ({ ...item, previewCode: code })) }

  activeBookings() { const current = Date.now(); return this.state.bookings.filter((b) => ['PENDING', 'CONFIRMED'].includes(b.status) && (!b.holdExpiresAt || new Date(b.holdExpiresAt).getTime() > current)) }
  overlap(aStart, aEnd, bStart, bEnd) { return new Date(aStart) < new Date(bEnd) && new Date(bStart) < new Date(aEnd) }
  async expireHolds() { await this.ready; if (!this.state.bookings.some(b => b.status === 'PENDING' && new Date(b.holdExpiresAt) <= new Date())) return []; return this.mutate(async () => { const expired = []; for (const booking of this.state.bookings) if (booking.status === 'PENDING' && new Date(booking.holdExpiresAt) <= new Date()) { const before = { ...booking }; booking.status = 'EXPIRED'; booking.updatedAt = now(); expired.push(booking.id); this.audit(null, 'HOLD_EXPIRED', 'booking', booking.id, before, booking); this.outbox('booking.expired', { bookingId: booking.id }, booking.id) } return expired }) }
  assertSettings() { if (!this.state.settings || !Number.isInteger(this.state.settings.maxConcurrentBookings) || this.state.settings.maxConcurrentBookings < 1) throw new AppError(503, 'CONFIGURATION_REQUIRED', 'Admin cần cấu hình giới hạn nhận booking trước khi mở lịch') }
  availability({ packageId, from, to }) { const pkg = this.state.packages.find((p) => p.id === packageId); const settings = this.state.settings; if (!pkg || !pkg.visible || !pkg.published || !pkg.bookable) return { available: false, reason: pkg?.bookableReason || 'Gói chưa bookable' }; if (!settings) return { available: false, reason: 'Chưa có cấu hình giới hạn nhận khách' }; const start = from || new Date().toISOString(); const end = to || new Date(new Date(start).getTime() + occupiedMinutes(pkg) * 60_000).toISOString(); const used = this.activeBookings().filter((b) => this.overlap(start, end, b.startAt, b.endAt)).length; const blocked = this.state.blocks.some((b) => this.overlap(start, end, b.startAt, b.endAt)); return { available: !blocked && used < settings.maxConcurrentBookings, used, limit: settings.maxConcurrentBookings, startAt: start, endAt: end, blocked } }
  async updateSettings(input, actorId) { return this.mutate(async () => { const max = Number(input.maxConcurrentBookings); const before = this.state.settings; if (!Number.isInteger(max) || max < 1) throw new AppError(400, 'VALIDATION_ERROR', 'Giới hạn phải là số nguyên dương'); const after = { maxConcurrentBookings: max, bufferBeforeMinutes: Math.max(0, Number(input.bufferBeforeMinutes || 0)), bufferAfterMinutes: Math.max(0, Number(input.bufferAfterMinutes || 0)), timezone: input.timezone || config.timezone, version: (before?.version || 0) + 1, updatedAt: now() }; this.state.settings = after; this.audit(actorId, 'BOOKING_SETTINGS_UPDATED', 'settings', 'booking', before, after); return after }) }
  packageQuote(input) {
    const pkg = this.state.packages.find((p) => p.id === input.packageId)
    if (!pkg?.bookable || !pkg.published || !pkg.visible) throw new AppError(409, 'PACKAGE_UNAVAILABLE', pkg?.bookableReason || 'Gói không khả dụng')
    if (input.packageVersion != null && Number(input.packageVersion) !== Number(pkg.version)) throw new AppError(409, 'CATALOG_CHANGED', 'Gói đã được cập nhật, vui lòng xác nhận lại giá')
    const selectedOptions = Array.isArray(input.selectedOptions) ? input.selectedOptions : []
    const optionChoices = new Map((pkg.optionGroups || []).flatMap((group) => (group.choices || []).filter((choice) => choice.active !== false).map((choice) => [choice.id, { ...choice, groupId: group.id, groupName: group.name }])))
    if (new Set(selectedOptions.map((item) => item.id)).size !== selectedOptions.length) throw new AppError(400, 'INVALID_OPTIONS', 'Option bị chọn trùng')
    const selected = selectedOptions.map((item) => { const choice = optionChoices.get(item.id); const quantity = Number(item.quantity || 1); if (!choice || !Number.isInteger(quantity) || quantity < 1 || quantity > 20) throw new AppError(400, 'INVALID_OPTIONS', 'Option không thuộc gói hoặc số lượng không hợp lệ'); return { id: choice.id, groupId: choice.groupId, groupName: choice.groupName, name: choice.name, priceVnd: Number(choice.priceVnd), quantity, totalVnd: Number(choice.priceVnd) * quantity } })
    for (const group of pkg.optionGroups || []) { const count = selected.filter((item) => item.groupId === group.id).reduce((sum, item) => sum + item.quantity, 0); if (group.required && count < Math.max(1, Number(group.minSelections || 0))) throw new AppError(400, 'INVALID_OPTIONS', `Cần chọn option trong nhóm ${group.name}`); if (Number(group.maxSelections || 0) && count > Number(group.maxSelections)) throw new AppError(400, 'INVALID_OPTIONS', `Vượt số lượng option trong nhóm ${group.name}`) }
    const optionTotalVnd = selected.reduce((sum, item) => sum + item.totalVnd, 0)
    return { pkg, selected, optionTotalVnd, totalVnd: pkg.priceVnd + optionTotalVnd }
  }
  quote(input) { const result = this.packageQuote(input); return { packageId: result.pkg.id, version: result.pkg.version, name: result.pkg.name, basePriceVnd: result.pkg.priceVnd, selectedOptions: result.selected, optionTotalVnd: result.optionTotalVnd, totalVnd: result.totalVnd, depositVnd: 500000, currency: 'VND' } }
  async createBooking(input, actorId, key) {
    return this.mutate(async () => {
      await this.expireHoldsInternal(); this.assertSettings()
      const fingerprint = JSON.stringify({ ...input, actorId })
      if (key && this.state.idempotency[`${actorId}:${key}`]) {
        const previous = this.state.idempotency[`${actorId}:${key}`]
        if (previous.fingerprint !== fingerprint) throw new AppError(409, 'IDEMPOTENCY_CONFLICT', 'Idempotency key đã dùng cho dữ liệu khác')
        return this.state.bookings.find((b) => b.id === previous.bookingId)
      }
      const { pkg, selected, optionTotalVnd, totalVnd } = this.packageQuote(input)
      const contactName = String(input.contact?.name || '').trim()
      const contactPhone = String(input.contact?.phone || '').trim()
      if (!contactName || contactName.length > 120) throw new AppError(400, 'VALIDATION_ERROR', 'Họ tên là bắt buộc và tối đa 120 ký tự')
      if (!contactPhone || contactPhone.length > 40) throw new AppError(400, 'VALIDATION_ERROR', 'Số điện thoại là bắt buộc và tối đa 40 ký tự')
      const start = new Date(input.startAt)
      if (pkg.peopleCount && input.contact?.peopleCount != null && Number(input.contact.peopleCount) !== pkg.peopleCount) throw new AppError(400, 'PARTY_SIZE_MISMATCH', 'Số người chụp phải khớp với gói đã chọn')
      if (Number.isNaN(start.getTime())) throw new AppError(400, 'VALIDATION_ERROR', 'start_at không hợp lệ')
      const end = new Date(start.getTime() + occupiedMinutes(pkg) * 60_000)
      const availability = this.availability({ packageId: pkg.id, from: start.toISOString(), to: end.toISOString() })
      if (!availability.available) throw new AppError(409, 'CAPACITY_CONFLICT', 'Khung giờ không còn khả dụng')
      const customer = this.userById(actorId)
      const booking = {
        id: id('bkg'), code: `BM-${new Date().getFullYear()}-${cryptoRandom().toUpperCase()}`, customerId: actorId,
        packageId: pkg.id, status: 'PENDING', paymentStatus: 'UNPAID', startAt: start.toISOString(), endAt: end.toISOString(),
        holdExpiresAt: new Date(Date.now() + 15 * 60_000).toISOString(), totalVnd, depositVnd: 500000, paidVnd: 0,
        snapshot: { version: pkg.version, name: pkg.name, description: pkg.description, image: pkg.image, priceVnd: pkg.priceVnd, optionTotalVnd, durationMinutes: pkg.durationMinutes, timeLabel: pkg.timeLabel, benefits: pkg.benefits, selectedOptions: selected },
        contact: { name: contactName, phone: contactPhone, facebook: String(input.contact?.facebook || '').trim(), peopleCount: pkg.peopleCount || Number(input.contact?.peopleCount || 1) },
        location: normalizeLocation(input.location),
        addons: input.addons || [], selectedOptions: selected, notes: String(input.notes || '').slice(0, 2000), internalNotes: '', assignmentId: null, version: 1, createdAt: now(), updatedAt: now(),
      }
      this.state.bookings.push(booking)
      if (key) this.state.idempotency[`${actorId}:${key}`] = { fingerprint, bookingId: booking.id }
      this.audit(actorId, 'BOOKING_CREATED', 'booking', booking.id, null, booking)
      this.outbox('booking.created', { bookingId: booking.id, code: booking.code }, booking.id)
      return booking
    })
  }
  async expireHoldsInternal() { for (const booking of this.state.bookings) if (booking.status === 'PENDING' && new Date(booking.holdExpiresAt) <= new Date()) { booking.status = 'EXPIRED'; booking.updatedAt = now(); this.audit(null, 'HOLD_EXPIRED', 'booking', booking.id, null, booking); this.outbox('booking.expired', { bookingId: booking.id }, booking.id) } }
  bookingView(booking, actorId, admin = false) {
    const owner = this.userById(booking.customerId)
    const assignment = booking.assignmentId ? this.state.assignments.find((a) => a.id === booking.assignmentId) : null
    const photographer = assignment ? this.userById(assignment.photographerId) : null
    return {
      id: booking.id, code: booking.code, status: booking.status, paymentStatus: booking.paymentStatus, startAt: booking.startAt, endAt: booking.endAt, holdExpiresAt: booking.holdExpiresAt, updatedAt: booking.updatedAt,
      package: booking.snapshot, addons: booking.addons || [], total: { amount: String(booking.totalVnd), currency: 'VND' }, deposit: { amount: String(booking.depositVnd), currency: 'VND' },
      paid: { amount: String(booking.paidVnd), currency: 'VND' }, remaining: { amount: String(Math.max(0, booking.totalVnd - booking.paidVnd)), currency: 'VND' },
      contact: admin ? { name: booking.contact?.name || owner?.name, email: owner?.email, phone: booking.contact?.phone || '', facebook: booking.contact?.facebook || '', peopleCount: booking.contact?.peopleCount || 1 } : undefined,
      location: (booking.location || {}), notes: admin ? booking.notes || '' : undefined, internalNotes: admin ? booking.internalNotes || '' : undefined,
      assignment: admin ? (assignment ? { ...assignment, photographerName: photographer?.name } : null) : undefined,
      receipts: admin ? (this.state.receipts || []).filter((item) => item.bookingId === booking.id) : undefined,
      sheets: admin ? this.sheetStatus(booking.id) : undefined, version: booking.version,
    }
  }
  ownedBookings(actorId) { return this.state.bookings.filter((b) => b.customerId === actorId).map((b) => this.bookingView(b, actorId)) }
  async simulatePayment(bookingId, actorId, amount = 500000, transactionId = `demo-${cryptoRandom()}`) { if (config.paymentMode !== 'mock') throw new AppError(409, 'DEMO_PAYMENT_DISABLED', 'Đã bật thanh toán thật; không thể mô phỏng cọc'); return this.mutate(async () => { const booking = this.state.bookings.find((b) => b.id === bookingId); if (!booking) throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy booking'); if (this.state.payments.some((p) => p.transactionId === transactionId)) return this.bookingView(booking, actorId, true); const payment = { id: id('pay'), bookingId, source: 'DEMO', transactionId, amountVnd: Number(amount), currency: 'VND', status: Number(amount) === booking.depositVnd && booking.status === 'PENDING' && new Date(booking.holdExpiresAt) > new Date() ? 'VERIFIED' : 'QUARANTINED', createdAt: now() }; this.state.payments.push(payment); if (payment.status === 'VERIFIED') { booking.status = 'CONFIRMED'; booking.paymentStatus = booking.totalVnd <= booking.depositVnd ? 'PAID' : 'PARTIALLY_PAID'; booking.paidVnd = booking.depositVnd; booking.version += 1; booking.updatedAt = now(); this.audit(actorId, 'PAYMENT_VERIFIED_DEMO', 'booking', booking.id, { status: 'PENDING' }, { status: booking.status, paymentStatus: booking.paymentStatus }); this.outbox('booking.confirmed', { bookingId: booking.id }, booking.id) } else this.audit(actorId, 'PAYMENT_QUARANTINED_DEMO', 'payment', payment.id, null, payment, 'Sai số tiền hoặc hold đã hết hạn'); return this.bookingView(booking, actorId, true) }) }
  paymentView(bookingId) { const b = this.state.bookings.find((item) => item.id === bookingId); if (!b) throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy booking'); return { bookingId, code: b.code, ...paymentRequest(b, config, this.state.payments), paymentStatus: b.paymentStatus, paid: { amount: String(b.paidVnd), currency: 'VND' }, remaining: { amount: String(Math.max(0, b.totalVnd - b.paidVnd)), currency: 'VND' }, transactions: this.state.payments.filter((p) => p.bookingId === bookingId).map((p) => ({ ...p, amount: { amount: String(p.amountVnd), currency: p.currency } })) } }
  async block(input, actorId) { return this.mutate(async () => { const start = new Date(input.startAt); const end = new Date(input.endAt); if (!(start < end)) throw new AppError(400, 'VALIDATION_ERROR', 'Khoảng block không hợp lệ'); if (this.activeBookings().some((b) => this.overlap(start, end, b.startAt, b.endAt))) throw new AppError(409, 'SCHEDULE_CONFLICT', 'Khoảng này đã có hold hoặc booking'); const block = { id: id('blk'), startAt: start.toISOString(), endAt: end.toISOString(), reason: input.reason || 'Studio nghỉ / bảo trì', createdAt: now() }; this.state.blocks.push(block); this.audit(actorId, 'SCHEDULE_BLOCKED', 'block', block.id, null, block); return block }) }
  async complete(bookingId, actorId) { return this.mutate(async () => { const b = this.state.bookings.find((item) => item.id === bookingId); if (!b || b.status !== 'CONFIRMED' || !b.assignmentId) throw new AppError(409, 'INVALID_STATE', 'Booking phải được xác nhận và phân thợ trước khi hoàn tất'); const before = { status: b.status }; b.status = 'COMPLETED'; b.version += 1; b.updatedAt = now(); this.audit(actorId, 'BOOKING_COMPLETED', 'booking', b.id, before, { status: b.status }); this.outbox('booking.completed', { bookingId: b.id }, b.id); return b }) }
  photographers() { return this.state.users.filter((u) => u.role === 'PHOTOGRAPHER').map(publicUser) }
  async assign(bookingId, photographerId, payoutVnd, actorId, expectedVersion) { return this.mutate(async () => { const b = this.state.bookings.find((item) => item.id === bookingId); const p = this.userById(photographerId); if (!b || !p) throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy booking hoặc Photographer'); if (expectedVersion != null && Number(expectedVersion) !== b.version) throw new AppError(409, 'VERSION_CONFLICT', 'Booking đã được cập nhật, vui lòng tải lại'); if (b.status !== 'CONFIRMED') throw new AppError(409, 'INVALID_STATE', 'Chỉ booking đã xác nhận mới được phân hoặc đổi ca'); if (p.role !== 'PHOTOGRAPHER' || p.status !== 'ACTIVE') throw new AppError(409, 'PHOTOGRAPHER_UNAVAILABLE', 'Photographer không active'); const current = b.assignmentId ? this.state.assignments.find((a) => a.id === b.assignmentId) : null; if (this.state.assignments.some((a) => a.id !== current?.id && a.photographerId === photographerId && a.status === 'ASSIGNED' && this.overlap(b.startAt, b.endAt, a.startAt, a.endAt))) throw new AppError(409, 'PHOTOGRAPHER_BUSY', 'Photographer đã bận trong khung giờ này'); const amount = Number(payoutVnd); if (!Number.isInteger(amount) || amount < 0 || amount > b.totalVnd) throw new AppError(400, 'VALIDATION_ERROR', 'Tiền công phải là số nguyên từ 0 đến tổng tiền khách'); if (current) current.status = 'REASSIGNED'; const assignment = { id: id('asg'), bookingId, photographerId, payoutVnd: amount, startAt: b.startAt, endAt: b.endAt, status: 'ASSIGNED', version: 1, createdAt: now() }; this.state.assignments.push(assignment); b.assignmentId = assignment.id; b.version += 1; b.updatedAt = now(); this.audit(actorId, current ? 'PHOTOGRAPHER_REASSIGNED' : 'PHOTOGRAPHER_ASSIGNED', 'assignment', assignment.id, current, assignment); this.outbox('assignment.assigned', { bookingId, assignmentId: assignment.id }, bookingId); return clone(assignment) }) }
  calendar(actorId, ownOnly = false) { const all = this.state.bookings.filter((b) => ['CONFIRMED', 'COMPLETED'].includes(b.status)).map((b) => { const assignment = b.assignmentId ? this.state.assignments.find((a) => a.id === b.assignmentId) : null; const photographer = assignment ? this.userById(assignment.photographerId) : null; return { id: b.id, code: b.code, startAt: b.startAt, endAt: b.endAt, status: b.status, customerLabel: this.userById(b.customerId)?.name || 'Khách hàng', photographer: photographer ? photographer.name : null, photographerId: photographer?.id || null, isMine: photographer?.id === actorId, location: photographer?.id === actorId ? b.location : undefined, payout: photographer?.id === actorId ? { amount: String(assignment.payoutVnd), currency: 'VND' } : undefined } }).filter((item) => !ownOnly || item.isMine); return all }
  sheetStatus(bookingId) {
    const events = this.state.outbox.filter((item) => item.channel === 'sheets' && item.bookingId === bookingId)
    const latest = events.slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0]
    return { status: latest?.status || 'NOT_QUEUED', attempts: latest?.attempts || 0, lastError: latest?.lastError || null, updatedAt: latest?.deliveredAt || latest?.createdAt || null }
  }
  sheetRowForBooking(bookingId) {
    const booking = this.state.bookings.find((item) => item.id === bookingId)
    if (!booking) return null
    const owner = this.userById(booking.customerId)
    const assignment = booking.assignmentId ? this.state.assignments.find((item) => item.id === booking.assignmentId) : null
    const photographer = assignment ? this.userById(assignment.photographerId) : null
    const realReceipts = (this.state.receipts || []).filter((item) => item.bookingId === booking.id && item.status === 'RECORDED').reduce((sum, item) => sum + item.amountVnd, 0)
    return {
      bookingId: booking.id, version: booking.version, 'Mã booking': booking.code, 'Trạng thái': booking.status,
      'Ngày chụp': new Date(booking.startAt).toLocaleDateString('vi-VN'), 'Bắt đầu': booking.startAt, 'Kết thúc': booking.endAt,
      'Tên khách': booking.contact?.name || owner?.name || '', Email: owner?.email || '', 'Số điện thoại': booking.contact?.phone || '', Facebook: booking.contact?.facebook || '', 'Số người': booking.contact?.peopleCount || '',
      'Địa điểm': booking.location?.name || '', 'Địa chỉ': booking.location?.address || '', 'Google Maps': booking.location?.mapsUrl || '', 'Gói chụp': booking.snapshot?.name || '', 'Dịch vụ thêm': (booking.addons || []).map((item) => item.name || item).join(', '),
      'Tổng tiền': booking.totalVnd, 'Cọc mô phỏng': this.state.payments.filter((item) => item.bookingId === booking.id && item.source === 'DEMO' && item.status === 'VERIFIED').reduce((sum, item) => sum + item.amountVnd, 0),
      'Thực thu': realReceipts + this.state.payments.filter((p) => p.bookingId === booking.id && p.source === 'SEPAY' && p.status === 'VERIFIED').reduce((sum, p) => sum + p.amountVnd, 0), 'Còn thiếu': Math.max(0, booking.totalVnd - booking.paidVnd), 'Photographer': photographer?.name || '', 'Tiền công': assignment?.payoutVnd || 0, 'Ghi chú': [booking.notes, booking.location?.meetingNotes ? 'Điểm hẹn: ' + booking.location.meetingNotes : ''].filter(Boolean).join('\n'), 'Cập nhật lúc': booking.updatedAt,
    }
  }
  async processOutbox() {
    if (config.sheetsMode === 'disabled') return []
    if (this.outboxRun) return this.outboxRun
    const run = async () => {
      const { deliverOutbox } = await import('../jobs/deliver-outbox.job.js')
      return processOutboxBatch(this, deliverOutbox)
    }
    this.outboxRun = run().finally(() => { this.outboxRun = null })
    return this.outboxRun
  }
  async updateBooking(bookingId, patch, actorId, expectedVersion) {
    return this.mutate(async () => {
      const booking = this.state.bookings.find((item) => item.id === bookingId)
      if (!booking) throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy booking')
      if (expectedVersion != null && Number(expectedVersion) !== booking.version) throw new AppError(409, 'VERSION_CONFLICT', 'Booking đã được cập nhật, vui lòng tải lại')
      const before = clone({ contact: booking.contact, location: booking.location, notes: booking.notes, internalNotes: booking.internalNotes })
      const nextLocation = patch.location ? normalizeLocation({ ...booking.location, ...patch.location }) : booking.location
      const nextContact = { ...booking.contact, ...(patch.contact || {}) }
      if (!String(nextContact.name || '').trim() || !String(nextContact.phone || '').trim()) throw new AppError(400, 'VALIDATION_ERROR', 'Họ tên và số điện thoại là bắt buộc')
      booking.contact = nextContact
      booking.location = nextLocation
      if (patch.notes != null) booking.notes = String(patch.notes).slice(0, 2000)
      if (patch.internalNotes != null) booking.internalNotes = String(patch.internalNotes).slice(0, 2000)
      booking.version += 1; booking.updatedAt = now()
      this.audit(actorId, 'BOOKING_UPDATED', 'booking', booking.id, before, { contact: booking.contact, location: booking.location, notes: booking.notes, internalNotes: booking.internalNotes })
      this.outbox('booking.updated', { bookingId }, booking.id)
      return this.bookingView(booking, actorId, true)
    })
  }
  async recordReceipt(bookingId, input, actorId) {
    return this.mutate(async () => {
      const booking = this.state.bookings.find((item) => item.id === bookingId)
      if (!booking || !['CONFIRMED', 'COMPLETED'].includes(booking.status)) throw new AppError(409, 'INVALID_STATE', 'Chỉ booking đã xác nhận hoặc hoàn tất mới ghi nhận khoản thu')
      const amount = Number(input.amountVnd)
      if (!Number.isInteger(amount) || amount <= 0) throw new AppError(400, 'VALIDATION_ERROR', 'Khoản thu phải là số nguyên dương')
      if (amount > Math.max(0, booking.totalVnd - booking.paidVnd)) throw new AppError(400, 'VALIDATION_ERROR', 'Khoản thu vượt công nợ còn lại')
      if (input.transactionId && this.state.receipts.some((item) => item.transactionId === input.transactionId)) return this.bookingView(booking, actorId, true)
      const receipt = { id: id('receipt'), bookingId, amountVnd: amount, method: input.method || 'CASH', transactionId: input.transactionId || null, note: input.note || '', status: 'RECORDED', createdAt: now(), createdBy: actorId }
      this.state.receipts.push(receipt); booking.paidVnd += amount; booking.paymentStatus = booking.paidVnd >= booking.totalVnd ? 'PAID' : 'PARTIALLY_PAID'; booking.version += 1; booking.updatedAt = now()
      this.audit(actorId, 'PAYMENT_RECORDED_MANUAL', 'receipt', receipt.id, null, receipt); this.outbox('payment.recorded', { bookingId }, bookingId)
      return this.bookingView(booking, actorId, true)
    })
  }
  async reverseReceipt(receiptId, reason, actorId) { return this.mutate(async () => { const receipt = (this.state.receipts || []).find((item) => item.id === receiptId); if (!receipt || receipt.status !== 'RECORDED') throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy khoản thu đang hiệu lực'); const booking = this.state.bookings.find((item) => item.id === receipt.bookingId); receipt.status = 'REVERSED'; receipt.reversedAt = now(); receipt.reversedBy = actorId; receipt.reversalReason = String(reason || '').slice(0, 500); booking.paidVnd = Math.max(0, booking.paidVnd - receipt.amountVnd); booking.paymentStatus = booking.paidVnd >= booking.totalVnd ? 'PAID' : booking.paidVnd > 0 ? 'PARTIALLY_PAID' : 'UNPAID'; booking.version += 1; booking.updatedAt = now(); this.audit(actorId, 'PAYMENT_REVERSED', 'receipt', receipt.id, { status: 'RECORDED', amountVnd: receipt.amountVnd }, receipt, receipt.reversalReason); this.outbox('payment.reversed', { bookingId: booking.id }, booking.id); return this.bookingView(booking, actorId, true) }) }
  async deleteBlock(blockId, actorId) { return this.mutate(async () => { const index = this.state.blocks.findIndex((item) => item.id === blockId); if (index < 0) throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy khoảng khóa'); const [block] = this.state.blocks.splice(index, 1); this.audit(actorId, 'SCHEDULE_UNBLOCKED', 'block', block.id, block, null); return block }) }
  dashboard() {
    const today = new Date().toISOString().slice(0, 10)
    const upcoming = this.state.bookings.filter((item) => ['PENDING', 'CONFIRMED'].includes(item.status) && new Date(item.startAt) >= new Date())
    return { today: this.state.bookings.filter((item) => item.startAt.slice(0, 10) === today).length, upcoming: upcoming.length, unassigned: this.state.bookings.filter((item) => item.status === 'CONFIRMED' && !item.assignmentId).length, outstandingVnd: this.state.bookings.reduce((sum, item) => sum + Math.max(0, item.totalVnd - item.paidVnd), 0), sheetsErrors: this.state.outbox.filter((item) => item.channel === 'sheets' && item.status === 'RETRY').length }
  }
  integrationStatus() {
    const services = [
      { target: 'email', mode: config.emailMode, status: config.emailMode === 'smtp' ? 'CONFIGURED' : 'DEMO', note: config.emailMode === 'smtp' ? 'Gửi email qua SMTP' : 'Hộp thư thử nghiệm' },
      { target: 'payment', mode: config.paymentMode, status: config.paymentMode === 'sepay' ? 'CONFIGURED' : 'DEMO', note: config.paymentMode === 'sepay' ? 'Đối soát chuyển khoản qua SePay' : 'Thanh toán thử nghiệm' },
      { target: 'sms', mode: config.smsMode, status: config.smsMode === 'disabled' ? 'DISABLED' : 'DEMO', note: 'Chưa bật gửi SMS' },
    ]
    return { mode: config.nodeEnv, services, outbox: this.state.outbox.slice(-50).reverse().map(item => ({ id: item.id, type: item.type, status: item.status, attempts: item.attempts, createdAt: item.createdAt })) }
  }
  auditList() { return this.state.audits.slice(-100).reverse().map((a) => ({ ...a, before: a.before ? '[redacted projection]' : null, after: a.after ? '[redacted projection]' : null })) }
}

export const demoStore = new DemoStore()
export { publicUser }

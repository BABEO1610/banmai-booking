import crypto from 'node:crypto'
import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { asyncHandler, AppError } from '../middleware/error.middleware.js'
import { csrfGuard, currentUser, requireAuth, requireRole } from '../middleware/auth.middleware.js'
import { demoStore, publicUser } from '../mock/store.js'
import { authService } from '../services/auth/auth.service.js'
import { config } from '../config/env.js'
import { googleSheetsAdapter } from '../integrations/sheets/google.js'
import healthRoutes from './health.routes.js'
import { createSepayRouter } from './sepay.routes.js'
import { createPackageImageRouter } from './package-image.routes.js'
import { createLocationSearch } from '../services/location.service.js'
import multer from 'multer'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { uploadPublicImage, detectImageExtension } from '../services/storage/public-image.storage.js'

const router = Router()
const searchLocation = createLocationSearch({ endpoint: process.env.NOMINATIM_SEARCH_URL || undefined, userAgent: process.env.MAPS_USER_AGENT || 'BanMaiStudioBooking/1.0' })
const mediaDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../.data/media')
fs.mkdirSync(mediaDir, { recursive: true })
router.use('/v1/admin/catalog/packages', createPackageImageRouter(mediaDir))
const upload = multer({ storage: multer.memoryStorage(), limits: { files: 20, fileSize: 10 * 1024 * 1024 }, fileFilter: (_req, _file, callback) => callback(null, true) })
const uploadImages = (request, response, next) => upload.array('images', 20)(request, response, (error) => error ? next(error.code?.startsWith('LIMIT_') ? new AppError(400, 'INVALID_IMAGE', 'Tối đa 20 ảnh, mỗi ảnh không quá 10MB') : error) : next())
const validImageBytes = (file) => Boolean(detectImageExtension(file.buffer))
router.get('/v1/locations/search', requireAuth, rateLimit({ windowMs: 60000, limit: 10, standardHeaders: true, legacyHeaders: false, handler: (_req, res) => res.status(429).json({ error: { message: 'Bạn đã tìm nhiều lần. Vui lòng chờ một phút.' } }) }), asyncHandler(async (request, response) => {
  response.json({ data: await searchLocation(request.query.q) })
}))
router.use('/v1/payments', createSepayRouter(demoStore, config))
router.get('/v1/admin/payments/review', requireRole('ADMIN'), asyncHandler(async (_request, response) => {
  await demoStore.ready
  const items = demoStore.state.payments.filter((p) => p.source === 'SEPAY' && ['PENDING_REVIEW', 'QUARANTINED'].includes(p.status))
    .map((p) => ({ id: p.id, status: 'PENDING_REVIEW', transactionId: p.transactionId, referenceCode: p.referenceCode, bookingId: p.bookingId, bookingCode: demoStore.state.bookings.find((b) => b.id === p.bookingId)?.code || null, amountVnd: p.amountVnd, content: p.content, reason: p.reason, createdAt: p.createdAt }))
  response.json({ data: items.reverse() })
}))
const ok = (response, data, status = 200) => response.status(status).json({ data })
const userView = (value) => value ? ({ id: value.id, email: value.email, role: value.role, status: value.status, emailVerified: value.emailVerified, name: value.name }) : null
const user = (request) => { const value = currentUser(request); if (!value) throw new AppError(401, 'AUTH_REQUIRED', 'Bạn cần đăng nhập'); return demoStore.userById(value.id) || value }
const bookingFor = (request) => { const b = demoStore.state.bookings.find((item) => item.id === request.params.id); if (!b) throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy booking'); const actor = currentUser(request); if (actor?.role !== 'ADMIN' && b.customerId !== actor?.id) throw new AppError(403, 'OWNERSHIP_REQUIRED', 'Bạn không có quyền với booking này'); return b }
const authenticatedMutation = [requireAuth, csrfGuard]
const saveSession = (session) => new Promise((resolve, reject) => session.save((error) => error ? reject(error) : resolve()))
const sessionLifetime = { CUSTOMER: { max: 7 * 24 * 60 * 60_000, idle: 24 * 60 * 60_000 }, ADMIN: { max: 8 * 60 * 60_000, idle: 30 * 60_000 }, PHOTOGRAPHER: { max: 12 * 60 * 60_000, idle: 60 * 60_000 } }
const limited = (max) => rateLimit({ windowMs: 15 * 60_000, limit: max, standardHeaders: 'draft-8', legacyHeaders: false, handler: (_request, response) => response.status(429).json({ error: { code: 'RATE_LIMITED', message: 'Bạn thử quá nhiều lần. Vui lòng chờ rồi thử lại.' } }) })
const loginLimiter = limited(10)
const challengeLimiter = limited(20)
const establishSession = async (request, found) => {
  await new Promise((resolve, reject) => request.session.regenerate((error) => error ? reject(error) : resolve()))
  const lifetime = sessionLifetime[found.role] || sessionLifetime.CUSTOMER
  const now = Date.now()
  request.session.userId = found.id
  request.session.authUserId = found.dbId || null
  request.session.role = found.role
  request.session.authVersion = found.authVersion || null
  request.session.createdAt = now
  request.session.lastSeenAt = now
  request.session.absoluteExpiresAt = now + lifetime.max
  request.session.idleTimeout = lifetime.idle
  request.session.csrf = crypto.randomBytes(24).toString('hex')
  request.session.cookie.maxAge = lifetime.max
  await saveSession(request.session)
}

router.use('/health', healthRoutes)
router.get('/v1/csrf', (request, response) => { request.session.csrf ||= crypto.randomBytes(24).toString('hex'); ok(response, { token: request.session.csrf }) })
router.post('/v1/auth/register', challengeLimiter, asyncHandler(async (request, response) => ok(response, await authService.register(request.body || {}), 202)))
router.post('/v1/auth/email/verify', challengeLimiter, asyncHandler(async (request, response) => ok(response, userView(await authService.verify(request.body || {})))))
router.post('/v1/auth/email/resend', challengeLimiter, asyncHandler(async (request, response) => ok(response, await authService.resend(request.body || {}), 202)))
router.post('/v1/auth/password/reset-request', challengeLimiter, asyncHandler(async (request, response) => ok(response, await authService.resetRequest(request.body?.email), 202)))
router.post('/v1/auth/password/reset', challengeLimiter, asyncHandler(async (request, response) => ok(response, await authService.reset(request.body || {}))))
router.post('/v1/auth/account/activate', challengeLimiter, asyncHandler(async (request, response) => ok(response, userView(await authService.activate(request.body || {})))))
router.post('/v1/auth/login', loginLimiter, asyncHandler(async (request, response) => { const found = await authService.login(request.body || {}); await establishSession(request, found); ok(response, { user: userView(found), csrfToken: request.session.csrf }) }))
router.post('/v1/auth/logout', ...authenticatedMutation, asyncHandler(async (request, response) => { await new Promise((resolve, reject) => request.session.destroy((error) => error ? reject(error) : resolve())); response.clearCookie('banmai.sid', { httpOnly: true, sameSite: 'lax', secure: config.nodeEnv === 'production', path: '/' }); ok(response, { loggedOut: true }) }))
router.get('/v1/auth/me', asyncHandler(async (request, response) => { const now = Date.now(); const expired = request.session && ((request.session.absoluteExpiresAt && now >= request.session.absoluteExpiresAt) || (request.session.lastSeenAt && request.session.idleTimeout && now - request.session.lastSeenAt >= request.session.idleTimeout)); if (expired) await new Promise((resolve) => request.session.destroy(() => resolve())); const canRead = !expired && (!authService.usingDatabase || request.session?.authUserId); const found = canRead && request.session?.authUserId && authService.usingDatabase ? await authService.current(request.session.authUserId) : (canRead && request.session?.userId ? publicUser(demoStore.userById(request.session.userId)) : null); ok(response, { user: found?.status === 'ACTIVE' && found?.emailVerified !== false ? userView(found) : null, csrfToken: request.session?.csrf || null }) }))
router.get('/v1/demo/mail', asyncHandler(async (request, response) => { if (authService.usingDatabase) throw new AppError(404, 'NOT_FOUND', 'Hộp thư demo không được bật khi dùng email thật'); return ok(response, demoStore.mail(request.query.email, request.get('x-demo-mail-token') || request.query.token)) }))

for (const routePath of ['/packages', '/addons', '/portfolio', '/contents', '/policies']) router.get(`/v1${routePath}`, asyncHandler(async (_request, response) => ok(response, demoStore.publicCatalog()[routePath.slice(1)])))
router.get('/v1/availability', asyncHandler(async (request, response) => ok(response, demoStore.availability({ packageId: request.query.package_id, from: request.query.from, to: request.query.to }))))
router.post('/v1/bookings/quote', requireAuth, asyncHandler(async (request, response) => { user(request); ok(response, demoStore.quote(request.body || {})) }))
router.post('/v1/bookings', ...authenticatedMutation, asyncHandler(async (request, response) => { const found = user(request); if (found.role !== 'CUSTOMER' || !found.emailVerified) throw new AppError(403, 'EMAIL_NOT_VERIFIED', 'Tài khoản cần xác thực email trước khi đặt lịch'); const booking = await demoStore.createBooking(request.body || {}, found.id, request.get('idempotency-key')); ok(response, demoStore.bookingView(booking, found.id), 201) }))
router.get('/v1/bookings', requireAuth, asyncHandler(async (request, response) => { const found = user(request); ok(response, found.role === 'ADMIN' ? demoStore.state.bookings.map((b) => demoStore.bookingView(b, found.id, true)) : demoStore.ownedBookings(found.id)) }))
router.get('/v1/bookings/:id', requireAuth, asyncHandler(async (request, response) => ok(response, demoStore.bookingView(bookingFor(request), request.session.userId, request.session.role === 'ADMIN'))))
router.get('/v1/bookings/:id/payment', requireAuth, asyncHandler(async (request, response) => { const booking = bookingFor(request); ok(response, demoStore.paymentView(booking.id)) }))

router.get('/v1/admin/booking-settings', requireRole('ADMIN'), asyncHandler(async (_request, response) => ok(response, demoStore.state.settings)))
router.get('/v1/admin/dashboard', requireRole('ADMIN'), asyncHandler(async (_request, response) => ok(response, demoStore.dashboard())))
router.patch('/v1/admin/booking-settings', requireRole('ADMIN'), csrfGuard, asyncHandler(async (request, response) => ok(response, await demoStore.updateSettings(request.body || {}, request.session.userId))))
router.get('/v1/admin/bookings', requireRole('ADMIN'), asyncHandler(async (request, response) => { const query = String(request.query.q || '').trim().toLowerCase(); const status = request.query.status; const photographerId = request.query.photographerId; const from = request.query.from ? new Date(request.query.from) : null; const to = request.query.to ? new Date(request.query.to) : null; const all = demoStore.state.bookings.filter((b) => { const owner = demoStore.userById(b.customerId); const assignment = b.assignmentId ? demoStore.state.assignments.find((a) => a.id === b.assignmentId) : null; const haystack = `${b.code} ${owner?.name || ''} ${owner?.email || ''} ${b.contact?.phone || ''}`.toLowerCase(); return (!query || haystack.includes(query)) && (!status || b.status === status) && (!photographerId || assignment?.photographerId === photographerId) && (!from || new Date(b.startAt) >= from) && (!to || new Date(b.startAt) <= to) }).sort((a, b) => new Date(a.startAt) - new Date(b.startAt)); ok(response, all.map((b) => demoStore.bookingView(b, null, true))) }))
router.get('/v1/admin/bookings/:id', requireRole('ADMIN'), asyncHandler(async (request, response) => ok(response, demoStore.bookingView(bookingFor(request), null, true))))
router.patch('/v1/admin/bookings/:id', requireRole('ADMIN'), csrfGuard, asyncHandler(async (request, response) => ok(response, await demoStore.updateBooking(request.params.id, request.body || {}, request.session.userId, request.body?.version))))
router.post('/v1/admin/bookings/:id/receipts', requireRole('ADMIN'), csrfGuard, asyncHandler(async (request, response) => ok(response, await demoStore.recordReceipt(request.params.id, request.body || {}, request.session.userId), 201)))
router.post('/v1/admin/receipts/:id/reverse', requireRole('ADMIN'), csrfGuard, asyncHandler(async (request, response) => ok(response, await demoStore.reverseReceipt(request.params.id, request.body?.reason, request.session.userId))))
router.post('/v1/admin/bookings/:id/complete', requireRole('ADMIN'), csrfGuard, asyncHandler(async (request, response) => ok(response, demoStore.bookingView(await demoStore.complete(request.params.id, request.session.userId), null, true))))
router.post('/v1/admin/blocked-schedules', requireRole('ADMIN'), csrfGuard, asyncHandler(async (request, response) => ok(response, await demoStore.block(request.body || {}, request.session.userId), 201)))
router.get('/v1/admin/blocked-schedules', requireRole('ADMIN'), asyncHandler(async (_request, response) => ok(response, demoStore.state.blocks)))
router.delete('/v1/admin/blocked-schedules/:id', requireRole('ADMIN'), csrfGuard, asyncHandler(async (request, response) => ok(response, await demoStore.deleteBlock(request.params.id, request.session.userId))))
router.get('/v1/admin/photographers', requireRole('ADMIN'), asyncHandler(async (_request, response) => ok(response, demoStore.photographers())))
router.get('/v1/admin/users', requireRole('ADMIN'), asyncHandler(async (_request, response) => ok(response, (await authService.listManaged()).map(userView))))
router.get('/v1/admin/customers', requireRole('ADMIN'), asyncHandler(async (_request, response) => { const customers = demoStore.state.users.filter((item) => item.role === 'CUSTOMER').map((customer) => ({ ...userView(customer), bookings: demoStore.state.bookings.filter((booking) => booking.customerId === customer.id).map((booking) => ({ id: booking.id, code: booking.code, status: booking.status, startAt: booking.startAt, totalVnd: booking.totalVnd })) })); ok(response, customers) }))
router.post('/v1/admin/users', requireRole('ADMIN'), csrfGuard, asyncHandler(async (request, response) => ok(response, await authService.createManaged(request.body || {}), 202)))
router.patch('/v1/admin/users/:id', requireRole('ADMIN'), csrfGuard, asyncHandler(async (request, response) => { const targetId = await authService.resolveId(request.params.id); if (!targetId) throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy tài khoản nội bộ'); ok(response, userView(await authService.updateManaged({ actorId: request.session.authUserId, targetId, status: request.body?.status, role: request.body?.role }))) }))
router.post('/v1/admin/bookings/:id/assignments', requireRole('ADMIN'), csrfGuard, asyncHandler(async (request, response) => ok(response, await demoStore.assign(request.params.id, request.body.photographerId, request.body.payoutVnd, request.session.userId, request.body.version), 201)))
router.get('/v1/admin/audit', requireRole('ADMIN'), asyncHandler(async (_request, response) => ok(response, demoStore.auditList())))
router.get('/v1/admin/integrations/status', requireRole('ADMIN'), asyncHandler(async (_request, response) => { const sheets = await googleSheetsAdapter.status(); const integration = demoStore.integrationStatus(); integration.services = integration.services.map((service) => service.target === 'sheets' ? { ...service, mode: config.sheetsMode, status: sheets.status, note: sheets.note } : service); ok(response, { ...integration, sheets }) }))
router.post('/v1/admin/integrations/:target/retries', requireRole('ADMIN'), csrfGuard, asyncHandler(async (request, response) => { await demoStore.mutate(async () => { const events = demoStore.state.outbox.filter((item) => item.channel === request.params.target || request.params.target === 'sheets'); events.forEach((item) => { item.status = 'PENDING'; item.availableAt = new Date().toISOString() }); }); await demoStore.processOutbox(); ok(response, { target: request.params.target, status: 'QUEUED' }) }))
router.post('/v1/admin/integrations/sheets/sync-all', requireRole('ADMIN'), csrfGuard, asyncHandler(async (_request, response) => { await demoStore.mutate(async () => { demoStore.state.bookings.filter((b) => b.assignmentId && ['CONFIRMED', 'COMPLETED'].includes(b.status)).forEach((b) => demoStore.outbox('booking.sync_requested', { bookingId: b.id }, b.id)); }); ok(response, { queued: demoStore.state.bookings.filter((b) => b.assignmentId && ['CONFIRMED', 'COMPLETED'].includes(b.status)).length }) }))
router.post('/v1/demo/payment/:id', requireRole('ADMIN'), csrfGuard, asyncHandler(async (request, response) => ok(response, await demoStore.simulatePayment(request.params.id, request.session.userId, request.body.amountVnd, request.body.transactionId))))

router.get('/v1/photographer/calendar', requireRole('PHOTOGRAPHER', 'ADMIN'), asyncHandler(async (request, response) => ok(response, demoStore.calendar(request.session.userId, request.query.own === 'true'))))
router.get('/v1/photographer/assignments', requireRole('PHOTOGRAPHER'), asyncHandler(async (request, response) => ok(response, demoStore.calendar(request.session.userId, true))))
router.get('/v1/admin/catalog', requireRole('ADMIN'), asyncHandler(async (_request, response) => ok(response, demoStore.adminCatalog())))
router.get('/v1/admin/portfolio', requireRole('ADMIN'), asyncHandler(async (_request, response) => ok(response, demoStore.adminCatalog().portfolio)))
router.post('/v1/admin/portfolio', requireRole('ADMIN'), csrfGuard, asyncHandler(async (request, response) => ok(response, await demoStore.createPortfolio(request.body || {}, request.session.userId), 201)))
router.patch('/v1/admin/portfolio/:id', requireRole('ADMIN'), csrfGuard, asyncHandler(async (request, response) => ok(response, await demoStore.updatePortfolio(request.params.id, request.body || {}, request.session.userId, request.body?.version))))
router.post('/v1/admin/portfolio/:id/publish', requireRole('ADMIN'), csrfGuard, asyncHandler(async (request, response) => ok(response, await demoStore.publishPortfolio(request.params.id, request.session.userId, request.body?.published !== false))))
router.post('/v1/admin/portfolio/:id/images', requireRole('ADMIN'), csrfGuard, uploadImages, asyncHandler(async (request, response) => { if (!request.files?.length) throw new AppError(400, 'VALIDATION_ERROR', 'Chọn ít nhất một ảnh JPEG, PNG hoặc WebP'); const invalid = request.files.filter((file) => !validImageBytes(file)); if (invalid.length) throw new AppError(400, 'INVALID_IMAGE', 'Một hoặc nhiều file không phải ảnh hợp lệ'); const uploaded = await Promise.all(request.files.map((file) => uploadPublicImage({ bytes: file.buffer, prefix: `portfolio/${request.params.id}`, localDir: mediaDir }))); const files = uploaded.map((item, index) => ({ ...request.files[index], filename: item.filename, publicUrl: item.image })); ok(response, await demoStore.addPortfolioImages(request.params.id, files, request.session.userId, request.body?.version), 201) }))
router.get('/v1/admin/catalog/packages', requireRole('ADMIN'), asyncHandler(async (_request, response) => ok(response, demoStore.adminCatalog().packages)))
router.get('/v1/admin/catalog/packages/:id', requireRole('ADMIN'), asyncHandler(async (request, response) => { const item = demoStore.state.packages.find((entry) => entry.id === request.params.id); if (!item) throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy gói'); ok(response, item) }))
router.post('/v1/admin/catalog/packages', requireRole('ADMIN'), csrfGuard, asyncHandler(async (request, response) => ok(response, await demoStore.createPackage(request.body || {}, request.session.userId), 201)))
router.post('/v1/admin/catalog/packages/:id/publish', requireRole('ADMIN'), csrfGuard, asyncHandler(async (request, response) => ok(response, await demoStore.publishPackage(request.params.id, request.session.userId, request.body?.published !== false))))
router.post('/v1/admin/catalog/packages/:id/archive', requireRole('ADMIN'), csrfGuard, asyncHandler(async (request, response) => ok(response, await demoStore.archivePackage(request.params.id, request.session.userId))))
router.post('/v1/admin/catalog/packages/:id/duplicate', requireRole('ADMIN'), csrfGuard, asyncHandler(async (request, response) => ok(response, await demoStore.duplicatePackage(request.params.id, request.session.userId), 201)))
router.patch('/v1/admin/catalog/packages/:id', requireRole('ADMIN'), csrfGuard, asyncHandler(async (request, response) => ok(response, await demoStore.updateCatalog('packages', request.params.id, request.body || {}, request.session.userId, request.body?.version))))
router.patch('/v1/admin/catalog/addons/:id', requireRole('ADMIN'), csrfGuard, asyncHandler(async (request, response) => ok(response, await demoStore.updateCatalog('addons', request.params.id, request.body || {}, request.session.userId))))

export default router

import { test, expect } from '@playwright/test'
import { bookingPackages } from '../../shared/booking-packages.js'
import { concepts } from '../../client/src/data/showcase.js'
const demoCatalog = { packages: bookingPackages.map(pkg => ({ ...pkg, price: { amount: String(pkg.priceVnd), currency: 'VND' } })), portfolio: concepts }

const money = (amount) => ({ amount: String(amount), currency: 'VND' })
const booking = { id: 'ui-booking', code: 'BM-2026-A-LONG-BOOKING-CODE', status: 'PENDING', paymentStatus: 'UNPAID', package: { name: 'Gói nửa ngày' }, startAt: '2026-10-20T00:00:00Z', total: money(2000000), paid: money(0), remaining: money(2000000), contact: { name: 'Khách hàng minh họa' }, assignment: null }
const payment = { code: booking.code, request: { amount: money(500000), reference: booking.code, label: 'Thanh toán demo — không phải QR ngân hàng thật' }, paymentStatus: 'UNPAID', paid: money(0), remaining: money(2000000) }

// All UI mutations are intercepted: these tests never write business data to Supabase.
async function mockApi(page, role = null, overrides = {}) {
  const user = role ? { id: 'ui-user', name: 'Khách demo', role, emailVerified: true } : null
  await page.route('**/api/v1/**', async (route) => {
    const path = new URL(route.request().url()).pathname.replace('/api/v1', '')
    const data = {
      '/auth/me': { user, csrfToken: 'ui-csrf' },
      '/packages': demoCatalog.packages, '/portfolio': demoCatalog.portfolio, '/addons': [], '/contents': [], '/policies': [],
      '/bookings': { items: [booking], page: 1, pages: 1, total: 1 }, '/bookings/ui-booking/payment': payment,
      '/admin/booking-settings': { maxConcurrentBookings: 2, bufferBeforeMinutes: 0, bufferAfterMinutes: 0, timezone: 'Asia/Ho_Chi_Minh', version: 1, updatedAt: '2026-09-17T00:00:00Z' },
      '/admin/bookings': { items: [booking], page: 1, pages: 1, total: 1 }, '/admin/photographers': [{ id: 'ui-photographer', name: 'Photographer A', status: 'ACTIVE' }],
      '/admin/integrations/status': { services: [{ target: 'payment', status: 'READY', note: 'Không phải giao dịch ngân hàng' }, { target: 'sheets', status: 'READY', note: 'Chưa ghi Google Sheets thật' }] },
      '/admin/audit': [{ id: 'audit-1', action: 'BOOKING_CREATED', entityType: 'booking', createdAt: '2026-09-17T00:00:00Z' }],
      '/photographer/calendar': [{ id: 'shift-1', code: 'BM-2026-001', customerLabel: 'Khách hàng minh họa', startAt: booking.startAt, isMine: true, photographer: 'Photographer A', payout: money(700000) }],
      ...overrides,
    }
    const value = data[path]
    if (typeof value === 'function') return value(route)
    if (value === undefined) return route.fulfill({ status: 404, json: { error: { message: 'Mock endpoint chưa cấu hình' } } })
    return route.fulfill({ json: { data: value } })
  })
}

async function checkLayout(page) {
  await page.evaluate(() => document.fonts.ready)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  expect(await page.locator('html').evaluate((el) => getComputedStyle(el).backgroundColor)).toBe('rgb(255, 255, 255)')
  if (await page.locator('.app-footer').count()) expect(await page.locator('.app-footer').evaluate((el) => getComputedStyle(el).backgroundColor)).toBe('rgb(255, 255, 255)')
  const main = page.locator('main')
  await expect(main).toBeVisible()
  expect(await page.evaluate(() => document.fonts.check('16px "Be Vietnam Pro"'))).toBe(true)
}

for (const width of [1440, 768, 390, 375, 320]) {
  test(`landing photographer scene and navigation at ${width}px`, async ({ page }, testInfo) => {
    // Cold software-GPU shader compilation plus full-page image capture can
    // exceed the default workflow timeout. Timing/FPS is measured separately.
    test.setTimeout(60000)
    const errors = []
    page.on('pageerror', (error) => errors.push(error.message))
    await mockApi(page)
    await page.setViewportSize({ width, height: 960 })
    await page.goto('/')
  await page.getByRole('button', { name: 'Khám phá máy ảnh 3D' }).click()
  await page.mouse.move(0, 0)
    await checkLayout(page)
    await expect(page.locator('.camera-installation')).toHaveAttribute('data-mode', '3d', { timeout: 20000 })
    await expect(page.getByRole('img', { name: /máy ảnh 3D/ })).toBeVisible()
    expect(await page.locator('.landing-hero').evaluate((el) => getComputedStyle(el).backgroundColor)).toBe('rgb(255, 255, 255)')
    await expect(page.locator('.editorial-grid, .package-constellation')).toHaveCount(0)
    // CSS animation freezing cannot stop a WebGL render loop. Capture the
    // owner's explicit paused/full-quality state; motion is tested separately.
    await page.getByRole('button', { name: /Tạm dừng nền động/ }).click()
    await expect(page.locator('.camera-canvas canvas')).toHaveAttribute('data-running', 'false')
    await page.screenshot({ path: testInfo.outputPath(`landing-${width}.png`), fullPage: true })
    await page.getByRole('button', { name: /Bật nền động/ }).click()
    await page.getByRole('button', { name: 'Chụp thử', exact: true }).click()
    await expect(page.locator('.shot-status')).toContainText('Đã chụp thử 1 khung hình minh họa')
    await page.getByRole('button', { name: /Tạm dừng nền động/ }).click()
    await expect(page.locator('.landing-hero')).toHaveClass(/motion-paused/)
    await expect(page.getByRole('button', { name: /Bật nền động/ })).toHaveAttribute('aria-pressed', 'true')
    if (width <= 900) {
      await page.getByRole('button', { name: /Menu/ }).click()
      await expect(page.getByRole('navigation', { name: 'Điều hướng chính' })).toBeVisible()
      expect(await page.getByRole('navigation').evaluate((el) => getComputedStyle(el).backgroundColor)).toBe('rgb(255, 255, 255)')
      await page.screenshot({ path: testInfo.outputPath(`menu-${width}.png`) })
      await page.keyboard.press('Escape')
      await expect(page.getByRole('button', { name: /Menu/ })).toBeFocused()
      await page.getByRole('button', { name: /Menu/ }).click()
    }
    await page.getByRole('navigation').getByRole('link', { name: 'Gói chụp', exact: true }).click()
    await expect(page.getByRole('heading', { name: /Dành thời gian/ })).toBeVisible()
    await expect(page.locator('#main-content')).toBeFocused()
    if (width <= 900) await expect(page.getByRole('navigation')).toBeHidden()
    expect(errors).toEqual([])
  })
}

const screens = [
  ['/packages', null], ['/portfolio', null], ['/portfolio?concept=color', null], ['/policy', null],
  ['/login', null], ['/register', null], ['/verify', null], ['/reset-password', null], ['/activate', null], ['/book', 'CUSTOMER'],
  ['/bookings', 'CUSTOMER'], ['/bookings/ui-booking/payment', 'CUSTOMER'], ['/admin', 'ADMIN'], ['/photographer', 'PHOTOGRAPHER'], ['/not-a-page', null],
]
for (const width of [1440, 390, 320]) for (const [path, role] of screens) {
  test(`screen ${path} at ${width}px`, async ({ page }, testInfo) => {
    const errors = []
    page.on('pageerror', (error) => errors.push(error.message))
    await mockApi(page, role)
    await page.setViewportSize({ width, height: 960 })
    await page.goto(path)
    await expect(page.getByText(/Đang tải dữ liệu|Đang tải gói|Đang kiểm tra phiên|Đang tải lịch|Đang tải thông tin|Đang tải dữ liệu vận hành/)).toHaveCount(0)
    await checkLayout(page)
    await page.screenshot({ path: testInfo.outputPath(`screen-${width}.png`), fullPage: true })
    expect(errors).toEqual([])
  })
}

test('reduced motion removes photographer animation; simulated shutter remains accessible', async ({ page }) => {
  await mockApi(page)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  await page.getByRole('button', { name: 'Khám phá máy ảnh 3D' }).click()
  await page.mouse.move(0, 0)
  await expect(page.getByRole('button', { name: 'Chế độ giảm chuyển động' })).toBeDisabled()
  await expect(page.locator('.camera-installation')).toHaveAttribute('data-mode', '3d', { timeout: 20000 })
  await expect(page.locator('.camera-canvas canvas')).toHaveAttribute('data-running', 'false')
  const frame = await page.locator('.camera-canvas canvas').getAttribute('data-frame')
  await page.waitForTimeout(200)
  expect(await page.locator('.camera-canvas canvas').getAttribute('data-frame')).toBe(frame)
  await page.getByRole('button', { name: 'Chụp thử', exact: true }).click()
  await expect(page.locator('.shot-status')).toContainText('Đã chụp thử 1')
  await expect(page.locator('.camera-shutter-glow')).toBeHidden()
})

test('catalog outage is explicit; booking fails closed instead of submitting fallback data', async ({ page }) => {
  await mockApi(page, 'CUSTOMER', { '/packages': (route) => route.fulfill({ status: 503, json: { error: { message: 'Studio đang mất kết nối' } } }) })
  await page.goto('/packages')
  await expect(page.getByRole('status')).toContainText('Chưa tải được gói chụp')
  await page.goto('/book')
  await expect(page.getByRole('alert')).toContainText('Studio đang mất kết nối')
  await expect(page.getByRole('button', { name: /Giữ lịch 15 phút/ })).toBeDisabled()
})

test('booking POST keeps JSON and CSRF headers, payment status refreshes and VND formats correctly', async ({ page }) => {
  let posted = false
  let paid = false
  await mockApi(page, 'CUSTOMER', {
    '/bookings': (route) => {
      expect(route.request().method()).toBe('POST')
      expect(route.request().headers()['content-type']).toBe('application/json')
      expect(route.request().headers()['x-csrf-token']).toBe('ui-csrf')
      expect(route.request().postDataJSON().packageId).toBe('half')
      posted = true
      return route.fulfill({ status: 201, json: { data: booking } })
    },
    '/bookings/ui-booking/payment': (route) => route.fulfill({ json: { data: paid ? { ...payment, paymentStatus: 'PARTIALLY_PAID', paid: money(500000), remaining: money(1500000) } : payment } }),
  })
  await page.goto('/book')
  await page.getByLabel('Số điện thoại', { exact: true }).fill('0901234567')
  await page.getByRole('button', { name: /Giữ lịch 15 phút/ }).click()
  await expect(page).toHaveURL(/ui-booking\/payment/)
  expect(posted).toBe(true)
  await expect(page.locator('.payment-side dd').first()).toHaveText('2.000.000đ')
  paid = true
  await page.getByRole('button', { name: 'Cập nhật trạng thái' }).click()
  await expect(page.getByRole('heading', { name: /Cọc đã được/ })).toBeVisible()
  await expect(page.locator('.payment-side dd').last()).toHaveText('1.500.000đ')
})

test('bookings error does not display misleading empty state', async ({ page }) => {
  await mockApi(page, 'CUSTOMER', { '/bookings': (route) => route.fulfill({ status: 503, json: { error: { message: 'Không tải được lịch hẹn' } } }) })
  await page.goto('/bookings')
  await expect(page.getByRole('alert')).toHaveText('Không tải được lịch hẹn')
  await expect(page.getByText('Chưa có booking nào.')).toHaveCount(0)
})

test('malformed verification state never crashes', async ({ page }) => {
  await mockApi(page)
  await page.addInitScript(() => sessionStorage.setItem('banmai.challenge', 'broken-json'))
  await page.goto('/verify')
  await expect(page.getByText(/Không có yêu cầu xác thực đang chờ/)).toBeVisible()
})

test('password reset requests an email OTP without exposing the code in the UI', async ({ page }) => {
  await mockApi(page, null, {
    '/auth/password/reset-request': { message: 'Nếu email tồn tại, hướng dẫn đã được gửi.' },
    '/auth/password/reset': { reset: true },
  })
  await page.goto('/reset-password')
  await expect(page.getByLabel('Mật khẩu mới')).toHaveCount(0)
  await page.getByLabel('Email', { exact: true }).fill('customer.x@banmai.test')
  await page.getByRole('button', { name: 'Gửi mã đặt lại' }).click()
  await expect(page.getByText('Kiểm tra Inbox/Spam')).toBeVisible()
  await page.getByLabel('Mã xác thực').fill('123456')
  await page.getByLabel('Mật khẩu mới', { exact: true }).fill('NewPassword123!')
  await page.getByRole('button', { name: /Đổi mật khẩu/ }).click()
  await expect(page.getByRole('status')).toContainText('Đã đổi mật khẩu')
})

test('password fields can be shown and hidden accessibly', async ({ page }) => {
  await mockApi(page)
  await page.goto('/login')
  const password = page.getByLabel('Mật khẩu', { exact: true })
  await password.fill('VisiblePassword123!')
  await expect(password).toHaveAttribute('type', 'password')
  await page.getByRole('button', { name: 'Hiện mật khẩu' }).click()
  await expect(password).toHaveAttribute('type', 'text')
  await expect(page.getByRole('button', { name: 'Ẩn mật khẩu' })).toHaveAttribute('aria-pressed', 'true')
  await page.getByRole('button', { name: 'Ẩn mật khẩu' }).click()
  await expect(password).toHaveAttribute('type', 'password')
})

test('password reset can request a replacement OTP', async ({ page }) => {
  await mockApi(page, null, {
    '/auth/password/reset-request': { message: 'Nếu email tồn tại, hướng dẫn khôi phục mật khẩu đã được gửi.' },
    '/auth/email/resend': { challengeId: 'reset-challenge-2', email: 'customer.x@banmai.test', expiresAt: '2026-09-17T12:15:00Z' },
  })
  await page.goto('/reset-password')
  await page.getByLabel('Email', { exact: true }).fill('customer.x@banmai.test')
  await page.getByRole('button', { name: 'Gửi mã đặt lại' }).click()
  await page.getByRole('button', { name: 'Gửi lại mã' }).click()
  await expect(page.getByRole('status')).toContainText('Đã gửi lại mã')
})

test('keyboard can skip header and mobile menu traps focus until closed', async ({ page }) => {
  await mockApi(page)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await expect(page.locator('.landing-hero')).toBeVisible()
  await page.keyboard.press('Tab')
  await expect(page.getByRole('link', { name: 'Bỏ qua menu, tới nội dung' })).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page.locator('#main-content')).toBeFocused()
  await page.getByRole('button', { name: /Menu/ }).click()
  await page.keyboard.press('Shift+Tab')
  await expect(page.getByRole('navigation').getByRole('link', { name: /Đặt lịch/ })).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(page.getByRole('button', { name: /Đóng/ })).toBeFocused()
})

test('session loading never flashes a login prompt to an authenticated customer', async ({ page }) => {
  let release
  const waiting = new Promise((resolve) => { release = resolve })
  await mockApi(page, 'CUSTOMER', { '/auth/me': async (route) => { await waiting; return route.fulfill({ json: { data: { user: { id: 'ui-user', role: 'CUSTOMER', name: 'Khách demo' }, csrfToken: 'ui-csrf' } } }) } })
  await page.goto('/book')
  await expect(page.getByRole('status')).toContainText('Đang kiểm tra phiên')
  await expect(page.getByRole('heading', { name: /Đăng nhập để/ })).toHaveCount(0)
  release()
  await expect(page.getByRole('button', { name: /Giữ lịch 15 phút/ })).toBeEnabled()
})

test('login displays API errors and re-enables submit', async ({ page }) => {
  await mockApi(page, null, { '/auth/login': (route) => route.fulfill({ status: 401, json: { error: { message: 'Email hoặc mật khẩu không đúng' } } }) })
  await page.goto('/login')
  await page.getByLabel('Email', { exact: true }).fill('customer.x@banmai.test')
  await page.getByLabel('Mật khẩu', { exact: true }).fill('wrong-password')
  await page.getByRole('button', { name: /Đăng nhập/ }).click()
  await expect(page.getByRole('alert')).toContainText('Email hoặc mật khẩu không đúng')
  await expect(page.getByRole('button', { name: /Đăng nhập/ })).toBeEnabled()
})

test('admin cannot assign a pending booking and never offers simulated payment', async ({ page }) => {
  await mockApi(page, 'ADMIN', { '/admin/users': [], '/demo/payment/ui-booking': (route) => route.fulfill({ status: 409, json: { error: { message: 'Hold đã hết hạn' } } }) })
  await page.goto('/admin')
  await expect(page.getByText('Chỉ phân ca sau khi booking được xác nhận.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Phân ca', exact: true })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Mô phỏng cọc 500k' })).toHaveCount(0)
})

test('photographer outage never displays an empty schedule as success', async ({ page }) => {
  await mockApi(page, 'PHOTOGRAPHER', { '/photographer/calendar': (route) => route.fulfill({ status: 503, json: { error: { message: 'Không tải được lịch Studio' } } }) })
  await page.goto('/photographer')
  await expect(page.getByRole('alert')).toHaveText('Không tải được lịch Studio')
  await expect(page.getByText('Chưa có ca đã xác nhận.')).toHaveCount(0)
})

test('photography background moves, pauses on request and pauses off screen', async ({ page }) => {
  await mockApi(page)
  await page.goto('/')
  await page.getByRole('button', { name: 'Khám phá máy ảnh 3D' }).click()
  await page.mouse.move(0, 0)
  await expect(page.locator('.camera-installation')).toHaveAttribute('data-mode', '3d', { timeout: 20000 })
  await expect(page.locator('.camera-canvas canvas')).toHaveAttribute('data-running', 'true')
  const first = await page.locator('.camera-canvas canvas').getAttribute('data-frame')
  await expect.poll(() => page.locator('.camera-canvas canvas').getAttribute('data-frame')).not.toBe(first)
  await page.getByRole('button', { name: /Tạm dừng nền động/ }).click()
  await expect(page.locator('.camera-canvas canvas')).toHaveAttribute('data-running', 'false')
  const frame = await page.locator('.camera-canvas canvas').getAttribute('data-frame')
  await page.waitForTimeout(200)
  expect(await page.locator('.camera-canvas canvas').getAttribute('data-frame')).toBe(frame)
  await page.getByRole('button', { name: /Bật nền động/ }).click()
  await page.locator('.app-footer').scrollIntoViewIfNeeded()
  await expect(page.locator('.camera-canvas canvas')).toHaveAttribute('data-running', 'false')
})

test('landing does not request or embed catalog; destination pages never embed landing', async ({ page }) => {
  const requests = []
  page.on('request', (request) => requests.push(new URL(request.url()).pathname))
  await mockApi(page)
  await page.goto('/')
  await page.getByRole('button', { name: 'Khám phá máy ảnh 3D' }).click()
  await page.mouse.move(0, 0)
  await expect(page.locator('.landing-hero')).toBeVisible()
  expect(requests.filter((path) => ['/api/v1/packages', '/api/v1/portfolio'].includes(path))).toEqual([])
  await expect(page.locator('.package-constellation, .editorial-grid')).toHaveCount(0)
  await page.goto('/packages')
  await expect(page.locator('.package-constellation')).toBeVisible()
  await expect(page.locator('.landing-hero, .editorial-grid')).toHaveCount(0)
  await page.goto('/portfolio')
  await expect(page.locator('.editorial-grid')).toBeVisible()
  await expect(page.locator('.landing-hero, .package-constellation')).toHaveCount(0)
})

test('white page canvas and blush primary controls remain readable in landscape', async ({ page }) => {
  await mockApi(page)
  await page.setViewportSize({ width: 844, height: 390 })
  for (const path of ['/', '/packages', '/portfolio', '/policy', '/login']) {
    await page.goto(path)
    await checkLayout(page)
    expect(await page.locator('html').evaluate((el) => getComputedStyle(el).backgroundColor)).toBe('rgb(255, 255, 255)')
    expect(await page.locator('.header-wrap').evaluate((el) => getComputedStyle(el).backgroundColor)).toBe('rgb(255, 255, 255)')
    if (await page.locator('.app-footer').count()) expect(await page.locator('.app-footer').evaluate((el) => getComputedStyle(el).backgroundColor)).toBe('rgb(255, 255, 255)')
  }
})

test('blush primary text contrast is readable at both gradient endpoints', async ({ page }) => {
  await mockApi(page)
  await page.goto('/')
  await page.getByRole('button', { name: 'Khám phá máy ảnh 3D' }).click()
  await page.mouse.move(0, 0)
  const ratio = await page.locator('.landing-hero .primary-button').evaluate((el) => {
    const style = getComputedStyle(el)
    const foreground = style.color.match(/\d+/g).slice(0, 3).map(Number)
    const luminance = (rgb) => rgb.map((value) => value / 255).map((value) => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4).reduce((sum, value, i) => sum + value * [.2126, .7152, .0722][i], 0)
    const parseHex = (hex) => hex.trim().replace('#', '').match(/.{2}/g).map((part) => parseInt(part, 16))
    return ['--color-primary-start', '--color-primary-end'].map((key) => {
      const a = luminance(foreground), b = luminance(parseHex(style.getPropertyValue(key)))
      return (Math.max(a, b) + .05) / (Math.min(a, b) + .05)
    })
  })
  for (const endpoint of ratio) expect(endpoint).toBeGreaterThanOrEqual(4.5)
})

test('photographer pauses on hover and keyboard interaction, while explicit play resumes', async ({ page }) => {
  await mockApi(page)
  await page.goto('/')
  await page.getByRole('button', { name: 'Khám phá máy ảnh 3D' }).click()
  await page.mouse.move(0, 0)
  await page.locator('.hero-scene').hover()
  await expect(page.locator('.landing-hero')).toHaveClass(/motion-paused/)
  await page.mouse.move(0, 0)
  await expect(page.locator('.landing-hero')).not.toHaveClass(/motion-paused/)
  await page.locator('.landing-hero .primary-button').focus()
  await expect(page.locator('.landing-hero')).toHaveClass(/motion-paused/)
  await page.getByRole('button', { name: /Tạm dừng nền động/ }).click()
  await page.getByRole('button', { name: /Bật nền động/ }).click()
  await expect(page.locator('.landing-hero')).not.toHaveClass(/motion-paused/)
})

for (const width of [1440, 390, 320]) {
  test(`collections animate, contain distinct photos and lightbox supports keyboard at ${width}px`, async ({ page }, testInfo) => {
    const errors = []
    page.on('pageerror', (error) => errors.push(error.message))
    await mockApi(page)
    await page.setViewportSize({ width, height: 960 })
    await page.goto('/portfolio')
    await page.getByRole('button', { name: 'Chân dung', exact: true }).click()
    await expect(page).toHaveURL(/concept=portrait/)
    await expect(page.getByRole('heading', { name: 'Chân dung', exact: true })).toBeVisible()
    await expect(page.locator('.collection-photo')).toHaveCount(3)
    expect(new Set(await page.locator('.collection-photo img').evaluateAll((images) => images.map((image) => image.src))).size).toBe(3)
    await expect(page.locator('.collection-disclaimer')).toContainText('chưa phải tác phẩm của Studio')
    const cover = page.locator('.collection-photo').first()
    await cover.click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Đóng ảnh lớn' })).toBeFocused()
    await expect(page.getByRole('dialog').getByRole('status')).toContainText('01 / 03')
    await page.keyboard.press('ArrowRight')
    await expect(page.getByRole('dialog').getByRole('status')).toContainText('02 / 03')
    await expect(page.locator('.lightbox-stage img')).toHaveAttribute('src', '/images/portrait-close.jpg')
    await expect(page.locator('.lightbox-stage img')).toHaveCSS('opacity', '1')
    await page.screenshot({ path: testInfo.outputPath(`lightbox-${width}.png`) })
    await page.keyboard.press('ArrowLeft')
    await expect(page.getByRole('dialog').getByRole('status')).toContainText('01 / 03')
    await page.keyboard.press('Shift+Tab')
    await expect(page.getByRole('button', { name: 'Ảnh tiếp theo' })).toBeFocused()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect(cover).toBeFocused()
    expect(await page.evaluate(() => document.body.style.overflow)).not.toBe('hidden')
    await page.getByRole('button', { name: 'Sắc riêng', exact: true }).click()
    await expect.poll(() => page.locator('[data-concept="portrait"]').evaluateAll((elements) => elements.map((el) => getComputedStyle(el).opacity))).not.toEqual(['1'])
    await expect(page.getByRole('heading', { name: 'Sắc riêng', exact: true })).toBeVisible()
    await expect(page.locator('.collection-photo')).toHaveCount(3)
    await page.getByRole('button', { name: 'Concept tiếp theo: Chung đôi' }).click()
    await expect(page.getByRole('heading', { name: 'Chung đôi', exact: true })).toBeVisible()
    await page.goBack()
    await expect(page.getByRole('heading', { name: 'Sắc riêng', exact: true })).toBeVisible()
    await checkLayout(page)
    await expect(page.locator('.concept-transition')).toHaveCSS('opacity', '1')
    await page.screenshot({ path: testInfo.outputPath(`collection-${width}.png`), fullPage: true })
    await page.getByRole('button', { name: 'Tất cả', exact: true }).click()
    await expect(page.locator('.editorial-grid')).toBeVisible()
    expect(errors).toEqual([])
  })
}

test('rapid concept changes, deep links and reduced motion keep the final selection', async ({ page }) => {
  await mockApi(page)
  await page.goto('/portfolio?concept=together')
  await expect(page.locator('.collection-photo')).toHaveCount(3)
  await page.evaluate(() => {
    for (const name of ['Chân dung', 'Sắc riêng', 'Chung đôi', 'Sắc riêng']) [...document.querySelectorAll('.portfolio-tabs button')].find((button) => button.textContent === name).click()
  })
  await expect(page).toHaveURL(/concept=color/)
  await expect(page.locator('.concept-transition')).toHaveCount(1)
  await expect(page.locator('.concept-transition')).toHaveAttribute('data-concept', 'color')
  await expect(page.getByRole('heading', { name: 'Sắc riêng', exact: true })).toBeVisible()
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.getByRole('button', { name: 'Chân dung', exact: true }).click()
  await expect(page.locator('.concept-transition')).toHaveAttribute('data-concept', 'portrait')
  await expect(page.locator('.concept-transition')).toHaveCSS('transform', 'none')
})

test('WebGL unavailable uses a readable fallback instead of an empty hero', async ({ page }, testInfo) => {
  await mockApi(page)
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext
    HTMLCanvasElement.prototype.getContext = function (type, ...args) { return type === 'webgl2' ? null : original.call(this, type, ...args) }
  })
  await page.goto('/')
  await page.getByRole('button', { name: 'Khám phá máy ảnh 3D' }).click()
  await page.mouse.move(0, 0)
  await expect(page.locator('.camera-installation')).toHaveAttribute('data-mode', 'fallback')
  await expect(page.locator('.installation-fallback')).toBeVisible()
  await expect(page.locator('.installation-fallback img')).toHaveCount(0)
  await expect(page.getByText('Minh họa Studio · Thiết bị không hỗ trợ 3D')).toBeVisible()
  await page.getByRole('button', { name: 'Chụp thử', exact: true }).click()
  await expect(page.locator('.shot-status')).toContainText('Đã chụp thử 1')
  await page.screenshot({ path: testInfo.outputPath('landing-fallback.png'), fullPage: true })
})

test('3D context loss switches to fallback and route re-entry recreates the installation', async ({ page }) => {
  await mockApi(page)
  await page.goto('/')
  await page.getByRole('button', { name: 'Khám phá máy ảnh 3D' }).click()
  await page.mouse.move(0, 0)
  await expect(page.locator('.camera-installation')).toHaveAttribute('data-mode', '3d', { timeout: 20000 })
  await page.locator('.camera-canvas canvas').evaluate((canvas) => canvas.dispatchEvent(new Event('webglcontextlost', { cancelable: true })))
  await expect(page.locator('.camera-installation')).toHaveAttribute('data-mode', 'fallback')
  await page.getByRole('navigation').getByRole('link', { name: 'Bộ ảnh', exact: true }).click()
  await expect(page.locator('.camera-canvas canvas')).toHaveCount(0)
  await page.getByRole('link', { name: 'Ban Mai — Trang chủ', exact: true }).click()
  await page.getByRole('button', { name: 'Khám phá máy ảnh 3D' }).click()
  await expect(page.locator('.camera-installation')).toHaveAttribute('data-mode', '3d', { timeout: 20000 })
  await expect(page.locator('.camera-canvas canvas')).toHaveCount(1)
})

test('all nine collection photographs load as distinct local images', async ({ page }) => {
  await mockApi(page)
  await page.setViewportSize({ width: 390, height: 844 })
  for (const id of ['portrait', 'color', 'together']) {
    await page.goto(`/portfolio?concept=${id}`)
    await expect(page.locator('.collection-photo img')).toHaveCount(3)
    for (const image of await page.locator('.collection-photo img').all()) {
      await image.scrollIntoViewIfNeeded()
      await expect.poll(() => image.evaluate((el) => el.complete && el.naturalWidth > 0)).toBe(true)
    }
  }
})

test('3D view changes with a keyboard/mobile button while automatic motion is paused', async ({ page }) => {
  await mockApi(page)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  await page.getByRole('button', { name: 'Khám phá máy ảnh 3D' }).click()
  await page.mouse.move(0, 0)
  await expect(page.locator('.camera-installation')).toHaveAttribute('data-mode', '3d', { timeout: 20000 })
  const button = page.getByRole('button', { name: 'Đổi góc nhìn', exact: true })
  await button.focus()
  const before = await page.locator('.camera-canvas').screenshot()
  await page.keyboard.press('Enter')
  const after = await page.locator('.camera-canvas').screenshot()
  expect(before.equals(after)).toBe(false)
  await expect(page.locator('.camera-canvas canvas')).toHaveAttribute('data-running', 'false')
})

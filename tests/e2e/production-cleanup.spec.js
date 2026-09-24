import { test, expect } from '@playwright/test'

for (const width of [1440, 390, 320]) {
  test(`lightweight landing and photographer at ${width}px`, async ({ page }, info) => {
    const requests = [], errors = []
    page.on('request', request => requests.push(request.url()))
    page.on('pageerror', error => errors.push(error.message))
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/')
    await expect(page.getByRole('heading', { name: /Một góc nhìn/ })).toBeVisible()
    await expect(page.locator('.camera-installation')).toHaveCount(0)
    await expect(page.locator('.studio-pet')).toHaveCount(0)
    await expect(page.locator('.hero-poster img')).toBeVisible()
    expect(requests.some(url => /studio-3d|AdminPage|LocationMap/.test(url))).toBe(false)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.screenshot({ path: info.outputPath(`photographer-${width}.png`), fullPage: true })
    expect(errors).toEqual([])
  })
}

test('admin loads only current tab and pagination changes requests', async ({ page }) => {
  const requested = []
  await page.route('**/api/v1/**', async route => {
    const url = new URL(route.request().url()); requested.push(url.pathname)
    const data = url.pathname.endsWith('/auth/me') ? { user: { id: 'a', role: 'ADMIN', emailVerified: true }, csrfToken: 'x' }
      : url.pathname.endsWith('/admin/bookings') ? { items: [], page: Number(url.searchParams.get('page') || 1), pages: 2, total: 26 }
      : url.pathname.endsWith('/admin/catalog') ? { packages: [], addons: [], portfolio: [] } : []
    await route.fulfill({ json: { data } })
  })
  await page.goto('/admin')
  await expect(page.getByText('Trang 1 / 2')).toBeVisible()
  expect(requested.some(url => /audit|integrations|customers|catalog/.test(url))).toBe(false)
  await expect(page.locator('.app-footer')).toHaveCount(0)
  await page.getByRole('button', { name: 'Trang sau' }).click()
  await expect(page.getByText('Trang 2 / 2')).toBeVisible()
  await page.getByRole('button', { name: 'Gói & dịch vụ' }).click()
  await expect.poll(() => requested.includes('/api/v1/admin/catalog')).toBe(true)
})

test('packages failure never substitutes demo prices', async ({ page }) => {
  await page.route('**/api/v1/packages', route => route.fulfill({ status: 503, json: {} }))
  await page.goto('/packages')
  await expect(page.getByRole('button', { name: 'Thử lại' })).toBeVisible()
  await expect(page.locator('.package-orbit')).toHaveCount(0)
})

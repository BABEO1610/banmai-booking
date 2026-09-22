import { test, expect } from '@playwright/test'

test('location search is explicit, selection updates fields, manual edit clears old pin', async ({ page }) => {
  let calls = 0
  await page.route('**/api/v1/auth/me', (route) => route.fulfill({ json: { data: { user: { id: 'test', role: 'CUSTOMER', name: 'Test', emailVerified: true }, csrfToken: 'test' } } }))
  await page.route('**/api/v1/locations/search?*', (route) => { calls++; return route.fulfill({ json: { data: [{ name: 'Hồ Hoàn Kiếm', address: 'Hoàn Kiếm, Hà Nội', lat: 21.028, lng: 105.852, source: 'osm', osmId: 'way:1' }] } }) })
  // Keep automated map tests off community tile infrastructure.
  await page.route('https://tile.openstreetmap.org/**', (route) => route.fulfill({ contentType: 'image/png', body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64') }))
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto('/book')
  await page.getByLabel('Tìm địa điểm tại Việt Nam', { exact: true }).fill('Hồ Hoàn Kiếm')
  expect(calls).toBe(0)
  await page.getByRole('button', { name: 'Tìm kiếm', exact: true }).click()
  await page.getByRole('button', { name: 'Hồ Hoàn Kiếm Hoàn Kiếm, Hà Nội' }).click()
  await expect(page.getByLabel('Tên địa điểm', { exact: true })).toHaveValue('Hồ Hoàn Kiếm')
  await expect(page.getByLabel('Địa chỉ', { exact: true })).toHaveValue('Hoàn Kiếm, Hà Nội')
  await expect(page.getByRole('link', { name: 'Mở vị trí trên bản đồ' })).toHaveAttribute('href', /mlat=21.028/)
  await expect(page.getByRole('button', { name: 'Chọn tâm bản đồ làm điểm hẹn' })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.getByLabel('Địa chỉ', { exact: true }).fill('Địa chỉ nhập tay')
  await expect(page.getByRole('link', { name: 'Mở vị trí trên bản đồ' })).toHaveCount(0)
  expect(calls).toBe(1)
})

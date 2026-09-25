import { test, expect } from '@playwright/test'

const content = { data: [{ key: 'home_intro', image: '/images/daylight.jpg' }] }

test('hero recovers from a failed first request without navigating away', async ({ page }) => {
  let requests = 0
  await page.route('**/api/v1/contents', (route) => {
    requests++
    return requests === 1 ? route.fulfill({ status: 503, body: '' }) : route.fulfill({ json: content })
  })
  await page.goto('/')
  const photo = page.locator('.hero-poster img')
  await expect(photo).toBeVisible()
  await expect.poll(() => photo.evaluate((img) => img.naturalWidth)).toBeGreaterThan(0)
  expect(requests).toBeGreaterThan(1)
})

test('hero keeps a usable fallback after persistent API errors', async ({ page }) => {
  await page.route('**/api/v1/contents', (route) => route.fulfill({ status: 503, body: '' }))
  await page.goto('/')
  await expect(page.locator('.hero-poster img')).toBeVisible()
  await expect(page.getByText('Chưa tải được ảnh Studio.')).toHaveCount(0)
})

test('missing hero content does not leave a loading message', async ({ page }) => {
  await page.route('**/api/v1/contents', (route) => route.fulfill({ json: { data: [] } }))
  await page.goto('/')
  await expect(page.locator('.hero-poster img')).toBeVisible()
  await expect(page.getByText('Đang tải ảnh Studio…')).toHaveCount(0)
})

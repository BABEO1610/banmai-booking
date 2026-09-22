import { test, expect } from '@playwright/test'
import { socialUrl } from '../../client/src/data/studioContact.js'

test('contact URL validation accepts explicit platform links only', () => {
  expect(socialUrl('zalo', ' https://zalo.me/0900000000 ')).toBe('https://zalo.me/0900000000')
  expect(socialUrl('facebook', 'https://www.facebook.com/studio-test')).toBe('https://www.facebook.com/studio-test')
  for (const value of ['', null, {}, 'javascript:alert(1)', 'http://zalo.me/123', 'https://zalo.me.attacker.com/123', 'https://user:password@zalo.me/123', 'https://zalo.me:8443/123', 'https://facebook.com/']) expect(socialUrl('zalo', value)).toBeNull()
  expect(socialUrl('facebook', 'https://facebook.com.evil.com/studio')).toBeNull()
  expect(socialUrl('facebook', 'https://facebook.com/')).toBeNull()
  expect(socialUrl('unknown', 'https://zalo.me/123')).toBeNull()
})

async function prepare(page, config = {}) {
  await page.route('**/api/v1/**', (route) => route.fulfill({ json: { data: route.request().url().endsWith('/auth/me') ? { user: null, csrfToken: 'test' } : [] } }))
  // These are test fixtures, never deployed as the Studio's actual contact links.
  await page.route('**/studio-contact.json', (route) => route.fulfill({ json: config }))
}

for (const width of [1440, 1024, 390, 320]) test(`shared customer care, keyboard navigation and configured links at ${width}px`, async ({ page }, testInfo) => {
  const errors = []; page.on('pageerror', (error) => errors.push(error.message))
  await prepare(page, { zalo: 'https://zalo.me/0900000000', facebook: 'https://www.facebook.com/studio-test' })
  await page.setViewportSize({ width, height: 960 }); await page.goto('/policy')
  if (width <= 900) await page.getByRole('button', { name: 'Menu' }).click()
  const help = page.getByRole('navigation').getByRole('link', { name: 'Liên hệ', exact: true })
  await help.focus(); await page.keyboard.press('Enter')
  await expect(page.locator('#studio-contact')).toBeFocused()
  if (width <= 900) await expect(page.getByRole('navigation')).toBeHidden()
  const zalo = page.getByRole('link', { name: /Nhắn tin qua Zalo/ })
  const fb = page.getByRole('link', { name: /Ghé Facebook Studio/ })
  await expect(zalo).toHaveAttribute('href', 'https://zalo.me/0900000000')
  await expect(fb).toHaveAttribute('href', 'https://www.facebook.com/studio-test')
  for (const link of [zalo, fb]) {
    await expect(link).toHaveAttribute('target', '_blank'); await expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    expect((await link.boundingBox()).height).toBeGreaterThanOrEqual(44)
  }
  await page.keyboard.press('Tab'); await expect(zalo).toBeFocused()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.evaluate(() => document.fonts.ready)
  await page.locator('#studio-contact').screenshot({ path: testInfo.outputPath(`contact-${width}.png`) })
  expect(errors).toEqual([])
})

test('missing and unsafe contact links are not fake clickable channels', async ({ page }) => {
  await prepare(page, { zalo: '', facebook: 'javascript:alert(1)' }); await page.goto('/login')
  await expect(page.locator('.contact-unavailable')).toHaveCount(2)
  await expect(page.locator('.contact-unavailable').first()).toHaveText('Studio chưa cập nhật link liên hệ')
  await expect(page.locator('.contact-link')).toHaveCount(0)
})

test('contact configuration failure is safe and never blocks the page', async ({ page }) => {
  await prepare(page)
  await page.route('**/studio-contact.json', (route) => route.fulfill({ status: 503, body: 'Unavailable' }))
  await page.goto('/login')
  await expect(page.locator('.contact-unavailable').first()).toHaveText('Kênh liên hệ tạm thời chưa khả dụng')
  await expect(page.getByRole('heading', { name: /Chào bạn/ })).toBeVisible()
})

test('professional camera has three distinct angles including the rear controls', async ({ page }, testInfo) => {
  await prepare(page); await page.emulateMedia({ reducedMotion: 'reduce' }); await page.goto('/')
  await expect(page.locator('.camera-installation')).toHaveAttribute('data-mode', '3d', { timeout: 20000 })
  const canvas = page.locator('.camera-canvas canvas'), images = []
  expect(Number(await canvas.getAttribute('data-draw-calls'))).toBeLessThanOrEqual(32)
  await expect(canvas).toHaveAttribute('data-lightweight', 'false')
  for (const angle of ['front', 'side', 'rear']) {
    images.push(await canvas.screenshot({ path: testInfo.outputPath(`camera-${angle}.png`) }))
    await expect(canvas).toHaveAttribute('data-running', 'false')
    await page.getByRole('button', { name: 'Đổi góc nhìn' }).click()
  }
  expect(images[0].equals(images[1])).toBe(false); expect(images[1].equals(images[2])).toBe(false)
  await page.screenshot({ path: testInfo.outputPath('landing-professional.png'), fullPage: true })
})

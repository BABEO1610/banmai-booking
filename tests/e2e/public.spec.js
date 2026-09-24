import { test, expect } from './fixtures.js'

test('guest can inspect the public catalog', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: /Một góc nhìn/ })).toBeVisible()
  await expect(page.getByText(/Bản demo · Hình ảnh minh họa/)).toHaveCount(0)
  await page.getByRole('navigation', { name: 'Điều hướng chính' }).getByRole('link', { name: 'Gói chụp', exact: true }).click()
  await expect(page.locator('.package-orbit').first()).toBeVisible()
  await expect(page.getByRole('heading', { name: /Dành thời gian/ })).toBeVisible()
})

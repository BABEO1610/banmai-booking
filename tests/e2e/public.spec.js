import { test, expect } from './fixtures.js'

test('guest can inspect the public catalog and demo label', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: /Một góc nhìn/ })).toBeVisible()
  await expect(page.getByText(/Bản demo · Hình ảnh minh họa/)).toBeVisible()
  await page.getByRole('navigation', { name: 'Điều hướng chính' }).getByRole('link', { name: 'Gói chụp', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Gói nửa ngày' })).toBeVisible()
  await expect(page.getByRole('heading', { name: /Dành thời gian/ })).toBeVisible()
})

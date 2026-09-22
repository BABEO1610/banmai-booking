import { test, expect } from '@playwright/test'

test('SePay shows holder and QR, hides QR on pending review, and fits mobile', async ({ page }) => {
  let review = false
  const payment = { code: 'BM-TEST', mode: 'SEPAY', providerConfigured: true, status: 'PENDING', holdExpiresAt: new Date(Date.now() + 60000).toISOString(), bankName: 'VietinBank', bankAccount: '123456', accountHolder: 'TEST HOLDER', qrUrl: 'https://vietqr.app/img?acc=123456', request: { amount: { amount: '500000' }, reference: 'BMTEST', label: 'Chuyển khoản đúng nội dung' }, paymentStatus: 'UNPAID', paid: { amount: '0' }, remaining: { amount: '2000000' } }
  await page.route('**/api/v1/auth/me', (route) => route.fulfill({ json: { data: { user: { id: 'test', role: 'CUSTOMER', name: 'Test', emailVerified: true }, csrfToken: 'test' } } }))
  await page.route('**/api/v1/bookings/test/payment', (route) => route.fulfill({ json: { data: { ...payment, pendingReview: review } } }))
  await page.route('https://vietqr.app/**', (route) => route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="280" height="280"><rect width="280" height="280" fill="white"/></svg>' }))
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto('/bookings/test/payment')
  await expect(page.getByText('TEST HOLDER', { exact: true })).toBeVisible()
  await expect(page.getByRole('img', { name: 'Mã QR chuyển khoản cọc đúng số tiền và mã booking' })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  review = true
  await page.getByRole('button', { name: 'Cập nhật trạng thái' }).click()
  await expect(page.getByText('Chờ đối soát', { exact: true })).toBeVisible()
  await expect(page.getByRole('img', { name: 'Mã QR chuyển khoản cọc đúng số tiền và mã booking' })).toHaveCount(0)
  await expect(page.getByRole('alert')).toContainText('không chuyển thêm')
})

test('customer automatically gets balance QR after completion and loses it after full payment', async ({ page }) => {
  let completed = false
  let paid = false
  await page.route('**/api/v1/auth/me', route => route.fulfill({ json: { data: { user: { id: 'test', role: 'CUSTOMER', name: 'Test', emailVerified: true }, csrfToken: 'test' } } }))
  await page.route('**/api/v1/bookings/test/payment', route => route.fulfill({ json: { data: {
    code: 'BM-TEST', mode: 'SEPAY', providerConfigured: true, status: completed ? 'COMPLETED' : 'CONFIRMED',
    holdExpiresAt: null, bankName: 'VietinBank', bankAccount: '123456', accountHolder: 'TEST HOLDER',
    qrUrl: completed && !paid ? 'https://vietqr.app/img?amount=1500000&des=SEVQRBMTESTTT' : null,
    request: { purpose: completed ? 'BALANCE' : 'DEPOSIT', amount: { amount: paid ? '0' : completed ? '1500000' : '500000' }, reference: 'SEVQRBMTESTTT', label: 'Thanh toán phần còn lại' },
    paymentStatus: paid ? 'PAID' : 'PARTIALLY_PAID', paid: { amount: paid ? '2000000' : '500000' }, remaining: { amount: paid ? '0' : '1500000' }
  } } }))
  await page.route('https://vietqr.app/**', route => route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="280" height="280"/>' }))
  await page.goto('/bookings/test/payment')
  await expect(page.getByText('Cọc đã được ghi nhận.', { exact: false })).toBeVisible()
  completed = true
  await expect(page.getByRole('img', { name: 'Mã QR thanh toán phần còn lại' })).toBeVisible({ timeout: 15000 })
  await expect(page.getByRole('heading', { level: 1 })).toContainText('phần còn lại.')
  paid = true
  await page.evaluate(() => window.dispatchEvent(new Event('focus')))
  await expect(page.getByText('Đã thanh toán đủ. Cảm ơn bạn!')).toBeVisible()
  await expect(page.getByRole('img', { name: 'Mã QR thanh toán phần còn lại' })).toHaveCount(0)
})

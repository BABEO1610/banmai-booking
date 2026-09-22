import test from 'node:test'
import assert from 'node:assert/strict'
import { paymentRequest } from '../../src/services/payment/payment-request.js'

const config = { paymentMode: 'sepay', sepayApiKey: 'fixture', sepayBankAccount: '123456', sepayBankName: 'VietinBank', sepayAccountHolder: 'TEST HOLDER' }
const booking = { id: 'b1', code: 'BM-2026-ABCDEFGH', status: 'PENDING', paidVnd: 0, depositVnd: 500000, holdExpiresAt: new Date(20000).toISOString() }

test('completed booking requests only outstanding balance with distinct memo', () => {
  const completed = { ...booking, status: 'COMPLETED', totalVnd: 2000000, paidVnd: 500000, holdExpiresAt: null }
  const result = paymentRequest(completed, config)
  assert.equal(result.request.purpose, 'BALANCE')
  assert.equal(new URL(result.qrUrl).searchParams.get('amount'), '1500000')
  assert.equal(result.request.reference, 'SEVQRBM2026ABCDEFGHTT')
  assert.equal(paymentRequest({ ...completed, paidVnd: 2000000 }, config).qrUrl, null)
  assert.equal(paymentRequest({ ...completed, status: 'CONFIRMED' }, config).qrUrl, null)
  assert.equal(paymentRequest(completed, config, [{ source: 'SEPAY', bookingId: 'b1', status: 'PENDING_REVIEW' }]).qrUrl, null)
})
test('QR binds account, bank, holder, deposit and normalized reference without exposing key', () => {
  const result = paymentRequest(booking, config, [], 10000)
  const url = new URL(result.qrUrl)
  assert.equal(url.origin, 'https://vietqr.app')
  for (const [key, value] of Object.entries({ acc: '123456', bank: 'VietinBank', holder: 'TEST HOLDER', amount: '500000', des: 'SEVQRBM2026ABCDEFGH' })) assert.equal(url.searchParams.get(key), value)
  assert.equal(result.request.reference, url.searchParams.get('des'))
  assert.equal(JSON.stringify(result).includes('fixture'), false)
})
test('no QR for expired, paid, review, demo or unconfigured bookings', () => {
  assert.equal(paymentRequest(booking, config, [], 20000).qrUrl, null)
  assert.equal(paymentRequest({ ...booking, paidVnd: 500000 }, config, [], 10000).qrUrl, null)
  for (const status of ['PENDING_REVIEW', 'QUARANTINED']) {
    const result = paymentRequest(booking, config, [{ bookingId: 'b1', source: 'SEPAY', status }], 10000)
    assert.equal(result.pendingReview, true)
    assert.equal(result.qrUrl, null)
  }
  assert.equal(paymentRequest(booking, { ...config, paymentMode: 'mock' }, [], 10000).qrUrl, null)
  assert.equal(paymentRequest(booking, { ...config, sepayAccountHolder: '' }, [], 10000).qrUrl, null)
})

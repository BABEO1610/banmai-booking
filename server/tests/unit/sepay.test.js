import test from 'node:test'
import assert from 'node:assert/strict'
import express from 'express'
import { authenticateSepay, receiveSepay } from '../../src/services/payment/sepay.service.js'
import { createSepayRouter } from '../../src/routes/sepay.routes.js'
import { errorHandler } from '../../src/middleware/error.middleware.js'
import { DurableState } from '../../src/db/durable-state.js'
import { paymentRequest } from '../../src/services/payment/payment-request.js'

test('generated SEVQR memo confirms the booking from webhook content or code', async () => {
  for (const field of ['content', 'code']) {
    const store = fixture()
    const request = paymentRequest(store.state.bookings[0], { paymentMode: 'sepay' })
    await receiveSepay(store, payload({ content: '', [field]: request.request.reference }), '123456')
    assert.equal(store.saved.bookings[0].status, 'CONFIRMED')
    assert.equal(store.saved.bookings[0].paidVnd, 500000)
  }
})

test('SEVQR memo with separated prefix confirms without accepting partial references', async () => {
  const store = fixture()
  await receiveSepay(store, payload({ content: 'CHUYEN SEVQR BM2026ABCDEFGH' }), '123456')
  assert.equal(store.saved.bookings[0].status, 'CONFIRMED')
  for (const content of ['XSEVQRBM2026ABCDEFGH', 'SEVQRBM2026ABCDEFGHX']) {
    const unmatched = fixture()
    await receiveSepay(unmatched, payload({ content }), '123456')
    assert.equal(unmatched.saved.payments[0].reason, 'UNKNOWN_REFERENCE')
    assert.equal(unmatched.saved.bookings[0].paidVnd, 0)
  }
})

test('bank metadata separated by hyphens does not hide the payment reference', async () => {
  for (const content of ['147968394116-0378344716-SEVQRBM2026ABCDEFGH', 'BANK-BM-2026-ABCDEFGH', 'BM-2026-ABCDEFGH']) {
    const store = fixture()
    await receiveSepay(store, payload({ content, code: null }), '123456')
    assert.equal(store.saved.bookings[0].status, 'CONFIRMED')
    assert.equal(store.saved.payments[0].bookingId, 'b1')
    assert.equal(store.saved.bookings[0].paidVnd, 500000)
  }
})

test('multiple bank-delimited booking references stay in review', async () => {
  const store = fixture()
  store.state.bookings.push({ ...store.state.bookings[0], id: 'b2', code: 'BM-2026-ZYXWVUTS' })
  await receiveSepay(store, payload({ content: 'BANK-SEVQRBM2026ABCDEFGH-SEVQRBM2026ZYXWVUTS' }), '123456')
  assert.equal(store.saved.payments[0].reason, 'AMBIGUOUS_REFERENCE')
  assert.ok(store.saved.bookings.every(b => b.paidVnd === 0))
})

test('durable store reconciles committed payment after a lost acknowledgement without double credit', async () => {
  const store = fixture()
  const durable = new DurableState()
  durable.value = store.state
  let saved = structuredClone(store.state)
  let fail = true
  Object.defineProperty(store, 'state', { get: () => durable.value })
  store.mutate = fn => durable.run(fn, {
    persist: async draft => { saved = structuredClone(draft); if (fail) throw Error('Query read timeout') },
    reload: async () => structuredClone(saved),
  })
  await assert.rejects(receiveSepay(store, payload(), '123456'))
  assert.equal(store.state.bookings[0].paidVnd, 0)
  fail = false
  const result = await receiveSepay(store, payload(), '123456')
  assert.equal(result.duplicate, true)
  assert.equal(store.state.bookings[0].paidVnd, 500000)
  assert.equal(store.state.payments.length, 1)
})

const payload = (patch = {}) => ({ id: 1234, transferType: 'in', transferAmount: 500000, accountNumber: '123456', content: 'CHUYEN BM2026ABCDEFGH', ...patch })

test('balance QR settles completed booking once and keeps completed status', async () => {
  const store = fixture()
  Object.assign(store.state.bookings[0], { status: 'COMPLETED', paidVnd: 500000, holdExpiresAt: null })
  const request = paymentRequest(store.state.bookings[0], { paymentMode: 'sepay' })
  const body = payload({ content: `BANK-123-${request.request.reference}`, transferAmount: Number(request.request.amount.amount) })
  await Promise.all([receiveSepay(store, body, '123456'), receiveSepay(store, body, '123456')])
  assert.equal(store.saved.bookings[0].status, 'COMPLETED')
  assert.equal(store.saved.bookings[0].paidVnd, 2000000)
  assert.equal(store.saved.bookings[0].paymentStatus, 'PAID')
  assert.equal(store.saved.payments.length, 1)
  assert.equal(store.saved.outbox[0][0], 'payment.recorded')
  await receiveSepay(store, { ...body, id: 5678 }, '123456')
  assert.equal(store.saved.payments[1].reason, 'BALANCE_NOT_PAYABLE')
  assert.equal(store.saved.bookings[0].paidVnd, 2000000)
})

test('balance rejects wrong amount, early payment, and stale deposit QR', async () => {
  for (const [status, content, amount, reason] of [
    ['COMPLETED', 'SEVQRBM2026ABCDEFGHTT', 500000, 'AMOUNT_MISMATCH'],
    ['CONFIRMED', 'SEVQRBM2026ABCDEFGHTT', 1500000, 'BALANCE_NOT_PAYABLE'],
    ['COMPLETED', 'SEVQRBM2026ABCDEFGH', 500000, 'BOOKING_NOT_PENDING'],
  ]) {
    const store = fixture()
    Object.assign(store.state.bookings[0], { status, paidVnd: 500000, holdExpiresAt: null })
    await receiveSepay(store, payload({ content, transferAmount: amount }), '123456')
    assert.equal(store.saved.payments[0].reason, reason)
    assert.equal(store.saved.bookings[0].paidVnd, 500000)
  }
})
function fixture() {
  const store = {
    ready: Promise.resolve(), writeQueue: Promise.resolve(),
    state: { payments: [], audits: [], outbox: [], bookings: [{ id: 'b1', code: 'BM-2026-ABCDEFGH', status: 'PENDING', depositVnd: 500000, totalVnd: 2000000, paidVnd: 0, version: 1, holdExpiresAt: new Date(Date.now() + 60000).toISOString() }] },
    async persist() { this.saved = structuredClone(this.state) },
    audit(...args) { this.state.audits.push(args) },
    outbox(...args) { this.state.outbox.push(args) },
  }
  return store
}
test('authentication rejects missing/wrong keys and unconfigured secret', () => {
  assert.throws(() => authenticateSepay('', 'secret'), { status: 401 })
  assert.throws(() => authenticateSepay('Apikey wrong', 'secret'), { status: 401 })
  assert.throws(() => authenticateSepay('Apikey secret', ''), { status: 503 })
  authenticateSepay('Apikey secret', 'secret')
})
test('valid deposit persists and concurrent duplicate deliveries credit only once', async () => {
  const store = fixture()
  await Promise.all([receiveSepay(store, payload(), '123456'), receiveSepay(store, payload(), '123456')])
  assert.equal(store.state.payments.length, 1)
  assert.equal(store.saved.bookings[0].paidVnd, 500000)
  assert.equal(store.saved.bookings[0].status, 'CONFIRMED')
  assert.equal(store.saved.bookings[0].holdExpiresAt, null)
  assert.equal(store.saved.outbox.length, 1)
  const restarted = fixture(); restarted.state = structuredClone(store.saved)
  assert.equal((await receiveSepay(restarted, payload(), '123456')).duplicate, true)
})
for (const [name, patch, reason] of [
  ['outgoing', { transferType: 'out' }, 'OUTGOING_TRANSFER'],
  ['wrong account', { accountNumber: '999' }, 'ACCOUNT_MISMATCH'],
  ['underpayment', { transferAmount: 1000 }, 'AMOUNT_MISMATCH'],
  ['overpayment', { transferAmount: 600000 }, 'AMOUNT_MISMATCH'],
  ['unknown reference', { content: 'unrelated' }, 'UNKNOWN_REFERENCE'],
  ['substring reference', { content: 'XBM2026ABCDEFGHX' }, 'UNKNOWN_REFERENCE'],
]) test(`${name} is saved for review without confirming`, async () => {
  const store = fixture()
  assert.equal((await receiveSepay(store, payload(patch), '123456')).success, true)
  assert.equal(store.saved.payments[0].reason, reason)
  assert.equal(store.saved.payments[0].status, 'PENDING_REVIEW')
  assert.equal(store.saved.bookings[0].paidVnd, 0)
  assert.equal(store.saved.bookings[0].status, 'PENDING')
})
test('expired hold and second deposit are never credited', async () => {
  const store = fixture()
  store.state.bookings[0].holdExpiresAt = new Date(Date.now() - 1000).toISOString()
  await receiveSepay(store, payload(), '123456')
  assert.equal(store.saved.payments[0].reason, 'HOLD_EXPIRED')
  assert.equal(store.saved.payments[0].status, 'PENDING_REVIEW')
  const paid = fixture()
  await receiveSepay(paid, payload(), '123456')
  await receiveSepay(paid, payload({ id: 9999 }), '123456')
  assert.equal(paid.saved.payments[1].reason, 'BOOKING_NOT_PENDING')
  assert.equal(paid.saved.bookings[0].paidVnd, 500000)
})
test('persistence failure rolls back and permits a successful retry', async () => {
  const store = fixture(), persist = store.persist
  store.persist = async () => { throw new Error('database unavailable') }
  await assert.rejects(receiveSepay(store, payload(), '123456'))
  assert.equal(store.state.payments.length, 0)
  assert.equal(store.state.bookings[0].paidVnd, 0)
  store.persist = persist
  await receiveSepay(store, payload(), '123456')
  assert.equal(store.saved.bookings[0].paidVnd, 500000)
})
test('malformed payload and missing account fail before mutation', () => {
  assert.throws(() => receiveSepay(fixture(), payload(), ''), { status: 503 })
  for (const patch of [{ id: -1 }, { transferAmount: '500000' }, { transferAmount: 1.5 }, { content: {} }]) {
    assert.throws(() => receiveSepay(fixture(), payload(patch), '123456'), { status: 400 })
  }
})
test('HTTP webhook works without session/CSRF, requires API key and acknowledges SePay', async (t) => {
  const store = fixture(), app = express()
  app.use(express.json())
  app.use('/api/v1/payments', createSepayRouter(store, { paymentMode: 'sepay', sepayApiKey: 'test-only', sepayBankAccount: '123456' }))
  app.use(errorHandler)
  const server = app.listen(0, '127.0.0.1')
  await new Promise((resolve) => server.once('listening', resolve))
  t.after(() => new Promise((resolve) => server.close(resolve)))
  const url = `http://127.0.0.1:${server.address().port}/api/v1/payments/webhook`
  const send = (key) => fetch(url, { method: 'POST', headers: { 'content-type': 'application/json', authorization: key }, body: JSON.stringify(payload()) })
  assert.equal((await send('')).status, 401)
  const response = await send('Apikey test-only')
  assert.equal(response.status, 200)
  assert.deepEqual(await response.json(), { success: true })
})

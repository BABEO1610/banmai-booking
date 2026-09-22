import { timingSafeEqual } from 'node:crypto'
import { AppError } from '../../middleware/error.middleware.js'

export function authenticateSepay(header, key) {
  if (!key) throw new AppError(503, 'PAYMENT_NOT_CONFIGURED', 'Chưa cấu hình SePay')
  const supplied = Buffer.from(String(header || ''))
  const expected = Buffer.from(`Apikey ${key}`)
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) {
    throw new AppError(401, 'INVALID_WEBHOOK_AUTH', 'Webhook không được xác thực')
  }
}

export function validateSepayPayload(body) {
  if (!body || !Number.isSafeInteger(body.id) || body.id <= 0 ||
      !Number.isSafeInteger(body.transferAmount) || body.transferAmount <= 0 ||
      !['in', 'out'].includes(body.transferType) ||
      typeof body.accountNumber !== 'string' || !body.accountNumber.trim() ||
      (body.content != null && typeof body.content !== 'string') ||
      (body.code != null && typeof body.code !== 'string')) {
    throw new AppError(400, 'INVALID_WEBHOOK_PAYLOAD', 'Dữ liệu giao dịch không hợp lệ')
  }
}

// Bank memos may remove punctuation. Compare complete tokens, never substrings.
const tokens = (value) => {
  // Normalize only booking-internal hyphens; bank metadata uses hyphens as separators.
  const normalized = String(value || '').toUpperCase().replace(/\bBM-(\d{4})-([A-Z0-9]+)\b/g, 'BM$1$2')
  return normalized.match(/[A-Z0-9]+/g) || []
}

export function receiveSepay(store, body, accountNumber) {
  if (!accountNumber) throw new AppError(503, 'PAYMENT_NOT_CONFIGURED', 'Chưa cấu hình tài khoản nhận SePay')
  validateSepayPayload(body)
  // Share the store's single-process queue with booking/expiry/assignment writes.
  const apply = async () => {
    await store.ready
    const before = structuredClone(store.state)
    try {
      const transactionId = String(body.id)
      const existing = store.state.payments.find((p) => p.source === 'SEPAY' && p.transactionId === transactionId)
      if (existing) return { success: true, duplicate: true }
      // VietinBank requires SEVQR; retain legacy references for delayed deliveries.
      const references = new Set([...tokens(body.content), ...tokens(body.code)].map((token) => token.startsWith('SEVQR') ? token.slice(5) : token))
      const matches = store.state.bookings.filter((b) => {
        const code = b.code.toUpperCase().replace(/-/g, '')
        return references.has(code) || references.has(`${code}TT`)
      })
      const booking = matches.length === 1 ? matches[0] : null
      const balance = booking && references.has(`${booking.code.toUpperCase().replace(/-/g, '')}TT`)
      let reason = null
      if (body.transferType !== 'in') reason = 'OUTGOING_TRANSFER'
      else if (body.accountNumber !== accountNumber) reason = 'ACCOUNT_MISMATCH'
      else if (!booking) reason = matches.length > 1 ? 'AMBIGUOUS_REFERENCE' : 'UNKNOWN_REFERENCE'
      else if (balance && references.has(booking.code.toUpperCase().replace(/-/g, ''))) reason = 'AMBIGUOUS_REFERENCE'
      else if (balance) {
        if (booking.status !== 'COMPLETED' || booking.paidVnd >= booking.totalVnd) reason = 'BALANCE_NOT_PAYABLE'
        else if (body.transferAmount !== booking.totalVnd - booking.paidVnd) reason = 'AMOUNT_MISMATCH'
      }
      else if (body.transferAmount !== booking.depositVnd) reason = 'AMOUNT_MISMATCH'
      else if (booking.status !== 'PENDING' || booking.paidVnd !== 0) reason = 'BOOKING_NOT_PENDING'
      else if (!(new Date(booking.holdExpiresAt).getTime() > Date.now())) reason = 'HOLD_EXPIRED'
      const payment = {
        id: `sepay_${transactionId}`, transactionId, source: 'SEPAY', bookingId: booking?.id || null,
        amountVnd: body.transferAmount, currency: 'VND', purpose: balance ? 'BALANCE' : 'DEPOSIT', status: reason ? 'PENDING_REVIEW' : 'VERIFIED',
        reason, accountNumber: body.accountNumber, referenceCode: body.referenceCode || null,
        content: body.content || '', transferType: body.transferType, createdAt: new Date().toISOString(),
      }
      store.state.payments.push(payment)
      if (!reason) {
        if (!balance) booking.status = 'CONFIRMED'
        booking.paidVnd += body.transferAmount
        booking.paymentStatus = booking.paidVnd >= booking.totalVnd ? 'PAID' : 'PARTIALLY_PAID'
        booking.holdExpiresAt = null
        booking.version += 1
        booking.updatedAt = payment.createdAt
        store.outbox(balance ? 'payment.recorded' : 'booking.confirmed', { bookingId: booking.id }, booking.id)
      }
      store.audit(null, reason ? 'PAYMENT_PENDING_REVIEW_SEPAY' : 'PAYMENT_VERIFIED_SEPAY', 'payment', payment.id, null, payment, reason)
      if (!store.mutate) await store.persist()
      return { success: true }
    } catch (error) {
      // Never acknowledge unpersisted money or leave it marked as paid in memory.
      if (!store.mutate) store.state = before
      throw error
    }
  }
  if (store.mutate) return store.mutate(apply)
  const run = store.writeQueue.then(apply)
  store.writeQueue = run.catch(() => {})
  return run
}

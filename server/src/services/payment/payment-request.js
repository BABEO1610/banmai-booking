export function paymentRequest(booking, config, payments = [], now = Date.now()) {
  const real = config.paymentMode === 'sepay'
  const configured = Boolean(config.sepayApiKey && config.sepayBankAccount && config.sepayBankName && config.sepayAccountHolder)
  const pendingReview = payments.some((p) => p.bookingId === booking.id && p.source === 'SEPAY' && ['PENDING_REVIEW', 'QUARANTINED'].includes(p.status))
  const balance = booking.status === 'COMPLETED'
  const amount = balance ? Math.max(0, booking.totalVnd - booking.paidVnd) : booking.depositVnd
  const eligible = balance ? amount > 0 : booking.status === 'PENDING' && booking.paidVnd === 0 && new Date(booking.holdExpiresAt).getTime() > now
  const canPay = real && configured && !pendingReview && eligible
  const reference = real ? `SEVQR${booking.code.replace(/-/g, '')}${balance ? 'TT' : ''}` : booking.code
  const params = new URLSearchParams({ acc: config.sepayBankAccount || '', bank: config.sepayBankName || '', amount: String(amount), des: reference, template: 'compact', holder: config.sepayAccountHolder || '', showinfo: 'true', fullacc: 'true' })
  return {
    mode: real ? 'SEPAY' : 'DEMO', providerConfigured: real && configured,
    status: booking.status, holdExpiresAt: booking.holdExpiresAt, pendingReview,
    bankAccount: real ? config.sepayBankAccount : undefined,
    bankName: real ? config.sepayBankName : undefined,
    accountHolder: real ? config.sepayAccountHolder : undefined,
    qrUrl: canPay ? `https://vietqr.app/img?${params}` : null,
    request: { purpose: balance ? 'BALANCE' : 'DEPOSIT', amount: { amount: String(amount), currency: 'VND' }, reference,
      label: real ? (balance ? 'Chuyển khoản đúng số tiền và nội dung để thanh toán phần còn lại' : 'Chuyển khoản đúng số tiền và nội dung để tự động xác nhận cọc') : 'Thanh toán demo – không phải QR ngân hàng thật' },
  }
}

export const statusLabel = (status) => ({
  PENDING: 'Chờ xác nhận', CONFIRMED: 'Đã xác nhận', EXPIRED: 'Hết hạn giữ chỗ', COMPLETED: 'Đã hoàn tất',
  CANCELLED: 'Đã hủy', UNPAID: 'Chưa thanh toán', PARTIALLY_PAID: 'Đã thanh toán một phần', PAID: 'Đã thanh toán',
}[status] || status)

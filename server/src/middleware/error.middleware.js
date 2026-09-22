export class AppError extends Error {
  constructor(status, code, message, details) { super(message); this.status = status; this.code = code; this.details = details }
}
export const asyncHandler = (handler) => (request, response, next) => Promise.resolve(handler(request, response, next)).catch(next)
export function notFound(_request, response) { response.status(404).json({ error: { code: 'NOT_FOUND', message: 'Không tìm thấy endpoint' } }) }
export function errorHandler(error, _request, response, next) {
  if (response.headersSent) return next(error)
  const databaseUnavailable = ['08006', '08001', '57P01', '57P03', '53300', 'ECONNRESET', 'ECONNREFUSED', 'ETIMEDOUT'].includes(error.code) || /Query read timeout|Connection terminated|timeout exceeded when trying to connect/i.test(error.message || '')
  if (databaseUnavailable) {
    console.error('Database unavailable:', error.code || error.message)
    return response.status(503).json({ error: { code: 'DATABASE_UNAVAILABLE', message: 'Kết nối cơ sở dữ liệu đang gián đoạn. Vui lòng thử lại sau.' } })
  }
  const status = error.status || 500
  if (status >= 500) console.error(error)
  response.status(status).json({ error: { code: error.code || 'INTERNAL_ERROR', message: status >= 500 ? 'Đã xảy ra lỗi ở server' : error.message, ...(error.details ? { details: error.details } : {}) } })
}

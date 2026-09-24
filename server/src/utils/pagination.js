import { AppError } from '../middleware/error.middleware.js'

export function paginate(items, query = {}, project = value => value) {
  const page = Number(query.page ?? 1)
  const pageSize = Number(query.pageSize ?? 25)
  if (!Number.isSafeInteger(page) || page < 1 || !Number.isSafeInteger(pageSize) || pageSize < 1 || pageSize > 100) {
    throw new AppError(400, 'INVALID_PAGINATION', 'Trang phải là số nguyên dương; mỗi trang từ 1 đến 100 mục')
  }
  const total = items.length
  const pages = Math.max(1, Math.ceil(total / pageSize))
  const current = Math.min(page, pages)
  return { items: items.slice((current - 1) * pageSize, current * pageSize).map(project), page: current, pageSize, total, pages }
}

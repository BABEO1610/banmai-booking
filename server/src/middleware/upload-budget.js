import { AppError } from './error.middleware.js'

// Shared by all upload routes: at most two 10 MB image buffers per process.
let active = 0
export function uploadBudget(req, res, next) {
  if (active >= 2) return next(new AppError(429, 'UPLOAD_BUSY', 'Studio đang xử lý ảnh. Vui lòng thử lại sau.'))
  active += 1
  let released = false
  const release = () => { if (!released) { released = true; active -= 1 } }
  res.once('finish', release)
  res.once('close', release)
  next()
}

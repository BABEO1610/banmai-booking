import { Router } from 'express'
import multer from 'multer'
import { requireRole, csrfGuard } from '../middleware/auth.middleware.js'
import { AppError, asyncHandler } from '../middleware/error.middleware.js'
import { uploadPublicImage } from '../services/storage/public-image.storage.js'

export function createPackageImageRouter(mediaDir) {
  const router = Router()
  const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024, files: 1, fields: 0 } }).single('image')
  router.post('/image', requireRole('ADMIN'), csrfGuard, (req, res, next) => upload(req, res, error => next(error ? new AppError(400, 'INVALID_IMAGE', 'Chọn một ảnh JPEG, PNG hoặc WebP, tối đa 10MB') : undefined)), asyncHandler(async (req, res) => {
    if (!req.file?.buffer) throw new AppError(400, 'INVALID_IMAGE', 'Chọn một ảnh JPEG, PNG hoặc WebP')
    const result = await uploadPublicImage({ bytes: req.file.buffer, prefix: 'packages', localDir: mediaDir })
    res.status(201).json({ data: { image: result.image } })
  }))
  return router
}

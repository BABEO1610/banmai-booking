import { Router } from 'express'
import { asyncHandler, AppError } from '../middleware/error.middleware.js'
import { authenticateSepay, receiveSepay } from '../services/payment/sepay.service.js'

export function createSepayRouter(store, config) {
  const router = Router()
  router.post('/webhook', asyncHandler(async (request, response) => {
    authenticateSepay(request.get('authorization'), config.sepayApiKey)
    if (config.paymentMode !== 'sepay') throw new AppError(503, 'PAYMENT_DISABLED', 'Chưa bật SePay')
    const result = await receiveSepay(store, request.body, config.sepayBankAccount)
    response.status(200).json(result)
  }))
  return router
}

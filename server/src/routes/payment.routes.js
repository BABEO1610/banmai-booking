import { Router } from 'express'
import { getPayment } from '../controllers/payment.controller.js'
const router = Router(); router.get('/:id/payment', getPayment); export default router

import { demoStore } from '../../mock/store.js'
export const verifyDemoPayment = (bookingId, actorId, amountVnd, transactionId) => demoStore.simulatePayment(bookingId, actorId, amountVnd, transactionId)

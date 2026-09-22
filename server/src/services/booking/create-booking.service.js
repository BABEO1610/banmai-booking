import { demoStore } from '../../mock/store.js'
export const createBooking = (input, actorId, idempotencyKey) => demoStore.createBooking(input, actorId, idempotencyKey)

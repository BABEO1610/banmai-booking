export const outboxModel = { enqueue(store, type, payload, bookingId) { store.outbox(type, payload, bookingId) } }

export const idempotencyModel = { keyFor(actorId, key) { return `${actorId}:${key}` } }

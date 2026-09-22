export const auditModel = { append(store, actorId, action, entityType, entityId, before, after, reason) { store.audit(actorId, action, entityType, entityId, before, after, reason) } }

import crypto from 'node:crypto'

// Claim and acknowledge in short mutations. Never hold the store queue during I/O.
export async function processOutboxBatch(store, deliver, { now = Date.now, batchSize = 5 } = {}) {
  const due = event => (event.channel === 'sheets' || !event.channel) && (
    (['PENDING', 'RETRY'].includes(event.status) && (!event.availableAt || Date.parse(event.availableAt) <= now())) ||
    (event.status === 'PROCESSING' && Date.parse(event.leaseUntil) <= now())
  )
  await store.ready
  if (!store.state.outbox.some(due)) return []
  const batch = await store.mutate(async () => {
    const claimed = []
    for (const event of store.state.outbox.filter(due).slice(0, batchSize)) {
      const booking = store.state.bookings.find(item => item.id === event.bookingId)
      if (!booking?.assignmentId || !['CONFIRMED', 'COMPLETED'].includes(booking.status)) { event.status = 'SKIPPED'; continue }
      event.channel = 'sheets'
      event.status = 'PROCESSING'
      event.claimId = crypto.randomUUID()
      event.leaseUntil = new Date(now() + 10 * 60_000).toISOString()
      claimed.push({ ...structuredClone(event), status: 'PENDING', availableAt: null, row: structuredClone(store.sheetRowForBooking(event.bookingId)) })
    }
    return claimed
  })
  const results = []
  for (const event of batch) {
    const result = await deliver([event], { rowForBooking: async () => event.row })
    await store.mutate(async () => {
      const current = store.state.outbox.find(item => item.id === event.id)
      if (!current || current.claimId !== event.claimId) return
      for (const key of ['status', 'attempts', 'lastError', 'deliveredAt', 'availableAt']) current[key] = event[key]
      delete current.claimId
      delete current.leaseUntil
    })
    results.push(...result)
  }
  return results
}

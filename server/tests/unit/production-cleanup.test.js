import test from 'node:test'
import assert from 'node:assert/strict'
import { DurableState } from '../../src/db/durable-state.js'
import { processOutboxBatch } from '../../src/jobs/process-outbox.job.js'
import { paginate } from '../../src/utils/pagination.js'

function fixture() {
  const durable = new DurableState()
  durable.value = { bookings: [{ id: 'booking', assignmentId: 'assignment', status: 'CONFIRMED', version: 1 }], outbox: [{ id: 'event', bookingId: 'booking', channel: 'sheets', status: 'PENDING', attempts: 0 }] }
  return { get state() { return durable.value }, mutate: fn => durable.run(fn, { persist: async () => {} }), sheetRowForBooking: () => ({ bookingId: 'booking', version: 1 }) }
}

test('slow Sheets delivery does not block booking mutations or duplicate an active claim', async () => {
  const store = fixture()
  let release, started
  const entered = new Promise(resolve => { started = resolve })
  const delivery = processOutboxBatch(store, async events => {
    started()
    await new Promise(resolve => { release = resolve })
    events[0].status = 'DELIVERED'; events[0].attempts++
    return [{ eventId: events[0].id }]
  })
  await entered
  await store.mutate(() => { store.state.bookings[0].version++ })
  assert.equal(store.state.bookings[0].version, 2)
  assert.deepEqual(await processOutboxBatch(store, () => assert.fail('claim must not be delivered twice')), [])
  release(); await delivery
  assert.equal(store.state.outbox[0].status, 'DELIVERED')
  assert.equal(store.state.bookings[0].version, 2)
})

test('expired claim is recovered and future retry is not sent early', async () => {
  const store = fixture()
  store.state.outbox[0].status = 'PROCESSING'
  store.state.outbox[0].leaseUntil = new Date(0).toISOString()
  await processOutboxBatch(store, async events => { events[0].status = 'RETRY'; events[0].availableAt = new Date(Date.now() + 60000).toISOString(); return [] })
  assert.equal(store.state.outbox[0].status, 'RETRY')
  await processOutboxBatch(store, () => assert.fail('not due'))
})

test('pagination projects only bounded records and rejects unsafe limits', () => {
  let projected = 0
  const result = paginate(Array.from({ length: 101 }, (_, i) => i), { page: 2, pageSize: 25 }, n => { projected++; return n })
  assert.equal(result.total, 101); assert.equal(result.pages, 5)
  assert.deepEqual(result.items, Array.from({ length: 25 }, (_, i) => i + 25))
  assert.equal(projected, 25)
  for (const query of [{ page: -1 }, { pageSize: 1000 }, { page: 'bad' }]) assert.throws(() => paginate([], query), { code: 'INVALID_PAGINATION' })
})

test('production never acknowledges delivery through fake Sheets', async () => {
  const { config } = await import('../../src/config/env.js')
  const { deliverOutbox } = await import('../../src/jobs/deliver-outbox.job.js')
  const previous = { nodeEnv: config.nodeEnv, sheetsMode: config.sheetsMode }
  Object.assign(config, { nodeEnv: 'production', sheetsMode: 'disabled' })
  const event = { id: 'event', channel: 'sheets', status: 'PENDING', attempts: 0, payload: {} }
  try {
    await deliverOutbox([event])
    assert.equal(event.status, 'RETRY')
    assert.equal(event.attempts, 1)
    assert.ok(event.lastError)
  } finally { Object.assign(config, previous) }
})

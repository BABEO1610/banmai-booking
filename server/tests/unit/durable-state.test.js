import test from 'node:test'
import assert from 'node:assert/strict'
import { DurableState } from '../../src/db/durable-state.js'
import { startWorker } from '../../src/workers/scheduler.js'

test('no changes do not write; validation failure discards draft', async () => {
  const state = new DurableState(); state.value = { count: 1 }
  let writes = 0
  const options = { persist: async () => { writes++ } }
  await state.run(() => {}, options)
  await assert.rejects(state.run(() => { state.value.count++; throw Error('invalid') }, options))
  assert.equal(writes, 0); assert.equal(state.value.count, 1)
})

test('readers cannot see a draft while persistence is pending', async () => {
  const state = new DurableState(); state.value = { count: 1 }
  let finish; let started
  const pending = new Promise(resolve => { started = resolve })
  const operation = state.run(() => { state.value.count++ }, { persist: () => { started(); return new Promise(resolve => { finish = resolve }) } })
  await pending; assert.equal(state.value.count, 1)
  finish(); await operation; assert.equal(state.value.count, 2)
})

test('ambiguous failure reconciles DB before next write; failed reload blocks mutation', async () => {
  const state = new DurableState(); state.value = { count: 1 }
  await assert.rejects(state.run(() => { state.value.count++ }, { persist: async () => { throw Error('timeout') } }))
  assert.equal(state.value.count, 1)
  await assert.rejects(state.run(() => assert.fail('must not mutate'), { reload: async () => { throw Error('offline') } }))
  await state.run(() => { state.value.count++ }, { reload: async () => ({ count: 2 }), persist: async draft => assert.equal(draft.count, 3) })
  assert.equal(state.value.count, 3)
})

test('concurrent mutations serialize without losing changes', async () => {
  const state = new DurableState(); state.value = { count: 0 }
  await Promise.all(Array.from({ length: 5 }, () => state.run(() => { state.value.count++ }, { persist: async () => {} })))
  assert.equal(state.value.count, 5)
})

test('worker backs off after failure and resets after success', async () => {
  let fail = true; let scheduled; const delays = []; const logs = []
  const store = { ready: Promise.resolve(), expireHolds: async () => { if (fail) throw Error('timeout') }, processOutbox: async () => {} }
  const stop = startWorker(store, 5000, { schedule: (fn, delay) => { scheduled = fn; delays.push(delay) }, cancel: () => {}, log: (...args) => logs.push(args) })
  await new Promise(resolve => setImmediate(resolve)); assert.deepEqual(delays, [10000])
  scheduled(); await new Promise(resolve => setImmediate(resolve)); assert.deepEqual(delays, [10000, 20000])
  fail = false; scheduled(); await new Promise(resolve => setImmediate(resolve)); assert.equal(delays.at(-1), 5000)
  assert.equal(logs[0][1].stage, 'expireHolds'); await stop()
})

import test from 'node:test'
import assert from 'node:assert/strict'
import { applyPackagePrices, bookingPackages, enableFullDayBooking, occupiedMinutes } from '../../../shared/booking-packages.js'
import { DemoStore } from '../../src/mock/store.js'

test('price migration preserves historical booking snapshots and runs only once', () => {
  const state = { packages: [{ id: 'half', priceVnd: 2000000, version: 3 }], bookings: [{ packageId: 'half', totalVnd: 2000000, snapshot: { priceVnd: 2000000 } }], payments: [{ amountVnd: 500000 }] }
  const history = JSON.stringify([state.bookings, state.payments])
  assert.equal(applyPackagePrices(state), true)
  assert.equal(state.packages.length, 8)
  assert.equal(JSON.stringify([state.bookings, state.payments]), history)
  assert.equal(state.packages.find((p) => p.id === 'half').version, 4)
  state.packages[0].priceVnd = 1600000
  assert.equal(applyPackagePrices(state), false)
  assert.equal(state.packages[0].priceVnd, 1600000)
})

test('catalog matches approved group prices and allows full-day booking', () => {
  assert.deepEqual(bookingPackages.map((p) => p.priceVnd), [1500000, 2200000, 2000000, 2900000, 2500000, 3500000, 2900000, 4000000])
  assert.equal(new Set(bookingPackages.map((p) => p.id)).size, 8)
  assert.ok(bookingPackages.filter((p) => p.period === 'full').every((p) => p.bookable))
  assert.ok(bookingPackages.every((p) => p.optionGroups?.[0]?.choices?.length === 2))
})

test('catalog migration adds options without overwriting an admin price', () => {
  const state = { packages: [{ id: 'half', priceVnd: 1750000, optionGroups: [] }], bookings: [] }
  assert.equal(applyPackagePrices(state), true)
  const half = state.packages.find((p) => p.id === 'half')
  assert.equal(half.priceVnd, 1750000)
  assert.equal(half.optionGroups[0].choices.length, 2)
})

test('full-day reserves lunch and afternoon until 17:00', () => {
  const store = Object.create(DemoStore.prototype)
  store.state = { packages: structuredClone(bookingPackages), settings: { maxConcurrentBookings: 1 }, bookings: [], blocks: [] }
  const from = '2030-01-01T07:00:00+07:00'
  assert.equal(occupiedMinutes(bookingPackages[1]), 600)
  assert.equal(occupiedMinutes(bookingPackages[0]), 300)
  assert.equal(store.availability({ packageId: 'full', from }).endAt, '2030-01-01T10:00:00.000Z')
  for (const hour of [12, 16]) {
    store.state.blocks = [{ startAt: `2030-01-01T${hour}:00:00+07:00`, endAt: `2030-01-01T${hour}:30:00+07:00` }]
    assert.equal(store.availability({ packageId: 'full', from }).available, false)
  }
})

test('full-day migration removes technical closure once and preserves prices and history', () => {
  const state = { packages: [{ period: 'full', priceVnd: 2300000, bookable: false, bookableReason: 'Gói cả ngày hiện cần studio xác nhận lịch thủ công', version: 3 }], bookings: [{ endAt: 'unchanged' }] }
  assert.equal(enableFullDayBooking(state), true)
  assert.equal(state.packages[0].bookable, true)
  assert.equal(state.packages[0].priceVnd, 2300000)
  assert.equal(state.bookings[0].endAt, 'unchanged')
  state.packages[0].bookable = false
  assert.equal(enableFullDayBooking(state), false)
  assert.equal(state.packages[0].bookable, false)
})

test('package quote resolves option prices from catalog and rejects stale revisions', () => {
  const store = Object.create(DemoStore.prototype)
  store.state = { packages: [structuredClone(bookingPackages[0])] }
  const quote = store.quote({ packageId: 'half', packageVersion: 1, selectedOptions: [{ id: 'extra-retouch', quantity: 2 }] })
  assert.equal(quote.totalVnd, 1800000)
  assert.equal(quote.selectedOptions[0].totalVnd, 300000)
  assert.throws(() => store.quote({ packageId: 'half', packageVersion: 999 }), /Gói đã được cập nhật/)
})

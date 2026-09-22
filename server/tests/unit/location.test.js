import test from 'node:test'
import assert from 'node:assert/strict'
import { createLocationSearch, normalizeLocation } from '../../src/services/location.service.js'
test('location accepts manual/coordinates and rejects unsafe input', () => {
  assert.equal(normalizeLocation({ name: ' Studio ', secret: 'x' }).name, 'Studio')
  assert.equal(normalizeLocation({ secret: 'x' }).secret, undefined)
  const location = normalizeLocation({ lat: 21, lng: 105, source: 'pin', meetingNotes: 'Cổng A' })
  assert.ok(location.mapsUrl.startsWith('https://www.openstreetmap.org/'))
  assert.equal(location.meetingNotes, 'Cổng A')
  for (const input of [{ lat: 91, lng: 0 }, { lat: '', lng: 0 }, { lat: 1 }, { mapsUrl: 'javascript:alert(1)' }, { mapsUrl: 'https://evil.test/' }, { name: 'x'.repeat(251) }]) assert.throws(() => normalizeLocation(input), { status: 400 })
})
test('search identifies application, caches requests and globally limits traffic', async () => {
  let now = 1000, count = 0
  const search = createLocationSearch({ clock: () => now, fetcher: async (url, options) => {
    count++; assert.equal(url.searchParams.get('countrycodes'), 'vn'); assert.equal(options.headers['User-Agent'], 'BanMaiStudioBooking/1.0')
    return { ok: true, json: async () => [{ name: 'Hồ', display_name: 'Hồ, Hà Nội', lat: '21', lon: '105', osm_type: 'way', osm_id: 1 }] }
  } })
  const result = await search('Hồ Hà Nội')
  assert.equal(result[0].lat, 21)
  await search('hồ hà nội'); assert.equal(count, 1)
  await assert.rejects(search('Huế'), { status: 429 })
  now += 1100; await search('Huế'); assert.equal(count, 2)
  await assert.rejects(search('a'), { status: 400 })
})
test('provider failure is recoverable without exposing upstream error details', async () => {
  const search = createLocationSearch({ fetcher: async () => { throw new Error('private upstream detail') } })
  await assert.rejects(search('Hà Nội'), { status: 503, code: 'MAP_SEARCH_UNAVAILABLE' })
})

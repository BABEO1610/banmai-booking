import test from 'node:test'
import assert from 'node:assert/strict'
import { overlaps, peakOccupancy, withBuffer } from '../../src/services/scheduling/intervals.js'
test('intervals use half-open semantics and end event before same-time start', () => { assert.equal(overlaps('2026-01-01T07:00:00Z', '2026-01-01T08:00:00Z', '2026-01-01T08:00:00Z', '2026-01-01T09:00:00Z'), false); assert.equal(peakOccupancy([{ startAt: '2026-01-01T07:00:00Z', endAt: '2026-01-01T08:00:00Z' }, { startAt: '2026-01-01T08:00:00Z', endAt: '2026-01-01T09:00:00Z' }]), 1) })
test('buffer expands a schedule without changing source', () => { const result = withBuffer('2026-01-01T08:00:00Z', '2026-01-01T09:00:00Z', 15, 10); assert.equal(result.startAt, '2026-01-01T07:45:00.000Z'); assert.equal(result.endAt, '2026-01-01T09:10:00.000Z') })

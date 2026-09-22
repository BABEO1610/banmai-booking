import { overlaps } from './intervals.js'
export function capacityFor(intervals, requestedStart, requestedEnd) { return intervals.filter((item) => overlaps(requestedStart, requestedEnd, item.startAt, item.endAt)).length }
export function hasCapacity(intervals, requestedStart, requestedEnd, limit) { return capacityFor(intervals, requestedStart, requestedEnd) < limit }

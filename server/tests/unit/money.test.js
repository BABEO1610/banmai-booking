import test from 'node:test'
import assert from 'node:assert/strict'
import { money, parseMoney } from '../../src/utils/money.js'
test('money serializes bigint as VND string', () => assert.deepEqual(money(2000000), { amount: '2000000', currency: 'VND' }))
test('money rejects decimals and negative values', () => { assert.throws(() => parseMoney('1.5')); assert.throws(() => parseMoney('-1')) })

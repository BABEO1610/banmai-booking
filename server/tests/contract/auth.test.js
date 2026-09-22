import test from 'node:test'
import assert from 'node:assert/strict'
import { demoStore } from '../../src/mock/store.js'
test('registration is always a Customer and creates a challenge without returning code', async () => { await demoStore.ready; const email = `contract-${Date.now()}@test.local`; const result = await demoStore.register({ email, password: 'Contract123!', name: 'Contract' }); const found = demoStore.userByEmail(email); assert.equal(found.role, 'CUSTOMER'); assert.equal(found.emailVerified, false); assert.equal(Object.hasOwn(result, 'code'), false) })

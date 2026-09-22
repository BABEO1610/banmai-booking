import test from 'node:test'
import assert from 'node:assert/strict'
import { createAuthRepository } from '../../src/services/auth/auth.repository.js'
import { hashCode, verifyPassword } from '../../src/utils/crypto.js'

test('activation without challengeId resolves the emailed OTP and sets the password', async () => {
  const email = 'admin@example.test'
  const secret = 'activation-test-secret'
  const password = 'ActivationTest123!'
  const user = { id: 'user-1', email, normalized_email: email, role: 'ADMIN', status: 'PENDING', auth_version: 0 }
  const challenge = {
    ...user, challenge_id: 'challenge-1', user_id: user.id,
    code_hash: hashCode('123456', secret), attempts: 0, consumed_at: null,
    expires_at: new Date(Date.now() + 60_000),
  }
  let consumed = false
  let committed = false
  const client = {
    async query(sql, params) {
      if (sql === 'begin' || sql === 'rollback') return { rows: [] }
      if (sql === 'commit') { committed = true; return { rows: [] } }
      if (sql.startsWith('select')) {
        return { rows: params[0] === email && params[1] === 'ACCOUNT_ACTIVATION' ? [challenge] : [] }
      }
      if (sql.startsWith('update app.auth_challenges')) {
        consumed = params[0] === challenge.challenge_id
        return { rows: [] }
      }
      if (sql.startsWith('update app.users')) {
        return { rows: [{ ...user, status: 'ACTIVE', email_verified_at: new Date(), password_hash: params[1], auth_version: 1 }] }
      }
      throw new Error('Unexpected query')
    },
    release() {},
  }
  const repository = createAuthRepository({ connect: async () => client }, secret)
  const result = await repository.activate({ email, code: '123456', password })

  assert.equal(result.status, 'ACTIVE')
  assert.equal(result.emailVerified, true)
  assert.equal(await verifyPassword(password, result.passwordHash), true)
  assert.equal(consumed, true)
  assert.equal(committed, true)
})

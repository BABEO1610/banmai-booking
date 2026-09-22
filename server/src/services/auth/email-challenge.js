import { hashCode, randomCode } from '../../utils/crypto.js'
export function makeEmailChallenge(secret, ttlMinutes = 15) { const code = randomCode(); return { code, hash: hashCode(code, secret), expiresAt: new Date(Date.now() + ttlMinutes * 60_000).toISOString(), attempts: 0, consumedAt: null } }
export function validEmailChallenge(challenge, code, secret) { return Boolean(challenge && !challenge.consumedAt && new Date(challenge.expiresAt) > new Date() && challenge.attempts < 5 && hashCode(code, secret) === challenge.hash) }

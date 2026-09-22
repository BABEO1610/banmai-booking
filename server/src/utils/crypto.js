import crypto from 'node:crypto'
export function hashPassword(password) { return new Promise((resolve, reject) => { const salt = crypto.randomBytes(16); crypto.scrypt(password, salt, 64, (error, derived) => error ? reject(error) : resolve(`scrypt:${salt.toString('hex')}:${derived.toString('hex')}`)) }) }
export function verifyPassword(password, encoded) { return new Promise((resolve, reject) => { const [, saltHex, hashHex] = String(encoded).split(':'); if (!saltHex || !hashHex) return resolve(false); crypto.scrypt(password, Buffer.from(saltHex, 'hex'), 64, (error, derived) => error ? reject(error) : resolve(derived.length === Buffer.from(hashHex, 'hex').length && crypto.timingSafeEqual(Buffer.from(hashHex, 'hex'), derived))) }) }
export const randomCode = () => String(crypto.randomInt(100000, 1000000))
export const hashCode = (code, secret) => crypto.createHmac('sha256', secret).update(String(code)).digest('hex')

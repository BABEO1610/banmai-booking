import session from 'express-session'
import connectPgSimple from 'connect-pg-simple'
import { config } from './env.js'
export function sessionMiddleware(pool) {
  const options = { secret: config.sessionSecret, resave: false, saveUninitialized: false, name: 'banmai.sid', proxy: config.trustProxy, cookie: { httpOnly: true, sameSite: 'lax', secure: config.nodeEnv === 'production', maxAge: 7 * 24 * 60 * 60 * 1000 } }
  if (config.dataMode === 'postgres' && pool) { const PgStore = connectPgSimple(session); options.store = new PgStore({ pool, schemaName: 'app', tableName: 'sessions', createTableIfMissing: false }) }
  return session(options)
}

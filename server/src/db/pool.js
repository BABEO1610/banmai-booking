import fs from 'node:fs'
import pg from 'pg'
import { config } from '../config/env.js'
const { Pool } = pg
export function createPool() {
  if (config.dataMode !== 'postgres') return null
  const ssl = config.databaseSslCaPath ? { ca: fs.readFileSync(config.databaseSslCaPath, 'utf8'), rejectUnauthorized: true } : undefined
  // When ssl is provided separately, strip sslrootcert from the connection string
  // to prevent pg-connection-string from trying to read a host-machine path (e.g. Windows).
  let connectionString = config.databaseUrl
  if (connectionString && ssl) {
    try {
      const u = new URL(connectionString)
      u.searchParams.delete('sslrootcert')
      u.searchParams.delete('sslmode')
      connectionString = u.toString()
    } catch { /* not a URL-format connection string, leave as-is */ }
  }
  const pool = new Pool({
    connectionString,
    ssl,
    max: config.pgPoolMax,
    min: 0,
    connectionTimeoutMillis: config.pgConnectionTimeoutMs,
    query_timeout: config.pgQueryTimeoutMs,
    statement_timeout: config.pgStatementTimeoutMs,
    idleTimeoutMillis: config.pgIdleTimeoutMs,
    keepAlive: true,
    keepAliveInitialDelayMillis: 10000,
    maxUses: 500,
    allowExitOnIdle: true,
    application_name: 'banmai-api',
  })
  pool.on('error', (error) => console.error('PostgreSQL pool error:', { code: error.code, message: error.message, total: pool.totalCount, idle: pool.idleCount, waiting: pool.waitingCount }))
  return pool
}

import { createPool } from '../src/db/pool.js'
import { config } from '../src/config/env.js'

if (config.dataMode !== 'postgres') throw new Error('DATA_MODE must be postgres')
// Read-only, independent connections: never prints credentials or customer data.
for (let attempt = 1; attempt <= 5; attempt++) {
  const pool = createPool()
  let client
  let started = Date.now()
  let stage = 'connect'
  try {
    client = await pool.connect()
    const connectMs = Date.now() - started
    stage = 'query'; started = Date.now()
    await client.query('select 1 as ok')
    // pg_stat_ssl describes the pooler-to-Postgres hop, not our client socket.
    const socket = client.connection.stream
    const tls = socket.encrypted === true && socket.authorized === true
    console.log(JSON.stringify({ attempt, connectMs, queryMs: Date.now() - started, tls, protocol: socket.getProtocol?.(), addressFamily: socket.remoteFamily }))
    if (!tls) process.exitCode = 1
  } catch (error) {
    process.exitCode = 1
    console.error(JSON.stringify({ attempt, stage, ms: Date.now() - started, code: error.code, message: error.message }))
  } finally {
    client?.release(true)
    await pool.end()
  }
}

import 'dotenv/config'
import { config } from './config/env.js'
import app from './app.js'
import { demoStore } from './mock/store.js'
import { startWorker } from './workers/scheduler.js'
const pool = app.locals.pool

// Vercel invokes the exported Express app as a function. Start a listener and
// the background worker only when running as a regular Node server.
if (process.env.VERCEL !== '1') {
  const server = app.listen(config.port, () => console.log(`API server running at http://localhost:${config.port} (${config.dataMode})`))
  const stopWorker = config.workerMode === 'in-process' ? startWorker(demoStore, config.sheetsSyncIntervalMs) : async () => {}
  function shutdown(signal) {
    console.log(`${signal}: shutting down`)
    const workerStopped = stopWorker()
    server.close(async () => { await workerStopped; await pool?.end(); process.exit(0) })
  }
  process.on('SIGTERM', () => shutdown('SIGTERM'))
  process.on('SIGINT', () => shutdown('SIGINT'))
}

import { config } from '../config/env.js'
import { demoStore } from '../mock/store.js'
import { startWorker } from './scheduler.js'

await demoStore.ready
const stop = startWorker(demoStore, config.sheetsSyncIntervalMs)
async function shutdown() { await stop(); await demoStore.pool?.end() }
process.once('SIGTERM', shutdown)
process.once('SIGINT', shutdown)

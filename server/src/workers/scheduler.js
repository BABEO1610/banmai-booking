export function startWorker(store, interval, { schedule = setTimeout, cancel = clearTimeout, log = console.error } = {}) {
  let stopped = false
  let timer
  let failures = 0
  let running = Promise.resolve()
  const tick = async () => {
    let stage = 'ready'
    try {
      await store.ready
      stage = 'expireHolds'
      await store.expireHolds()
      stage = 'processOutbox'
      await store.processOutbox()
      failures = 0
    } catch (error) {
      failures += 1
      log('Worker tick failed', { stage, code: error.code, message: error.message, failures })
    }
    if (!stopped) timer = schedule(() => { running = tick() }, Math.min(60000, interval * 2 ** Math.min(failures, 6)))
  }
  running = tick()
  return async () => { stopped = true; cancel(timer); await running }
}

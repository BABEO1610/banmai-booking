import { AsyncLocalStorage } from 'node:async_hooks'

// Readers see the last committed snapshot; mutations work on a private draft.
export class DurableState {
  context = new AsyncLocalStorage()
  committed = {}
  queue = Promise.resolve()
  uncertain = false

  get value() { return this.context.getStore()?.draft ?? this.committed }
  set value(value) { this.committed = value }

  run(fn, { ready, persist, reload }) {
    const operation = this.queue.then(async () => {
      await ready
      if (this.uncertain) {
        this.committed = await reload()
        this.uncertain = false
      }
      const draft = structuredClone(this.committed)
      return this.context.run({ draft }, async () => {
        const result = await fn()
        if (JSON.stringify(draft) !== JSON.stringify(this.committed)) {
          try { await persist(draft) } catch (error) {
            // A timeout does not prove that the server rolled back the write.
            this.uncertain = true
            throw error
          }
          this.committed = draft
        }
        return result
      })
    })
    this.queue = operation.catch(() => {})
    return operation
  }
}

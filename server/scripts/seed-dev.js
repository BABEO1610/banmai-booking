import 'dotenv/config'
import { demoStore } from '../src/mock/store.js'
await demoStore.seed()
console.log('Demo store đã seed idempotent: Admin, Photographer A/B/C và Customer X/Y.')

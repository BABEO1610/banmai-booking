import test from 'node:test'
import assert from 'node:assert/strict'
import { demoStore } from '../../src/mock/store.js'
test('public projection excludes unpublished catalog records', async () => { await demoStore.ready; const catalog = demoStore.publicCatalog(); assert.ok(catalog.packages.every((item) => item.published && item.visible)); assert.ok(catalog.portfolio.every((item) => item.published && item.visible)); assert.equal(Object.hasOwn(catalog.packages[0], 'passwordHash'), false) })

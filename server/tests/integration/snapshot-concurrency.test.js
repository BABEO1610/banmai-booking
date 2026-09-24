import test from 'node:test'
import assert from 'node:assert/strict'
import pg from 'pg'
import { DemoStore } from '../../src/mock/store.js'

const url = process.env.BANMAI_REVIEW_DATABASE_URL
test('PostgreSQL snapshot compare-and-swap rejects stale writes and preserves the winning update', { skip: !url }, async () => {
  // This test is only pointed at an ephemeral review database, never DATABASE_URL.
  if (new URL(url).pathname !== '/banmai_review_test') throw Error('Expected isolated banmai_review_test database')
  const pool = new pg.Pool({ connectionString: url })
  try {
    await pool.query('create schema if not exists app')
    await pool.query('create table app.demo_state (id integer primary key, state jsonb not null, updated_at timestamptz not null)')
    const writer = () => Object.assign(Object.create(DemoStore.prototype), { pool })
    const first = writer(), stale = writer()
    await first.persist({ count: 0 })
    stale.revision = first.revision
    await first.persist({ count: 1 })
    await assert.rejects(stale.persist({ count: 2 }), { code: 'STATE_CONFLICT' })
    const result = await pool.query('select state, updated_at::text as revision from app.demo_state where id = 1')
    assert.deepEqual(result.rows[0].state, { count: 1 })
    stale.revision = result.rows[0].revision
    await stale.persist({ count: 2 })
    assert.deepEqual((await pool.query('select state from app.demo_state where id = 1')).rows[0].state, { count: 2 })
  } finally { await pool.end() }
})

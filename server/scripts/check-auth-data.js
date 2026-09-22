import 'dotenv/config'
import { createPool } from '../src/db/pool.js'

const pool = createPool()
try {
  const result = await pool.query(`
    select
      (select count(*) from app.users) as users,
      (select count(*) from app.auth_challenges) as challenges,
      (select count(*) from app.demo_state) as demo_state,
      (select count(*) from app.schema_migrations) as migrations
  `)
  console.log(JSON.stringify(result.rows[0], null, 2))
} finally {
  await pool.end()
}

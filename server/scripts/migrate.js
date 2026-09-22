import 'dotenv/config'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { runner } from 'node-pg-migrate'
import { config } from '../src/config/env.js'

if (config.dataMode !== 'postgres') {
  console.error('Migration cần DATA_MODE=postgres và DATABASE_URL. Mock demo không chạy DDL.')
  process.exitCode = 2
} else {
  const databaseUrl = config.migrationDatabaseUrl || config.databaseUrl
  const ssl = config.databaseSslCaPath ? { ca: fs.readFileSync(config.databaseSslCaPath, 'utf8'), rejectUnauthorized: true } : undefined
  const migrationsDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../migrations')
  const result = await runner({ databaseUrl: { connectionString: databaseUrl, ssl }, dir: migrationsDir, direction: 'up', schema: 'app', migrationsSchema: 'app', migrationsTable: 'schema_migrations', createSchema: true, createMigrationsSchema: true, singleTransaction: true, checkOrder: true })
  console.log(`Applied ${result.length} migration(s).`)
}

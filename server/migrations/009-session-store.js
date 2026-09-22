export async function up(pgm) {
  pgm.dropTable({ name: 'sessions', schema: 'app' }, { ifExists: true })
  pgm.createTable('sessions', { sid: { type: 'text', primaryKey: true }, sess: { type: 'json', notNull: true }, expire: { type: 'timestamptz', notNull: true } }, { schema: 'app' })
  pgm.createIndex({ name: 'sessions', schema: 'app' }, ['expire'], { name: 'sessions_expire_idx' })
}
export async function down(pgm) { pgm.dropTable({ name: 'sessions', schema: 'app' }, { ifExists: true }) }

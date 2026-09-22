export async function up(pgm) { pgm.createTable('demo_state', { id: { type: 'integer', primaryKey: true }, state: { type: 'jsonb', notNull: true }, updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') } }, { schema: 'app' }) }
export async function down(pgm) { pgm.dropTable('demo_state', { schema: 'app' }) }

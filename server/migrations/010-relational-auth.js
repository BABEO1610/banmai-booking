export async function up(pgm) {
  pgm.sql(`
    ALTER TABLE app.users
      ADD COLUMN IF NOT EXISTS name text NOT NULL DEFAULT 'Khách hàng',
      ADD COLUMN IF NOT EXISTS legacy_id text,
      ADD COLUMN IF NOT EXISTS auth_version integer NOT NULL DEFAULT 1,
      ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

    ALTER TABLE app.auth_challenges
      ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now(),
      ADD COLUMN IF NOT EXISTS sent_at timestamptz;

    DROP INDEX IF EXISTS app.users_single_admin;

    INSERT INTO app.users
      (id, email, normalized_email, password_hash, role, status,
       email_verified_at, created_at, name, legacy_id)
    SELECT
      md5('banmai-auth:' || (item->>'id'))::uuid,
      item->>'email',
      lower(trim(item->>'email')),
      item->>'passwordHash',
      item->>'role',
      item->>'status',
      CASE WHEN coalesce((item->>'emailVerified')::boolean, false) THEN now() ELSE NULL END,
      coalesce((item->>'createdAt')::timestamptz, now()),
      coalesce(nullif(item->>'name', ''), 'Khách hàng'),
      item->>'id'
    FROM jsonb_array_elements(
      coalesce((select state->'users' from app.demo_state where id = 1), '[]'::jsonb)
    ) AS item
    WHERE nullif(item->>'email', '') IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM app.users existing
        WHERE existing.normalized_email = lower(trim(item->>'email'))
      );

    UPDATE app.users AS u
    SET name = coalesce(nullif(item->>'name', ''), u.name),
        legacy_id = coalesce(u.legacy_id, item->>'id'),
        updated_at = now()
    FROM jsonb_array_elements(
      coalesce((select state->'users' from app.demo_state where id = 1), '[]'::jsonb)
    ) AS item
    WHERE u.normalized_email = lower(trim(item->>'email'));

    CREATE UNIQUE INDEX IF NOT EXISTS users_legacy_id_unique
      ON app.users (legacy_id) WHERE legacy_id IS NOT NULL;
    CREATE INDEX IF NOT EXISTS auth_challenges_user_purpose_idx
      ON app.auth_challenges (user_id, purpose, created_at DESC);
    ALTER TABLE app.auth_challenges
      DROP CONSTRAINT IF EXISTS auth_challenges_attempts_check;
    ALTER TABLE app.auth_challenges
      ADD CONSTRAINT auth_challenges_attempts_check CHECK (attempts >= 0 AND attempts <= 5);
    ALTER TABLE app.users
      DROP CONSTRAINT IF EXISTS users_role_check,
      DROP CONSTRAINT IF EXISTS users_status_check;
    ALTER TABLE app.users
      ADD CONSTRAINT users_role_check CHECK (role IN ('CUSTOMER', 'PHOTOGRAPHER', 'ADMIN')),
      ADD CONSTRAINT users_status_check CHECK (status IN ('PENDING', 'ACTIVE', 'INACTIVE'));
  `)
}

export async function down(pgm) {
  pgm.sql(`
    DROP INDEX IF EXISTS app.auth_challenges_user_purpose_idx;
    DROP INDEX IF EXISTS app.users_legacy_id_unique;
    ALTER TABLE app.users
      DROP CONSTRAINT IF EXISTS users_role_check,
      DROP CONSTRAINT IF EXISTS users_status_check;
    ALTER TABLE app.auth_challenges
      DROP CONSTRAINT IF EXISTS auth_challenges_attempts_check;
    ALTER TABLE app.auth_challenges
      DROP COLUMN IF EXISTS sent_at,
      DROP COLUMN IF EXISTS created_at;
    ALTER TABLE app.users
      DROP COLUMN IF EXISTS updated_at,
      DROP COLUMN IF EXISTS auth_version,
      DROP COLUMN IF EXISTS legacy_id,
      DROP COLUMN IF EXISTS name;
    CREATE UNIQUE INDEX IF NOT EXISTS users_single_admin
      ON app.users (role) WHERE role = 'ADMIN';
  `)
}

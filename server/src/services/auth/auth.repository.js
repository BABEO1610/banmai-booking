import crypto from 'node:crypto'
import { AppError } from '../../middleware/error.middleware.js'
import { hashCode, hashPassword, randomCode, verifyPassword } from '../../utils/crypto.js'

const normalizeEmail = (email) => String(email || '').trim().toLowerCase()
const roleValues = ['CUSTOMER', 'PHOTOGRAPHER', 'ADMIN']
const publicUser = (row) => ({
  id: row.legacy_id || row.id,
  email: row.email,
  role: row.role,
  status: row.status,
  emailVerified: Boolean(row.email_verified_at),
  name: row.name,
})
const authUser = (row) => ({ ...publicUser(row), dbId: row.id, legacyId: row.legacy_id, passwordHash: row.password_hash, authVersion: row.auth_version })
const challengeExpiry = () => new Date(Date.now() + 10 * 60_000)

export function createAuthRepository(pool, emailCodeSecret) {
  async function transaction(callback) {
    const client = await pool.connect()
    try {
      await client.query('begin')
      const result = await callback(client)
      await client.query('commit')
      return result
    } catch (error) {
      await client.query('rollback')
      throw error
    } finally {
      client.release()
    }
  }

  async function byEmail(client, email, forUpdate = false) {
    const query = `select * from app.users where normalized_email = $1${forUpdate ? ' for update' : ''}`
    const result = await client.query(query, [normalizeEmail(email)])
    return result.rows[0] || null
  }

  async function byId(client, id, forUpdate = false) {
    const result = await client.query(`select * from app.users where id = $1${forUpdate ? ' for update' : ''}`, [id])
    return result.rows[0] || null
  }

  async function createChallenge(client, userId, purpose) {
    await client.query('update app.auth_challenges set consumed_at = now() where user_id = $1 and purpose = $2 and consumed_at is null', [userId, purpose])
    const code = randomCode()
    const expiresAt = challengeExpiry()
    const result = await client.query(
      `insert into app.auth_challenges (id, user_id, purpose, code_hash, expires_at, attempts, created_at, sent_at)
       values ($1, $2, $3, $4, $5, 0, now(), now()) returning id, expires_at`,
      [crypto.randomUUID(), userId, purpose, hashCode(code, emailCodeSecret), expiresAt],
    )
    return { challengeId: result.rows[0].id, code, expiresAt: result.rows[0].expires_at }
  }

  function duplicateError(error) {
    if (error?.code === '23505') return new AppError(409, 'EMAIL_EXISTS', 'Email đã được đăng ký')
    return error
  }

  return {
    async register({ email, password, name }) {
      try {
        return await transaction(async (client) => {
          const address = normalizeEmail(email)
          const id = crypto.randomUUID()
          const legacyId = `usr_${crypto.randomUUID().replaceAll('-', '').slice(0, 12)}`
          const passwordHash = await hashPassword(password)
          const inserted = await client.query(
            `insert into app.users (id, email, normalized_email, password_hash, role, status, name, legacy_id)
             values ($1, $2, $2, $3, 'CUSTOMER', 'PENDING', $4, $5) returning *`,
            [id, address, passwordHash, String(name).trim() || 'Khách hàng', legacyId],
          )
          const user = authUser(inserted.rows[0])
          const challenge = await createChallenge(client, id, 'EMAIL_VERIFY')
          return { user, ...challenge }
        })
      } catch (error) {
        throw duplicateError(error)
      }
    },

    async verify({ challengeId, email, code, purpose = 'EMAIL_VERIFY', newPassword = null }) {
      const result = await transaction(async (client) => {
        const query = challengeId
          ? await client.query(`select c.id as challenge_id, c.user_id, c.purpose, c.code_hash, c.expires_at, c.attempts, c.consumed_at, c.created_at, c.sent_at, u.* from app.auth_challenges c join app.users u on u.id = c.user_id where c.id = $1 and c.purpose = $2 for update`, [challengeId, purpose])
          : await client.query(`select c.id as challenge_id, c.user_id, c.purpose, c.code_hash, c.expires_at, c.attempts, c.consumed_at, c.created_at, c.sent_at, u.* from app.auth_challenges c join app.users u on u.id = c.user_id where u.normalized_email = $1 and c.purpose = $2 and c.consumed_at is null order by c.created_at desc limit 1 for update`, [normalizeEmail(email), purpose])
        const row = query.rows[0]
        const valid = row && !row.consumed_at && new Date(row.expires_at) > new Date() && row.attempts < 5 && hashCode(code, emailCodeSecret) === row.code_hash
        if (!valid) {
          if (row && !row.consumed_at && row.attempts < 5) await client.query('update app.auth_challenges set attempts = attempts + 1 where id = $1', [row.challenge_id])
          return { invalid: true }
        }
        await client.query('update app.auth_challenges set consumed_at = now() where id = $1', [row.challenge_id])
        const update = purpose === 'PASSWORD_RESET'
          ? await client.query('update app.users set password_hash = $2, auth_version = auth_version + 1, updated_at = now() where id = $1 returning *', [row.user_id, await hashPassword(newPassword)])
          : purpose === 'ACCOUNT_ACTIVATION'
            ? await client.query("update app.users set password_hash = $2, status = 'ACTIVE', email_verified_at = coalesce(email_verified_at, now()), auth_version = auth_version + 1, updated_at = now() where id = $1 returning *", [row.user_id, await hashPassword(newPassword)])
            : await client.query("update app.users set status = 'ACTIVE', email_verified_at = coalesce(email_verified_at, now()), updated_at = now() where id = $1 returning *", [row.user_id])
        return authUser(update.rows[0])
      })
      if (result?.invalid) throw new AppError(400, 'INVALID_CHALLENGE', 'Mã xác thực không hợp lệ hoặc đã hết hạn')
      return result
    },

    async resend({ email, challengeId, purpose = 'EMAIL_VERIFY' }) {
      return transaction(async (client) => {
        const current = challengeId
          ? (await client.query('select u.* from app.auth_challenges c join app.users u on u.id = c.user_id where c.id = $1 and c.purpose = $2 for update', [challengeId, purpose])).rows[0]
          : await byEmail(client, email, true)
        const eligible = purpose === 'EMAIL_VERIFY'
          ? current?.status === 'PENDING'
          : purpose === 'ACCOUNT_ACTIVATION'
            ? current?.status === 'PENDING'
            : current?.status === 'ACTIVE'
        if (!current || !eligible) return { sent: true }
        const recent = await client.query('select 1 from app.auth_challenges where user_id = $1 and purpose = $2 and created_at > now() - interval \'60 seconds\' and consumed_at is null limit 1', [current.id, purpose])
        if (recent.rowCount) throw new AppError(429, 'EMAIL_COOLDOWN', 'Vui lòng chờ trước khi gửi lại mã')
        const challenge = await createChallenge(client, current.id, purpose)
        return { sent: true, email: current.email, ...challenge }
      })
    },

    async login({ email, password }) {
      const client = await pool.connect()
      try {
        const row = await byEmail(client, email)
        if (!row || !row.password_hash || !(await verifyPassword(password, row.password_hash))) throw new AppError(401, 'INVALID_CREDENTIALS', 'Email hoặc mật khẩu không đúng')
        if (row.status === 'PENDING' || !row.email_verified_at) throw new AppError(403, 'EMAIL_NOT_VERIFIED', 'Bạn cần xác thực email trước khi đăng nhập')
        if (row.status !== 'ACTIVE') throw new AppError(403, 'ACCOUNT_INACTIVE', 'Tài khoản đã bị khóa')
        return authUser(row)
      } finally { client.release() }
    },

    async current(dbId) {
      const client = await pool.connect()
      try { const row = await byId(client, dbId); return row ? authUser(row) : null } finally { client.release() }
    },

    async resolveId(identifier) {
      const client = await pool.connect()
      try {
        const result = await client.query('select id from app.users where id::text = $1 or legacy_id = $1', [String(identifier)])
        return result.rows[0]?.id || null
      } finally { client.release() }
    },

    async requestPasswordReset(email) {
      return transaction(async (client) => {
        const current = await byEmail(client, email, true)
        if (!current || current.status !== 'ACTIVE' || !current.email_verified_at) return { sent: true }
        const challenge = await createChallenge(client, current.id, 'PASSWORD_RESET')
        return { sent: true, email: current.email, ...challenge }
      })
    },

    async createManaged({ email, name, role }) {
      if (!roleValues.includes(role) || role === 'CUSTOMER') throw new AppError(400, 'INVALID_ROLE', 'Chỉ có thể tạo Admin hoặc Photographer nội bộ')
      return transaction(async (client) => {
        const id = crypto.randomUUID()
        const legacyId = `usr_${crypto.randomUUID().replaceAll('-', '').slice(0, 12)}`
        try {
          const inserted = await client.query(`insert into app.users (id, email, normalized_email, role, status, name, legacy_id) values ($1, $2, $2, $3, 'PENDING', $4, $5) returning *`, [id, normalizeEmail(email), role, String(name).trim() || role, legacyId])
          const user = authUser(inserted.rows[0])
          const challenge = await createChallenge(client, id, 'ACCOUNT_ACTIVATION')
          return { user, ...challenge }
        } catch (error) { throw duplicateError(error) }
      })
    },

    async activate({ challengeId, email, code, password }) { return this.verify({ challengeId, email, code, purpose: 'ACCOUNT_ACTIVATION', newPassword: password }) },

    async listManaged() {
      const client = await pool.connect()
      try { const result = await client.query("select * from app.users where role in ('ADMIN', 'PHOTOGRAPHER') order by created_at"); return result.rows.map(authUser) } finally { client.release() }
    },

    async updateManaged({ actorId, targetId, status, role }) {
      return transaction(async (client) => {
        const actor = await byId(client, actorId, true)
        const target = await byId(client, targetId, true)
        if (!actor || actor.role !== 'ADMIN' || actor.status !== 'ACTIVE') throw new AppError(403, 'FORBIDDEN', 'Bạn không có quyền quản lý tài khoản')
        if (!target || !roleValues.includes(target.role) || target.role === 'CUSTOMER') throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy tài khoản nội bộ')
        if (target.id === actor.id && (status === 'INACTIVE' || (role && role !== 'ADMIN'))) throw new AppError(409, 'SELF_ADMIN_CHANGE_FORBIDDEN', 'Không thể tự khóa hoặc hạ quyền Admin hiện tại')
        const nextRole = role || target.role
        const nextStatus = status || target.status
        if (target.role === 'ADMIN' && nextRole !== 'ADMIN' && target.status === 'ACTIVE') {
          const count = await client.query("select count(*)::int as count from app.users where role = 'ADMIN' and status = 'ACTIVE' and email_verified_at is not null")
          if (count.rows[0].count <= 1) throw new AppError(409, 'LAST_ADMIN_REQUIRED', 'Không thể hạ quyền Admin cuối cùng')
        }
        if (target.role === 'ADMIN' && nextStatus === 'INACTIVE' && target.status === 'ACTIVE') {
          const count = await client.query("select count(*)::int as count from app.users where role = 'ADMIN' and status = 'ACTIVE' and email_verified_at is not null")
          if (count.rows[0].count <= 1) throw new AppError(409, 'LAST_ADMIN_REQUIRED', 'Không thể khóa Admin cuối cùng')
        }
        const result = await client.query('update app.users set role = $2, status = $3, auth_version = auth_version + 1, updated_at = now() where id = $1 returning *', [target.id, nextRole, nextStatus])
        await client.query('insert into app.audit_log (id, payload) values ($1, $2::jsonb)', [crypto.randomUUID(), JSON.stringify({ actorId: actor.id, action: 'MANAGED_USER_UPDATED', entityType: 'user', entityId: target.id, before: { role: target.role, status: target.status }, after: { role: nextRole, status: nextStatus }, createdAt: new Date().toISOString() })])
        return authUser(result.rows[0])
      })
    },
  }
}

import { demoStore } from '../../mock/store.js'
import { createAuthRepository } from './auth.repository.js'
import { emailService } from '../email/email.service.js'
import { config } from '../../config/env.js'
import { z } from 'zod'
import { AppError } from '../../middleware/error.middleware.js'

const repository = demoStore.pool ? createAuthRepository(demoStore.pool, config.emailCodeSecret) : null
const syncProjection = async (user) => {
  if (repository && user?.legacyId) await demoStore.syncAuthUser(user)
}
const send = async (challenge) => {
  if (repository) await emailService.sendChallenge(challenge)
}
const validate = (schema, input) => {
  const result = schema.safeParse(input || {})
  if (!result.success) throw new AppError(400, 'VALIDATION_ERROR', 'Thông tin gửi lên không hợp lệ', result.error.issues.map((issue) => ({ path: issue.path, message: issue.message })))
  return result.data
}
const registerSchema = z.object({ name: z.string().trim().min(1).max(100), email: z.email().max(254), password: z.string().min(12).max(200) }).strict()
const loginSchema = z.object({ email: z.email().max(254), password: z.string().min(1).max(200) }).strict()
const challengeSchema = z.object({ challengeId: z.string().min(1).max(100).optional(), email: z.email().max(254).optional(), code: z.string().regex(/^\d{6}$/), purpose: z.enum(['EMAIL_VERIFY', 'PASSWORD_RESET', 'ACCOUNT_ACTIVATION']).optional(), newPassword: z.string().min(12).max(200).optional(), password: z.string().min(12).max(200).optional() }).strict()
const resetSchema = z.object({ challengeId: z.string().min(1).max(100).optional(), email: z.email().max(254).optional(), code: z.string().regex(/^\d{6}$/), newPassword: z.string().min(12).max(200) }).strict()
const activateSchema = z.object({ challengeId: z.string().min(1).max(100).optional(), email: z.email().max(254), code: z.string().regex(/^\d{6}$/), password: z.string().min(12).max(200) }).strict()
const managedPatchSchema = z.object({ status: z.enum(['ACTIVE', 'INACTIVE']).optional(), role: z.enum(['ADMIN', 'PHOTOGRAPHER']).optional() }).strict().refine((value) => value.status || value.role, 'Cần có thay đổi tài khoản')

export const authService = {
  usingDatabase: Boolean(repository),
  async register(input) {
    const data = validate(registerSchema, input)
    if (!repository) return demoStore.register(data)
    const result = await repository.register(data)
    await syncProjection(result.user)
    try { await send({ to: result.user.email, code: result.code, purpose: 'EMAIL_VERIFY', expiresAt: result.expiresAt }) } catch (error) { throw error }
    return { challengeId: result.challengeId, email: result.user.email, expiresAt: result.expiresAt }
  },
  async verify(input) {
    const data = validate(challengeSchema.pick({ challengeId: true, code: true }), input)
    if (!repository) return demoStore.verify(data)
    const user = await repository.verify(data)
    await syncProjection(user)
    return { ...user, id: user.id }
  },
  async login(input) {
    const data = validate(loginSchema, input)
    if (!repository) return demoStore.login(data)
    const user = await repository.login(data)
    await syncProjection(user)
    return user
  },
  async current(dbId) { return repository ? repository.current(dbId) : null },
  async resolveId(identifier) { return repository ? repository.resolveId(identifier) : identifier },
  async resetRequest(email) {
    const data = validate(z.object({ email: z.email().max(254) }), { email })
    if (!repository) return demoStore.requestPasswordReset(data.email)
    const result = await repository.requestPasswordReset(data.email)
    if (result.code) await send({ to: result.email, code: result.code, purpose: 'PASSWORD_RESET', expiresAt: result.expiresAt })
    return { message: 'Nếu email tồn tại, hướng dẫn khôi phục mật khẩu đã được gửi.' }
  },
  async reset(input) {
    const data = validate(resetSchema, input)
    if (!repository) return demoStore.resetPassword(input)
    const user = await repository.verify({ ...data, purpose: 'PASSWORD_RESET', newPassword: data.newPassword })
    await syncProjection(user)
    return { reset: true }
  },
  async resend(input) {
    const data = validate(challengeSchema.pick({ challengeId: true, email: true, purpose: true }), input)
    if (!repository) throw new Error('Gửi lại mã email thật cần DATA_MODE=postgres')
    const result = await repository.resend(data)
    if (result.code) await send({ to: result.email, code: result.code, purpose: input.purpose || 'EMAIL_VERIFY', expiresAt: result.expiresAt })
    return result.challengeId ? { challengeId: result.challengeId, email: result.email, expiresAt: result.expiresAt } : { sent: true }
  },
  async createManaged(input) {
    const data = validate(z.object({ email: z.email().max(254), name: z.string().trim().min(1).max(100), role: z.enum(['ADMIN', 'PHOTOGRAPHER']) }).strict(), input)
    if (!repository) throw new Error('Quản trị account cần DATA_MODE=postgres')
    const result = await repository.createManaged(data)
    await syncProjection(result.user)
    await send({ to: result.user.email, code: result.code, purpose: 'ACCOUNT_ACTIVATION', expiresAt: result.expiresAt })
    return { challengeId: result.challengeId, email: result.user.email, role: result.user.role, expiresAt: result.expiresAt }
  },
  async activate(input) {
    const data = validate(activateSchema, input)
    if (!repository) throw new Error('Kích hoạt account cần DATA_MODE=postgres')
    const user = await repository.activate(data)
    await syncProjection(user)
    return user
  },
  async listManaged() { return repository ? repository.listManaged() : demoStore.photographers() },
  async updateManaged(input) {
    if (!repository) throw new Error('Quản trị account cần DATA_MODE=postgres')
    const patch = validate(managedPatchSchema, input)
    const user = await repository.updateManaged({ ...patch, actorId: input.actorId, targetId: input.targetId })
    await syncProjection(user)
    return user
  },
}

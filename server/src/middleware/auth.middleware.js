import { AppError } from './error.middleware.js'
export const currentUser = (request) => request.authUser || (request.session?.userId ? { id: request.session.userId, role: request.session.role, dbId: request.session.authUserId } : null)
async function resolveAuth(request) {
  if (request.authUser) return request.authUser
  if (!request.session?.userId) return null
  const now = Date.now()
  if ((request.session.absoluteExpiresAt && now >= request.session.absoluteExpiresAt) || (request.session.lastSeenAt && request.session.idleTimeout && now - request.session.lastSeenAt >= request.session.idleTimeout)) {
    await new Promise((resolve) => request.session.destroy(() => resolve()))
    return null
  }
  const service = request.app.locals.authService
  if (service?.usingDatabase) {
    if (!request.session.authUserId) return null
    const found = await service.current(request.session.authUserId)
    if (!found || found.status !== 'ACTIVE' || !found.emailVerified) return null
    if (found.authVersion && request.session.authVersion && found.authVersion !== request.session.authVersion) return null
    request.authUser = found
    request.session.lastSeenAt = now
    return found
  }
  request.authUser = currentUser(request)
  request.session.lastSeenAt = now
  return request.authUser
}
export async function requireAuth(request, _response, next) { try { if (!await resolveAuth(request)) return next(new AppError(401, 'AUTH_REQUIRED', 'Bạn cần đăng nhập')); next() } catch (error) { next(error) } }
export const requireRole = (...roles) => async (request, _response, next) => { try { const found = await resolveAuth(request); if (!found) return next(new AppError(401, 'AUTH_REQUIRED', 'Bạn cần đăng nhập')); if (!roles.includes(found.role)) return next(new AppError(403, 'FORBIDDEN', 'Bạn không có quyền thực hiện thao tác này')); next() } catch (error) { next(error) } }
export function csrfGuard(request, _response, next) { if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) return next(); const token = request.get('x-csrf-token'); if (!request.session?.csrf || token !== request.session.csrf) return next(new AppError(403, 'CSRF_REQUIRED', 'Thiếu hoặc sai mã bảo vệ phiên')); next() }

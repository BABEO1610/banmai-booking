import 'dotenv/config'
import { authService } from '../src/services/auth/auth.service.js'
import { demoStore } from '../src/mock/store.js'
import { config } from '../src/config/env.js'

const email = config.bootstrapAdminEmail
if (!email) throw new Error('Thiếu BOOTSTRAP_ADMIN_EMAIL trong server/.env')
const existing = (await authService.listManaged()).find((user) => user.email === email.trim().toLowerCase())
if (existing) {
  console.log(JSON.stringify({ status: 'exists', email: existing.email, role: existing.role, accountStatus: existing.status }, null, 2))
} else {
  const result = await authService.createManaged({ email, name: 'Chủ Studio', role: 'ADMIN' })
  console.log(JSON.stringify({ status: 'activation_sent', email: result.email, role: result.role, challengeId: result.challengeId, expiresAt: result.expiresAt }, null, 2))
  console.log('Mở email, nhập mã tại luồng kích hoạt rồi đặt mật khẩu Admin. Script không đặt hoặc in mật khẩu.')
}
await demoStore.pool?.end()

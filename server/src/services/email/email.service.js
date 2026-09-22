import nodemailer from 'nodemailer'
import { config } from '../../config/env.js'
import { AppError } from '../../middleware/error.middleware.js'

let transporter
function getTransporter() {
  if (config.emailMode !== 'smtp') throw new AppError(503, 'EMAIL_NOT_CONFIGURED', 'Kênh email chưa được cấu hình')
  transporter ||= nodemailer.createTransport({
    host: config.smtpHost,
    port: config.smtpPort,
    secure: config.smtpSecure,
    auth: { user: config.smtpUser, pass: config.smtpPassword },
    connectionTimeout: 15_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
    disableFileAccess: true,
    disableUrlAccess: true,
  })
  return transporter
}

const subjects = {
  EMAIL_VERIFY: 'Mã xác thực đăng ký Ban Mai Studio',
  PASSWORD_RESET: 'Mã khôi phục mật khẩu Ban Mai Studio',
  ACCOUNT_ACTIVATION: 'Mã kích hoạt tài khoản Ban Mai Studio',
}

export const emailService = {
  async sendChallenge({ to, code, purpose, expiresAt }) {
    try {
      await getTransporter().sendMail({
        from: config.mailFrom,
        to,
        subject: subjects[purpose] || 'Mã bảo mật Ban Mai Studio',
        text: `Mã của bạn là: ${code}\n\n${purpose === 'ACCOUNT_ACTIVATION' ? `Mở ${config.publicOrigin}/activate để kích hoạt account.` : purpose === 'PASSWORD_RESET' ? `Mở ${config.publicOrigin}/reset-password để đặt lại mật khẩu.` : `Mở ${config.publicOrigin}/verify để xác thực email.`}\nMã có hiệu lực đến ${new Date(expiresAt).toLocaleString('vi-VN', { timeZone: config.timezone })}.\nMã chỉ dùng một lần. Nếu bạn không yêu cầu thao tác này, hãy bỏ qua email.`,
      })
    } catch (error) {
      const codeValue = typeof error?.code === 'string' ? error.code : 'UNKNOWN'
      console.error(JSON.stringify({ event: 'email_delivery_failed', code: codeValue, purpose }))
      throw new AppError(503, 'EMAIL_DELIVERY_FAILED', 'Không thể gửi mã email lúc này. Vui lòng thử lại sau.')
    }
  },
  async verifyConnection() {
    await getTransporter().verify()
    return true
  },
}

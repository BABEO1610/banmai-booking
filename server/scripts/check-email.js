import { randomUUID } from 'node:crypto'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'
import nodemailer from 'nodemailer'

// Load only email settings; do not initialize the app, database or demo store.
dotenv.config({ path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../.env'), quiet: true })

const args = process.argv.slice(2)
let send = false
let recipient
for (let index = 0; index < args.length; index += 1) {
  if (args[index] === '--send' && !send) send = true
  else if (args[index] === '--to' && !recipient && args[index + 1] && !args[index + 1].startsWith('--')) recipient = args[++index]
  else {
    console.error('Cách dùng từ thư mục gốc: node server/scripts/check-email.js [--send --to email@example.com]')
    process.exit(1)
  }
}

const required = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_SECURE', 'SMTP_USER', 'SMTP_PASSWORD', 'MAIL_FROM']
const missing = required.filter((key) => !process.env[key]?.trim())
if (missing.length) {
  console.error(`Thiếu cấu hình: ${missing.join(', ')}`)
  process.exit(1)
}
const port = Number(process.env.SMTP_PORT)
if (!Number.isInteger(port) || port < 1 || port > 65535 || !['true', 'false'].includes(process.env.SMTP_SECURE)) {
  console.error('SMTP_PORT hoặc SMTP_SECURE không hợp lệ.')
  process.exit(1)
}
const isEmail = (value) => typeof value === 'string' && /^[^\s@<>,;]+@[^\s@<>,;]+\.[^\s@<>,;]+$/.test(value)
if (!isEmail(process.env.SMTP_USER) || /[\r\n]/.test(process.env.MAIL_FROM)) {
  console.error('SMTP_USER hoặc MAIL_FROM không hợp lệ.')
  process.exit(1)
}
if ((send && !isEmail(recipient)) || (!send && recipient)) {
  console.error('Gửi thử cần --send --to với đúng một địa chỉ email; mặc định chỉ kiểm tra SMTP.')
  process.exit(1)
}

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port,
  secure: process.env.SMTP_SECURE === 'true',
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
  connectionTimeout: 15_000,
  greetingTimeout: 10_000,
  socketTimeout: 20_000,
  dnsTimeout: 10_000,
  logger: false,
  debug: false,
  disableFileAccess: true,
  disableUrlAccess: true,
})

let stage = 'SMTP_VERIFY'
try {
  await transporter.verify()
  console.log('SMTP_OK: kết nối TLS và đăng nhập SMTP thành công.')
  if (send) {
    stage = 'SMTP_SEND'
    const testId = randomUUID().slice(0, 8)
    const sentAt = new Date().toISOString()
    const subject = `Ban Mai — Kiểm tra email [${testId}]`
    const info = await transporter.sendMail({
      from: process.env.MAIL_FROM,
      to: recipient,
      subject,
      text: `Đây là email kiểm tra gửi thư từ Ban Mai Studio đang chạy local.\n\nMã kiểm tra: ${testId}\nThời điểm gửi (UTC): ${sentAt}\n\nĐây không phải mã OTP đăng ký. Không cần trả lời email này.\nNếu bạn nhận được email, kênh gửi đã hoạt động cho lần thử này.`,
    })
    const accepted = (info.accepted || []).some((address) => String(address).toLowerCase() === recipient.toLowerCase())
    if (!accepted || info.rejected?.length) {
      console.error('SMTP_NOT_ACCEPTED: SMTP không chấp nhận người nhận email thử.')
      process.exitCode = 1
    } else {
      console.log(JSON.stringify({ status: 'SMTP_ACCEPTED', recipient, subject, messageId: info.messageId, sentAt }, null, 2))
      console.log('Hãy kiểm tra Inbox/Spam theo tiêu đề trên. SMTP chấp nhận chưa xác nhận email đã tới hộp thư.')
    }
  } else {
    console.log('Chưa gửi email. Thêm --send --to <email> để gửi đúng một thư thử.')
  }
} catch (error) {
  const hints = {
    EAUTH: 'Gmail từ chối đăng nhập. Kiểm tra App Password, tài khoản và xác minh hai bước.',
    ETIMEDOUT: 'Kết nối hết thời gian. Kiểm tra Internet, firewall và cổng SMTP.',
    ECONNECTION: 'Không kết nối được SMTP. Kiểm tra host, port và mạng.',
    ESOCKET: 'Lỗi socket/TLS. Kiểm tra kết nối và cấu hình TLS.',
    EDNS: 'Không phân giải được hostname SMTP. Kiểm tra DNS và Internet.',
    EENVELOPE: 'SMTP từ chối địa chỉ gửi hoặc nhận.',
  }
  // Never dump the error object, SMTP transcript, credentials or message body.
  const code = typeof error.code === 'string' && /^[A-Z0-9_]+$/.test(error.code) ? error.code : 'UNKNOWN'
  const responseCode = Number.isInteger(error.responseCode) ? error.responseCode : null
  console.error(JSON.stringify({ status: 'FAILED', stage, code, responseCode, hint: hints[code] || 'Không hoàn tất kiểm tra/gửi email; kiểm tra cấu hình SMTP.' }, null, 2))
  process.exitCode = 1
} finally {
  transporter.close()
}

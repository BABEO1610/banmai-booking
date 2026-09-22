import path from 'node:path'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'

dotenv.config({ path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../.env') })

const bool = (value, fallback = false) => value == null ? fallback : ['1', 'true', 'yes'].includes(String(value).toLowerCase())

export const config = {
  port: Number(process.env.PORT) || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  dataMode: process.env.DATA_MODE || 'mock',
  publicOrigin: process.env.PUBLIC_ORIGIN || 'http://localhost:5173',
  imageStorage: process.env.IMAGE_STORAGE || 'local',
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  storageBucket: process.env.SUPABASE_STORAGE_BUCKET || 'studio-media',
  timezone: process.env.STUDIO_TIMEZONE || 'Asia/Ho_Chi_Minh',
  sessionSecret: process.env.SESSION_SECRET || 'local-demo-session-secret-change-me',
  emailCodeSecret: process.env.EMAIL_CODE_HMAC_SECRET || 'local-demo-email-secret-change-me',
  demoMailToken: process.env.DEMO_MAIL_TOKEN || 'local-demo-only',
  emailMode: process.env.EMAIL_MODE || 'mock',
  smtpHost: process.env.SMTP_HOST || 'smtp.gmail.com',
  smtpPort: Number(process.env.SMTP_PORT) || 465,
  smtpSecure: bool(process.env.SMTP_SECURE, true),
  smtpUser: process.env.SMTP_USER,
  smtpPassword: process.env.SMTP_PASSWORD,
  mailFrom: process.env.MAIL_FROM || process.env.SMTP_USER,
  bootstrapAdminEmail: process.env.BOOTSTRAP_ADMIN_EMAIL,
  paymentMode: process.env.PAYMENT_MODE || 'mock',
  sepayApiKey: process.env.SEPAY_API_KEY,
  sepayBankAccount: process.env.SEPAY_BANK_ACCOUNT,
  sepayBankName: process.env.SEPAY_BANK_NAME || 'Ngân hàng nhận tiền',
  sepayAccountHolder: process.env.SEPAY_ACCOUNT_HOLDER,
  smsMode: process.env.SMS_MODE || 'mock',
  sheetsMode: process.env.SHEETS_MODE || 'mock',
  sheetsSpreadsheetId: process.env.SHEETS_SPREADSHEET_ID,
  sheetsTab: process.env.SHEETS_TAB || 'Bookings',
  sheetsCredentialsPath: process.env.GOOGLE_APPLICATION_CREDENTIALS,
  sheetsSyncIntervalMs: Number(process.env.SHEETS_SYNC_INTERVAL_MS) || 5000,
  pgPoolMax: Number(process.env.PG_POOL_MAX) || 4,
  pgConnectionTimeoutMs: Number(process.env.PG_CONNECTION_TIMEOUT_MS) || 15000,
  pgQueryTimeoutMs: Number(process.env.PG_QUERY_TIMEOUT_MS) || 15000,
  pgStatementTimeoutMs: Number(process.env.PG_STATEMENT_TIMEOUT_MS) || 15000,
  pgIdleTimeoutMs: Number(process.env.PG_IDLE_TIMEOUT_MS) || 60000,
  workerMode: process.env.WORKER_MODE || 'in-process',
  maxConcurrentBookings: process.env.MAX_CONCURRENT_BOOKINGS ? Number(process.env.MAX_CONCURRENT_BOOKINGS) : null,
  bufferBeforeMinutes: process.env.BUFFER_BEFORE_MINUTES ? Number(process.env.BUFFER_BEFORE_MINUTES) : null,
  bufferAfterMinutes: process.env.BUFFER_AFTER_MINUTES ? Number(process.env.BUFFER_AFTER_MINUTES) : null,
  databaseUrl: process.env.DATABASE_URL,
  migrationDatabaseUrl: process.env.MIGRATION_DATABASE_URL,
  testDatabaseUrl: process.env.TEST_DATABASE_URL,
  databaseSslCaPath: process.env.DATABASE_SSL_CA_PATH ? path.resolve(process.env.DATABASE_SSL_CA_PATH) : undefined,
  trustProxy: bool(process.env.TRUST_PROXY),
}

export function validateConfig({ mode = config.nodeEnv } = {}) {
  if (!['development', 'test', 'production'].includes(mode)) throw new Error(`NODE_ENV không hợp lệ: ${mode}`)
  if (mode === 'production') {
    if (config.dataMode === 'mock' || config.paymentMode === 'mock' || config.smsMode === 'mock' || config.sheetsMode === 'mock') throw new Error('Production không được bật mock controls')
    for (const [name, value] of [['DATABASE_URL', config.databaseUrl], ['SESSION_SECRET', process.env.SESSION_SECRET], ['EMAIL_CODE_HMAC_SECRET', process.env.EMAIL_CODE_HMAC_SECRET]]) if (!value) throw new Error(`Thiếu cấu hình bắt buộc: ${name}`)
    if (config.sessionSecret.length < 32 || config.emailCodeSecret.length < 32) throw new Error('SESSION_SECRET và EMAIL_CODE_HMAC_SECRET phải dài ít nhất 32 ký tự')
  }
  if (config.dataMode === 'postgres' && !config.databaseUrl) throw new Error('DATA_MODE=postgres yêu cầu DATABASE_URL')
  if (config.emailMode === 'smtp') {
    if (!config.smtpUser || !config.smtpPassword || !config.mailFrom) throw new Error('EMAIL_MODE=smtp yêu cầu SMTP_USER, SMTP_PASSWORD và MAIL_FROM')
    if (!Number.isInteger(config.smtpPort) || config.smtpPort < 1 || config.smtpPort > 65535) throw new Error('SMTP_PORT không hợp lệ')
  }
  return config
}

validateConfig()

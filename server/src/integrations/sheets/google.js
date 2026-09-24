import fs from 'node:fs'
import { config } from '../../config/env.js'

export const SHEET_HEADERS = [
  '_booking_id', '_version', 'Mã booking', 'Trạng thái', 'Ngày chụp', 'Bắt đầu', 'Kết thúc',
  'Tên khách', 'Email', 'Số điện thoại', 'Facebook', 'Số người', 'Địa điểm', 'Địa chỉ', 'Google Maps',
  'Gói chụp', 'Dịch vụ thêm', 'Tổng tiền', 'Cọc mô phỏng', 'Thực thu', 'Còn thiếu',
  'Photographer', 'Tiền công', 'Ghi chú', 'Cập nhật lúc',
]

const configured = () => config.sheetsMode === 'google' && Boolean(config.sheetsSpreadsheetId && config.sheetsCredentialsPath)

function credentialsReady() {
  return configured() && fs.existsSync(config.sheetsCredentialsPath)
}

let clientPromise
async function sheetsClient() {
  if (!credentialsReady()) throw new Error('Google Sheets chưa được cấu hình: kiểm tra SHEETS_MODE, SHEETS_SPREADSHEET_ID và GOOGLE_APPLICATION_CREDENTIALS')
  clientPromise ||= (async () => {
    const { google } = await import('googleapis')
    google.options({ timeout: 10000, retry: false })
    const auth = new google.auth.GoogleAuth({ keyFile: config.sheetsCredentialsPath, scopes: ['https://www.googleapis.com/auth/spreadsheets'] })
    return google.sheets({ version: 'v4', auth: await auth.getClient() })
  })()
  return clientPromise
}

async function ensureSheet(sheets) {
  const metadata = await sheets.spreadsheets.get({ spreadsheetId: config.sheetsSpreadsheetId, fields: 'sheets.properties' })
  const exists = metadata.data.sheets?.some((sheet) => sheet.properties?.title === config.sheetsTab)
  if (!exists) {
    await sheets.spreadsheets.batchUpdate({ spreadsheetId: config.sheetsSpreadsheetId, requestBody: { requests: [{ addSheet: { properties: { title: config.sheetsTab } } }] } })
  }
  const headerRange = `${config.sheetsTab}!A1:Y1`
  const header = await sheets.spreadsheets.values.get({ spreadsheetId: config.sheetsSpreadsheetId, range: headerRange })
  const values = header.data.values?.[0] || []
  if (!values.length) {
    await sheets.spreadsheets.values.update({ spreadsheetId: config.sheetsSpreadsheetId, range: headerRange, valueInputOption: 'RAW', requestBody: { values: [SHEET_HEADERS] } })
  } else if (SHEET_HEADERS.some((value, index) => values[index] !== value)) {
    throw new Error(`Tab ${config.sheetsTab} có tiêu đề không tương thích; đã dừng để không ghi đè dữ liệu`)
  }
}

async function rows(sheets) {
  const response = await sheets.spreadsheets.values.get({ spreadsheetId: config.sheetsSpreadsheetId, range: `${config.sheetsTab}!A2:Y` })
  return response.data.values || []
}

export const googleSheetsAdapter = {
  name: 'GOOGLE_SHEETS',
  get configured() { return credentialsReady() },
  async status() {
    if (!configured()) return { status: 'DISABLED', note: 'Đang dùng chế độ mock hoặc chưa đủ biến môi trường' }
    if (!credentialsReady()) return { status: 'ERROR', note: 'Không tìm thấy file credentials Google' }
    try { const sheets = await sheetsClient(); await ensureSheet(sheets); return { status: 'READY', note: `Đã kết nối tab ${config.sheetsTab}` } } catch (error) { return { status: 'ERROR', note: error.message } }
  },
  async upsert(row) {
    const sheets = await sheetsClient()
    await ensureSheet(sheets)
    const current = await rows(sheets)
    const index = current.findIndex((value) => value[0] === String(row.bookingId))
    const values = [SHEET_HEADERS.map((header) => header === '_booking_id' ? row.bookingId : header === '_version' ? row.version : row[header] ?? '')]
    const range = index >= 0 ? `${config.sheetsTab}!A${index + 2}:Y${index + 2}` : `${config.sheetsTab}!A${current.length + 2}:Y${current.length + 2}`
    await sheets.spreadsheets.values.update({ spreadsheetId: config.sheetsSpreadsheetId, range, valueInputOption: 'RAW', requestBody: { values } })
    return { accepted: true, provider: this.name, row: values[0], rowNumber: index >= 0 ? index + 2 : current.length + 2 }
  },
}

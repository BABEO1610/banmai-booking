import { config } from '../config/env.js'
import { fakeSheetsAdapter } from '../integrations/sheets/fake.js'
import { googleSheetsAdapter } from '../integrations/sheets/google.js'
import { fakeSmsAdapter } from '../integrations/sms/fake.js'

export async function deliverOutbox(events, { rowForBooking } = {}) {
  const results = []
  for (const event of events.filter((item) => ['PENDING', 'RETRY'].includes(item.status) && (!item.availableAt || new Date(item.availableAt) <= new Date()))) {
    try {
      const payload = event.channel === 'sheets' && rowForBooking ? await rowForBooking(event.bookingId) : event.payload
      const mockAllowed = config.nodeEnv !== 'production'
      if (event.channel === 'sheets' && !googleSheetsAdapter.configured && !(mockAllowed && config.sheetsMode === 'mock')) throw new Error('Google Sheets chưa sẵn sàng; tác vụ chưa được gửi')
      if (event.channel !== 'sheets' && !(mockAllowed && config.smsMode === 'mock')) throw new Error('Kênh gửi chưa được cấu hình')
      const adapter = event.channel === 'sheets' ? (googleSheetsAdapter.configured ? googleSheetsAdapter : fakeSheetsAdapter) : fakeSmsAdapter
      const result = event.channel === 'sheets' ? await adapter.upsert(payload) : await adapter.send(payload)
      event.status = 'DELIVERED'
      event.attempts = (event.attempts || 0) + 1
      event.lastError = null
      event.deliveredAt = new Date().toISOString()
      results.push({ eventId: event.id, result })
    } catch (error) {
      event.status = 'RETRY'
      event.attempts = (event.attempts || 0) + 1
      event.lastError = error.message
      event.availableAt = new Date(Date.now() + Math.min(300000, 1000 * (2 ** Math.min(event.attempts, 8)))).toISOString()
      results.push({ eventId: event.id, error: error.message })
    }
  }
  return results
}

// Giá trọn gói theo nhóm, xác nhận ngày 19/09/2026 (VND).
export const packagePriceVersion = '2026-09-19-group-pricing-options-v3'
const prices = [[1500000, 2200000], [2000000, 2900000], [2500000, 3500000], [2900000, 4000000]]

export const bookingPackages = prices.flatMap(([halfPrice, fullPrice], index) => {
  const peopleCount = index + 1
  const group = peopleCount === 1 ? 'Cá nhân' : `Nhóm ${peopleCount} người`
  return ['half', 'full'].map((period, periodIndex) => ({
    id: peopleCount === 1 ? period : `${period}-${peopleCount}`,
    name: `${group} · ${period === 'half' ? 'Nửa ngày' : 'Cả ngày'}`,
    peopleCount, period, priceVnd: periodIndex === 0 ? halfPrice : fullPrice,
    durationMinutes: period === 'half' ? 300 : 480,
    timeLabel: period === 'half' ? '07:00 – 12:00' : '07:00 – 17:00 · nghỉ trưa 12:00 – 14:00',
    bookable: true,
    bookableReason: null,
    visible: true, published: true, featured: peopleCount === 1,
    description: period === 'half' ? 'Một buổi chụp đủ chậm để giữ lại những điều tự nhiên nhất.' : 'Một ngày trọn vẹn cho câu chuyện nhiều lớp và nhiều khung hình.',
    image: peopleCount === 1 ? '/images/portrait-soft.jpg' : peopleCount === 2 ? '/images/together-close.jpg' : peopleCount === 3 ? '/images/color-fashion.jpg' : '/images/together-ceremony.jpg',
    benefits: [`Giá trọn gói cho ${peopleCount} người`, period === 'half' ? 'Chụp trong 5 giờ' : 'Hai khung giờ trong ngày', 'Tư vấn concept trước buổi chụp'],
    optionGroups: [{ id: 'retouch', name: 'Lựa chọn thêm', type: 'multi', required: false, minSelections: 0, maxSelections: 2, choices: [{ id: 'extra-retouch', name: 'Chỉnh thêm 5 ảnh', priceVnd: 150000, pricingMode: 'fixed', active: true }, { id: 'raw-files', name: 'Nhận bộ ảnh gốc', priceVnd: 300000, pricingMode: 'fixed', active: true }] }],
    version: 1,
  }))
})

// Full-day shoots include a two-hour lunch break in the reserved interval.
export const occupiedMinutes = (pkg) => pkg.durationMinutes + (pkg.period === 'full' ? 120 : 0)

export function enableFullDayBooking(state) {
  if (state.fullDayScheduleVersion === 1) return false
  for (const pkg of state.packages || []) {
    if (pkg.period !== 'full') continue
    const legacyReason = ['Gói cả ngày hiện cần studio xác nhận lịch thủ công', 'Đang chờ Studio chốt cách giữ ca trong giờ nghỉ trưa'].includes(pkg.bookableReason)
    if (legacyReason && !pkg.archived) {
      pkg.bookable = true
      pkg.bookableReason = null
    }
    pkg.version = (pkg.version || 0) + 1
  }
  state.fullDayScheduleVersion = 1
  return true
}

export function applyPackagePrices(state) {
  if (state.packagePriceVersion === packagePriceVersion) return false
  const previous = state.packages || []
  state.packages = bookingPackages.map((pkg) => {
    const old = previous.find((entry) => entry.id === pkg.id)
    return old ? { ...pkg, ...old, description: old.description || pkg.description, image: old.image || pkg.image, timeLabel: old.timeLabel === '07:00 – 12:00 / 14:00 – 17:00' ? pkg.timeLabel : old.timeLabel, bookableReason: old.bookableReason === 'Đang chờ Studio chốt cách giữ ca trong giờ nghỉ trưa' ? pkg.bookableReason : old.bookableReason, benefits: Array.from(new Set([...(old.benefits || []), ...pkg.benefits])), optionGroups: old.optionGroups?.length ? old.optionGroups : pkg.optionGroups, version: (old.version || 0) + 1 } : { ...pkg }
  }).concat(previous.filter((entry) => !bookingPackages.some((pkg) => pkg.id === entry.id)))
  state.packagePriceVersion = packagePriceVersion
  // Historical booking snapshots and payments are deliberately untouched.
  return true
}

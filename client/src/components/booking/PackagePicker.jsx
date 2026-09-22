import './PackagePicker.css'

const groupKey = (pkg) => pkg.peopleCount ? `people-${pkg.peopleCount}` : pkg.id
const money = (value) => Number(value || 0).toLocaleString('vi-VN') + 'đ'

export default function PackagePicker({ packages, value, onChange }) {
  const selected = packages.find(pkg => pkg.id === value)
  const groups = [...new Map(packages.map(pkg => [groupKey(pkg), {
    key: groupKey(pkg), label: pkg.peopleCount === 1 ? 'Cá nhân' : pkg.peopleCount ? `${pkg.peopleCount} người` : pkg.name,
  }])).values()]
  const activeGroup = selected ? groupKey(selected) : groups[0]?.key
  const variants = packages.filter(pkg => groupKey(pkg) === activeGroup)
  const chooseGroup = (key) => {
    const choices = packages.filter(pkg => groupKey(pkg) === key)
    const next = choices.find(pkg => pkg.bookable && pkg.period === selected?.period) || choices.find(pkg => pkg.bookable) || choices[0]
    if (next) onChange(next.id)
  }

  return <fieldset className="compact-packages">
    <legend>Gói chụp</legend>
    <div className="package-picker-heading"><span>Bạn chụp cùng ai?</span><small>Giá trọn gói cho cả nhóm</small></div>
    <div className="package-people" role="group" aria-label="Số người chụp">
      {groups.map(group => <button type="button" key={group.key} aria-pressed={group.key === activeGroup} onClick={() => chooseGroup(group.key)}>{group.label}</button>)}
    </div>
    <div className="package-durations">
      {variants.map(pkg => <label key={pkg.id} className={`package-duration ${value === pkg.id ? 'is-selected' : ''} ${!pkg.bookable ? 'is-disabled' : ''}`}>
        <div className="package-duration-title"><span>{pkg.period === 'half' ? 'Nửa ngày' : pkg.period === 'full' ? 'Cả ngày' : pkg.name}</span><input type="radio" name="package" value={pkg.id} checked={value === pkg.id} disabled={!pkg.bookable} onChange={() => onChange(pkg.id)} aria-label={pkg.name} /></div>
        <strong>{money(pkg.price?.amount)}</strong>
        <small>{pkg.timeLabel}</small>
        {!pkg.bookable && <small className="package-unavailable">{pkg.bookableReason || 'Hiện chưa nhận lịch'}</small>}
      </label>)}
    </div>
    {selected && <details className="package-inclusions" key={selected.id}><summary>Xem chi tiết gói chụp</summary><p>{selected.description}</p>{selected.benefits?.length > 0 && <ul>{selected.benefits.map(benefit => <li key={benefit}>{benefit}</li>)}</ul>}</details>}
    {!packages.length && <p>Chưa có gói chụp. Vui lòng thử lại sau.</p>}
  </fieldset>
}

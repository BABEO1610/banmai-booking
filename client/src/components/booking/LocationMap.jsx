import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

export default function LocationMap({ location, onSelect }) {
  const element = useRef(null), map = useRef(null), marker = useRef(null), callback = useRef(onSelect)
  const [tileError, setTileError] = useState(false)
  callback.current = onSelect
  useEffect(() => {
    const instance = L.map(element.current, { scrollWheelZoom: false }).setView([16.1, 106.2], 5)
    map.current = instance
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, referrerPolicy: 'strict-origin-when-cross-origin', attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' }).on('tileerror', () => setTileError(true)).addTo(instance)
    instance.on('click', (event) => callback.current(event.latlng.lat, event.latlng.lng))
    const observer = new ResizeObserver(() => instance.invalidateSize())
    observer.observe(element.current)
    return () => { observer.disconnect(); instance.remove(); map.current = null; marker.current = null }
  }, [])
  useEffect(() => {
    const instance = map.current
    if (!instance) return
    if (!Number.isFinite(location.lat) || !Number.isFinite(location.lng)) { marker.current?.remove(); marker.current = null; return }
    const point = [location.lat, location.lng]
    if (!marker.current) {
      marker.current = L.marker(point, { draggable: true, title: 'Điểm hẹn đã chọn', icon: L.divIcon({ className: 'booking-map-pin', html: '<span></span>', iconSize: [28, 28], iconAnchor: [14, 28] }) }).addTo(instance)
      marker.current.on('dragend', () => { const p = marker.current.getLatLng(); callback.current(p.lat, p.lng) })
    } else marker.current.setLatLng(point)
    instance.setView(point, 16)
  }, [location.lat, location.lng])
  return <>
    <div ref={element} className="booking-location-map" aria-label="Bản đồ chọn điểm hẹn" />
    <button className="secondary-button" type="button" onClick={() => { const p = map.current.getCenter(); callback.current(p.lat, p.lng) }}>Chọn tâm bản đồ làm điểm hẹn</button>
    {tileError && <p role="status">Một phần bản đồ chưa tải được. Bạn vẫn có thể nhập địa chỉ bên dưới.</p>}
  </>
}

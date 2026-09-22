import { Link } from 'react-router-dom'
import PublicLayout from '../../components/public/PublicLayout.jsx'
export default function PolicyPage() { return <PublicLayout><main className="simple-page"><p className="eyebrow"><span /> Chính sách hiện hành</p><h1>Rõ ràng trước<br />khi bắt đầu.</h1><div className="notice-box"><strong>Chính sách đang chờ công bố</strong><p>Các mốc hủy, hoàn cọc và dời lịch sẽ hiển thị sau khi Studio xác nhận. Demo không tự suy ra tỷ lệ hoàn tiền.</p></div><Link className="under-link" to="/book">Tiếp tục chọn buổi chụp ↗</Link></main></PublicLayout> }

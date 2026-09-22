import PublicLayout from './public/PublicLayout.jsx'

export function LoadingState({ children = 'Đang tải dữ liệu…' }) {
  return <p className="loading-state" role="status">{children}</p>
}

export function SessionLoading() {
  return <PublicLayout><main className="simple-page"><LoadingState>Đang kiểm tra phiên đăng nhập…</LoadingState></main></PublicLayout>
}

import { useId, useState } from 'react'

export default function PasswordField({ label, id, className = '', ...inputProps }) {
  const generatedId = useId()
  const inputId = id || `password-field-${generatedId.replaceAll(':', '')}`
  const [visible, setVisible] = useState(false)

  return <div className={`password-field ${className}`.trim()}>
    <label htmlFor={inputId}>{label}</label>
    <div className="password-control">
      <input {...inputProps} id={inputId} type={visible ? 'text' : 'password'} />
      <button
        className="password-toggle"
        type="button"
        aria-label={visible ? `Ẩn ${label.toLowerCase()}` : `Hiện ${label.toLowerCase()}`}
        aria-pressed={visible}
        aria-controls={inputId}
        onClick={() => setVisible((current) => !current)}
      >
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          {visible ? <><path d="m3 3 18 18" /><path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" /><path d="M9.9 4.2A10.8 10.8 0 0 1 12 4c5.2 0 8.7 4.7 9.7 6.3a3 3 0 0 1 0 .4 17.7 17.7 0 0 1-3.1 3.8M6.2 6.2C3.9 7.7 2.5 10 2.3 10.3a3 3 0 0 0 0 .4C3.3 12.3 6.8 17 12 17c1 0 2-.2 2.8-.5" /></> : <><path d="M2.3 10.3C3.3 8.7 6.8 4 12 4s8.7 4.7 9.7 6.3a3 3 0 0 1 0 .4C20.7 12.3 17.2 17 12 17s-8.7-4.7-9.7-6.3a3 3 0 0 1 0-.4Z" /><circle cx="12" cy="10.5" r="2.4" /></>}
        </svg>
        <span>{visible ? 'Ẩn' : 'Hiện'}</span>
      </button>
    </div>
  </div>
}

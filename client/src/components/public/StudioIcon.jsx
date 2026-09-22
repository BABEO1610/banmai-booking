export default function StudioIcon({ name = 'arrow', className = '', ...props }) {
  const paths = {
    message: <><path d="M4 4h16v12H9l-5 4Z" /><path d="M8 8h8M8 12h5" /></>,
    external: <><path d="M14 4h6v6M20 4 10 14M10 4H4v16h16v-6" /></>,
    arrow: <><path d="M5 12h14M13 6l6 6-6 6" /></>,
    menu: <><path d="M4 7h16M4 12h16M4 17h16" /></>,
    close: <><path d="m6 6 12 12M18 6 6 18" /></>,
    pause: <><path d="M8 5v14M16 5v14" /></>,
    play: <><path d="m8 5 11 7-11 7Z" /></>,
    camera: <><path d="M4 7h4l2-3h4l2 3h4v13H4Z" /><circle cx="12" cy="13" r="4" /></>,
    aperture: <><circle cx="12" cy="12" r="9" /><path d="m12 3 5 9-5 9M4.2 7.5h10.4l5.2 9M4.2 16.5l5.2-9h10.4" /></>,
  }
  return <svg className={`studio-icon ${className}`} viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>{paths[name] || paths.arrow}</svg>
}

const localPhotos = new Set(['daylight', 'portrait', 'portrait-soft', 'portrait-close', 'color-fashion', 'color-street', 'together', 'together-close', 'together-ceremony'])

export default function StudioImage({ src, sizes = '(max-width: 600px) 90vw, 400px', ...props }) {
  const match = /^\/images\/([\w-]+)\.jpg$/.exec(src || '')
  if (!match || !localPhotos.has(match[1])) return <img src={src} {...props} />
  const base = `/images/${match[1]}`
  return <picture><source type="image/webp" srcSet={`${base}-400.webp 400w, ${base}-800.webp 800w`} sizes={sizes} /><img src={src} {...props} /></picture>
}

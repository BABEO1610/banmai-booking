import { useEffect, useRef, useState } from 'react'
import StudioIcon from './StudioIcon.jsx'

// GPU code loads only on landing. No model/texture CDN, tracker or webcam access.
export default function CameraInstallation({ paused, reduced, shot }) {
  const host = useRef(null)
  const controller = useRef(null)
  const latest = useRef({ paused, reduced, shot })
  latest.current = { paused, reduced, shot }
  const [mode, setMode] = useState('loading')
  useEffect(() => {
    let disposed = false, contextLost = false
    const container = host.current
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('webgl2', { alpha: true, antialias: true })
    if (!context) { setMode('fallback'); return }
    let teardown = () => {}
    Promise.all([
      import('three'), import('three/addons/geometries/RoundedBoxGeometry.js'),
      import('three/addons/environments/RoomEnvironment.js'), import('./ProfessionalCamera.js'),
      import('three/addons/utils/BufferGeometryUtils.js'),
    ]).then(([T, { RoundedBoxGeometry }, { RoomEnvironment }, { buildProfessionalCamera }, { mergeGeometries, mergeVertices }]) => {
      if (disposed) { context.getExtension('WEBGL_lose_context')?.loseContext(); return }
      const renderer = new T.WebGLRenderer({ canvas, context, alpha: true, antialias: true })
      let model, environment, observer, shotTimer
      const listeners = []
      // Install cleanup before any GPU allocation that could throw.
      teardown = () => {
        controller.current = null; clearTimeout(shotTimer)
        observer?.disconnect(); renderer.setAnimationLoop(null)
        listeners.forEach(([event, handler]) => canvas.removeEventListener(event, handler))
        model?.dispose(); environment?.dispose()
        renderer.dispose(); renderer.forceContextLoss(); canvas.remove()
      }
      const baseRatio = Math.min(window.devicePixelRatio, 1.25)
      let movingRatio = baseRatio, slowFrames = 0, lightweight = false
      const resolution = (ratio) => { renderer.setPixelRatio(ratio); canvas.dataset.pixelRatio = String(ratio) }
      resolution(baseRatio)
      renderer.setClearColor(0xffffff, 0)
      renderer.outputColorSpace = T.SRGBColorSpace
      renderer.toneMapping = T.ACESFilmicToneMapping
      renderer.toneMappingExposure = 1.1
      canvas.setAttribute('aria-hidden', 'true')
      const scene = new T.Scene()
      const room = new RoomEnvironment(), pmrem = new T.PMREMGenerator(renderer)
      try { environment = pmrem.fromScene(room, .04, .1, 100, { size: 128 }) }
      finally { room.dispose(); pmrem.dispose() }
      const view = new T.PerspectiveCamera(34, 1, .1, 40)
      view.position.set(0, .3, 11.5); view.lookAt(0, .12, 0)
      scene.add(new T.HemisphereLight(0xffffff, 0x3c3542, 1.1))
      const light = (color, intensity, x, y, z) => {
        const item = new T.DirectionalLight(color, intensity)
        item.position.set(x, y, z); scene.add(item)
      }
      light(0xffffff, 3.4, -4, 5, 6)
      light(0xf9cce0, 1.8, 4, 1, -3)
      light(0x8faaff, .8, -3, -1, 2)
      model = buildProfessionalCamera(T, RoundedBoxGeometry, mergeGeometries, mergeVertices, environment.texture)
      const camera = model.camera
      const installation = new T.Group(); installation.add(camera); scene.add(installation)
      camera.position.z = -.75
      let time = 0, previous = 0, frame = 0, angle = 0
      const pointer = { x: 0, y: 0 }
      const pose = () => {
        installation.rotation.set(.12 + Math.sin(time * .55) * .045 + pointer.y * .1, .43 + Math.sin(time * .4) * .22 + pointer.x * .17 + [0, -1.3, 2.7][angle], -.065 + Math.sin(time * .5) * .025)
        installation.position.y = .18 + Math.sin(time * .82) * .065
      }
      const draw = () => {
        if (disposed || contextLost) return
        renderer.render(scene, view); canvas.dataset.frame = String(++frame)
        canvas.dataset.drawCalls = String(renderer.info.render.calls)
      }
      const animate = (now) => {
        if (previous && now - previous < 1000 / 30 - 1) return
        if (previous) {
          const elapsed = now - previous
          time += Math.min(elapsed / 1000, .05) * 1.28
          // Respond to measured load, not browser/GPU fingerprinting. Keep
          // geometric detail; lower only moving pixels when rendering is slow.
          slowFrames = elapsed > 52 ? slowFrames + 1 : Math.max(0, slowFrames - 1)
          if (slowFrames >= 8 && movingRatio > .7) {
            movingRatio = Math.max(.7, movingRatio - .2); resolution(movingRatio); slowFrames = 0
          } else if (slowFrames >= 8 && !lightweight) {
            lightweight = true; model.setLightweight(true); canvas.dataset.lightweight = 'true'; slowFrames = 0
          }
        }
        previous = now; pose(); draw()
      }
      const sync = () => {
        previous = 0
        slowFrames = 0
        const running = !latest.current.paused && !latest.current.reduced && !contextLost
        resolution(running ? movingRatio : baseRatio)
        model.setLightweight(running && lightweight); canvas.dataset.lightweight = String(running && lightweight)
        renderer.setAnimationLoop(running ? animate : null)
        if (latest.current.reduced) { time = 0; pointer.x = 0; pointer.y = 0 }
        pose(); draw(); canvas.dataset.running = String(running)
      }
      const resize = () => {
        if (disposed) return
        const { width, height } = container.getBoundingClientRect()
        if (!width || !height) return
        renderer.setSize(width, height, false)
        view.aspect = width / height
        // Keep the full grip/lens in frame on narrow mobile canvases.
        view.position.z = Math.max(8.8, 6 / view.aspect)
        view.updateProjectionMatrix(); draw()
      }
      const move = (event) => {
        if (latest.current.reduced || event.pointerType !== 'mouse') return
        const rect = canvas.getBoundingClientRect()
        pointer.x = ((event.clientX - rect.left) / rect.width - .5) * 2
        pointer.y = ((event.clientY - rect.top) / rect.height - .5) * 2
        pose(); draw()
      }
      const leave = () => { pointer.x = 0; pointer.y = 0; pose(); draw() }
      const lost = (event) => { event.preventDefault(); contextLost = true; renderer.setAnimationLoop(null); canvas.dataset.running = 'false'; setMode('fallback') }
      listeners.push(['pointermove', move], ['pointerleave', leave], ['webglcontextlost', lost])
      listeners.forEach(([event, handler]) => canvas.addEventListener(event, handler))
      observer = new ResizeObserver(resize); container.append(canvas); observer.observe(container)
      controller.current = {
        sync, rotate: () => { angle = (angle + 1) % 3; pose(); draw() },
        shoot: () => { clearTimeout(shotTimer); model.shoot(true); draw(); shotTimer = setTimeout(() => { if (!disposed) { model.shoot(false); draw() } }, 180) },
      }
      resize(); sync(); setMode('3d')
    }).catch(() => { teardown(); context.getExtension('WEBGL_lose_context')?.loseContext(); if (!disposed) setMode('fallback') })
    return () => { disposed = true; teardown(); context.getExtension('WEBGL_lose_context')?.loseContext() }
  }, [])
  useEffect(() => { controller.current?.sync() }, [paused, reduced])
  useEffect(() => { if (shot) controller.current?.shoot() }, [shot])
  return <div className={`camera-installation camera-${mode}`} data-mode={mode}>
    <div ref={host} className="camera-canvas" role="img" aria-label="Mô hình máy ảnh 3D mirrorless minh họa với báng cầm có vân, ống kính nhiều lớp, kính quang học và nút điều khiển trong ánh sáng Studio" />
    {mode !== '3d' && <div className="installation-fallback" aria-hidden="true"><StudioIcon name="camera" /></div>}
    {mode === '3d' && <button className="camera-angle-button" onClick={() => controller.current?.rotate()}><StudioIcon name="aperture" />Đổi góc nhìn</button>}
    <span className="installation-label">{mode === '3d' ? 'Nghiên cứu ánh sáng · Máy ảnh mirrorless 3D' : mode === 'fallback' ? 'Minh họa Studio · Thiết bị không hỗ trợ 3D' : 'Đang mở không gian 3D…'}</span>
    {shot > 0 && <span key={shot} className="camera-shutter-glow" aria-hidden="true" />}
  </div>
}

/**
 * PixelPet – pixel-art photographer mascot for Ban Mai studio
 * Drawn entirely with SVG + CSS; no external image required.
 * States: idle (bob + blink), walk (feet alternate), dragging (lean), shooting (flash).
 */
import { useEffect, useState } from 'react'
import './pixel-pet.css'

/* ── pixel palette (matches Ban Mai pink/plum brand) ─────────────── */
const C = {
  skin:   '#f5c5a0',
  skinS:  '#e09e76',
  hair:   '#2b1a20',
  shirt:  '#9b315c',  // brand magenta-rose
  shirtS: '#7a2448',
  pants:  '#35272e',
  pantsS: '#261d22',
  shoe:   '#1a1215',
  cam:    '#222222',
  camS:   '#111111',
  camL:   '#4a90d9',
  camH:   '#6ab4ff',
  white:  '#ffffff',
  blush:  '#f4a0b8',
}

/* 1 logical pixel = p SVG units so we get a chunky pixel-art look */
const p = 3

/* tiny helper – renders a pixel block */
const Px = ({ x, y, w = 1, h = 1, fill, rx = 0 }) => (
  <rect x={x * p} y={y * p} width={w * p} height={h * p} fill={fill} rx={rx} />
)

export default function PixelPet({ dragging = false, shooting = false, walking = false }) {
  const [blink, setBlink]         = useState(false)
  const [footFrame, setFootFrame] = useState(0)
  const [flash, setFlash]         = useState(false)

  /* ── blink scheduler ──────────────────────────────────────── */
  useEffect(() => {
    let timer
    const schedule = () => {
      timer = setTimeout(() => {
        setBlink(true)
        timer = setTimeout(() => { setBlink(false); schedule() }, 110)
      }, 3000 + Math.random() * 2500)
    }
    schedule()
    return () => clearTimeout(timer)
  }, [])

  /* ── walk-cycle ───────────────────────────────────────────── */
  useEffect(() => {
    if (!walking) { setFootFrame(0); return }
    const id = setInterval(() => setFootFrame(f => (f + 1) % 4), 160)
    return () => clearInterval(id)
  }, [walking])

  /* ── camera flash ─────────────────────────────────────────── */
  useEffect(() => {
    if (!shooting) return
    setFlash(true)
    const id = setTimeout(() => setFlash(false), 200)
    return () => clearTimeout(id)
  }, [shooting])

  /* foot y-offsets for walk cycle: 0 → -1 → 0 → 1 (per foot, alternating) */
  const fA = walking ? [0, -1, 0, 1][footFrame] : 0
  const fB = walking ? [0, 1, 0, -1][footFrame] : 0

  const cls = [
    'pixel-pet-svg',
    dragging  ? 'is-dragging'  : '',
    shooting  ? 'is-shooting'  : '',
  ].filter(Boolean).join(' ')

  /* viewBox in SVG units (42 × 62 logical pixels) */
  const VW = 42, VH = 64

  return (
    <svg
      className={cls}
      viewBox={`0 0 ${VW * p} ${VH * p}`}
      width={VW * p / 1.5}
      height={VH * p / 1.5}
      shapeRendering="crispEdges"
      aria-hidden="true"
      focusable="false"
    >
      {/* ── SHADOW ──────────────────────────────────────────── */}
      <ellipse
        cx={21 * p} cy={63 * p}
        rx={10 * p} ry={1.5 * p}
        fill="rgba(0,0,0,.18)"
      />

      {/* ── SHOES ─────────────────────────────────────────── */}
      {/* left */}
      <Px x={12} y={53 + fA} w={8}  h={2} fill={C.shoe} />
      <Px x={11} y={55 + fA} w={9}  h={2} fill={C.shoe} />
      {/* right */}
      <Px x={22} y={53 + fB} w={8}  h={2} fill={C.shoe} />
      <Px x={22} y={55 + fB} w={9}  h={2} fill={C.shoe} />

      {/* ── LEGS (pants) ──────────────────────────────────── */}
      {/* left leg */}
      <Px x={13} y={42 + fA} w={7} h={12} fill={C.pants} />
      <Px x={13} y={42 + fA} w={1} h={12} fill={C.pantsS} />
      {/* right leg */}
      <Px x={22} y={42 + fB} w={7} h={12} fill={C.pants} />
      <Px x={28} y={42 + fB} w={1} h={12} fill={C.pantsS} />
      {/* waistband */}
      <Px x={12} y={40} w={18} h={4} fill={C.pantsS} />

      {/* ── SHIRT / BODY ──────────────────────────────────── */}
      <Px x={11} y={26} w={20} h={16} fill={C.shirt} />
      <Px x={11} y={26} w={2}  h={16} fill={C.shirtS} />   {/* left shadow */}
      <Px x={29} y={26} w={2}  h={16} fill={C.shirtS} />   {/* right shadow */}
      {/* collar */}
      <Px x={19} y={26} w={4}  h={4}  fill={C.skin} />
      <Px x={20} y={28} w={2}  h={3}  fill={C.skin} />
      {/* small logo patch */}
      <Px x={14} y={30} w={3}  h={3}  fill={C.white} />
      <Px x={15} y={31} w={1}  h={1}  fill={C.shirt} />

      {/* ── LEFT ARM (camera side) ────────────────────────── */}
      <Px x={5}  y={27} w={6}  h={4}  fill={C.shirt} />
      <Px x={3}  y={29} w={6}  h={3}  fill={C.skin}  />
      <Px x={3}  y={31} w={5}  h={2}  fill={C.skinS} />

      {/* ── RIGHT ARM ────────────────────────────────────── */}
      <Px x={31} y={27} w={6}  h={4}  fill={C.shirt} />
      <Px x={33} y={29} w={6}  h={3}  fill={C.skin}  />
      <Px x={33} y={31} w={5}  h={2}  fill={C.skinS} />

      {/* ── CAMERA ───────────────────────────────────────── */}
      {/* body */}
      <Px x={2}  y={22} w={14} h={10} fill={C.cam}  />
      <Px x={2}  y={22} w={1}  h={10} fill={C.camS} />
      {/* grip bump */}
      <Px x={14} y={21} w={2}  h={2}  fill={C.cam}  />
      {/* viewfinder hump */}
      <Px x={10} y={20} w={5}  h={3}  fill={C.cam}  />
      {/* shutter button */}
      <Px x={12} y={19} w={2}  h={2}  fill={C.shirt} />
      {/* lens ring */}
      <ellipse cx={7 * p} cy={27 * p} rx={3.8 * p} ry={3.8 * p} fill={C.camS} />
      <ellipse cx={7 * p} cy={27 * p} rx={2.8 * p} ry={2.8 * p} fill={C.camL} />
      <ellipse cx={7 * p} cy={27 * p} rx={1.2 * p} ry={1.2 * p} fill={C.camH} />
      {/* flash burst */}
      {flash && <Px x={2} y={19} w={6} h={2} fill="#ffe875" />}
      {/* strap */}
      <Px x={1}  y={21} w={1}  h={13} fill={C.shirt} />

      {/* ── HEAD ─────────────────────────────────────────── */}
      {/* hair base (wider than face) */}
      <Px x={13} y={6}  w={16} h={13} fill={C.hair} />
      {/* face */}
      <Px x={14} y={8}  w={14} h={14} fill={C.skin} />
      {/* forehead top edge */}
      <Px x={14} y={8}  w={14} h={2}  fill={C.skinS} />
      {/* hair top */}
      <Px x={14} y={6}  w={14} h={4}  fill={C.hair} />
      {/* side hair */}
      <Px x={13} y={8}  w={2}  h={7}  fill={C.hair} />
      <Px x={27} y={8}  w={2}  h={6}  fill={C.hair} />
      {/* blush spots */}
      <Px x={15} y={18} w={2}  h={1}  fill={C.blush} />
      <Px x={25} y={18} w={2}  h={1}  fill={C.blush} />

      {/* ── EYES ─────────────────────────────────────────── */}
      {blink ? (
        <>
          <Px x={17} y={13} w={4} h={1} fill={C.hair} />
          <Px x={23} y={13} w={4} h={1} fill={C.hair} />
        </>
      ) : (
        <>
          {/* left eye */}
          <Px x={17} y={12} w={3} h={3} fill={C.white} />
          <Px x={18} y={13} w={2} h={2} fill={C.hair}  />
          <Px x={18} y={13} w={1} h={1} fill="#ffffffaa" />
          {/* right eye */}
          <Px x={23} y={12} w={3} h={3} fill={C.white} />
          <Px x={24} y={13} w={2} h={2} fill={C.hair}  />
          <Px x={24} y={13} w={1} h={1} fill="#ffffffaa" />
        </>
      )}

      {/* ── EYEBROWS ─────────────────────────────────────── */}
      <Px x={17} y={11} w={4} h={1} fill={C.hair} />
      <Px x={23} y={11} w={4} h={1} fill={C.hair} />

      {/* ── MOUTH ────────────────────────────────────────── */}
      <Px x={19} y={20} w={4} h={1} fill={C.skinS} />
      <Px x={20} y={21} w={2} h={1} fill={C.skinS} />

      {/* ── HEADPHONES ───────────────────────────────────── */}
      <Px x={13} y={8}  w={2}  h={8}  fill={C.pantsS} />
      <Px x={13} y={14} w={3}  h={3}  fill={C.pantsS} />
      <Px x={27} y={8}  w={2}  h={8}  fill={C.pantsS} />
      <Px x={27} y={14} w={3}  h={3}  fill={C.pantsS} />
      {/* headband arc – two pixel rows across top */}
      <Px x={14} y={6}  w={14} h={2}  fill={C.pantsS} />
    </svg>
  )
}

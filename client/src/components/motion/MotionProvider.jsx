import { MotionConfig } from 'motion/react'
import { defaultTransition } from '../../motion/presets.js'

export default function MotionProvider({ children }) {
  return (
    <MotionConfig reducedMotion="user" transition={defaultTransition}>
      {children}
    </MotionConfig>
  )
}

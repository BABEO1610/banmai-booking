// Durations are in seconds. Keep the design guide in sync when tuning them.
export const motionDurations = Object.freeze({
  fast: 0.16,
  panel: 0.24,
  standard: 0.3,
  image: 0.45,
  hero: 0.75,
})

export const studioEase = [0.22, 1, 0.36, 1]

export const defaultTransition = {
  type: 'tween',
  duration: motionDurations.standard,
  ease: studioEase,
}

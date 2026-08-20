import { useEffect, useState } from 'react'

/**
 * Step-through engine shared by the interactives. The universal pattern:
 * precompute ALL frames with a pure simulate() (cheap at teaching sizes),
 * then render as a pure function of frames[stepper.step]. Stepping, playing
 * and scrubbing are just index math — deterministic and testable.
 */
export function useStepper(total: number, intervalMs = 900) {
  const [step, setStep] = useState(0)
  const [playing, setPlaying] = useState(false)

  useEffect(() => {
    if (!playing) return
    const id = setInterval(
      () =>
        setStep((s) => {
          if (s + 1 >= total) {
            setPlaying(false)
            return s
          }
          return s + 1
        }),
      intervalMs,
    )
    return () => clearInterval(id)
  }, [playing, total, intervalMs])

  // If the frame set shrinks (input changed), clamp.
  useEffect(() => {
    setStep((s) => Math.min(s, Math.max(total - 1, 0)))
  }, [total])

  return {
    step,
    playing,
    atEnd: step >= total - 1,
    play: () => setPlaying(true),
    pause: () => setPlaying(false),
    next: () => setStep((s) => Math.min(s + 1, total - 1)),
    prev: () => setStep((s) => Math.max(s - 1, 0)),
    seek: (s: number) => setStep(Math.max(0, Math.min(s, total - 1))),
    reset: () => {
      setPlaying(false)
      setStep(0)
    },
  }
}

export type Stepper = ReturnType<typeof useStepper>

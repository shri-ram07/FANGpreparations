import type { Stepper } from './useStepper'

const btn =
  'rounded-md border border-line px-2.5 py-1 text-xs font-medium text-ink-soft hover:border-accent hover:text-accent disabled:opacity-40 disabled:hover:border-line disabled:hover:text-ink-soft'

export function StepControls({ stepper, total }: { stepper: Stepper; total: number }) {
  return (
    <div className="flex items-center gap-2">
      <button className={btn} onClick={stepper.prev} disabled={stepper.step === 0} aria-label="Previous step">
        ← Step
      </button>
      <button className={btn} onClick={stepper.playing ? stepper.pause : stepper.play} disabled={stepper.atEnd}>
        {stepper.playing ? 'Pause' : 'Play'}
      </button>
      <button className={btn} onClick={stepper.next} disabled={stepper.atEnd} aria-label="Next step">
        Step →
      </button>
      <input
        type="range"
        min={0}
        max={Math.max(total - 1, 0)}
        value={stepper.step}
        onChange={(e) => stepper.seek(Number(e.target.value))}
        className="min-w-0 flex-1 accent-accent"
        aria-label="Scrub steps"
      />
      <span className="w-14 text-right font-mono text-xs text-ink-soft">
        {stepper.step + 1}/{total}
      </span>
    </div>
  )
}

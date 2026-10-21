import { Icon } from "@/components/Icon"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

/** What the algorithm is doing right now. Sits above the plot, inside the visualization surface. */
export function StepBanner({ step, total, title, children }: { step: number; total: number; title: string; children: React.ReactNode }) {
  return (
    <div className="mb-4 rounded-control bg-tonal px-4 py-3" aria-live="polite">
      <p className="text-caption font-medium text-slate">
        Step {step + 1} of {total}
      </p>
      <p className="mt-0.5 text-[18px] leading-tight font-bold tracking-[-0.01em] text-ink">{title}</p>
      <p className="mt-1.5 min-h-[3.2em] text-body leading-snug text-charcoal">{children}</p>
    </div>
  )
}

/**
 * One walkthrough control: numbered steps with Back / Next / Reset / Show result.
 * The arrow keys move between steps.
 */
export function Walkthrough({ steps, step, onStep }: { steps: string[]; step: number; onStep: (i: number) => void }) {
  const last = steps.length - 1
  return (
    <div
      className="flex flex-col gap-3"
      onKeyDown={(e) => {
        if (e.key === "ArrowRight" || e.key === "ArrowDown") onStep(Math.min(last, step + 1))
        else if (e.key === "ArrowLeft" || e.key === "ArrowUp") onStep(Math.max(0, step - 1))
        else return
        e.preventDefault()
      }}
    >
      <ol className="flex items-center gap-1 sm:gap-1.5" aria-label="Walkthrough steps">
        {steps.map((t, i) => {
          const on = i === step
          return (
            <li key={t} className="flex min-w-0 flex-1 items-center gap-1 last:flex-none sm:gap-1.5">
              <button
                onClick={() => onStep(i)}
                aria-current={on ? "step" : undefined}
                aria-label={`Step ${i + 1}: ${t}`}
                title={`${i + 1}. ${t}`}
                className={cn(
                  "num grid size-7 shrink-0 cursor-pointer place-items-center rounded-full border text-micro font-bold sm:size-8 transition-[background-color,color,transform,border-color] duration-150 ease-out active:scale-95",
                  on ? "border-forest bg-lime text-forest" : i < step ? "border-forest bg-forest text-lime" : "border-pebble bg-surface text-slate hover:bg-linen"
                )}
              >
                {i + 1}
              </button>
              {i < last && <span className={cn("h-px flex-1 transition-colors duration-150", i < step ? "bg-forest" : "bg-line")} aria-hidden />}
            </li>
          )
        })}
      </ol>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => onStep(Math.max(0, step - 1))} disabled={step === 0}>
          <Icon name="arrow_back" className="text-[18px]" /> Back
        </Button>
        <Button variant="dark" size="sm" onClick={() => onStep(Math.min(last, step + 1))} disabled={step === last}>
          Next <Icon name="arrow_forward" className="text-[18px]" />
        </Button>
        <Button variant="ghost" size="sm" onClick={() => onStep(0)} disabled={step === 0}>
          <Icon name="restart_alt" className="text-[18px]" /> Reset
        </Button>
        <Button variant="ghost" size="sm" className="sm:ml-auto" onClick={() => onStep(last)} disabled={step === last}>
          Show result <Icon name="skip_next" className="text-[18px]" />
        </Button>
      </div>
    </div>
  )
}

/** Which frozen simulation tick a page is analysing, with a secondary action to refresh it. */
export function SnapshotChip({ tick, time, onRefresh }: { tick: number; time: number; onRefresh: () => void }) {
  return (
    <>
      <span className="inline-flex h-10 items-center gap-2 rounded-full border border-line bg-surface px-4 text-caption font-medium text-ink" title="The simulation keeps moving; this page analyses one frozen moment">
        <Icon name="photo_camera" className="text-[18px] text-slate" />
        Snapshot <span className="num font-mono">t {time.toFixed(1)} s · tick {tick}</span>
      </span>
      <Button variant="outline" size="sm" onClick={onRefresh} title="Analyse the simulation as it is now">
        <Icon name="refresh" className="text-[18px]" /> New snapshot
      </Button>
    </>
  )
}

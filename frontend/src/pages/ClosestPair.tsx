import { useMemo, useState } from "react"
import { AnimalGlyph } from "@/components/AnimalGlyph"
import { SnapshotChip, StepBanner, Walkthrough } from "@/components/AlgoParts"
import { Icon } from "@/components/Icon"
import { Notice } from "@/components/Notice"
import { PlaneView } from "@/components/PlaneView"
import { DashedMark, GAP, MetaList, Metric, Module, PAGE, PageHeader, Row, VizSurface } from "@/components/Surface"
import { Button } from "@/components/ui/button"
import { useApi, useSnapshot, type Animal, type ClosestPair } from "@/lib/api"
import { at, COLOR, fmtDist } from "@/lib/ui"
import { cn } from "@/lib/utils"

const FOREST = "#163300"
const BARK = "#7c5733"
const LIME = "#9fe870"
const STEPS = [
  "Original points",
  "Sort by x and y",
  "Divide at the median x",
  "Left and right subproblems",
  "Best distance δ",
  "Strip of width 2δ",
  "Compare inside the strip",
  "Closest pair",
]

/** Magnified view of the winning pair: at grid scale the two animals are only a few pixels apart. */
function Lens({ a, b, distance, top }: { a: Animal; b: Animal; distance: number; top: boolean }) {
  // Normalised to a 200 x 140 box so text and strokes keep sensible sizes at any real distance.
  const hw = Math.max(distance, 0.5) * 1.7
  const k = 100 / hw
  const cx = (a.x + b.x) / 2
  const cy = (a.y + b.y) / 2
  const pts = [a, b].map((p) => ({ id: p.id, x: (p.x - cx) * k, y: -(p.y - cy) * k }))
  const [p, q] = pts
  return (
    <div className={cn("absolute right-3 z-10 w-[148px] rounded-card border border-line bg-surface sm:w-[200px]", top ? "top-3" : "bottom-3")}>
      <svg viewBox="-100 -70 200 140" className="block w-full" role="img" aria-label="Zoomed view of the closest pair">
        <line x1={p.x} y1={p.y} x2={q.x} y2={q.y} stroke={COLOR.pair} strokeWidth="2" strokeDasharray="6 4" />
        {pts.map((pt) => (
          <g key={pt.id}>
            <circle cx={pt.x} cy={pt.y} r="7" fill={COLOR.pair} stroke={FOREST} strokeWidth="1.5" />
            <text x={pt.x} y={pt.y - 14} textAnchor="middle" fontSize="12" fontWeight="600" fill={FOREST}>
              {pt.id}
            </text>
          </g>
        ))}
        <text x="0" y="50" textAnchor="middle" fontSize="14" fontWeight="700" fill={COLOR.pair}>
          d = {distance.toFixed(2)}
        </text>
      </svg>
      <p className="border-t border-line px-2.5 py-1 text-[11px] text-slate">Zoomed view</p>
    </div>
  )
}

function Chip({ size, x, y, children, tone }: { size: number; x: number; y: number; children: React.ReactNode; tone: "forest" | "bark" | "red" }) {
  const below = y > size - 12
  return (
    <span
      style={{ ...at(size, x, y), background: tone === "red" ? COLOR.pair : undefined }}
      className={cn(
        below ? "translate-y-[90%]" : "-translate-y-[170%]",
        "pointer-events-none absolute z-10 -translate-x-1/2 rounded-full px-2.5 py-0.5 text-[11px] font-semibold whitespace-nowrap",
        tone === "forest" && "bg-forest text-lime",
        tone === "bark" && "bg-bark text-white",
        tone === "red" && "text-white"
      )}
    >
      {children}
    </span>
  )
}

function Swatch({ kind }: { kind: "pair" | "median" | "strip" | "ring" }) {
  if (kind === "median") return <span className="inline-block h-4 w-0 border-l-2" style={{ borderColor: FOREST }} />
  if (kind === "strip") return <span className="inline-block h-4 w-3 border-x border-dashed border-forest" style={{ background: `${LIME}66` }} />
  if (kind === "ring") return <span className="inline-block size-3 rounded-full border-2" style={{ borderColor: FOREST, background: `${FOREST}1f` }} />
  return <span className="inline-block size-3 rounded-full border-2" style={{ borderColor: COLOR.pair, background: `${COLOR.pair}26` }} />
}

function Content({ animals, size, cp, time, onRefresh }: { animals: Animal[]; size: number; cp: ClosestPair; time: number; onRefresh: () => void }) {
  const [step, setStep] = useState(0)
  const trace = cp.trace
  const byId = useMemo(() => new Map(animals.map((a) => [a.id, a])), [animals])
  const left = useMemo(() => new Set(trace?.left_ids ?? []), [trace])
  const strip = useMemo(() => new Set(trace?.strip.ids ?? []), [trace])
  const n = cp.stats.n
  const mid = cp.stats.top_split_x ?? size / 2
  const delta = trace?.delta ?? cp.distance
  const pairIds = new Set([cp.a.id, cp.b.id])
  const bruteForce = (n * (n - 1)) / 2
  const straddles = (cp.a.x < mid) !== (cp.b.x < mid)
  const checks = trace?.strip.checks ?? []
  const compared = checks.filter((c) => c.compared).length
  const stopped = checks.length - compared
  const medianId = trace?.x_order[Math.floor(n / 2)]

  /** Opacity and state ring for one animal at the current step. */
  const glyphState = (a: Animal): { opacity: number; ring?: { color: string; width?: number; r?: number } } => {
    if ((step === 5 || step === 6) && trace) return strip.has(a.id) ? { opacity: 1, ring: { color: FOREST, r: 2.7 } } : { opacity: 0.28 }
    if (step === 7) return pairIds.has(a.id) ? { opacity: 1, ring: { color: COLOR.pair, width: 2.2, r: 2.8 } } : { opacity: 0.28 }
    return { opacity: 1 }
  }

  const pairRing = (p: { a: string; b: string }, color: string, show: boolean) => {
    const a = byId.get(p.a)
    const b = byId.get(p.b)
    if (!a || !b) return null
    return (
      <circle
        cx={(a.x + b.x) / 2}
        cy={(a.y + b.y) / 2}
        r={3.4}
        fill="none"
        stroke={color}
        strokeWidth="2"
        vectorEffect="non-scaling-stroke"
        style={{ opacity: show ? 1 : 0, transition: "opacity 250ms ease-out" }}
      />
    )
  }
  const mp = (p: { a: string; b: string }) => {
    const a = byId.get(p.a)!
    const b = byId.get(p.b)!
    return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
  }
  const fade = (on: boolean) => ({ opacity: on ? 1 : 0, transition: "opacity 250ms ease-out" })

  const texts: React.ReactNode[] = [
    `${n} animals at fixed positions on the 100 × 100 grid. The algorithm will find the closest pair without having to compare every pair.`,
    trace
      ? `The points are sorted once by x and once by y (rug marks on the axes). Leftmost: ${trace.x_order[0]}. Rightmost: ${trace.x_order[n - 1]}. The median by x is ${medianId}, at x = ${mid}.`
      : "",
    trace
      ? `A vertical line at the median x = ${mid} splits the grid. The same split repeats inside each half: the solid line is level 1, dashed lines are levels 2 and 3. Recursion stops when a piece has 3 points or fewer.`
      : "The set is small enough to compare directly.",
    trace ? `Two independent subproblems: ${left.size} animals on the left and ${n - left.size} on the right. Each is solved by the same method.` : "",
    trace
      ? `Best on the left: ${trace.left.a} and ${trace.left.b}, ${fmtDist(trace.left.distance)} apart. Best on the right: ${trace.right.a} and ${trace.right.b}, ${fmtDist(trace.right.distance)}. The smaller is δ = ${delta.toFixed(2)}.`
      : "",
    trace
      ? `A closer pair that straddles the line must lie within δ of it, so only a strip of width 2δ = ${(delta * 2).toFixed(2)} matters. It holds ${trace.strip.ids.length} ${trace.strip.ids.length === 1 ? "animal" : "animals"}.`
      : "",
    trace
      ? `Strip animals are taken in y order and each is compared only with neighbours less than δ away vertically. ${compared} ${compared === 1 ? "pair was" : "pairs were"} compared and ${stopped} ${stopped === 1 ? "neighbour was" : "neighbours were"} skipped because the y-gap was already at least δ. ${trace.strip.improved ? "A closer pair was found." : "Nothing beat δ."}`
      : "",
    `${cp.a.id} and ${cp.b.id} are ${fmtDist(cp.distance)} apart. ${straddles ? "They sit on opposite sides of the line, so the strip found them." : "Both lie in the " + (cp.a.x < mid ? "left" : "right") + " half, so the strip could not improve on it."} Total: ${cp.stats.comparisons} distance comparisons, within the O(n log n) bound.`,
  ]

  const pairSpecies = cp.a.species === cp.b.species ? `Two ${cp.a.species.toLowerCase()}s` : `${cp.a.species} + ${cp.b.species}`

  return (
    <div className={PAGE}>
      <PageHeader
        icon="polyline"
        tone={COLOR.pair}
        eyebrow="Algorithm · Divide and conquer"
        title="Closest pair"
        description="Find the two animals that are closest together using divide and conquer."
        right={<SnapshotChip tick={cp.tick} time={time} onRefresh={onRefresh} />}
      />

      {/* Result and walkthrough: the answer first, then the picture that explains it */}
      <section className={cn("mt-8 grid lg:grid-cols-12 lg:grid-rows-[auto_1fr]", GAP)}>
        <Module icon="straighten" tone={COLOR.pair} title="Closest animals" meta="Closest Pair · Divide & Conquer" className="max-lg:order-1 lg:col-span-5 lg:col-start-8 lg:row-start-1">
          <div className="flex items-center gap-3">
            <span className="grid min-w-14 place-items-center gap-1 text-center">
              <span className="text-[34px] leading-none">{cp.a.emoji}</span>
              <span className="num font-mono text-caption font-semibold text-ink">{cp.a.id}</span>
            </span>
            <span className="relative flex flex-1 items-center" aria-hidden>
              <DashedMark w="w-full" />
              <Icon name="sync_alt" className="absolute left-1/2 -translate-x-1/2 bg-surface px-1 text-[20px]" />
            </span>
            <span className="grid min-w-14 place-items-center gap-1 text-center">
              <span className="text-[34px] leading-none">{cp.b.emoji}</span>
              <span className="num font-mono text-caption font-semibold text-ink">{cp.b.id}</span>
            </span>
          </div>
          <Metric unit="units apart" color={COLOR.pair} className="mt-5">
            {cp.distance.toFixed(2)}
          </Metric>
          <p className="mt-2 text-body font-medium text-ink">{pairSpecies}</p>
          <p className="mt-1 text-caption text-slate">The two closest animals in this snapshot of the simulation, found without checking every pair.</p>
          <MetaList className="mt-4">
            <Row k="Point comparisons" mono>
              {cp.stats.comparisons}
            </Row>
            <Row k="Recursive calls" mono>
              {cp.stats.recursive_calls}
            </Row>
            <Row k="Complexity" mono>
              O(n log n)
            </Row>
          </MetaList>
        </Module>

        <Module icon="stacks" title="Work behind the result" meta="What the algorithm had to do" className="max-lg:order-3 lg:col-span-5 lg:col-start-8 lg:row-start-2">
          <MetaList>
            <Row k="Median split" mono>
              x = {mid}
            </Row>
            <Row k="Best half distance (δ)" mono>
              {delta.toFixed(2)}
            </Row>
            <Row k="Strip candidates" mono>
              {trace ? trace.strip.ids.length : "–"}
            </Row>
            <Row k="Strip pairs" mono>
              {compared} compared · {stopped} skipped
            </Row>
          </MetaList>
          <p className="mt-4 text-caption text-slate">
            For reference only: comparing every pair would take {bruteForce.toLocaleString()} point comparisons. This algorithm never does that; it needed {cp.stats.comparisons}.
          </p>
        </Module>

        <VizSurface
          icon="polyline"
          title="Walkthrough"
          meta={`Replaying the algorithm on this snapshot · ${n} animals`}
          className="max-lg:order-2 lg:col-span-7 lg:col-start-1 lg:row-span-2 lg:row-start-1"
          legend={
            <ul className="flex flex-wrap items-center gap-x-5 gap-y-1.5">
              <li className="flex items-center gap-2">
                <Swatch kind="median" /> Median split
              </li>
              <li className="flex items-center gap-2">
                <Swatch kind="strip" /> Strip of width 2δ
              </li>
              <li className="flex items-center gap-2">
                <Swatch kind="ring" /> In the strip
              </li>
              <li className="flex items-center gap-2">
                <Swatch kind="pair" /> Closest pair
              </li>
              <li className="flex items-center gap-2">
                <DashedMark /> Distance
              </li>
            </ul>
          }
          controls={<Walkthrough steps={STEPS} step={step} onStep={setStep} />}
        >
          <StepBanner step={step} total={STEPS.length} title={STEPS[step]}>
            {texts[step]}
          </StepBanner>
          <PlaneView
            size={size}
            label={`Closest pair on the 100 by 100 grid, step ${step + 1} of ${STEPS.length}: ${STEPS[step]}. Result: ${cp.a.id} and ${cp.b.id}, ${fmtDist(cp.distance)} apart.`}
            overlay={
              <>
                {step === 1 && trace && (
                  <Chip size={size} x={mid} y={4} tone="bark">
                    Median by x · {medianId}
                  </Chip>
                )}
                {step === 3 && trace && (
                  <>
                    <Chip size={size} x={mid / 2} y={size - 3} tone="forest">
                      Left · {left.size} animals
                    </Chip>
                    <Chip size={size} x={(mid + size) / 2} y={size - 3} tone="bark">
                      Right · {n - left.size} animals
                    </Chip>
                  </>
                )}
                {step === 4 && trace && (
                  <>
                    <Chip size={size} {...mp(trace.left)} tone="forest">
                      Left d = {trace.left.distance.toFixed(2)}
                    </Chip>
                    <Chip size={size} {...mp(trace.right)} tone="bark">
                      Right d = {trace.right.distance.toFixed(2)}
                    </Chip>
                    <Chip size={size} x={mid} y={size - 3} tone="forest">
                      δ = {delta.toFixed(2)}
                    </Chip>
                  </>
                )}
                {step === 5 && trace && (
                  <Chip size={size} x={mid} y={size - 3} tone="forest">
                    Strip width 2δ = {(delta * 2).toFixed(2)} · {trace.strip.ids.length} {trace.strip.ids.length === 1 ? "animal" : "animals"}
                  </Chip>
                )}
                {step === 6 &&
                  checks.map((c, i) => {
                    const a = byId.get(c.a)!
                    const b = byId.get(c.b)!
                    return (
                      <Chip key={i} size={size} x={Math.min(Math.max((a.x + b.x) / 2 + (i % 2 ? 9 : -9), 12), size - 12)} y={(a.y + b.y) / 2} tone={c.compared ? "forest" : "bark"}>
                        {c.compared ? `d = ${c.distance!.toFixed(2)}` : `y-gap ${c.dy} ≥ δ, skip`}
                      </Chip>
                    )
                  })}
                {step === 7 && <Lens a={cp.a} b={cp.b} distance={cp.distance} top={cp.a.y < size / 2} />}
              </>
            }
          >
            {/* Sorted order: rug marks along both axes */}
            <g style={fade(step === 1)}>
              {trace?.x_order.map((id) => {
                const p = byId.get(id)!
                return <line key={`rx${id}`} x1={p.x} x2={p.x} y1={0} y2={id === medianId ? 4.5 : 2.2} stroke={id === medianId ? BARK : FOREST} strokeWidth={id === medianId ? 2 : 1} vectorEffect="non-scaling-stroke" opacity="0.7" />
              })}
              {trace?.y_order.map((id) => {
                const p = byId.get(id)!
                return <line key={`ry${id}`} x1={0} x2={2.2} y1={p.y} y2={p.y} stroke={FOREST} strokeWidth="1" vectorEffect="non-scaling-stroke" opacity="0.7" />
              })}
            </g>
            {/* Left / right subproblems */}
            <g style={fade(step >= 3 && step <= 5)}>
              <rect x={0} y={0} width={mid} height={size} fill="#e2f6d5" opacity="0.6" />
              <rect x={mid} y={0} width={size - mid} height={size} fill="#efe6d6" opacity="0.7" />
            </g>
            {/* Recursive division: level 1 solid, deeper levels dashed */}
            <g style={fade(step >= 2 && step <= 6)}>
              {trace?.splits
                .filter((s) => s.depth > 0)
                .map((s, i) => (
                  <line key={i} x1={s.x} x2={s.x} y1={0} y2={size} stroke={s.depth === 1 ? FOREST : "#868685"} strokeWidth="1" strokeDasharray="4 4" vectorEffect="non-scaling-stroke" />
                ))}
            </g>
            {/* δ strip */}
            <g style={{ opacity: step >= 5 ? (step === 7 ? 0.5 : 1) : 0, transition: "opacity 250ms ease-out" }}>
              <rect x={mid - delta} y={0} width={delta * 2} height={size} fill={LIME} opacity="0.4" />
              <line x1={mid - delta} x2={mid - delta} y1={0} y2={size} stroke={FOREST} strokeWidth="1" strokeDasharray="3 3" vectorEffect="non-scaling-stroke" />
              <line x1={mid + delta} x2={mid + delta} y1={0} y2={size} stroke={FOREST} strokeWidth="1" strokeDasharray="3 3" vectorEffect="non-scaling-stroke" />
            </g>
            <line x1={mid} x2={mid} y1={0} y2={size} stroke={FOREST} strokeWidth="2" vectorEffect="non-scaling-stroke" style={fade(step >= 2)} />
            {trace && pairRing(trace.left, FOREST, step === 4)}
            {trace && pairRing(trace.right, BARK, step === 4)}
            {/* Strip inspections: solid = compared, dotted = stopped because the y-gap reached δ */}
            <g style={fade(step === 6)}>
              {checks.map((c, i) => {
                const a = byId.get(c.a)!
                const b = byId.get(c.b)!
                return (
                  <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={c.compared ? FOREST : BARK} strokeWidth="1.5" strokeDasharray={c.compared ? undefined : "2 3"} vectorEffect="non-scaling-stroke" />
                )
              })}
            </g>
            {/* Closest-pair connection */}
            <line
              x1={cp.a.x}
              y1={cp.a.y}
              x2={cp.b.x}
              y2={cp.b.y}
              stroke={COLOR.pair}
              strokeWidth="2"
              strokeDasharray="5 3"
              vectorEffect="non-scaling-stroke"
              style={fade(step === 7)}
            />
            {step === 7 && <circle cx={(cp.a.x + cp.b.x) / 2} cy={(cp.a.y + cp.b.y) / 2} r={4} fill="none" stroke={COLOR.pair} strokeWidth="2" vectorEffect="non-scaling-stroke" />}
            {animals.map((a) => {
              const g = glyphState(a)
              return <AnimalGlyph key={a.id} x={a.x} y={a.y} emoji={a.emoji} opacity={g.opacity} ring={g.ring} />
            })}
          </PlaneView>
        </VizSurface>
      </section>

      {/* How it works: plain language first */}
      <section className="mt-12">
        <Module
          icon="school"
          title="How it works"
          meta="The idea in five short parts"
          footer={
            <p className="text-caption text-slate">
              Each level of splitting costs about n steps and there are about log n levels, so the total is <span className="num font-mono">O(n log n)</span>, written <span className="num font-mono">T(n) = 2T(n/2) + O(n)</span>.
            </p>
          }
        >
          <ol className="grid gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-5">
            {[
              ["Divide", "Split the habitat down the middle, at the median x, and solve each half on its own."],
              ["Base case", "When a piece holds 3 animals or fewer, just compare them directly."],
              ["Strip", "A closer pair could still straddle the line, so check a thin strip of width 2δ around it."],
              ["Seven-neighbour rule", "In the strip, each animal only needs comparing with the few neighbours just above it, at most 7, which keeps the work linear."],
              ["Cost", "Because every level does linear work, the whole search stays fast: O(n log n)."],
            ].map(([t, d], i) => (
              <li key={t}>
                <p className="flex items-center gap-2 text-body font-bold text-ink">
                  <span className="num grid size-6 place-items-center rounded-full bg-tonal text-micro text-slate">{i + 1}</span>
                  {t}
                </p>
                <p className="mt-1.5 text-caption leading-snug text-slate">{d}</p>
              </li>
            ))}
          </ol>
        </Module>
      </section>

      <p className="mt-8 text-caption text-slate">Synthetic, seeded simulation. The analysis is computed by the Python backend on tick {cp.tick}; this page only draws it.</p>
    </div>
  )
}

export default function ClosestPairPage() {
  const snap = useSnapshot()
  const cp = useApi<ClosestPair>(snap.tick !== undefined ? `/closest-pair?tick=${snap.tick}` : null)
  const eyebrow = "Algorithm · Divide and conquer"
  if (snap.status === "error" || cp.status === "error")
    return (
      <Notice
        eyebrow={eyebrow}
        icon="cloud_off"
        title={cp.error?.includes("404") ? "That snapshot has expired" : "Can't reach the GeoWild API"}
        text={cp.error?.includes("404") ? "Take a new snapshot of the simulation." : "Start the backend on port 8000 and try again."}
        action={
          <Button variant="dark" size="sm" onClick={snap.refresh}>
            {cp.error?.includes("404") ? "Take a new snapshot" : "Try again"}
          </Button>
        }
      />
    )
  if (snap.status !== "ready" || cp.status !== "ready" || !cp.data || cp.data.tick !== snap.tick || !snap.grid || !snap.sim)
    return <Notice eyebrow={eyebrow} icon="progress_activity" title="Analysing the snapshot" text="Running the closest-pair search on the backend." />
  return <Content key={snap.tick} animals={snap.animals} size={snap.grid.size} cp={cp.data} time={snap.sim.time} onRefresh={snap.refresh} />
}

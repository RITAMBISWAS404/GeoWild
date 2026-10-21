import { useMemo, useState } from "react"
import { AnimalGlyph } from "@/components/AnimalGlyph"
import { SnapshotChip, StepBanner, Walkthrough } from "@/components/AlgoParts"
import { Icon } from "@/components/Icon"
import { Notice } from "@/components/Notice"
import { PlaneView } from "@/components/PlaneView"
import { GAP, MetaList, Metric, Module, PAGE, PageHeader, Row, VizSurface } from "@/components/Surface"
import { Button } from "@/components/ui/button"
import { Segmented } from "@/components/ui/segmented"
import { useApi, useDangerZone, useSnapshot, type Animal, type Grid, type KDNode, type KDTreeData } from "@/lib/api"
import { COLOR } from "@/lib/ui"
import { cn } from "@/lib/utils"

const FOREST = "#163300"
const BARK = "#7c5733"
const PEBBLE = "#868685"
const STEPS = [
  "Point set",
  "Recursive median split",
  "Alternating x and y axes",
  "The KD-tree",
  "Range query",
  "Visited nodes",
  "Pruned subtrees",
  "Matching points",
]
const axisColor = (a: number) => (a === 0 ? FOREST : BARK)
const TREE_LEVELS = 4

type Levels = "3 levels" | "5 levels" | "All"
const LEVEL_DEPTH: Record<Levels, number> = { "3 levels": 2, "5 levels": 4, All: 99 }

function Swatch({ kind }: { kind: "visited" | "pruned" | "inside" | "faded" | "zone" | "x" | "y" }) {
  if (kind === "pruned") return <span className="inline-block size-3.5 rounded-[3px] border border-dashed border-pebble bg-[repeating-linear-gradient(45deg,#86868555_0_1px,transparent_1px_4px)]" />
  if (kind === "zone") return <span className="inline-block size-3.5 rounded-[3px] border-[1.5px]" style={{ borderColor: COLOR.zone, background: `${COLOR.zone}1f` }} />
  if (kind === "x") return <span className="inline-block h-4 w-0 border-l-2" style={{ borderColor: FOREST }} />
  if (kind === "y") return <span className="inline-block h-0 w-4 border-t-2" style={{ borderColor: BARK }} />
  if (kind === "faded") return <span className="inline-block size-3 rounded-full border-2 border-dashed border-pebble" />
  const c = kind === "inside" ? COLOR.inside : FOREST
  return <span className="inline-block size-3 rounded-full border-2" style={{ borderColor: c, background: `${c}26` }} />
}

type NodeState = "plain" | "visited" | "pruned" | "skipped"

/** Top levels of the real tree, from /api/kdtree. Node colour follows the search trace. */
function TreeDiagram({ tree, nodes, state, match, showMatch }: { tree: KDTreeData; nodes: Map<string, KDNode>; state: (id: string) => NodeState; match: Set<string>; showMatch: boolean }) {
  const W = 320
  const rowH = 38
  const items = useMemo(() => {
    const out: { n: KDNode; x: number; y: number; parent?: { x: number; y: number } }[] = []
    const root = tree.nodes.find((n) => n.parent === null)
    const walk = (n: KDNode | undefined, depth: number, idx: number, parent?: { x: number; y: number }) => {
      if (!n || depth >= TREE_LEVELS) return
      const x = ((idx + 0.5) * W) / 2 ** depth
      const y = 16 + depth * rowH
      out.push({ n, x, y, parent })
      walk(n.left ? nodes.get(n.left) : undefined, depth + 1, idx * 2, { x, y })
      walk(n.right ? nodes.get(n.right) : undefined, depth + 1, idx * 2 + 1, { x, y })
    }
    walk(root, 0, 0)
    return out
  }, [tree, nodes])
  return (
    <svg viewBox={`0 0 ${W} ${16 + (TREE_LEVELS - 1) * rowH + 16}`} className="block w-full" role="img" aria-label="Top levels of the KD-tree">
      <defs>
        <pattern id="gw-hatch-tree" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="4" stroke={PEBBLE} strokeWidth="1" />
        </pattern>
      </defs>
      {items.map(({ n, x, y, parent }) =>
        parent ? <line key={`e${n.id}`} x1={parent.x} y1={parent.y} x2={x} y2={y} stroke={state(n.id) === "skipped" || state(n.id) === "pruned" ? "#c9c5b5" : "#868685"} strokeWidth="1.2" /> : null
      )}
      {items.map(({ n, x, y }) => {
        const st = state(n.id)
        const c = axisColor(n.axis)
        return (
          <g key={n.id} opacity={st === "skipped" ? 0.35 : 1}>
            {showMatch && match.has(n.id) && <circle cx={x} cy={y} r={12.5} fill="none" stroke={COLOR.inside} strokeWidth="3" />}
            <circle
              cx={x}
              cy={y}
              r={9}
              fill={st === "visited" ? c : st === "pruned" ? "url(#gw-hatch-tree)" : "#fff"}
              stroke={st === "pruned" ? PEBBLE : c}
              strokeWidth="1.8"
              strokeDasharray={st === "pruned" ? "3 2" : undefined}
              style={{ transition: "fill 250ms ease-out" }}
            />
            <text x={x} y={y + 3.5} textAnchor="middle" fontSize="10" fontWeight="700" fill={st === "visited" ? "#fff" : c}>
              {n.axis === 0 ? "x" : "y"}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

function Content({ animals, grid, tree, time, onRefresh }: { animals: Animal[]; grid: Grid; tree: KDTreeData; time: number; onRefresh: () => void }) {
  const zone = useDangerZone(grid.danger_zone, tree.tick)
  const { rect, result, failed } = zone
  const [step, setStep] = useState(0)
  const [draw, setDraw] = useState(false)
  const [sel, setSel] = useState<string | null>(null)
  const [levels, setLevels] = useState<Levels>("5 levels")

  const nodes = useMemo(() => new Map(tree.nodes.map((n) => [n.id, n])), [tree])
  const visited = useMemo(() => new Set(result?.visited_ids ?? []), [result])
  const prunedRoots = useMemo(() => new Set(result?.pruned_ids ?? []), [result])
  const match = useMemo(() => new Set(result?.animals.map((a) => a.id) ?? []), [result])
  const skippedPoints = result ? result.pruned_ids.reduce((s, id) => s + (nodes.get(id)?.size ?? 0), 0) : 0
  const lineDepth = step === 0 ? -1 : step === 1 ? 1 : step === 2 ? 3 : LEVEL_DEPTH[levels]
  const ringDepth = step >= 1 && step < 5 ? 2 : -1
  const lines = useMemo(() => tree.nodes.filter((n) => n.depth <= lineDepth), [tree, lineDepth])
  const selected: KDNode | null = sel ? (nodes.get(sel) ?? null) : null
  const n = tree.size
  const root = tree.nodes.find((x) => x.parent === null)
  const rootLeft = root?.left ? nodes.get(root.left) : undefined
  const searching = step >= 5 && !!result
  const k = result?.results ?? 0
  const sqrtN = Math.sqrt(n)
  const bySpecies = grid.species
    .map((s) => ({ ...s, inside: result?.animals.filter((a) => a.species === s.name).length ?? 0 }))
    .filter((s) => s.inside > 0)
  const fade = (on: boolean) => ({ opacity: on ? 1 : 0, transition: "opacity 250ms ease-out" })

  const glyphState = (a: Animal): { opacity: number; ring?: { color: string; width?: number; r?: number; fill?: number } } => {
    if (!searching) return { opacity: 1 }
    if (step >= 7 && match.has(a.id)) return { opacity: 1, ring: { color: COLOR.inside, r: 2.7, width: 1.9 } }
    if (visited.has(a.id)) return { opacity: 1, ring: { color: FOREST, r: 2.5, width: 1.4, fill: 0.08 } }
    return { opacity: 0.3 }
  }
  const nodeState = (id: string): NodeState => {
    if (step < 5 || !result) return "plain"
    if (visited.has(id)) return "visited"
    if (step >= 6 && prunedRoots.has(id)) return "pruned"
    return step >= 6 ? "skipped" : "plain"
  }

  const texts = [
    `${n} animals on the 100 × 100 habitat. A KD-tree indexes them so that a rectangle query can skip most of them.`,
    root
      ? `The root is the median animal by x: ${root.id}, at x = ${root.x}. Its vertical line splits the habitat into halves of ${rootLeft?.size ?? "?"} and ${n - 1 - (rootLeft?.size ?? 0)} animals (plus the root). Each half is then split at its own median, this time on y.`
      : "",
    "Splits alternate: x (vertical, dark green), then y (horizontal, brown), then x again, level by level. Each line passes through the median animal of the cell it splits (ringed).",
    `The finished tree has ${n} nodes over ${tree.height} levels, built in O(n log n). Every animal is one node. The diagram below shows the top ${TREE_LEVELS} levels; the letter is the node's split axis.`,
    `The monitoring zone is the rectangle x ${rect.xmin}–${rect.xmax}, y ${rect.ymin}–${rect.ymax}. The search must list the animals inside it without testing every animal.`,
    result
      ? `From the root, the search visits a node only if its cell can overlap the rectangle. It visited ${result.nodes_visited} of ${n} nodes: outlined animals, filled tree nodes.`
      : "Searching.",
    result
      ? `When a cell cannot overlap the rectangle, its whole branch is skipped. ${result.subtrees_pruned} branches were pruned (hatched cells), so ${skippedPoints} animals were never touched. That is why the search does not inspect every point.`
      : "Searching.",
    result
      ? `${k} animals are inside the zone (orange). The search made ${result.nodes_visited} node visits where a plain scan would test all ${n}. Cost grows like √n + k: here √${n} ≈ ${sqrtN.toFixed(1)} and k = ${k}.`
      : "Searching.",
  ]

  return (
    <div className={PAGE}>
      <PageHeader
        icon="account_tree"
        tone={COLOR.zone}
        eyebrow="Algorithm · Spatial index"
        title="KD-Tree search"
        description="Search the habitat efficiently to find animals inside a rectangular region."
        right={<SnapshotChip tick={tree.tick} time={time} onRefresh={onRefresh} />}
      />

      <section className={cn("mt-8 grid lg:grid-cols-12 lg:grid-rows-[auto_1fr]", GAP)}>
        <Module icon="crop_free" tone={COLOR.zone} title="Animals in this zone" meta="Range Search · KD-Tree" className="max-lg:order-1 lg:col-span-5 lg:col-start-8 lg:row-start-1">
          {failed ? (
            <p className="text-body text-slate">The search failed. Check that the API is running.</p>
          ) : (
            <>
              <Metric unit={`of ${n} animals`}>{result ? result.results : "–"}</Metric>
              <p className="mt-2 min-h-6 text-body text-charcoal" aria-label="Animals in the zone by species">
                {bySpecies.map((s) => `${s.emoji} ${s.inside}`).join("   ")}
              </p>
              {result && (
                <p className="mt-2 text-body font-medium text-ink">
                  KD-Tree Search avoided inspecting {skippedPoints} of {n} animals.
                </p>
              )}
              {result && <p className="mt-1 text-caption text-slate">{result.results} {result.results === 1 ? "animal matches" : "animals match"} the rectangular query.</p>}
              <MetaList className="mt-4">
                <Row k="X range" mono>
                  {rect.xmin} – {rect.xmax}
                </Row>
                <Row k="Y range" mono>
                  {rect.ymin} – {rect.ymax}
                </Row>
                <Row k="Zone size" mono>
                  {rect.xmax - rect.xmin} × {rect.ymax - rect.ymin} units
                </Row>
              </MetaList>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => setDraw((d) => !d)} aria-pressed={draw} title="Drag on the plot to draw a new zone">
                  <Icon name="crop_free" fill={draw} className="text-[18px]" /> {draw ? "Cancel" : "Redraw zone"}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  title="Restore the default zone"
                  onClick={() => {
                    zone.reset()
                    setDraw(false)
                  }}
                >
                  <Icon name="undo" className="text-[18px]" /> Reset
                </Button>
              </div>
            </>
          )}
        </Module>

        <Module icon="stacks" title="Work behind the result" meta="What the search had to do" className="max-lg:order-3 lg:col-span-5 lg:col-start-8 lg:row-start-2">
          <MetaList>
            <Row k="Nodes visited" mono>
              {result ? `${result.nodes_visited} of ${n}` : "–"}
            </Row>
            <Row k="Branches pruned" mono>
              {result ? result.subtrees_pruned : "–"}
            </Row>
            <Row k="Matches" mono>
              {result ? result.results : "–"}
            </Row>
            <Row k="Tree height" mono>
              {tree.height} levels
            </Row>
            <Row k="Query complexity" mono>
              O(√n + k)
            </Row>
            <Row k="Build complexity" mono>
              O(n log n)
            </Row>
          </MetaList>
        </Module>

        <VizSurface
          icon="account_tree"
          title="Walkthrough"
          meta={`Replaying the search on this snapshot · ${n} animals`}
          className="max-lg:order-2 lg:col-span-7 lg:col-start-1 lg:row-span-2 lg:row-start-1"
          legend={
            <div className="space-y-2.5">
              <ul className="flex flex-wrap items-center gap-x-5 gap-y-1.5">
                <li className="flex items-center gap-2">
                  <Swatch kind="visited" /> Visited
                </li>
                <li className="flex items-center gap-2">
                  <Swatch kind="pruned" /> Pruned
                </li>
                <li className="flex items-center gap-2">
                  <Swatch kind="inside" /> Inside zone
                </li>
                <li className="flex items-center gap-2">
                  <Swatch kind="faded" /> Not searched
                </li>
                <li className="flex items-center gap-2">
                  <Swatch kind="x" /> x split
                </li>
                <li className="flex items-center gap-2">
                  <Swatch kind="y" /> y split
                </li>
              </ul>
              <p className="text-slate">
                {selected ? (
                  <span className="inline-flex flex-wrap items-center gap-x-2">
                    <span className="num font-mono font-semibold text-ink">{selected.id}</span>
                    <span className="num font-mono">
                      ({selected.x}, {selected.y})
                    </span>
                    <span>
                      splits on {selected.axis === 0 ? "x" : "y"} at {selected.axis === 0 ? selected.x : selected.y}, level {selected.depth + 1}, branch of {selected.size}.{" "}
                      {result && (visited.has(selected.id) ? "The search visited it." : "The search skipped it.")}
                    </span>
                    <button onClick={() => setSel(null)} aria-label="Clear selection" title="Clear selection" className="grid size-7 cursor-pointer place-items-center rounded-control hover:bg-clay">
                      <Icon name="close" className="text-[16px]" />
                    </button>
                  </span>
                ) : (
                  "Select an animal to see which tree node it is and whether the search visited it."
                )}
              </p>
            </div>
          }
          controls={
            <div className="flex flex-col gap-3">
              <Walkthrough steps={STEPS} step={step} onStep={setStep} />
              {step >= 3 && (
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="text-caption text-slate">Split lines</span>
                  <Segmented<Levels> label="Split line depth" value={levels} onChange={setLevels} options={(["3 levels", "5 levels", "All"] as Levels[]).map((v) => ({ value: v, label: v }))} />
                </div>
              )}
            </div>
          }
        >
          <StepBanner step={step} total={STEPS.length} title={STEPS[step]}>
            {texts[step]}
          </StepBanner>
          <PlaneView
            size={grid.size}
            draw={draw}
            onDraw={(r) => {
              zone.apply(r)
              setDraw(false)
              setStep(7)
            }}
            label={`KD-tree on the 100 by 100 habitat, step ${step + 1} of ${STEPS.length}: ${STEPS[step]}. ${result ? `${result.results} of ${n} animals inside the zone; ${result.nodes_visited} nodes visited, ${result.subtrees_pruned} branches pruned.` : ""}`}
            overlay={
              draw && (
                <span className="pointer-events-none absolute top-3 left-3 z-10 inline-flex items-center gap-1.5 rounded-full border border-forest bg-lime px-3 py-1.5 text-micro font-medium text-forest">
                  <Icon name="crop_free" className="text-[16px]" /> Drag to draw the zone
                </span>
              )
            }
          >
            <g style={fade(step >= 6)}>
              {result?.pruned_ids.map((id) => {
                const r = nodes.get(id)?.region
                return r && <rect key={id} x={r.xmin} y={r.ymin} width={r.xmax - r.xmin} height={r.ymax - r.ymin} fill="url(#gw-hatch)" />
              })}
            </g>
            {lines.map((nd) => {
              const r = nd.region
              const on = !searching || visited.has(nd.id)
              return (
                <line
                  key={nd.id}
                  x1={nd.axis === 0 ? nd.x : r.xmin}
                  x2={nd.axis === 0 ? nd.x : r.xmax}
                  y1={nd.axis === 0 ? r.ymin : nd.y}
                  y2={nd.axis === 0 ? r.ymax : nd.y}
                  stroke={on ? axisColor(nd.axis) : PEBBLE}
                  strokeOpacity={on ? 0.85 : 0.4}
                  strokeWidth={Math.max(2.4 - nd.depth * 0.3, 0.9)}
                  vectorEffect="non-scaling-stroke"
                  style={{ transition: "stroke-opacity 250ms ease-out" }}
                />
              )
            })}
            <rect
              x={rect.xmin}
              y={rect.ymin}
              width={rect.xmax - rect.xmin}
              height={rect.ymax - rect.ymin}
              fill={COLOR.zone}
              fillOpacity="0.09"
              stroke={COLOR.zone}
              strokeWidth="1.5"
              vectorEffect="non-scaling-stroke"
              style={fade(step >= 4)}
            />
            {tree.nodes
              .filter((nd) => nd.depth <= ringDepth)
              .map((nd) => (
                <circle key={`ring${nd.id}`} cx={nd.x} cy={nd.y} r={3} fill="none" stroke={axisColor(nd.axis)} strokeWidth="1.5" strokeDasharray="2 2" vectorEffect="non-scaling-stroke" />
              ))}
            {animals.map((a) => {
              const g = glyphState(a)
              return <AnimalGlyph key={a.id} x={a.x} y={a.y} emoji={a.emoji} opacity={g.opacity} ring={g.ring} />
            })}
            {selected && <circle cx={selected.x} cy={selected.y} r={3.8} fill={COLOR.lime} fillOpacity="0.32" stroke={COLOR.ink} strokeWidth="1.6" vectorEffect="non-scaling-stroke" />}
            {!draw &&
              animals.map((a) => (
                <circle key={`t${a.id}`} cx={a.x} cy={a.y} r={3} fill="transparent" style={{ cursor: "pointer" }} onClick={() => setSel(a.id === sel ? null : a.id)}>
                  <title>{`${a.id} (${a.x}, ${a.y})`}</title>
                </circle>
              ))}
          </PlaneView>
        </VizSurface>
      </section>

      <section className={cn("mt-12 grid lg:grid-cols-12", GAP)}>
        <Module
          icon="schema"
          title="The search tree"
          meta={`Top ${TREE_LEVELS} of ${tree.height} levels · the letter is the split axis`}
          className="lg:col-span-5"
          footer={
            <ul className="flex flex-wrap gap-x-4 gap-y-1 text-caption text-slate">
              <li>Filled: visited</li>
              <li>Hatched: pruned</li>
              <li>Orange ring: inside the zone</li>
            </ul>
          }
        >
          <TreeDiagram tree={tree} nodes={nodes} state={nodeState} match={match} showMatch={step >= 7} />
        </Module>

        <Module icon="school" title="How it works" meta="The idea in four short parts" className="lg:col-span-7">
          <ol className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
            {[
              ["Build", "Split the habitat on x at the median animal, then each half on y, then x again. Every animal becomes one node, and the tree stays balanced."],
              ["Ask", "Give the tree a rectangle. Start at the root and look at the cell each node controls."],
              ["Skip", "If a cell cannot touch the rectangle, skip that whole branch without looking inside it."],
              ["Why it is fast", "Only branches along the rectangle's edges need a look, about √n of them, plus the k animals that match: O(√n + k)."],
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

      <p className="mt-8 text-caption text-slate">Synthetic, seeded simulation. The tree, search and counts come from the Python backend on tick {tree.tick}; this page only draws them.</p>
    </div>
  )
}

export default function KdTreePage() {
  const snap = useSnapshot()
  const tree = useApi<KDTreeData>(snap.tick !== undefined ? `/kdtree?tick=${snap.tick}` : null)
  const eyebrow = "Algorithm · Spatial index"
  const expired = tree.error?.includes("404")
  if (snap.status === "error" || tree.status === "error")
    return (
      <Notice
        eyebrow={eyebrow}
        icon="cloud_off"
        title={expired ? "That snapshot has expired" : "Can't reach the GeoWild API"}
        text={expired ? "Take a new snapshot of the simulation." : "Start the backend on port 8000 and try again."}
        action={
          <Button variant="dark" size="sm" onClick={snap.refresh}>
            {expired ? "Take a new snapshot" : "Try again"}
          </Button>
        }
      />
    )
  if (snap.status !== "ready" || tree.status !== "ready" || !tree.data || tree.data.tick !== snap.tick || !snap.grid || !snap.sim)
    return <Notice eyebrow={eyebrow} icon="progress_activity" title="Building the KD-tree" text="Indexing the snapshot on the backend." />
  return <Content key={snap.tick} animals={snap.animals} grid={snap.grid} tree={tree.data} time={snap.sim.time} onRefresh={snap.refresh} />
}

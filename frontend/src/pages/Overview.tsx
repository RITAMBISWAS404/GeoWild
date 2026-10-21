import { useEffect, useState } from "react"
import type { NavId } from "@/components/AppShell"
import { Icon } from "@/components/Icon"
import { Notice } from "@/components/Notice"
import { PlaneView } from "@/components/PlaneView"
import { Button } from "@/components/ui/button"
import { DashedMark, GAP, IconBox, MetaList, Metric, Module, Row } from "@/components/Surface"
import { Segmented } from "@/components/ui/segmented"
import { Switch } from "@/components/ui/switch"
import { livePos, useApi, useNow, useSimulation, type Grid, type Rect, type SimState } from "@/lib/api"
import { at, COLOR, stagger } from "@/lib/ui"
import { cn } from "@/lib/utils"

const EYEBROW = "GeoWild · Wildlife Spatial Monitoring"
const SPEEDS = ["0.5×", "1×", "2×", "4×"]

function OverviewContent({ grid, onOpen }: { grid: Grid; onOpen: (id: NavId) => void }) {
  const [draw, setDraw] = useState(false)
  const [sel, setSel] = useState<string | null>(null)
  const [hover, setHover] = useState<string | null>(null)
  const [zone, setZone] = useState<Rect>(grid.danger_zone)
  const [zoneOn, setZoneOn] = useState(true)
  const [detailsOpen, setDetailsOpen] = useState(() => typeof window !== "undefined" && window.matchMedia("(min-width: 1024px)").matches)
  const { sim, error, control } = useSimulation(zoneOn ? zone : null)
  const running = sim?.state.running ?? true
  const now = useNow(running)

  // The highlighted pair is held steady: it only switches once the backend's closest pair has been stable for
  // 1.5 s, or immediately if the held pair is clearly no longer the closest (>40% farther apart).
  const serverPair = sim ? [sim.state.closest.a, sim.state.closest.b].sort().join("|") : ""
  const [pairKey, setPairKey] = useState("")
  const held = sim ? pairKey.split("|").map((id) => sim.state.animals.find((a) => a.id === id)) : []
  const heldDist = held.length === 2 && held[0] && held[1] ? Math.hypot(held[0].x - held[1].x, held[0].y - held[1].y) : Infinity
  const clearlyWorse = sim ? heldDist > 1.4 * sim.state.closest.distance : false
  useEffect(() => {
    if (!serverPair || serverPair === pairKey) return
    const t = setTimeout(() => setPairKey(serverPair), pairKey === "" || clearlyWorse ? 0 : 1500)
    return () => clearTimeout(t)
  }, [serverPair, pairKey, clearlyWorse])

  if (!sim)
    return error ? (
      <Notice eyebrow={EYEBROW} icon="cloud_off" title="Can't reach the GeoWild API" text={`${error}. Start the backend on port 8000 and try again.`} />
    ) : (
      <Notice eyebrow={EYEBROW} icon="progress_activity" title="Starting the simulation" text="Fetching the animals." />
    )

  const st: SimState = sim.state
  const size = grid.size
  const n = st.animals.length
  const byId = new Map(st.animals.map((a) => [a.id, a]))
  const pos = new Map(st.animals.map((a) => [a.id, livePos(a, sim.at, now, st.running, size, st.speed)]))
  const inside = new Set(zoneOn ? (st.range?.inside_ids ?? []) : [])
  const [idA, idB] = (pairKey || serverPair).split("|")
  const A = byId.get(idA) ?? st.animals[0]
  const B = byId.get(idB) ?? st.animals[1]
  const pa = pos.get(A.id)!
  const pb = pos.get(B.id)!
  const pairDist = Math.hypot(pa[0] - pb[0], pa[1] - pb[1])
  const pairMid = { x: (pa[0] + pb[0]) / 2, y: (pa[1] + pb[1]) / 2 }
  const selected = sel ? byId.get(sel) : undefined
  const hovered = hover ? byId.get(hover) : undefined
  const count = zoneOn ? st.range?.results : undefined
  const bySpecies = grid.species.map((s) => ({ ...s, inside: st.animals.filter((a) => a.species === s.name && inside.has(a.id)).length }))
  const speciesStats = grid.species.map((s) => {
    const members = st.animals.filter((a) => a.species === s.name)
    const groups = new Set(members.map((a) => a.group)).size
    const avg = members.reduce((sum, a) => sum + Math.hypot(a.vx, a.vy), 0) / Math.max(members.length, 1)
    return { ...s, groups, avg, solitary: groups === members.length }
  })
  const maxCount = Math.max(...grid.species.map((s) => s.count))
  const plural = (k: number, one: string) => `${k} ${one}${k === 1 ? "" : "s"}`

  const tag = (id: string, tone: "dark" | "lime") => {
    const a = byId.get(id)!
    const [x, y] = pos.get(id)!
    return (
      <span
        key={id + tone}
        style={at(size, x, y)}
        className={cn(
          "pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-[170%] rounded-full px-2.5 py-0.5 text-[12px] font-semibold whitespace-nowrap",
          tone === "dark" ? "bg-forest text-white" : "bg-lime text-forest"
        )}
      >
        {a.emoji} {a.id} · {a.species}
      </span>
    )
  }

  const walk = (id: NavId) => (
    <Button variant="outline" size="sm" onClick={() => onOpen(id)}>
      Walk through algorithm <Icon name="arrow_forward" className="text-[18px]" />
    </Button>
  )

  return (
    <div className="mx-auto max-w-page px-5 pt-6 pb-4 md:px-8 lg:pt-8">
      {/* A. Page header: chrome, not a card */}
      <header className="rise flex flex-wrap items-start justify-between gap-x-8 gap-y-4" style={stagger(0)}>
        <div className="min-w-0 max-w-xl">
          <h1 className="text-[clamp(28px,3.2vw,38px)] leading-none font-black tracking-[-0.04em] text-ink">GeoWild</h1>
          <p className="mt-1.5 text-lead font-medium text-charcoal">Wildlife Spatial Monitoring</p>
          <p className="mt-3 text-body leading-snug text-slate">
            Simulated animals roam a {size} × {size} habitat. At every step, GeoWild analyzes their current positions to find the closest animals and the animals inside a monitored zone.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {st.running ? (
            <span className="inline-flex h-10 items-center gap-2 rounded-full bg-forest px-4 text-[12px] font-bold tracking-[0.08em] text-lime">
              <span className="gw-live size-2 rounded-full bg-lime" /> LIVE SIMULATION
            </span>
          ) : (
            <span className="inline-flex h-10 items-center gap-2 rounded-full border border-pebble px-4 text-[12px] font-bold tracking-[0.08em] text-slate">
              <Icon name="pause" fill className="text-[14px]" /> PAUSED
            </span>
          )}
          <Button variant={st.running ? "dark" : "primary"} size="sm" onClick={() => control(st.running ? "pause" : "resume")} title={st.running ? "Pause the simulation" : "Play the simulation"}>
            <Icon name={st.running ? "pause" : "play_arrow"} fill className="text-[20px]" /> {st.running ? "Pause" : "Play"}
          </Button>
        </div>
      </header>

      {/* B. Primary bento row: habitat (8 columns, two rows) + analysis rail (4 columns, two sibling modules) */}
      <section className={cn("mt-8 grid md:grid-cols-2 lg:grid-cols-12 lg:grid-rows-[auto_1fr]", GAP)}>
        <div
          className="rise flex min-w-0 flex-col overflow-hidden rounded-hero border border-line bg-surface shadow-[0_6px_20px_rgba(14,15,12,0.04)] md:col-span-2 lg:col-span-8 lg:row-span-2"
          style={stagger(1)}
        >
          <header className={cn("flex items-center gap-3 pb-0", "px-5 pt-5 md:px-6 md:pt-6")}>
            <IconBox icon="landscape" />
            <div>
              <h2 className="text-[18px] leading-tight font-bold tracking-[-0.01em] text-ink">Live habitat</h2>
              <p className="mt-0.5 text-caption text-slate">
                {n} simulated animals · {size} × {size}
              </p>
            </div>
          </header>
          <div className="flex flex-1 items-center px-2 pt-3 sm:px-3 md:px-5">
            <div className="w-full">
            <PlaneView
              size={size}
              draw={draw}
              onDraw={(r) => {
                setZone(r)
                setZoneOn(true)
                setDraw(false)
              }}
              zone={{ rect: zone, visible: zoneOn, editable: true, onChange: setZone }}
              label={`${n} simulated animals moving on a ${size} by ${size} habitat. Closest animals ${A.id} and ${B.id}, ${pairDist.toFixed(2)} units apart. ${count ?? "No"} animals inside the monitoring zone.`}
              overlay={
                <>
                  {draw && (
                    <span className="pointer-events-none absolute top-3 left-3 z-10 inline-flex items-center gap-1.5 rounded-full border border-forest bg-lime px-3 py-1.5 text-micro font-medium text-forest">
                      <Icon name="crop_free" className="text-[16px]" /> Drag on the habitat to draw the zone
                    </span>
                  )}
                  {zoneOn && !draw && (
                    <span
                      style={at(size, zone.xmin, zone.ymax)}
                      className="pointer-events-none absolute z-10 translate-x-4 -translate-y-[145%] rounded-full border bg-surface px-2.5 py-0.5 text-[12px] font-semibold whitespace-nowrap"
                    >
                      <span style={{ color: COLOR.zone }}>
                        <span className="max-sm:hidden">Monitoring zone</span>
                        <span className="sm:hidden">Zone</span>
                        {count !== undefined && ` · ${count} of ${n}`}
                      </span>
                    </span>
                  )}
                  <span
                    style={{ ...at(size, pairMid.x, pairMid.y), background: COLOR.pair }}
                    className="pointer-events-none absolute z-10 -translate-x-[12%] -translate-y-[215%] rounded-full px-2.5 py-0.5 text-[12px] font-semibold whitespace-nowrap text-white"
                    aria-hidden
                  >
                    <span className="sm:hidden">{pairDist.toFixed(2)}</span>
                    <span className="hidden sm:inline">
                      {A.id} ↔ {B.id} · {pairDist.toFixed(2)}
                    </span>
                  </span>
                  {hovered && hovered.id !== sel && hovered.id !== A.id && hovered.id !== B.id && tag(hovered.id, "dark")}
                  {selected && tag(selected.id, "lime")}
                </>
              }
            >
              <line x1={pa[0]} y1={pa[1]} x2={pb[0]} y2={pb[1]} stroke={COLOR.pair} strokeWidth="2" strokeDasharray="5 3" vectorEffect="non-scaling-stroke" />
              {st.animals.map((a) => {
                const [x, y] = pos.get(a.id)!
                const isPair = a.id === A.id || a.id === B.id
                const isIn = inside.has(a.id)
                return (
                  <g key={a.id}>
                    <ellipse cx={x} cy={y - 1.5} rx={1.7} ry={0.6} fill={COLOR.ink} fillOpacity="0.12" />
                    {(isPair || isIn) && (
                      <circle
                        cx={x}
                        cy={y}
                        r={isPair ? 2.8 : 2.4}
                        fill={isPair ? COLOR.pair : COLOR.inside}
                        fillOpacity="0.15"
                        stroke={isPair ? COLOR.pair : COLOR.inside}
                        strokeWidth={isPair ? 2.2 : 1.6}
                        vectorEffect="non-scaling-stroke"
                      />
                    )}
                    <text transform={`translate(${x} ${y}) scale(1 -1)`} textAnchor="middle" dominantBaseline="central" fontSize="3.7" style={{ pointerEvents: "none", userSelect: "none" }}>
                      {a.emoji}
                    </text>
                  </g>
                )
              })}
              {selected && (
                <circle cx={pos.get(selected.id)![0]} cy={pos.get(selected.id)![1]} r={3.8} fill={COLOR.lime} fillOpacity="0.32" stroke={COLOR.ink} strokeWidth="1.6" vectorEffect="non-scaling-stroke" />
              )}
              {!draw &&
                st.animals.map((a) => {
                  const [x, y] = pos.get(a.id)!
                  return (
                    <circle
                      key={`t${a.id}`}
                      cx={x}
                      cy={y}
                      r={3}
                      fill="transparent"
                      style={{ cursor: "pointer" }}
                      onClick={() => setSel(a.id === sel ? null : a.id)}
                      onPointerEnter={(e) => e.pointerType === "mouse" && setHover(a.id)}
                      onPointerLeave={() => setHover((h) => (h === a.id ? null : h))}
                    />
                  )
                })}
            </PlaneView>
            </div>
          </div>

          {/* Only what the picture cannot say by itself */}
          <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1.5 px-5 pb-4 text-caption text-charcoal md:px-6">
            <ul className="flex flex-wrap items-center gap-x-5 gap-y-1">
              <li className="flex items-center gap-2">
                <DashedMark /> Closest two animals
              </li>
              <li className="flex items-center gap-2">
                <span className="inline-block size-3 rounded-full border-2" style={{ borderColor: COLOR.inside, background: `${COLOR.inside}29` }} /> Inside the zone
              </li>
            </ul>
            <p className={cn("text-slate", !selected && "max-sm:hidden")}>
              {selected ? (
                <span className="inline-flex items-center gap-2">
                  <span className="text-ink">
                    {selected.emoji} <span className="num font-mono font-semibold">{selected.id}</span> {selected.species}
                  </span>
                  <span className="num">{Math.hypot(selected.vx, selected.vy).toFixed(1)} units/s</span>
                  <button onClick={() => setSel(null)} aria-label="Clear selection" title="Clear selection" className="grid size-7 cursor-pointer place-items-center rounded-control hover:bg-clay">
                    <Icon name="close" className="text-[16px]" />
                  </button>
                </span>
              ) : (
                "Select an animal to follow it · drag the zone to move or resize it"
              )}
            </p>
          </div>

          {/* Simulation controls belong to the habitat they drive */}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-3 border-t border-line bg-tonal px-5 py-3.5 md:px-6" role="group" aria-label="Simulation controls">
            <span className="inline-flex items-center gap-2 text-caption font-semibold text-ink">
              <span className={cn("size-2.5 rounded-full border", st.running ? "gw-live border-forest bg-lime" : "border-pebble bg-fog")} />
              {st.running ? "Running" : "Paused"}
              <span className="num font-mono font-normal text-slate">· t {st.time.toFixed(1)} s</span>
            </span>
            <div className="flex items-center gap-2.5">
              <span className="text-caption text-slate">Speed</span>
              <Segmented<string> label="Simulation speed" value={`${st.speed}×`} onChange={(v) => control("speed", parseFloat(v))} options={SPEEDS.map((v) => ({ value: v, label: v }))} />
            </div>
            <Button size="sm" variant="outline" className="sm:ml-auto" onClick={() => control("reset")} title="Restart from the beginning (same seed)" aria-label="Restart the simulation">
              <Icon name="restart_alt" className="text-[18px]" /> <span className="max-sm:hidden">Restart</span>
            </Button>
          </div>
        </div>

        <div className="contents">
          <Module
            icon="straighten"
            tone={COLOR.pair}
            title="Closest animals"
            meta="Closest Pair · Divide & Conquer"
            className="lg:col-span-4 lg:col-start-9 lg:row-start-1"
            footer={walk("closest")}
          >
            <div key={A.id + B.id} className="gw-swap flex items-center gap-3">
              <span className="grid min-w-14 place-items-center gap-1 text-center">
                <span className="text-[34px] leading-none">{A.emoji}</span>
                <span className="num font-mono text-caption font-semibold text-ink">{A.id}</span>
              </span>
              <span className="relative flex flex-1 items-center" aria-hidden>
                <DashedMark w="w-full" />
                <Icon name="sync_alt" className="absolute left-1/2 -translate-x-1/2 bg-surface px-1 text-[20px]" />
              </span>
              <span className="grid min-w-14 place-items-center gap-1 text-center">
                <span className="text-[34px] leading-none">{B.emoji}</span>
                <span className="num font-mono text-caption font-semibold text-ink">{B.id}</span>
              </span>
            </div>
            <Metric unit="units apart" color={COLOR.pair} className="mt-5">
              {pairDist.toFixed(2)}
            </Metric>
            <p className="mt-2 text-caption text-slate">Drawn as the dashed red line on the habitat.</p>
            <MetaList className="mt-4">
              <Row k="Species">
                {A.species === B.species ? `Two ${A.species.toLowerCase()}s` : `${A.species} and ${B.species}`}
              </Row>
              <Row k="Comparisons" mono>
                {st.closest.comparisons}
              </Row>
              <Row k="Complexity" mono>
                O(n log n)
              </Row>
            </MetaList>
          </Module>

          <Module
            icon="crop_free"
            tone={COLOR.zone}
            title="Animals in this zone"
            meta="Range Search · KD-Tree"
            className="lg:col-span-4 lg:col-start-9 lg:row-start-2"
            footer={walk("kdtree")}
          >
            <Metric unit={zoneOn ? `of ${n} animals` : undefined}>{zoneOn ? (count ?? "–") : "Hidden"}</Metric>
            <p className="mt-2 min-h-6 text-body text-charcoal" aria-label="Animals in the zone by species">
              {zoneOn && count ? bySpecies.filter((s) => s.inside > 0).map((s) => `${s.emoji} ${s.inside}`).join("   ") : ""}
            </p>
            <MetaList className="mt-3">
              <Row k="Query bounds" mono>
                x {zone.xmin}–{zone.xmax}, y {zone.ymin}–{zone.ymax}
              </Row>
              <Row k="Complexity" mono>
                O(√n + k)
              </Row>
              <Row k="Nodes visited" mono>
                {zoneOn && st.range ? st.range.nodes_visited : "–"}
              </Row>
              <Row k="Subtrees pruned" mono>
                {zoneOn && st.range ? st.range.subtrees_pruned : "–"}
              </Row>
            </MetaList>
            <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2">
              <Switch checked={zoneOn} onChange={setZoneOn} label={zoneOn ? "Zone shown" : "Zone hidden"} />
              <Button size="sm" variant="outline" onClick={() => setDraw((d) => !d)} aria-pressed={draw} title="Drag on the habitat to draw a new zone">
                <Icon name="crop_free" fill={draw} className="text-[18px]" /> {draw ? "Cancel" : "Redraw"}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                title="Restore the default zone"
                onClick={() => {
                  setZone(grid.danger_zone)
                  setZoneOn(true)
                  setDraw(false)
                }}
              >
                <Icon name="undo" className="text-[18px]" /> Reset
              </Button>
            </div>
          </Module>
        </div>
      </section>

      {/* C. Second bento row: simulation state and algorithm activity */}
      <section className="rise mt-12" style={stagger(3)}>
        <h2 className="text-[24px] leading-tight font-bold tracking-[-0.02em] text-ink">Simulation insights</h2>
        <p className="mt-1 text-body text-slate">Current population, movement behaviour, and algorithm activity.</p>

        <div className={cn("mt-5 grid lg:grid-cols-12", GAP)}>
          <Module
            icon="pets"
            tone={COLOR.ink}
            title="Population and movement"
            meta={`${n} animals · ${grid.species.length} species · ${st.speed}× speed · tick ${st.tick}`}
            className="lg:col-span-5"
            footer={<p className="text-caption text-slate">Herds hold together and follow a shared heading; lions roam independently. These rules are simplified and synthetic, not real wildlife behaviour.</p>}
          >
            <ul className="space-y-4">
              {speciesStats.map((s) => (
                <li key={s.name}>
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-body font-semibold text-ink">
                      <span className="mr-2 text-[18px]">{s.emoji}</span>
                      {s.name}
                    </span>
                    <span className="num font-mono text-caption font-semibold text-ink">{s.count}</span>
                  </div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-tonal">
                    <div className="h-full rounded-full bg-forest transition-[width] duration-300 ease-out" style={{ width: `${(s.count / maxCount) * 100}%` }} />
                  </div>
                  <p className="num mt-1.5 text-caption text-slate">
                    {s.solitary ? `${s.count} roaming alone` : `${plural(s.groups, "herd")} of ${Math.round(s.count / s.groups)}`} · averaging {s.avg.toFixed(1)} units/s
                  </p>
                </li>
              ))}
            </ul>
          </Module>

          <Module
            icon="query_stats"
            tone={COLOR.ink}
            title="Spatial analysis"
            meta={`${st.closest.comparisons} comparisons found the closest pair${zoneOn && st.range ? ` · ${st.range.nodes_visited} tree nodes visited` : ""}`}
            className="lg:col-span-7"
            action={
              <Button variant="ghost" size="sm" className="max-sm:hidden" onClick={() => setDetailsOpen((o) => !o)} aria-expanded={detailsOpen} aria-controls="analysis-details">
                {detailsOpen ? "Hide details" : "Show details"}
                <Icon name="expand_more" className={cn("text-[20px] transition-transform duration-200 ease-out", detailsOpen && "rotate-180")} />
              </Button>
            }
          >
            <Button variant="outline" size="sm" className="mb-4 w-full sm:hidden" onClick={() => setDetailsOpen((o) => !o)} aria-expanded={detailsOpen} aria-controls="analysis-details">
              {detailsOpen ? "Hide details" : "Show details"}
              <Icon name="expand_more" className={cn("text-[20px] transition-transform duration-200 ease-out", detailsOpen && "rotate-180")} />
            </Button>
            {detailsOpen && (
              <div id="analysis-details" className="grid gap-x-8 gap-y-6 sm:grid-cols-2 sm:divide-x sm:divide-line">
                <div className="sm:pr-8">
                  <h3 className="flex items-center gap-2 text-body font-bold text-ink">
                    <DashedMark w="w-4" /> Closest pair
                  </h3>
                  <dl className="mt-2">
                    <Row k="Algorithm">Divide &amp; Conquer</Row>
                    <Row k="Closest pair" mono>
                      {A.id} ↔ {B.id}
                    </Row>
                    <Row k="Complexity" mono>
                      O(n log n)
                    </Row>
                    <Row k="Min. distance" mono>
                      {st.closest.distance.toFixed(2)} units
                    </Row>
                    <Row k="Comparisons" mono>
                      {st.closest.comparisons}
                    </Row>
                    <Row k="Recursive calls" mono>
                      {st.closest.recursive_calls}
                    </Row>
                    <Row k="Strip animals" mono>
                      {st.closest.strip_size ?? 0}
                    </Row>
                  </dl>
                </div>
                <div className="sm:pl-8">
                  <h3 className="flex items-center gap-2 text-body font-bold text-ink">
                    <span className="inline-block size-3.5 rounded-[3px] border-[1.5px]" style={{ borderColor: COLOR.zone, background: `${COLOR.zone}1f` }} aria-hidden /> KD-Tree range search
                  </h3>
                  <dl className="mt-2">
                    <Row k="Structure">2D KD-Tree</Row>
                    <Row k="Tree height" mono>
                      {st.range ? `${st.range.tree_height} levels` : "–"}
                    </Row>
                    <Row k="Complexity" mono>
                      O(√n + k)
                    </Row>
                    <Row k="Query bounds" mono>
                      x {zone.xmin}–{zone.xmax}, y {zone.ymin}–{zone.ymax}
                    </Row>
                    <Row k="Nodes visited" mono>
                      {zoneOn && st.range ? st.range.nodes_visited : "–"}
                    </Row>
                    <Row k="Subtrees pruned" mono>
                      {zoneOn && st.range ? st.range.subtrees_pruned : "–"}
                    </Row>
                    <Row k="Results" mono>
                      {zoneOn && st.range ? st.range.results : "–"}
                    </Row>
                  </dl>
                </div>
              </div>
            )}
            {detailsOpen && (
              <p className="mt-5 text-caption text-slate">
                Closest pair splits the habitat at the median x, solves each half, then checks only a thin strip along the split. The KD-tree splits the habitat on x, then y, and skips every cell that cannot touch the zone.
              </p>
            )}
          </Module>
        </div>
      </section>

      <p className="mt-8 text-caption text-slate">Synthetic, seeded simulation (seed {grid.seed}) with simplified herd and solitary movement. Not real wildlife data.</p>
    </div>
  )
}

export default function Overview({ onOpen }: { onOpen: (id: NavId) => void }) {
  const grid = useApi<Grid>("/grid")
  if (grid.status === "error")
    return (
      <Notice
        eyebrow={EYEBROW}
        icon="cloud_off"
        title="Can't reach the GeoWild API"
        text={`${grid.error}. Start the backend on port 8000 and try again.`}
        action={
          <Button variant="dark" size="sm" onClick={grid.retry}>
            Try again
          </Button>
        }
      />
    )
  if (grid.status !== "ready" || !grid.data) return <Notice eyebrow={EYEBROW} icon="progress_activity" title="Starting the simulation" text="Fetching the habitat." />
  return <OverviewContent grid={grid.data} onOpen={onOpen} />
}

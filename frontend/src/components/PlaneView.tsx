import { useRef, useState } from "react"
import { COLOR } from "@/lib/ui"
import { cn } from "@/lib/utils"
import type { Rect } from "@/lib/api"

const TICKS = [0, 20, 40, 60, 80, 100]
const MIN_ZONE = 6

/** A rectangle drawn on the plane that can be dragged to move and resized by its corners. */
export type EditableZone = { rect: Rect; visible: boolean; editable?: boolean; onChange: (r: Rect) => void }

type Drag = { mode: "move" | "resize"; start: [number, number]; rect: Rect; anchor?: [number, number]; last: number; latest: Rect }

/**
 * The 0..size habitat as an SVG with labelled X/Y axes. Children are drawn in habitat coordinates with y pointing up.
 * Optionally lets the user drag out a rectangle (`draw`), or move / resize an existing one (`zone`).
 */
export function PlaneView({
  size,
  children,
  overlay,
  draw,
  onDraw,
  zone,
  className,
  label,
}: {
  size: number
  children: React.ReactNode
  overlay?: React.ReactNode
  draw?: boolean
  onDraw?: (r: Rect) => void
  zone?: EditableZone
  className?: string
  label: string
}) {
  const svg = useRef<SVGSVGElement>(null)
  const start = useRef<[number, number] | null>(null)
  const drag = useRef<Drag | null>(null)
  const [draft, setDraft] = useState<Rect | null>(null)
  const [live, setLive] = useState<Rect | null>(null)

  const plane = (e: React.PointerEvent): [number, number] => {
    const b = svg.current!.getBoundingClientRect()
    const x = Math.min(Math.max(((e.clientX - b.left) / b.width) * size, 0), size)
    const y = Math.min(Math.max(size - ((e.clientY - b.top) / b.height) * size, 0), size)
    return [Math.round(x), Math.round(y)]
  }
  const rect = (a: [number, number], b: [number, number]): Rect => ({
    xmin: Math.min(a[0], b[0]),
    xmax: Math.max(a[0], b[0]),
    ymin: Math.min(a[1], b[1]),
    ymax: Math.max(a[1], b[1]),
  })

  // ---- move / resize an existing zone
  const canEdit = !!zone?.editable && zone.visible && !draw
  const begin = (mode: "move" | "resize", anchor?: [number, number]) => (e: React.PointerEvent<SVGElement>) => {
    if (!canEdit || !zone) return
    e.stopPropagation()
    drag.current = { mode, start: plane(e), rect: zone.rect, anchor, last: 0, latest: zone.rect }
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {
      // no active pointer (synthetic input): the drag still works while the pointer stays over the shape
    }
  }
  const move = (e: React.PointerEvent<SVGElement>) => {
    const d = drag.current
    if (!d || !zone) return
    const p = plane(e)
    let r = d.rect
    if (d.mode === "move") {
      const w = d.rect.xmax - d.rect.xmin
      const h = d.rect.ymax - d.rect.ymin
      const xmin = Math.min(Math.max(d.rect.xmin + p[0] - d.start[0], 0), size - w)
      const ymin = Math.min(Math.max(d.rect.ymin + p[1] - d.start[1], 0), size - h)
      r = { xmin, xmax: xmin + w, ymin, ymax: ymin + h }
    } else {
      const next = rect(d.anchor!, p)
      if (next.xmax - next.xmin < MIN_ZONE || next.ymax - next.ymin < MIN_ZONE) return
      r = next
    }
    d.latest = r
    setLive(r)
    if (e.timeStamp - d.last > 150) {
      d.last = e.timeStamp
      zone.onChange(r) // keep the backend result close to the drag
    }
  }
  const end = () => {
    const d = drag.current
    drag.current = null
    if (d && zone) zone.onChange(d.latest)
    setLive(null)
  }

  const z = live ?? zone?.rect
  const corners: [number, number][] = z
    ? [
        [z.xmin, z.ymin],
        [z.xmax, z.ymin],
        [z.xmax, z.ymax],
        [z.xmin, z.ymax],
      ]
    : []

  return (
    <div className={cn("relative pb-6 pl-7", className)}>
      <div
        className="relative overflow-hidden rounded-card border border-line bg-surface select-none"
        style={{ aspectRatio: "1 / 1", touchAction: draw ? "none" : undefined, cursor: draw ? "crosshair" : undefined }}
        onPointerDown={(e) => {
          if (!draw) return
          start.current = plane(e)
          e.currentTarget.setPointerCapture(e.pointerId)
        }}
        onPointerMove={(e) => {
          if (start.current) setDraft(rect(start.current, plane(e)))
        }}
        onPointerUp={(e) => {
          if (!start.current) return
          const r = rect(start.current, plane(e))
          start.current = null
          setDraft(null)
          if (r.xmax - r.xmin >= 2 && r.ymax - r.ymin >= 2) onDraw?.(r)
        }}
        onPointerCancel={() => {
          start.current = null
          setDraft(null)
        }}
      >
        <svg ref={svg} viewBox={`0 0 ${size} ${size}`} className="absolute inset-0 h-full w-full" role="img" aria-label={label}>
          <defs>
            <pattern id="gw-hatch" width="2.4" height="2.4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <line x1="0" y1="0" x2="0" y2="2.4" stroke="#868685" strokeWidth="0.12" opacity="0.4" />
            </pattern>
          </defs>
          <g transform={`translate(0 ${size}) scale(1 -1)`}>
            {Array.from({ length: size / 10 + 1 }, (_, i) => i * 10).map((v) => (
              <g key={v} stroke={v % 50 === 0 ? "#c9c5b5" : "#e4e1d4"} strokeWidth="1">
                <line x1={v} x2={v} y1={0} y2={size} vectorEffect="non-scaling-stroke" />
                <line x1={0} x2={size} y1={v} y2={v} vectorEffect="non-scaling-stroke" />
              </g>
            ))}
            {z && (
              <rect
                x={z.xmin}
                y={z.ymin}
                width={z.xmax - z.xmin}
                height={z.ymax - z.ymin}
                fill={COLOR.zone}
                fillOpacity="0.09"
                stroke={COLOR.zone}
                strokeWidth="1.5"
                vectorEffect="non-scaling-stroke"
                style={{ opacity: zone?.visible ? 1 : 0, transition: live ? undefined : "opacity 200ms ease-out", cursor: canEdit ? "move" : undefined, pointerEvents: canEdit ? "all" : "none", touchAction: "none" }}
                onPointerDown={begin("move")}
                onPointerMove={move}
                onPointerUp={end}
                onPointerCancel={end}
              />
            )}
            {children}
            {draft && (
              <rect
                x={draft.xmin}
                y={draft.ymin}
                width={draft.xmax - draft.xmin}
                height={draft.ymax - draft.ymin}
                fill={COLOR.zone}
                fillOpacity="0.15"
                stroke={COLOR.zone}
                strokeWidth="2"
                strokeDasharray="5 4"
                vectorEffect="non-scaling-stroke"
              />
            )}
            {canEdit &&
              corners.map(([x, y], i) => {
                const opposite = corners[(i + 2) % 4]
                return (
                  <g key={i} onPointerDown={begin("resize", opposite)} onPointerMove={move} onPointerUp={end} onPointerCancel={end} style={{ cursor: i % 2 ? "nesw-resize" : "nwse-resize", touchAction: "none" }}>
                    <circle cx={x} cy={y} r={3.4} fill="transparent" />
                    <circle cx={x} cy={y} r={1.3} fill="#fff" stroke={COLOR.zone} strokeWidth="2" vectorEffect="non-scaling-stroke" />
                  </g>
                )
              })}
          </g>
        </svg>
        {overlay}
        <span aria-hidden className="pointer-events-none absolute right-2 bottom-1 text-[11px] font-semibold text-slate">X →</span>
        <span aria-hidden className="pointer-events-none absolute top-1 left-2 text-[11px] font-semibold text-slate">Y ↑</span>
      </div>
      {/* Axis labels live outside the SVG so the text keeps a fixed size */}
      <div aria-hidden className="num pointer-events-none absolute right-0 bottom-0 left-7 h-6 text-[11px] text-slate">
        {TICKS.map((t) => (
          <span key={t} className="absolute top-1 -translate-x-1/2" style={{ left: `${t}%` }}>
            {t}
          </span>
        ))}
      </div>
      <div aria-hidden className="num pointer-events-none absolute top-0 bottom-6 left-0 w-7 text-[11px] text-slate">
        {TICKS.map((t) => (
          <span key={t} className="absolute right-1.5 translate-y-1/2" style={{ bottom: `${t}%` }}>
            {t}
          </span>
        ))}
      </div>
    </div>
  )
}

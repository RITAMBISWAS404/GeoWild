import { COLOR } from "@/lib/ui"

/**
 * An animal in a plot: the species emoji with a soft ground shadow, the same on every page.
 * Rendered inside a plane group whose y axis points up, so the text is flipped back upright.
 * `ring` marks a meaningful state only (closest pair, inside the zone, visited by the search).
 */
export function AnimalGlyph({
  x,
  y,
  emoji,
  opacity = 1,
  ring,
}: {
  x: number
  y: number
  emoji: string
  opacity?: number
  ring?: { color: string; width?: number; r?: number; fill?: number }
}) {
  return (
    <g opacity={opacity} style={{ transition: "opacity 250ms ease-out" }}>
      <ellipse cx={x} cy={y - 1.5} rx={1.7} ry={0.6} fill={COLOR.ink} fillOpacity="0.12" />
      {ring && (
        <circle cx={x} cy={y} r={ring.r ?? 2.5} fill={ring.color} fillOpacity={ring.fill ?? 0.15} stroke={ring.color} strokeWidth={ring.width ?? 1.8} vectorEffect="non-scaling-stroke" />
      )}
      <text transform={`translate(${x} ${y}) scale(1 -1)`} textAnchor="middle" dominantBaseline="central" fontSize="3.7" style={{ pointerEvents: "none", userSelect: "none" }}>
        {emoji}
      </text>
    </g>
  )
}

import type { CSSProperties } from "react"

/** Entrance-animation delay slot (see `.rise` in index.css). */
export const stagger = (i: number) => ({ "--i": i }) as CSSProperties

/** Distance in grid units. */
export const fmtDist = (d: number) => `${d.toFixed(2)} units`

/** CSS position (in %) of a grid coordinate, for HTML labels laid over the SVG. */
export const at = (size: number, x: number, y: number) => ({
  left: `${(x / size) * 100}%`,
  top: `${(1 - y / size) * 100}%`,
})

/** Visualization semantics shared by every plot. */
export const COLOR = {
  safe: "#2f8f3a", // animal outside the Danger Zone
  pair: "#cb272f", // closest pair + its dashed connection
  zone: "#cb272f", // Danger Zone outline / translucent fill
  inside: "#f08a24", // animal inside the Danger Zone
  ink: "#163300",
  lime: "#9fe870",
}

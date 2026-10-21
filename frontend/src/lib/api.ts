import { useCallback, useEffect, useRef, useState } from "react"

/** An animal at one simulation tick. The geometry only uses id, x, y; the rest comes from the simulation. */
export type Animal = {
  id: string
  x: number
  y: number
  species: string
  emoji: string
  group: number
  vx: number // habitat units per simulated second
  vy: number
}

/** Rectangle on the habitat (xmin <= xmax, ymin <= ymax). */
export type Rect = { xmin: number; xmax: number; ymin: number; ymax: number }

/** Habitat setup reported by the backend. */
export type Grid = {
  size: number
  count: number
  seed: number
  dt: number
  tick_hz: number
  species: { name: string; emoji: string; count: number; behavior: string }[]
  danger_zone: Rect
}

/** Current positions plus the analyses the backend computed from exactly those positions. */
export type SimState = {
  tick: number
  time: number
  running: boolean
  speed: number
  animals: Animal[]
  closest: { a: string; b: string; distance: number; comparisons: number; recursive_calls: number; strip_size: number | null }
  range: { inside_ids: string[]; nodes_visited: number; subtrees_pruned: number; results: number; tree_height: number } | null
}

export type RangeResult = {
  tick: number
  query: Rect
  animals: Animal[]
  n: number
  nodes_visited: number
  subtrees_pruned: number
  results: number
  visited_ids: string[]
  pruned_ids: string[]
}

export type ClosestPair = {
  tick: number
  a: Animal
  b: Animal
  distance: number
  stats: { n: number; comparisons: number; recursive_calls: number; top_split_x: number | null; top_strip_size: number | null }
  trace: {
    splits: { depth: number; x: number }[]
    left: { a: string; b: string; distance: number }
    right: { a: string; b: string; distance: number }
    delta: number
    strip: {
      ids: string[]
      pairs_checked: number
      improved: boolean
      checks: { a: string; b: string; dy: number; compared: boolean; distance: number | null }[]
    }
    left_ids: string[]
    x_order: string[]
    y_order: string[]
  } | null
}

export type KDNode = {
  id: string
  x: number
  y: number
  axis: 0 | 1
  depth: number
  parent: string | null
  left: string | null
  right: string | null
  size: number
  region: Rect
}
export type KDTreeData = { tick: number; size: number; height: number; nodes: KDNode[] }

const API = (import.meta.env.VITE_API_URL as string | undefined) ?? ""

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API}/api${path}`, init)
  if (!res.ok) throw new Error(`Request failed (${res.status})`)
  return res.json() as Promise<T>
}

const post = <T>(path: string, body: unknown) =>
  request<T>(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })

export const rangeSearch = (rect: Rect, tick?: number) => post<RangeResult>("/range-search", { ...rect, tick })

type Fetch<T> = { status: "loading" | "error" | "ready"; data?: T; error?: string }
const cache = new Map<string, Promise<unknown>>()

/** Fetch a JSON endpoint once (null = wait). Results are cached for the session, failures are not. */
export function useApi<T>(path: string | null) {
  const [state, setState] = useState<Fetch<T>>({ status: "loading" })
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    if (path === null) return
    let live = true
    let p = cache.get(path) as Promise<T> | undefined
    if (!p) {
      p = request<T>(path)
      cache.set(path, p)
      p.catch(() => cache.delete(path))
    }
    p.then((data) => live && setState({ status: "ready", data }))
      .catch((e: Error) => live && setState({ status: "error", error: e.message }))
    return () => {
      live = false
    }
  }, [path, attempt])
  const retry = useCallback(() => {
    setState({ status: "loading" })
    setAttempt((n) => n + 1)
  }, [])
  return { ...state, retry }
}

/** Live simulation: polls the backend ~5 times a second; `at` is when the latest state arrived. */
export function useSimulation(zone: Rect | null) {
  const [sim, setSim] = useState<{ state: SimState; at: number } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const zoneKey = zone ? `?xmin=${zone.xmin}&xmax=${zone.xmax}&ymin=${zone.ymin}&ymax=${zone.ymax}` : ""

  useEffect(() => {
    let live = true
    let timer: ReturnType<typeof setTimeout>
    const poll = async () => {
      try {
        const state = await request<SimState>(`/simulation${zoneKey}`)
        if (live) {
          setSim({ state, at: performance.now() })
          setError(null)
        }
      } catch (e) {
        if (live) setError((e as Error).message)
      }
      if (live) timer = setTimeout(poll, 200)
    }
    poll()
    return () => {
      live = false
      clearTimeout(timer)
    }
  }, [zoneKey])

  const control = useCallback(
    async (action: "pause" | "resume" | "reset" | "step" | "speed", speed?: number) => {
      const state = await post<SimState>("/simulation/control", { action, speed })
      setSim({ state, at: performance.now() })
    },
    []
  )
  return { sim, error, control }
}

/** One frozen simulation tick, for the step-by-step algorithm pages. `refresh` takes a newer snapshot. */
export function useSnapshot() {
  const [attempt, setAttempt] = useState(0)
  const [state, setState] = useState<Fetch<SimState>>({ status: "loading" })
  const grid = useApi<Grid>("/grid")
  useEffect(() => {
    let live = true
    request<SimState>("/simulation")
      .then((data) => live && setState({ status: "ready", data }))
      .catch((e: Error) => live && setState({ status: "error", error: e.message }))
    return () => {
      live = false
    }
  }, [attempt])
  const refresh = useCallback(() => {
    setState({ status: "loading" })
    setAttempt((n) => n + 1)
    grid.retry()
  }, [grid])
  const failed = state.status === "error" || grid.status === "error"
  return {
    status: failed ? ("error" as const) : state.status === "ready" && grid.status === "ready" ? ("ready" as const) : ("loading" as const),
    sim: state.data,
    animals: state.data?.animals ?? [],
    grid: grid.data,
    tick: state.data?.tick,
    refresh,
  }
}

/** requestAnimationFrame clock, so positions can be drawn between server ticks. */
export function useNow(active = true) {
  const [now, setNow] = useState(() => performance.now())
  const raf = useRef(0)
  useEffect(() => {
    if (!active) return
    const loop = (t: number) => {
      setNow(t)
      raf.current = requestAnimationFrame(loop)
    }
    raf.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf.current)
  }, [active])
  return now
}

/** Position of an animal `now`, extrapolated from the last server tick along its velocity (capped at one tick-ish). */
export function livePos(a: Animal, at: number, now: number, running: boolean, size: number, speed = 1): [number, number] {
  const el = running ? Math.min(Math.max((now - at) / 1000, 0), 0.6) * speed : 0
  return [Math.min(Math.max(a.x + a.vx * el, 0), size), Math.min(Math.max(a.y + a.vy * el, 0), size)]
}

/** Danger Zone result for one fixed snapshot (algorithm pages). */
export function useDangerZone(initial: Rect, tick?: number) {
  const [rect, setRect] = useState<Rect>(initial)
  const [result, setResult] = useState<RangeResult | null>(null)
  const [failed, setFailed] = useState(false)
  const req = useRef(0)
  const run = useCallback(
    (r: Rect) => {
      const id = ++req.current
      rangeSearch(r, tick)
        .then((res) => {
          if (id !== req.current) return
          setResult(res)
          setFailed(false)
        })
        .catch(() => id === req.current && setFailed(true))
    },
    [tick]
  )
  useEffect(() => run(initial), [run, initial])
  const apply = useCallback(
    (r: Rect) => {
      setRect(r)
      run(r)
    },
    [run]
  )
  return { rect, result, failed, apply, reset: () => apply(initial) }
}

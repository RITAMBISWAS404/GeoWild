# GeoWild: Project Spec

**GeoWild: Wildlife Territorial Conflict & Habitat Monitoring System.** A university Algorithm 2 project. A synthetic wildlife habitat is simulated; at every moment the animals' current positions feed two computational-geometry analyses. It is a simulation and algorithm visualization, not real wildlife data.

## The two analyses (hand-written in Python, no solver libraries)
1. **Closest Pair of Points**, divide and conquer. Which two animals are closest right now? O(n log n).
2. **2D KD-Tree range search.** Which animals are inside the Danger Zone right now? Build O(n log n), query O(√n + k).

The frontend never implements either algorithm. The backend is the source of truth.

## Architecture
```
Simulation (backend/simulation)        Analysis (backend/algorithms)
  identity, species, x, y, velocity  →   snapshot of (id, x, y)  →  Closest Pair / KD-Tree + range search
```
Simulation produces positions. The algorithms only ever receive a snapshot of them (id, x, y), so they stay independent of movement.

## Simulation
- 50 animals on a **100 × 100 habitat**, fixed seed (42), deterministic: the state at tick *t* depends only on (seed, *t*).
- Tick = 0.2 simulated seconds; the server advances at 5 ticks per second at 1× while running. Controls: `pause`, `resume`, `step`, `reset`, and `speed` (0.25× to 8×; speed only changes how fast ticks arrive, never what they contain).
- Species (emoji is only the visual; the data is numeric x/y):

| Species | Emoji | Count | Behaviour |
|---|---|---|---|
| Elephant | 🐘 | 10 | slow herds of 5, tight cohesion |
| Zebra | 🦓 | 18 | fast herds of 6, strong cohesion |
| Giraffe | 🦒 | 12 | medium herds of 6, loose cohesion |
| Lion | 🦁 | 10 | solitary, independent roaming |

- Movement is smooth, never teleporting: each herd (or solitary animal) has a heading that drifts through a smoothed random turn rate and a walk/graze speed rhythm; walls steer groups back toward the centre; each animal's velocity eases toward a target made of the group direction, a smoothed individual wander, a pull toward the herd centre and a gentle push away from close neighbours. Positions are clamped to the habitat.
- The last 3000 snapshots are kept so any analysis can be pinned to an exact tick.
- Educational model, not an ecological one. No prediction, no learning, no real geography.

## Data model
`Animal { id, x, y, species, emoji, group, vx, vy }` at one tick. Algorithms read only `id, x, y`. Habitat constants: size 100, seed 42, default Danger Zone x 35–70, y 30–65.

## Backend API (FastAPI)
- `GET /api/health`
- `GET /api/grid` → size, count, seed, tick timing, species metadata, default Danger Zone
- `GET /api/simulation[?tick=&xmin=&xmax=&ymin=&ymax=]` → tick, time, running, all animals, closest pair (live, with comparisons, recursive calls and strip size), and a Danger Zone range result (with nodes visited, subtrees pruned and tree height) when a rectangle is given
- `POST /api/simulation/control` `{action: pause|resume|reset|step|speed, speed?}`
- `GET /api/animals[?tick=]`, `GET /api/animals/{id}`
- `GET /api/closest-pair[?tick=]` → pair, distance, stats, trace (sorted orders, splits, half bests, δ, strip checks)
- `POST /api/range-search` `{xmin,xmax,ymin,ymax,tick?}` → animals inside, nodes visited, subtrees pruned, `visited_ids`, `pruned_ids`
- `GET /api/kdtree[?tick=]` → nodes with axis, depth, subtree size and cell region
- Every analysis endpoint takes an optional `tick`. An expired tick returns 404.

## Frontend (React + TS + Vite + Tailwind v4)
- **Live habitat (home)**: a bento dashboard on one grid. Layout system: 12 columns (6 on tablet, 1 on mobile), 16px grid gap, 32px page gutter (20px on mobile), 32px between sections and 48px between major sections, 24px module padding (20px on mobile). Shapes: controls 10px, surfaces 16px, the habitat 20px. Surfaces: page (bone) > primary (surface) > secondary (tonal, for metadata and controls). Plain language leads; algorithm names are secondary.
  - **Header** (page chrome, not a card): GeoWild, "Wildlife Spatial Monitoring", one explanatory sentence; on the right a LIVE SIMULATION status and the Pause / Play button.
  - **Primary row**: the **Live habitat** module (8 columns, 2 rows) beside a 4-column rail of two sibling **Modules** (**Closest animals**, **Animals in this zone**). Every module shares one architecture: icon + title + metadata line, primary content, a tonal label / value metadata list, optional actions, and a footer with an outlined "Walk through algorithm" button. The habitat's footer holds the simulation controls: running state and clock, speed 0.5× to 4× (segmented), Restart. The habitat and rail start and end on the same grid lines.
  - **Habitat**: 100 × 100 plane with a subtle grid and axes, emoji animals with a soft ground shadow (no circles around ordinary animals), the dashed red connection with an id-and-distance chip, the translucent monitoring zone with a "N of 50" chip. Rings mark only state (red pair, orange in-zone, lime selected). Hover labels an animal, click follows it. The zone can be dragged to move, resized by its corners, redrawn, hidden or reset; each change re-queries the backend.
  - **Closest animals**: emoji and ids joined by a red dashed connector matching the habitat, distance in red, species, comparisons, complexity.
  - **Animals in this zone**: count, species breakdown, query bounds, complexity, nodes visited, subtrees pruned; Show-zone switch, Redraw, Reset.
  - **Simulation insights** (second row, 5 + 7 columns): **Population and movement** (species bars on one shared scale, herds vs solitary, live average speed, a note that movement is simplified and synthetic) and **Spatial analysis** (expandable; open on desktop, closed on mobile): closest-pair algorithm, complexity, minimum distance, comparisons, recursive calls, strip animals; KD-tree structure, height, complexity, query bounds, nodes visited, subtrees pruned, results.
  - Information levels: 1 what is happening now (habitat, closest animals, animals in zone); 2 simulation state (population, species, time, speed); 3 how the algorithms work (comparisons, recursive calls, pruning, bounds, complexity).
  - Buttons: dark filled (Pause), lime filled (Play), outlined (secondary actions), ghost (tertiary), icon buttons with a title and aria-label. The highlighted closest pair is held steady (switches after 1.5 s of stability, or at once if the held pair is more than 40% farther apart than the true closest). Motion: polls `/api/simulation` about five times a second and draws positions between ticks by extrapolating along each velocity on `requestAnimationFrame`. Algorithm results always come from the backend.
- **Closest pair** and **KD-Tree search** use the Overview's design language (same page width and gutters, header type scale, icon boxes, modules, tonal metadata rows, button tiers, shape family, and the same emoji animals with soft ground shadows) but an editorial composition: header (icon, eyebrow, title, one-line description, snapshot chip and "New snapshot" button) > result and evidence modules beside a **Walkthrough** surface > supporting module(s) > "How it works". Each page analyses one frozen snapshot (a pinned tick) so the explanation does not move under the reader.
  - Walkthrough surface: current-step banner, the plot, a plain legend, and one control bar (numbered steps 1 to 8, Back, Next, Reset, Show result; arrow keys also move between steps). Closest pair legend: median split, strip of width 2δ, in the strip, closest pair, distance. KD-Tree legend: visited, pruned, inside zone, not searched, x split, y split; plus a split-line depth control (3 levels, 5 levels, All) and tap-an-animal node details.
  - **Closest animals** result: emoji and ids with the red dashed connector, distance, species ("Zebra + Lion"), point comparisons, recursive calls, complexity. **Work behind the result**: median split, best half distance δ, strip candidates, strip pairs compared and skipped, and the brute-force count shown only as a reference.
  - **Animals in this zone** result: "N of 50 animals", species breakdown, "KD-Tree Search avoided inspecting X of 50 animals", X range, Y range, zone size, Redraw and Reset. **Work behind the result**: nodes visited, branches pruned, matches, tree height, query and build complexity. **The search tree** shows the top four levels with visited and pruned nodes.
  - On tablet and mobile the order is header, result, walkthrough, evidence, then explanation.
- Plots are SVG (`PlaneView`) with a labelled 0–100 grid; no map library, no state-management library.

## Visualization semantics
Safe animals green, closest pair red with a dashed red line, Danger Zone translucent red, animals inside orange; grid, labelled axes, legend.

## Design direction
Forest green, lime for active states, warm off-white surfaces, pills and hairline borders.

## Deployment direction
Static frontend build plus a small FastAPI service (the simulation clock runs inside the API process). Development uses the Vite `/api` proxy; for production set `VITE_API_URL` to the backend's address (the backend's CORS list currently allows only the local dev origins).

# GeoWild

**GeoWild: Wildlife Territorial Conflict & Habitat Monitoring System** is an Algorithm 2 lab project at IIIT Kalyani. A synthetic herd simulation of 50 animals on a 100 × 100 habitat supplies live point data to two hand-written computational geometry algorithms, and a web interface shows what they compute and how.

- **Closest pair:** which two animals are nearest to each other right now?
- **Range search:** which animals are inside a rectangular monitoring zone?

## Features

- Deterministic synthetic wildlife simulation (seed 42): 10 elephants, 18 zebras, 12 giraffes and 10 lions moving smoothly in herds or alone, with pause, step, speed and restart controls.
- Closest Pair of Points using divide and conquer.
- Two-dimensional KD-tree with rectangular range search.
- Live habitat view with the closest pair highlighted and a draggable, resizable monitoring zone.
- Step-by-step walkthroughs of both algorithms, replayed from traces produced by the algorithm code, with operation counts (comparisons, recursive calls, nodes visited, subtrees pruned).

## Algorithms

Both are implemented manually in Python (`backend/algorithms/`); no computational geometry library is used, and the frontend never reimplements them.

| Algorithm | File | Complexity |
|---|---|---|
| Closest pair, divide and conquer | `closest_pair.py` | O(n log n) time (sort once, split at the median, check only the strip around the dividing line) |
| KD-tree build | `kd_tree.py` | O(n log n) |
| KD-tree rectangular range search | `kd_tree.py` | Expected O(√n + k) for a balanced tree under suitable assumptions, where k is the number of results; not a guarantee for every query |

The report in `docs/` explains both algorithms and reports sample results.

## Technology Stack

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS, base-ui components; plots are plain SVG.
- **Backend:** Python, FastAPI, Uvicorn, Pydantic.
- **Linting:** oxlint.

## Project Structure

```
backend/
  main.py                 FastAPI app and simulation clock
  routes/api.py           API endpoints
  models/                 Animal and response schemas
  simulation/engine.py    Deterministic movement simulation
  algorithms/             closest_pair.py, kd_tree.py
  data/dataset.py         Habitat constants (grid size, seed, default zone)
  verify_algorithms.py    Correctness checks against brute force / linear scan
  requirements.txt
frontend/
  src/pages/              Live habitat, Closest pair, KD-Tree search
  src/components/         Shared UI and plot components
  src/lib/                API client and helpers
docs/
  PROJECT_SPEC.md         Project specification
  GeoWild_Project_Report.pdf   Project report
```

## Prerequisites

- Python 3.12 (developed and tested with 3.12.10)
- Node.js 24 with npm (tested with Node 24.20)

## Getting Started

Start the backend first; the frontend proxies `/api` requests to `127.0.0.1:8000`.

**Backend (Windows PowerShell)**

```powershell
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python -m uvicorn main:app --host 127.0.0.1 --port 8000
```

On macOS/Linux, activate with `source .venv/bin/activate` instead. Check http://127.0.0.1:8000/api/health.

**Frontend (second terminal)**

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173. Pages are switched with the sidebar buttons.

## Verification

```bash
cd backend
python verify_algorithms.py     # run inside the activated virtual environment

cd ../frontend
npm run build                   # type-check and production build
npm run lint
```

The verification script checks both algorithms against brute force and a linear scan on random inputs and on simulation snapshots, and prints operation counts for larger inputs.

## Dataset

All animal positions and movement are synthetic, generated from a fixed random seed. They do not represent real wildlife tracking, geography or behaviour. The animal emoji are only visual labels.

## Team

| Name | Roll No. |
|---|---|
| Samridhi Mukhopadhay | 1134 |
| Ritam Biswas | 1128 |
| Sanu Mukherjee | 1135 |

## License

No license has been selected.

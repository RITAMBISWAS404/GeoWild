from collections import OrderedDict

from fastapi import APIRouter, HTTPException

from algorithms.closest_pair import closest_pair
from algorithms.kd_tree import KDTree
from data.dataset import DANGER_ZONE, GRID, SEED
from models.animal import Animal
from models.schemas import (
    ClosestPairResult,
    ControlRequest,
    GridInfo,
    KDTreeOut,
    LiveClosest,
    LiveRange,
    RangeQuery,
    RangeRequest,
    RangeSearchResult,
    SimulationState,
    SpeciesInfo,
)
from simulation.engine import COUNT, DT, SPECIES, Simulation

router = APIRouter(prefix="/api")

# Simulation produces positions; the algorithms below only ever see a snapshot of them.
SIM = Simulation(SEED)
TICK_HZ = 5.0

_closest: OrderedDict[int, dict] = OrderedDict()
_trees: OrderedDict[int, KDTree] = OrderedDict()


def _snapshot(tick: int | None) -> tuple[int, tuple[Animal, ...]]:
    found = SIM.snapshot(tick)
    if found is None:
        raise HTTPException(status_code=404, detail=f"Tick {tick} is no longer available. Take a new snapshot.")
    return found


def _remember(cache: OrderedDict, key: int, value, keep: int = 16):
    cache[key] = value
    while len(cache) > keep:
        cache.popitem(last=False)
    return value


def _closest_for(tick: int, animals) -> dict:
    return _closest.get(tick) or _remember(_closest, tick, closest_pair(animals))


def _tree_for(tick: int, animals) -> KDTree:
    return _trees.get(tick) or _remember(_trees, tick, KDTree(animals), keep=8)


@router.get("/health")
def health():
    return {"status": "ok", "service": "geowild"}


@router.get("/grid", response_model=GridInfo)
def get_grid():
    return GridInfo(
        size=GRID,
        count=COUNT,
        seed=SEED,
        dt=DT,
        tick_hz=TICK_HZ,
        species=[SpeciesInfo(name=s.name, emoji=s.emoji, count=s.count, behavior=s.behavior) for s in SPECIES],
        danger_zone=RangeQuery(**DANGER_ZONE),
    )


@router.get("/simulation", response_model=SimulationState)
def get_simulation(
    tick: int | None = None,
    xmin: float | None = None,
    xmax: float | None = None,
    ymin: float | None = None,
    ymax: float | None = None,
):
    """Positions at a tick (default: now) with closest pair, and a range search if a rectangle is given."""
    t, animals = _snapshot(tick)
    cp = _closest_for(t, animals)
    live_range = None
    if None not in (xmin, xmax, ymin, ymax):
        q = RangeQuery(xmin=xmin, xmax=xmax, ymin=ymin, ymax=ymax)  # normalises reversed bounds
        r = _tree_for(t, animals).range_search(q.xmin, q.xmax, q.ymin, q.ymax)
        live_range = LiveRange(
            inside_ids=[p.id for p in r["points"]],
            nodes_visited=r["stats"]["nodes_visited"],
            subtrees_pruned=r["stats"]["subtrees_pruned"],
            results=r["stats"]["results"],
            tree_height=_tree_for(t, animals).height,
        )
    return SimulationState(
        tick=t,
        time=round(t * DT, 3),
        running=SIM.running,
        speed=SIM.speed,
        animals=list(animals),
        closest=LiveClosest(
            a=cp["a"].id,
            b=cp["b"].id,
            distance=cp["distance"],
            comparisons=cp["stats"]["comparisons"],
            recursive_calls=cp["stats"]["recursive_calls"],
            strip_size=cp["stats"]["top_strip_size"],
        ),
        range=live_range,
    )


@router.post("/simulation/control", response_model=SimulationState)
def control(req: ControlRequest):
    if req.action == "pause":
        SIM.set_running(False)
    elif req.action == "resume":
        SIM.set_running(True)
    elif req.action == "reset":
        SIM.reset()
        _closest.clear()
        _trees.clear()
    elif req.action == "step":
        SIM.step()
    elif req.action == "speed" and req.speed is not None:
        SIM.set_speed(req.speed)
    return get_simulation()


@router.get("/animals", response_model=list[Animal])
def list_animals(tick: int | None = None):
    return list(_snapshot(tick)[1])


@router.get("/animals/{animal_id}", response_model=Animal)
def get_animal(animal_id: str, tick: int | None = None):
    for a in _snapshot(tick)[1]:
        if a.id == animal_id:
            return a
    raise HTTPException(status_code=404, detail=f"Animal {animal_id} not found")


@router.get("/closest-pair", response_model=ClosestPairResult)
def get_closest_pair(tick: int | None = None):
    t, animals = _snapshot(tick)
    return {"tick": t, **_closest_for(t, animals)}


@router.post("/range-search", response_model=RangeSearchResult)
def range_search(q: RangeRequest):
    t, animals = _snapshot(q.tick)
    r = _tree_for(t, animals).range_search(q.xmin, q.xmax, q.ymin, q.ymax)
    s = r["stats"]
    return RangeSearchResult(
        tick=t,
        query=RangeQuery(xmin=q.xmin, xmax=q.xmax, ymin=q.ymin, ymax=q.ymax),
        animals=r["points"],
        n=s["n"],
        nodes_visited=s["nodes_visited"],
        subtrees_pruned=s["subtrees_pruned"],
        results=s["results"],
        visited_ids=r["visited_ids"],
        pruned_ids=r["pruned_ids"],
    )


@router.get("/kdtree", response_model=KDTreeOut)
def get_kdtree(tick: int | None = None):
    t, animals = _snapshot(tick)
    tree = _tree_for(t, animals)
    return KDTreeOut(tick=t, size=tree.size, height=tree.height, nodes=tree.export_nodes((0.0, float(GRID), 0.0, float(GRID))))

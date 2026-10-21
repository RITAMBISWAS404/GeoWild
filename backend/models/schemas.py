from typing import Literal

from pydantic import BaseModel, Field, model_validator

from models.animal import Animal


class RangeQuery(BaseModel):
    """Rectangle on the 100 x 100 grid. Reversed bounds are accepted and normalised."""

    xmin: float = Field(allow_inf_nan=False)
    xmax: float = Field(allow_inf_nan=False)
    ymin: float = Field(allow_inf_nan=False)
    ymax: float = Field(allow_inf_nan=False)

    @model_validator(mode="after")
    def normalise(self):
        if self.xmin > self.xmax:
            self.xmin, self.xmax = self.xmax, self.xmin
        if self.ymin > self.ymax:
            self.ymin, self.ymax = self.ymax, self.ymin
        return self


class RangeRequest(RangeQuery):
    """A range query. `tick` pins it to one simulation snapshot (default: the current one)."""

    tick: int | None = None


class RangeSearchResult(BaseModel):
    tick: int
    query: RangeQuery
    animals: list[Animal]
    n: int
    nodes_visited: int
    subtrees_pruned: int
    results: int
    visited_ids: list[str]
    pruned_ids: list[str]


class ClosestPairStats(BaseModel):
    n: int
    comparisons: int
    recursive_calls: int
    top_split_x: float | None
    top_strip_size: int | None


class ClosestPairResult(BaseModel):
    tick: int
    a: Animal
    b: Animal
    distance: float
    stats: ClosestPairStats
    trace: "ClosestPairTrace | None" = None


class SpeciesInfo(BaseModel):
    name: str
    emoji: str
    count: int
    behavior: str


class GridInfo(BaseModel):
    """Habitat setup: grid size, animal count, seed, tick timing, species and the default Danger Zone."""

    size: int
    count: int
    seed: int
    dt: float  # simulated seconds per tick
    tick_hz: float  # ticks per real second while running
    species: list[SpeciesInfo]
    danger_zone: RangeQuery


class LiveClosest(BaseModel):
    a: str
    b: str
    distance: float
    comparisons: int
    recursive_calls: int
    strip_size: int | None


class LiveRange(BaseModel):
    inside_ids: list[str]
    nodes_visited: int
    subtrees_pruned: int
    results: int
    tree_height: int


class SimulationState(BaseModel):
    """Current positions plus the two analyses computed from exactly those positions."""

    tick: int
    time: float  # simulated seconds
    running: bool
    speed: float
    animals: list[Animal]
    closest: LiveClosest
    range: LiveRange | None = None


class ControlRequest(BaseModel):
    action: Literal["pause", "resume", "reset", "step", "speed"]
    speed: float | None = None  # for action "speed": 0.25 to 8


class ClosestPairSplit(BaseModel):
    depth: int
    x: float


class PairInfo(BaseModel):
    a: str
    b: str
    distance: float


class StripCheck(BaseModel):
    a: str
    b: str
    dy: float
    compared: bool  # False = stopped early: the y-gap already reached delta
    distance: float | None


class StripInfo(BaseModel):
    checks: list[StripCheck]
    ids: list[str]
    pairs_checked: int
    improved: bool


class ClosestPairTrace(BaseModel):
    """Top-level divide-and-conquer step, for visualisation."""

    splits: list[ClosestPairSplit]
    left: PairInfo
    right: PairInfo
    delta: float
    strip: StripInfo
    left_ids: list[str]
    x_order: list[str]
    y_order: list[str]


class Region(BaseModel):
    xmin: float
    xmax: float
    ymin: float
    ymax: float


class KDNodeOut(BaseModel):
    id: str
    x: float
    y: float
    axis: int  # 0 = x split (vertical line), 1 = y split (horizontal line)
    depth: int
    parent: str | None
    left: str | None
    right: str | None
    size: int  # points in this node's subtree
    region: Region  # the cell this node splits


class KDTreeOut(BaseModel):
    tick: int
    size: int
    height: int
    nodes: list[KDNodeOut]

ClosestPairResult.model_rebuild()

"""Deterministic wildlife movement simulation (synthetic; an educational model, not an ecological one).

State at tick t depends only on (seed, t): one seeded RNG is consumed in a fixed order every tick, so the
same seed always replays the same herds. Motion is smooth: group headings turn gradually, velocities ease
toward targets, and walls steer groups back rather than reflecting them.

Simulation (this module) is separate from analysis: it only produces positions. The closest-pair and
KD-tree algorithms receive each tick's snapshot of those positions.
"""
import math
import random
import threading
from collections import OrderedDict
from dataclasses import dataclass, field

from data.dataset import GRID, SEED
from models.animal import Animal

DT = 0.2  # simulated seconds per tick
HISTORY = 3000  # snapshots kept (10 minutes at 1x speed)
WALL_MARGIN = 14.0


@dataclass(frozen=True)
class Species:
    name: str
    emoji: str
    prefix: str
    count: int
    group_size: int  # 1 = solitary
    speed: float  # cruising speed, units per second
    cohesion: float  # pull toward the herd centre
    wander: float  # individual meander relative to speed
    behavior: str


SPECIES = (
    Species("Elephant", "🐘", "E", 10, 5, 0.9, 0.5, 0.10, "Slow herds that stay tightly together"),
    Species("Zebra", "🦓", "Z", 18, 6, 2.0, 0.9, 0.25, "Fast herds with strong cohesion"),
    Species("Giraffe", "🦒", "G", 12, 6, 1.2, 0.5, 0.15, "Loose herds drifting at a medium pace"),
    Species("Lion", "🦁", "L", 10, 1, 1.6, 0.0, 0.45, "Solitary roamers, independent paths"),
)
COUNT = sum(s.count for s in SPECIES)


@dataclass
class _Body:
    id: str
    spec: Species
    group: int
    x: float
    y: float
    vx: float
    vy: float
    wx: float = 0.0  # smoothed individual wander
    wy: float = 0.0


@dataclass
class _Group:
    spec: Species
    heading: float
    turn: float = 0.0
    phase: float = 0.0
    members: list = field(default_factory=list)


def _wrap(a: float) -> float:
    return (a + math.pi) % (2 * math.pi) - math.pi


class Simulation:
    def __init__(self, seed: int = SEED):
        self.seed = seed
        self._lock = threading.RLock()
        self.running = True
        self.speed = 1.0  # pace multiplier; only changes how fast ticks arrive, never what they contain
        self._init()

    # ---- construction -------------------------------------------------------------------------
    def _init(self) -> None:
        self.rng = random.Random(self.seed)
        self.tick = 0
        self.groups: list[_Group] = []
        self.bodies: list[_Body] = []
        for spec in SPECIES:
            made = 0
            while made < spec.count:
                size = min(spec.group_size, spec.count - made)
                g = _Group(spec, heading=self.rng.uniform(-math.pi, math.pi), phase=self.rng.uniform(0, 6.28))
                cx, cy = self.rng.uniform(18, GRID - 18), self.rng.uniform(18, GRID - 18)
                spread = 4.5 if size > 1 else 0.0
                for _ in range(size):
                    made += 1
                    x = min(max(cx + self.rng.gauss(0, spread), 1), GRID - 1)
                    y = min(max(cy + self.rng.gauss(0, spread), 1), GRID - 1)
                    sp = spec.speed * 0.7
                    b = _Body(f"{spec.prefix}{made:02d}", spec, len(self.groups), x, y, math.cos(g.heading) * sp, math.sin(g.heading) * sp)
                    g.members.append(b)
                    self.bodies.append(b)
                self.groups.append(g)
        self.history: OrderedDict[int, tuple[Animal, ...]] = OrderedDict()
        self._record()

    def _record(self) -> None:
        snap = tuple(
            Animal(b.id, round(b.x, 3), round(b.y, 3), b.spec.name, b.spec.emoji, b.group, round(b.vx, 3), round(b.vy, 3))
            for b in sorted(self.bodies, key=lambda b: b.id)
        )
        self.history[self.tick] = snap
        while len(self.history) > HISTORY:
            self.history.popitem(last=False)

    # ---- one tick of motion ---------------------------------------------------------------------
    def _advance(self) -> None:
        rng = self.rng
        for g in self.groups:
            spec = g.spec
            n = len(g.members)
            cx = sum(b.x for b in g.members) / n
            cy = sum(b.y for b in g.members) / n
            # Heading drifts through a smoothed random turn rate
            g.turn = 0.92 * g.turn + 0.08 * rng.gauss(0, 1.3)
            g.heading += g.turn * DT
            edge = min(cx, cy, GRID - cx, GRID - cy)
            if edge < WALL_MARGIN:  # steer back toward the middle, harder the closer to the wall
                prox = (WALL_MARGIN - edge) / WALL_MARGIN
                g.heading += _wrap(math.atan2(GRID / 2 - cy, GRID / 2 - cx) - g.heading) * min(1.0, 3.0 * prox * DT)
            g.phase += DT * 0.15
            speed = spec.speed * (0.75 + 0.25 * math.sin(g.phase))  # walk / graze rhythm
            dx, dy = math.cos(g.heading) * speed, math.sin(g.heading) * speed
            for b in g.members:
                b.wx = 0.93 * b.wx + 0.07 * rng.gauss(0, 1) * spec.wander * spec.speed
                b.wy = 0.93 * b.wy + 0.07 * rng.gauss(0, 1) * spec.wander * spec.speed
                tx, ty = dx + b.wx, dy + b.wy
                if spec.cohesion > 0 and n > 1:
                    ox, oy = cx - b.x, cy - b.y
                    dist = math.hypot(ox, oy)
                    if dist > 4.0:
                        pull = spec.cohesion * min(dist - 4.0, 6.0) * 0.3
                        tx += ox / dist * pull
                        ty += oy / dist * pull
                b.vx += (tx - b.vx) * min(1.0, 1.5 * DT)
                b.vy += (ty - b.vy) * min(1.0, 1.5 * DT)
        # Personal space: close neighbours push each other apart through their velocities (stays smooth)
        bodies = self.bodies
        for i, a in enumerate(bodies):
            for b in bodies[i + 1:]:
                ox, oy = a.x - b.x, a.y - b.y
                d2 = ox * ox + oy * oy
                if d2 < 3.24:
                    d = math.sqrt(d2) or 1e-6
                    push = (1.8 - d) * 2.0 * DT
                    a.vx += ox / d * push
                    a.vy += oy / d * push
                    b.vx -= ox / d * push
                    b.vy -= oy / d * push
        for b in bodies:
            b.x += b.vx * DT
            b.y += b.vy * DT
            if b.x < 0.5 or b.x > GRID - 0.5:
                b.x = min(max(b.x, 0.5), GRID - 0.5)
                b.vx *= -0.5
            if b.y < 0.5 or b.y > GRID - 0.5:
                b.y = min(max(b.y, 0.5), GRID - 0.5)
                b.vy *= -0.5

    # ---- public API -----------------------------------------------------------------------------
    def step(self, n: int = 1) -> None:
        with self._lock:
            for _ in range(n):
                self._advance()
                self.tick += 1
                self._record()

    def reset(self) -> None:
        with self._lock:
            self._init()

    def set_speed(self, speed: float) -> None:
        with self._lock:
            self.speed = min(max(speed, 0.25), 8.0)

    def set_running(self, running: bool) -> None:
        with self._lock:
            self.running = running

    def snapshot(self, tick: int | None = None) -> tuple[int, tuple[Animal, ...]] | None:
        """Positions at `tick` (default: now). None if that tick has left the history window."""
        with self._lock:
            t = self.tick if tick is None else tick
            snap = self.history.get(t)
            return (t, snap) if snap is not None else None

"""Lightweight correctness/complexity checks. Run: .venv/Scripts/python verify_algorithms.py"""
import math
import random
from collections import namedtuple
from itertools import combinations

from algorithms.closest_pair import closest_pair
from algorithms.kd_tree import KDTree
from simulation.engine import Simulation

P = namedtuple("P", "id x y")


def brute_closest(pts):
    return min(math.dist((a.x, a.y), (b.x, b.y)) for a, b in combinations(pts, 2))


def make(coords):
    return [P(f"p{i}", x, y) for i, (x, y) in enumerate(coords)]


def check_cp(pts, label):
    r = closest_pair(pts)
    ref = brute_closest(pts)
    assert math.isclose(r["distance"], ref, abs_tol=1e-12), (label, r["distance"], ref)
    assert math.isclose(math.dist((r["a"].x, r["a"].y), (r["b"].x, r["b"].y)), r["distance"])
    assert r["a"].id != r["b"].id


# ---- Closest pair
r = closest_pair(make([(0, 0), (3, 4), (1, 1), (10, 10), (1.5, 1.2)]))
assert {r["a"].id, r["b"].id} == {"p2", "p4"}  # known answer: (1,1)-(1.5,1.2)
check_cp(make([(5, 5), (5, 5), (9, 1)]), "duplicates")
check_cp(make([(0, 0), (4, 0), (4.0001, 0), (8, 0)]), "straddles median, very close")
check_cp(make([(x, 0) for x in range(10)] + [(4.5, 0.2)]), "vertical split line, tied x")
rng = random.Random(7)
for t in range(300):
    n = rng.randint(2, 60)
    span = rng.choice([3, 10, 1000])  # small span => many ties / duplicates
    check_cp(make([(rng.randint(0, span), rng.randint(0, span)) for _ in range(n)]), f"grid {t}")
    check_cp(make([(rng.uniform(0, span), rng.uniform(0, span)) for _ in range(n)]), f"float {t}")
print("closest pair: known/duplicate/median/random (600 cases) OK")

# ---- KD-tree
tiny = make([(2, 3), (5, 4), (9, 6), (4, 7), (8, 1), (7, 2)])
t = KDTree(tiny)
assert t.size == 6 and t.root.axis == 0
res = t.range_search(2, 5, 3, 4)  # boundaries inclusive
assert {p.id for p in res["points"]} == {"p0", "p1"}
assert KDTree([]).range_search(0, 1, 0, 1)["points"] == []
assert t.range_search(100, 200, 100, 200)["points"] == []  # empty range
assert len(t.range_search(-1e9, 1e9, -1e9, 1e9)["points"]) == 6  # all points
assert {p.id for p in t.range_search(5, 2, 4, 3)["points"]} == {"p0", "p1"}  # swapped bounds normalised

def check_tree_invariant(node, lo_hi=None):
    if node is None:
        return 0
    c = (node.point.x, node.point.y)[node.axis]
    for side, child in (("l", node.left), ("r", node.right)):
        stack = [child]
        while stack:
            s = stack.pop()
            if s is None:
                continue
            v = (s.point.x, s.point.y)[node.axis]
            assert v <= c if side == "l" else v >= c
            stack += [s.left, s.right]
    return 1 + check_tree_invariant(node.left) + check_tree_invariant(node.right)

for t_i in range(200):
    n = rng.randint(1, 80)
    span = rng.choice([4, 20, 500])
    pts = make([(rng.randint(0, span), rng.randint(0, span)) for _ in range(n)])
    tree = KDTree(pts)
    assert check_tree_invariant(tree.root) == n
    for _ in range(15):
        # boundaries drawn from actual point coordinates to hit inclusive edges
        a, b = rng.choice(pts), rng.choice(pts)
        x1, x2, y1, y2 = a.x, b.x, a.y, b.y
        got = {p.id for p in tree.range_search(x1, x2, y1, y2)["points"]}
        want = {p.id for p in pts if min(x1, x2) <= p.x <= max(x1, x2) and min(y1, y2) <= p.y <= max(y1, y2)}
        assert got == want, (t_i, x1, x2, y1, y2)
print("kd-tree: construction invariant, boundaries, empty, all, 3000 queries vs linear scan OK")

# ---- Simulation snapshots (the point sets the algorithms really receive)
sim = Simulation(42)
other = Simulation(42)
other.step(300)
checked = []
for target in (0, 1, 7, 50, 150, 300, 600, 1000):
    sim.step(target - sim.tick)
    tick, data = sim.snapshot()
    assert tick == target and len(data) == 50
    assert all(0 <= a.x <= 100 and 0 <= a.y <= 100 for a in data), "inside the habitat"
    if target == 300:
        assert data == other.snapshot()[1], "same seed, same tick, same positions"
    check_cp(list(data), f"tick {target}")
    tree = KDTree(data)
    assert check_tree_invariant(tree.root) == 50
    for rect in [(0, 100, 0, 100), (35, 70, 30, 65), (0, 5, 0, 5), (200, 300, 200, 300), (70, 35, 65, 30)] + [
        (rng.uniform(0, 60), rng.uniform(40, 100), rng.uniform(0, 60), rng.uniform(40, 100)) for _ in range(20)
    ]:
        r = tree.range_search(*rect)
        got = {p.id for p in r["points"]}
        want = {p.id for p in data if min(rect[:2]) <= p.x <= max(rect[:2]) and min(rect[2:]) <= p.y <= max(rect[2:])}
        assert got == want, (target, rect)
    checked.append(target)
cp = closest_pair(list(sim.snapshot()[1]))
print(f"simulation: snapshots at ticks {checked} match brute force / linear scan; tick {sim.tick}: closest {cp['a'].id}-{cp['b'].id} d={cp['distance']:.3f}, {cp['stats']['comparisons']} comparisons")

# ---- Complexity evidence (operation counts, not wall time)
print("\n    n   cp.comparisons  cp/(n log2 n)  tree.height  log2 n  kd visited(small box)  sqrt(n)")
for n in (1000, 4000, 16000, 64000):
    pts = make([(rng.uniform(0, 1000), rng.uniform(0, 1000)) for _ in range(n)])
    c = closest_pair(pts)["stats"]["comparisons"]
    tr = KDTree(pts)
    side = 1000 * 0.05  # 5% x 5% box => k ~ 0.0025 n
    vis = sum(tr.range_search(x, x + side, y, y + side)["stats"]["nodes_visited"]
              for x, y in [(rng.uniform(0, 950), rng.uniform(0, 950)) for _ in range(20)]) / 20
    print(f"{n:6d} {c:14d} {c / (n * math.log2(n)):13.2f} {tr.height:12d} {math.log2(n):7.1f} {vis:21.0f} {math.sqrt(n):9.0f}")
print("\nALL CHECKS PASSED")

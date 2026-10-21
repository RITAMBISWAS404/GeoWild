"""Closest pair of points, divide and conquer, O(n log n).

Sorting happens exactly once (by x and by y). Recursion works on index ranges of the
x-sorted array and on y-sorted lists of x-ranks, so each level costs O(n) in total:
T(n) = 2T(n/2) + O(n)  =>  O(n log n). Points need `.id`, `.x`, `.y`.

Besides the answer, the top-level split is traced (left/right best pairs, strip) so the
frontend can explain the process. Tracing adds O(n) work once and does not change the algorithm.
"""
from math import sqrt

TRACE_SPLIT_DEPTH = 2  # report split lines for the first three recursion levels only


def closest_pair(points) -> dict:
    n = len(points)
    if n < 2:
        raise ValueError("closest_pair needs at least 2 points")

    px = sorted(points, key=lambda p: (p.x, p.y))  # x order; a point's position in px is its unique rank
    rank_of = {id(p): r for r, p in enumerate(px)}
    py = [rank_of[id(p)] for p in sorted(points, key=lambda p: (p.y, p.x))]  # ranks in y order

    stats = {"comparisons": 0, "recursive_calls": 0, "top_split_x": None, "top_strip_size": None}
    best = [float("inf"), 0, 0]  # squared distance, rank a, rank b
    trace = {
        "splits": [], "left": None, "right": None, "delta": None, "strip": None, "left_ids": [],
        "x_order": [p.id for p in px], "y_order": [px[r].id for r in py],
    }

    def dist2(a: int, b: int) -> float:
        stats["comparisons"] += 1
        d = (px[a].x - px[b].x) ** 2 + (px[a].y - px[b].y) ** 2
        if d < best[0]:
            best[0], best[1], best[2] = d, a, b
        return d

    def pair_info(b):
        return {"a": px[b[1]].id, "b": px[b[2]].id, "distance": sqrt(b[0])}

    def solve(lo: int, hi: int, ys: list[int], depth: int) -> float:
        """Smallest squared distance among px[lo:hi]; `ys` holds those ranks sorted by y."""
        stats["recursive_calls"] += 1
        size = hi - lo
        if size <= 3:  # base case: brute force on at most 3 points
            d = float("inf")
            for i in range(lo, hi):
                for j in range(i + 1, hi):
                    d = min(d, dist2(i, j))
            return d

        mid = lo + size // 2
        mid_x = px[mid].x  # median split line
        if depth <= TRACE_SPLIT_DEPTH:
            trace["splits"].append({"depth": depth, "x": mid_x})
        left_ys = [r for r in ys if r < mid]  # stable partition keeps y order, O(n)
        right_ys = [r for r in ys if r >= mid]

        if depth == 0:
            # Same recursion, but remember each half's own best pair before merging them.
            d_left = solve(lo, mid, left_ys, 1)
            left_best = tuple(best)
            best[0] = float("inf")
            d_right = solve(mid, hi, right_ys, 1)
            right_best = tuple(best)
            best[0], best[1], best[2] = min(left_best, right_best, key=lambda b: b[0])
            d = min(d_left, d_right)
            trace["left"], trace["right"] = pair_info(left_best), pair_info(right_best)
            trace["left_ids"] = [p.id for p in px[lo:mid]]
        else:
            d = min(solve(lo, mid, left_ys, depth + 1), solve(mid, hi, right_ys, depth + 1))

        # Strip: points within sqrt(d) of the split line, still in y order.
        d_before = d
        strip = [r for r in ys if (px[r].x - mid_x) ** 2 < d]
        checked = 0
        checks = []  # top-level strip inspections, for visualisation
        for i, a in enumerate(strip):
            for b in strip[i + 1:]:
                if (px[b].y - px[a].y) ** 2 >= d:  # y-gap already too large: at most ~7 neighbours checked
                    if depth == 0 and len(checks) < 24:
                        checks.append({"a": px[a].id, "b": px[b].id, "dy": abs(px[b].y - px[a].y), "compared": False, "distance": None})
                    break
                checked += 1
                d2 = dist2(a, b)
                if depth == 0 and len(checks) < 24:
                    checks.append({"a": px[a].id, "b": px[b].id, "dy": abs(px[b].y - px[a].y), "compared": True, "distance": sqrt(d2)})
                d = min(d, d2)
        if depth == 0:
            stats["top_split_x"], stats["top_strip_size"] = mid_x, len(strip)
            trace["delta"] = sqrt(d_before)
            trace["strip"] = {"ids": [px[r].id for r in strip], "pairs_checked": checked, "improved": d < d_before, "checks": checks}
        return d

    solve(0, n, py, 0)
    return {
        "a": px[best[1]],
        "b": px[best[2]],
        "distance": sqrt(best[0]),
        "stats": {"n": n, **stats},
        "trace": trace if n > 3 else None,
    }

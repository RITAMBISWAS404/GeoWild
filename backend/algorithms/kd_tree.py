"""2D KD-Tree with rectangular range search. Points need `.id`, `.x`, `.y`.

Build is O(n log n): points are sorted once by x and once by y, and each level splits both
sorted lists with a linear stable partition (no re-sorting, no per-level median selection).
Range search visits O(sqrt(n) + k) nodes: only subtrees whose half-plane can hold matches are
entered, and every node stores a point, so nodes fully inside the rectangle are all results (k).
"""
from dataclasses import dataclass


@dataclass
class KDNode:
    point: object
    axis: int  # 0 = split on x, 1 = split on y
    left: "KDNode | None" = None  # coordinates <= this point on `axis`
    right: "KDNode | None" = None  # coordinates >= this point on `axis`


class KDTree:
    def __init__(self, points):
        pts = list(points)
        self.size = len(pts)
        self.height = 0
        by_x = sorted(range(len(pts)), key=lambda i: (pts[i].x, pts[i].y, i))
        by_y = sorted(range(len(pts)), key=lambda i: (pts[i].y, pts[i].x, i))
        # rank[axis][i]: unique position of pts[i] in that axis order, so duplicate coordinates split cleanly
        rank = [[0] * len(pts), [0] * len(pts)]
        for r, i in enumerate(by_x):
            rank[0][i] = r
        for r, i in enumerate(by_y):
            rank[1][i] = r
        self._pts, self._rank = pts, rank
        self.root = self._build(by_x, by_y, 0)

    def _build(self, by_x, by_y, depth):
        if not by_x:
            return None
        self.height = max(self.height, depth + 1)
        axis = depth % 2
        primary, other = (by_x, by_y) if axis == 0 else (by_y, by_x)
        mid = len(primary) // 2  # median is just an index in the already-sorted axis list
        m = primary[mid]
        r = self._rank[axis][m]
        # Stable partition of the other list around the median keeps it sorted: O(n)
        other_left = [i for i in other if self._rank[axis][i] < r]
        other_right = [i for i in other if self._rank[axis][i] > r]
        left_p, right_p = primary[:mid], primary[mid + 1:]
        if axis == 0:
            lx, ly, rx, ry = left_p, other_left, right_p, other_right
        else:
            lx, ly, rx, ry = other_left, left_p, other_right, right_p
        return KDNode(self._pts[m], axis, self._build(lx, ly, depth + 1), self._build(rx, ry, depth + 1))

    def range_search(self, xmin, xmax, ymin, ymax) -> dict:
        """All points with xmin <= x <= xmax and ymin <= y <= ymax (boundaries inclusive)."""
        if xmin > xmax:
            xmin, xmax = xmax, xmin
        if ymin > ymax:
            ymin, ymax = ymax, ymin
        lo, hi = (xmin, ymin), (xmax, ymax)
        found, visited_ids, pruned_ids = [], [], []

        def visit(node):
            p = node.point
            visited_ids.append(p.id)
            if xmin <= p.x <= xmax and ymin <= p.y <= ymax:
                found.append(p)
            split = p.x if node.axis == 0 else p.y
            for child, enter in ((node.left, lo[node.axis] <= split), (node.right, hi[node.axis] >= split)):
                if child is None:
                    continue
                if enter:
                    visit(child)
                else:
                    pruned_ids.append(child.point.id)  # whole subtree rooted here lies outside the rectangle

        if self.root:
            visit(self.root)
        return {
            "points": found,
            "visited_ids": visited_ids,
            "pruned_ids": pruned_ids,  # roots of the subtrees that were skipped
            "stats": {
                "n": self.size,
                "nodes_visited": len(visited_ids),
                "subtrees_pruned": len(pruned_ids),
                "results": len(found),
            },
        }

    def export_nodes(self, bounds) -> list[dict]:
        """Flat node list for visualisation. `bounds` = (xmin, xmax, ymin, ymax) of the whole plane.
        Each node's `region` is the cell it owns; its split line is drawn across that cell."""
        out: list[dict] = []

        def walk(node, depth, parent, r):
            p = node.point
            rec = {
                "id": p.id, "x": p.x, "y": p.y, "axis": node.axis, "depth": depth, "parent": parent,
                "left": node.left.point.id if node.left else None,
                "right": node.right.point.id if node.right else None,
                "size": 0,
                "region": {"xmin": r[0], "xmax": r[1], "ymin": r[2], "ymax": r[3]},
            }
            out.append(rec)
            if node.axis == 0:
                lr, rr = (r[0], p.x, r[2], r[3]), (p.x, r[1], r[2], r[3])
            else:
                lr, rr = (r[0], r[1], r[2], p.y), (r[0], r[1], p.y, r[3])
            size = 1
            if node.left:
                size += walk(node.left, depth + 1, p.id, lr)
            if node.right:
                size += walk(node.right, depth + 1, p.id, rr)
            rec["size"] = size
            return size

        if self.root:
            walk(self.root, 0, None, bounds)
        return out

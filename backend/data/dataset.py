"""Habitat constants. The animals themselves come from the simulation (backend/simulation)."""

SEED = 42
GRID = 100  # the habitat is a GRID x GRID plane; x and y run 0..GRID
# Default rectangular Danger Zone used as the starting range-search query
DANGER_ZONE = {"xmin": 35.0, "xmax": 70.0, "ymin": 30.0, "ymax": 65.0}

from dataclasses import asdict, dataclass


@dataclass(frozen=True)
class Animal:
    """An animal at one simulation tick: its identity, current x/y on the 100 x 100 habitat, and motion.

    The geometry algorithms only read id, x and y. Everything else belongs to the simulation.
    """

    id: str
    x: float
    y: float
    species: str = ""
    emoji: str = ""
    group: int = 0  # herd / solitary-animal index
    vx: float = 0.0  # velocity in habitat units per simulated second
    vy: float = 0.0

    def to_dict(self) -> dict:
        return asdict(self)

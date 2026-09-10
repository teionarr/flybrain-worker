"""The real fly brain: a thin wrapper over `flybrain-sdk`.

The connectome sim is genuine (LIF neurons, real sensory -> motor wiring). Here we
only translate its tiny vocabulary into something the table can drive:

  sensory: food, looming_left, looming_right, touch
  motor:   walk, turn_left, turn_right, jump   (each 0..1)

The fly does NOT know the answer. Its movement is whatever the wiring produces.
"""
from __future__ import annotations

from dataclasses import dataclass

try:
    from flybrain import FlyBrain, Stimulus
except Exception as exc:  # pragma: no cover - import guard for friendlier errors
    FlyBrain = None  # type: ignore
    Stimulus = None  # type: ignore
    _IMPORT_ERROR: Exception = exc
else:
    _IMPORT_ERROR = None


@dataclass
class MotorIntent:
    """Read-only snapshot of what the fly wants to do right now."""

    walk: float = 0.0
    turn_left: float = 0.0
    turn_right: float = 0.0
    jump: float = 0.0

    @property
    def steer(self) -> float:
        """Net steering bias in [-1, 1] (positive -> left)."""
        return self.turn_left - self.turn_right

    def to_dict(self) -> dict[str, float]:
        return {
            "walk": round(self.walk, 3),
            "turn_left": round(self.turn_left, 3),
            "turn_right": round(self.turn_right, 3),
            "jump": round(self.jump, 3),
        }


class Fly:
    """A single fly employee wrapping one `FlyBrain` instance."""

    def __init__(self) -> None:
        if FlyBrain is None:
            raise RuntimeError(
                "Could not import `flybrain`. Install the SDK:\n"
                "    pip install 'flybrain-sdk @ "
                "git+https://github.com/freeman-1984-coder/flybrain-sdk.git'"
            )
        # The bundled "toy" model: 12 neurons, heuristic but genuinely wired.
        self.brain = FlyBrain.load("toy", backend="cpu")

    def stimulate(self, channel: str, strength: float = 1.0, duration_ms: float = 100.0) -> None:
        self.brain.stimulate(Stimulus(channel, strength=strength, duration_ms=duration_ms))

    def step(self, steps: int = 1) -> None:
        self.brain.step(steps)

    def intent(self) -> MotorIntent:
        a = self.brain.action()
        d = a.to_dict() if hasattr(a, "to_dict") else {}

        def get(key: str) -> float:
            if key in d:
                return float(d[key])
            return float(getattr(a, key, 0.0) or 0.0)

        return MotorIntent(
            walk=get("walk"),
            turn_left=get("turn_left"),
            turn_right=get("turn_right"),
            jump=get("jump"),
        )


# Sensible duration for a "nudge" in simulated milliseconds.
NUDGE_MS = 120.0

"""The "table": a 2D grid the fly wanders on, plus food and looming sources.

Positions are `(x, y)` with y growing downward (rendering-friendly). The fly moves
according to its motor intents (from the real brain), nudged by food / looming /
touch stimuli that management places on the table.

The fly does NOT know the answer. Food pulls it; looming repels it; touch makes it
twitch. That's all.
"""
from __future__ import annotations

import math
import random
from dataclasses import dataclass, field

from .brain import Fly, NUDGE_MS


@dataclass
class TableConfig:
    width: int = 28
    height: int = 16


@dataclass
class Food:
    x: int
    y: int
    strength: float = 1.0
    ticks_left: int = 0  # how many "runs" this food remains active


@dataclass
class Loom:
    x: int
    y: int
    side: str  # "left" | "right" | "both"


class Table:
    def __init__(self, config: TableConfig | None = None) -> None:
        cfg = config or TableConfig()
        self.width = cfg.width
        self.height = cfg.height
        self.fly = Fly()
        # Start roughly center-left.
        self.fx = self.width // 3
        self.fy = self.height // 2
        self.heading = 0.0  # radians, 0 = +x
        self.food: list[Food] = []
        self.looms: list[Loom] = []
        self.poke_timer = 0
        self.last_motor = None
        self.hop = 0.0  # accumulated "jump" airtime

    # ---- management interventions -------------------------------------------
    def place_food(self, x: int, y: int, strength: float = 1.0) -> None:
        x = max(0, min(self.width - 1, x))
        y = max(0, min(self.height - 1, y))
        self.food.append(Food(x, y, strength=strength, ticks_left=8))

    def place_loom(self, x: int, y: int) -> None:
        x = max(0, min(self.width - 1, x))
        y = max(0, min(self.height - 1, y))
        dx = x - self.fx
        side = "left" if dx >= 0 else "right"
        self.looms.append(Loom(x, y, side))

    def poke(self) -> None:
        self.fly.stimulate("touch", strength=1.0, duration_ms=60)
        self.poke_timer = 4

    # ---- perception: turn table state into sensory stimuli ------------------
    def _nearest_food(self) -> Food | None:
        if not self.food:
            return None
        return min(self.food, key=lambda f: (f.x - self.fx) ** 2 + (f.y - self.fy) ** 2)

    def _synthesize_stimuli(self) -> None:
        """Emit sensory pulses from the table state into the brain."""
        f = self._nearest_food()
        if f is not None:
            dist = math.hypot(f.x - self.fx, f.y - self.fy)
            strength = max(0.2, min(1.0, 1.0 - dist / max(self.width, self.height)))
            self.fly.stimulate("food", strength=strength, duration_ms=100)

        for loom in self.looms:
            dist = math.hypot(loom.x - self.fx, loom.y - self.fy)
            if dist < 6:
                strength = max(0.2, min(1.0, 1.0 - dist / 6))
                # Loom on the fly's left/right triggers the corresponding escape.
                channel = "looming_left" if loom.side == "left" else "looming_right"
                self.fly.stimulate(channel, strength=strength, duration_ms=80)

    # ---- the run loop -------------------------------------------------------
    def run(self, steps: int = 20) -> None:
        """Advance the fly by some ticks, translating its motor intent into motion."""
        self._synthesize_stimuli()
        self.fly.step(steps)
        m = self.fly.intent()
        self.last_motor = m

        # Decrement food lifetimes.
        for f in self.food:
            f.ticks_left -= 1
        self.food = [f for f in self.food if f.ticks_left > 0]
        # Expire looms quickly (transient threat).
        self.looms = []

        # Steering: bias heading by net turn.
        self.heading += m.steer * 0.5
        # Walk: move along heading with some jitter.
        speed = m.walk * 0.6
        nx = self.fx + math.cos(self.heading) * speed
        ny = self.fy + math.sin(self.heading) * speed

        # Jump: a little hop shifts position.
        if m.jump > 0.5:
            self.hop = max(0.0, self.hop + m.jump)
            nx += random.uniform(-1, 1) * m.jump
            ny += random.uniform(-1, 1) * m.jump

        # Small random diffusion so it never sits still (flies don't).
        nx += random.uniform(-0.15, 0.15)
        ny += random.uniform(-0.15, 0.15)

        # Poke jolt.
        if self.poke_timer > 0:
            self.poke_timer -= 1
            nx += random.uniform(-0.6, 0.6)
            ny += random.uniform(-0.6, 0.6)

        # Clamp to table (bounce-ish).
        self.fx = max(0.0, min(self.width - 1.0, nx))
        self.fy = max(0.0, min(self.height - 1.0, ny))

    def candidate_cell(self) -> tuple[int, int]:
        """The cell the fly currently 'occupies' (rounds position)."""
        return int(round(self.fx)), int(round(self.fy))

    def snapshot(self) -> dict:
        """Everything the dashboard needs to render the table."""
        return {
            "fly": {"x": round(self.fx, 2), "y": round(self.fy, 2)},
            "motor": self.last_motor.to_dict() if self.last_motor else {},
            "food": [{"x": f.x, "y": f.y, "s": round(f.strength, 2)} for f in self.food],
            "size": {"w": self.width, "h": self.height},
        }

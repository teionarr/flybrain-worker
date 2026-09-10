"""The game engine: pure Python, no web framework.

This is where all the actual state and rules live, so it can be unit-tested
(and driven by any frontend) independently of Flask.
"""
from __future__ import annotations

import random

from .consulting import Question, pick_question
from .reviews import Wall, final_review, make_entry
from .table import Table


class Game:
    """A single hiring/consulting session: one manager, one fly, many questions."""

    def __init__(self, wall: Wall | None = None) -> None:
        self.wall: Wall = wall or Wall()
        self.manager_title: str = "Director of Fly Operations"
        self.question: Question | None = None
        self.table: Table | None = None
        self.nudges: int = 0
        self.rejects: int = 0
        self.billable: int = 0
        self.finished: bool = False
        self.review: dict | None = None

    # ---- lifecycle ----------------------------------------------------------
    def new_question(self, avoid_id: int | None = None) -> dict:
        avoid = {avoid_id} if avoid_id is not None else set()
        self.question = pick_question(avoid)
        self.table = Table()
        self.nudges = 0
        self.rejects = 0
        self.billable = random.randint(20, 120)
        self.finished = False
        self.review = None
        return {
            "id": self.question.id,
            "client": self.question.client,
            "ask": self.question.ask,
            "answers": self.question.answers,
        }

    # ---- management interventions ------------------------------------------
    def nudge(self, kind: str = "run", x: int = 0, y: int = 0) -> dict:
        if self.table is None:
            raise RuntimeError("no active question")
        if kind == "food":
            self.table.place_food(x, y)
        elif kind == "loom":
            self.table.place_loom(x, y)
        elif kind == "poke":
            self.table.poke()
        # "run" advances the clock with no intervention
        self.table.run(steps=20)
        self.nudges += 1
        return {"nudges": self.nudges, "table": self.table.snapshot()}

    # ---- the fly "offers" the answer it stumbles onto ----------------------
    def offer(self) -> dict:
        if self.table is None or self.question is None:
            raise RuntimeError("no active question")
        x, y = self.table.candidate_cell()
        idx = self._answer_index_at(x, y)
        return {"index": idx, "answer": self.question.answers[idx], "cell": [x, y]}

    def decide(self, decision: str, index: int) -> dict:
        """`ok` ships the answer (correct or not); `reject` hurts the fly.

        Returns the review when the game is finished, otherwise partial state.
        """
        if self.table is None or self.question is None:
            raise RuntimeError("no active question")
        index = max(0, min(index, len(self.question.answers) - 1))

        if decision == "reject":
            self.rejects += 1
            # Rejection reprimands the fly: loom at its spot + a poke.
            self.table.place_loom(*self.table.candidate_cell())
            self.table.poke()
            self.table.run(steps=20)
            return {"ok": True, "rejects": self.rejects, "table": self.table.snapshot()}

        # "ok": answer is sent to the client regardless of correctness.
        correct = index == self.question.correct
        question = self.question
        self.finished = True
        self.review = {
            "text": final_review(
                title=self.manager_title,
                nudges=self.nudges,
                rejects=self.rejects,
                correct=correct,
            ),
            "correct": correct,
            "answer": question.answers[index],
            "flavor": question.flavor,
        }
        self.wall.add(
            make_entry(
                manager_title=self.manager_title,
                question_summary=f"{question.client}: {question.ask}",
                answer_given=question.answers[index],
                was_correct=correct,
                nudges_used=self.nudges,
                rejects=self.rejects,
                billable=self.billable,
            )
        )
        return {"ok": True, "finished": True, "review": self.review}

    # ---- helpers ------------------------------------------------------------
    def _answer_index_at(self, x: int, y: int) -> int:
        """Deterministic mapping from a table cell to an answer index."""
        if self.question is None:
            return 0
        n = len(self.question.answers)
        seed = (x * 73856093) ^ (y * 19349663) ^ (self.question.id * 83492791)
        return random.Random(seed).randrange(n)

    def state(self) -> dict:
        """Everything the dashboard needs, serializable."""
        return {
            "manager_title": self.manager_title,
            "nudges": self.nudges,
            "rejects": self.rejects,
            "billable": self.billable,
            "finished": self.finished,
            "review": self.review,
            "wall": self.wall.load(),
            "question": (
                {
                    "id": self.question.id,
                    "client": self.question.client,
                    "ask": self.question.ask,
                    "answers": self.question.answers,
                }
                if self.question
                else None
            ),
            "table": self.table.snapshot() if self.table else None,
        }

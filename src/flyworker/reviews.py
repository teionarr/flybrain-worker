"""The Wall of Reviews: a persistent, append-only log of every manager's performance
review. Lives on disk as JSON so it survives restarts.
"""
from __future__ import annotations

import json
import os
import threading
from datetime import datetime, timezone


def _default_path() -> str:
    # Keep it next to the package, under a git-ignored data dir.
    here = os.path.dirname(os.path.abspath(__file__))
    return os.path.join(here, "..", "..", "data", "reviews.json")


class Wall:
    def __init__(self, path: str | None = None) -> None:
        self.path: str = path or os.environ.get("FLYWORKER_REVIEWS", _default_path())
        self._lock = threading.Lock()

    def load(self) -> list[dict]:
        if not os.path.exists(self.path):
            return []
        try:
            with open(self.path, "r", encoding="utf-8") as fh:
                data = json.load(fh)
            return data if isinstance(data, list) else []
        except (json.JSONDecodeError, OSError):
            return []

    def add(self, entry: dict) -> dict:
        with self._lock:
            reviews = self.load()
            reviews.append(entry)
            os.makedirs(os.path.dirname(self.path) or ".", exist_ok=True)
            tmp = self.path + ".tmp"
            with open(tmp, "w", encoding="utf-8") as fh:
                json.dump(reviews, fh, indent=2, ensure_ascii=False)
            os.replace(tmp, self.path)
        return entry


def make_entry(
    *,
    manager_title: str,
    question_summary: str,
    answer_given: str,
    was_correct: bool,
    nudges_used: int,
    rejects: int,
    billable: int,
) -> dict:
    now = datetime.now(timezone.utc).isoformat(timespec="seconds")
    return {
        "manager_title": manager_title,
        "question": question_summary,
        "answer": answer_given,
        "correct": was_correct,
        "nudges_used": nudges_used,
        "rejects": rejects,
        "billable_hours": billable,
        "timestamp": now,
    }


# ---- The performance-review text generator (the punchline) ------------------
_TEMPLATES_CORRECT = [
    "{title} demonstrated exceptional leadership, guiding the fly to a client-ready "
    "answer in only {nudges} nudges. The fly is invited to the all-hands it cannot attend.",
    "{title} aligned a misaligned organism with vision and grace. {nudges} strategic food "
    "placements. Zero fly resignations. Promotion recommended.",
    "Under {title}'s stewardship, a creature with no language produced a billable answer. "
    "This is the firm's value. {nudges} nudges of pure synergy.",
]

_TEMPLATES_WRONG = [
    "{title} shipped the wrong answer with total confidence — a hallmark of the craft. "
    "{nudges} nudges, one invoice. The client is 'aligned' with our invoicing.",
    "{title} let the fly speak its truth; the truth was nonsense. {nudges} nudges. "
    "Blame assigned to the fly, which has no HR file to contest it.",
    "{title} exemplified our core value: proximity to an answer is not required, only "
    "proximity to a billable. {nudges} nudges, all non-refundable.",
]

_INTERIM = [
    "KPI: fly still wandering. {title} remains deeply committed to the process.",
    "The fly has filed a work-from-table request. {title} provided {nudges} nudges of "
    "agile support.",
    "Alignment in progress. {title} has rejected {rejects} fly-proposed answers, citing "
    "'strategic misalignment' (the fly's).",
]


def interim_line(*, title: str, nudges: int, rejects: int) -> str:
    import random as _r
    return _r.choice(_INTERIM).format(title=title, nudges=nudges, rejects=rejects)


def final_review(*, title: str, nudges: int, rejects: int, correct: bool) -> str:
    import random as _r
    pool = _TEMPLATES_CORRECT if correct else _TEMPLATES_WRONG
    return _r.choice(pool).format(title=title, nudges=nudges, rejects=rejects)

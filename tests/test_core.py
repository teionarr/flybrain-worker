"""Sanity tests for the non-network parts (consulting + reviews + table wiring).

The fly brain itself requires the optional flybrain-sdk; we guard those imports so
these tests pass even before the SDK is installed.
"""
import os

from flyworker.consulting import all_questions, pick_question
from flyworker.reviews import Wall, final_review, make_entry


def test_question_bank():
    qs = all_questions()
    assert len(qs) == 10
    for q in qs:
        assert q["ask"]
        assert len(q["answers"]) >= 3


def test_pick_question():
    q = pick_question()
    assert q.id in {x["id"] for x in all_questions()}


def test_final_review_templates():
    r = final_review(title="VP of Vibe", nudges=7, rejects=2, correct=True)
    assert "VP of Vibe" in r
    r2 = final_review(title="Chief Fly Officer", nudges=7, rejects=2, correct=False)
    assert "Chief Fly Officer" in r2


def test_wall_roundtrip(tmp_path):
    p = str(tmp_path / "reviews.json")
    wall = Wall(path=p)
    assert wall.load() == []
    wall.add(make_entry(
        manager_title="Tester",
        question_summary="c: ask",
        answer_given="the answer",
        was_correct=True,
        nudges_used=5,
        rejects=1,
        billable=42,
    ))
    got = wall.load()
    assert len(got) == 1
    assert got[0]["manager_title"] == "Tester"
    assert got[0]["correct"] is True

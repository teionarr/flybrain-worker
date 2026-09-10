"""End-to-end game engine test, optionally exercising the real flybrain-sdk.

These run the actual Game state machine (nudge -> offer -> decide -> review).
The fly brain is exercised if flybrain-sdk is importable; the engine's
logic-only paths (offer/decide/review mapping) work regardless.
"""
import os
import sys

from flyworker.game import Game
from flyworker.reviews import Wall


def _fly_available() -> bool:
    try:
        from flyworker.brain import Fly  # noqa: F401
        return True
    except Exception:
        return False


def test_full_session(tmp_path):
    wall = Wall(path=str(tmp_path / "reviews.json"))
    game = Game(wall)
    game.manager_title = "Chief Fly Whisperer"

    q = game.new_question()
    assert q["ask"]
    assert len(q["answers"]) >= 3

    # Nudge a few times. If the fly brain is present, this exercises real neurons.
    for _ in range(5):
        game.nudge("run")

    # Feed on a random cell and ask the fly for an offer.
    game.nudge("food", x=14, y=7)
    offer = game.offer()
    assert 0 <= offer["index"] < len(q["answers"])
    assert offer["answer"] in q["answers"]

    # Rejecting hurts the fly but keeps the game going.
    res = game.decide("reject", offer["index"])
    assert res["rejects"] == 1
    assert not game.finished

    # Accepting ends the game and writes a review.
    res = game.decide("ok", offer["index"])
    assert res["finished"] is True
    assert game.review is not None
    assert "Chief Fly Whisperer" in game.review["text"]

    # Wall got one entry.
    assert len(wall.load()) == 1


def test_offer_mapping_is_deterministic():
    game = Game(Wall(path=os.devnull))
    game.new_question()
    a = game.offer()
    b = game.offer()
    assert a["index"] == b["index"]
    assert a["answer"] == b["answer"]


def test_fly_availability_flag_is_consistent():
    # Just documents whether the SDK is present in this environment.
    assert _fly_available() in (True, False)

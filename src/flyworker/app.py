"""The management dashboard: a Flask app wrapping the pure Game engine."""
from __future__ import annotations

import os

from flask import Flask, jsonify, render_template, request

from .consulting import all_questions
from .game import Game
from .reviews import Wall

app = Flask(__name__)

GAME = Game(Wall())
WALL = GAME.wall


def _has_fly() -> bool:
    """Whether flybrain-sdk is importable (drives a friendly UI hint)."""
    try:
        from .brain import Fly  # noqa: F401

        return True
    except Exception:
        return False


@app.route("/")
def index():
    return render_template(
        "index.html",
        has_fly=_has_fly(),
        questions=all_questions(),
        reviews=WALL.load(),
    )


@app.route("/api/state")
def api_state():
    data = dict(GAME.state())
    data["has_fly"] = _has_fly()
    return jsonify(data)


@app.route("/api/new_question", methods=["POST"])
def new_question():
    avoid = GAME.question.id if GAME.question else None
    payload = GAME.new_question(avoid_id=avoid)
    return jsonify({"ok": True, "question": payload})


@app.route("/api/nudge", methods=["POST"])
def nudge():
    body = request.get_json(force=True, silent=True) or {}
    kind = body.get("kind", "run")
    x = int(body.get("x", 0))
    y = int(body.get("y", 0))
    try:
        res = GAME.nudge(kind, x, y)
    except RuntimeError as e:
        return jsonify({"ok": False, "error": str(e)}), 400
    return jsonify({"ok": True, **res})


@app.route("/api/offer", methods=["POST"])
def offer():
    try:
        res = GAME.offer()
    except RuntimeError as e:
        return jsonify({"ok": False, "error": str(e)}), 400
    return jsonify({"ok": True, **res})


@app.route("/api/decide", methods=["POST"])
def decide():
    body = request.get_json(force=True, silent=True) or {}
    decision = body.get("decision")
    index = int(body.get("index", 0))
    try:
        res = GAME.decide(decision, index)
    except RuntimeError as e:
        return jsonify({"ok": False, "error": str(e)}), 400
    return jsonify(res)


@app.route("/api/title", methods=["POST"])
def set_title():
    body = request.get_json(force=True, silent=True) or {}
    title = (body.get("title") or "").strip()
    if title:
        GAME.manager_title = title[:80]
    return jsonify({"ok": True, "manager_title": GAME.manager_title})


def main() -> None:
    port = int(os.environ.get("PORT", "8000"))
    app.run(host="127.0.0.1", port=port, debug=False)


if __name__ == "__main__":
    main()

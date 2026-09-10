"""A zero-dependency terminal version of the game.

No Flask, no browser. Runs the real Game engine (and the real flybrain-sdk when
installed, with a graceful animated fallback otherwise) so you can play and test
the whole loop from the command line:

    python -m flyworker.play

Flow:
  1. See the ticket (parody AI-alignment question) with hidden answers.
  2. Nudge the fly (food / loom / poke / run) until it stumbles onto an answer.
  3. The fly offers an answer -> OK (ship it) or Reject (hurt the fly).
  4. Get a performance review, logged to the Wall.
"""
from __future__ import annotations

import sys

from .game import Game
from .reviews import Wall


def _clear():
    sys.stdout.write("\033[2J\033[H")


def _fly_ok() -> bool:
    try:
        from .brain import Fly  # noqa: F401

        return True
    except Exception:
        return False


def _prompt_choice(prompt: str, options: list[str]) -> int:
    print(prompt)
    for i, o in enumerate(options):
        print(f"  [{i}] {o}")
    while True:
        raw = input("> ").strip()
        if raw.isdigit() and 0 <= int(raw) < len(options):
            return int(raw)
        if raw == "" and options:
            return 0
        print("  (pick a number)")


def play() -> None:
    wall = Wall()
    game = Game(wall)
    _clear()
    print("🪰  FLYWORKER — hire a fly")
    print("   Don't hire people. Don't hire AI. Hire a fly.\n")

    title = input("Your management title [Director of Fly Operations]: ").strip()
    if title:
        game.manager_title = title[:80]

    print("\nNo CUDA. No GPU. No salary. No sick days.\n")
    print("Controls:")
    print("  f = place food on a cell   l = loom (scare away)")
    print("  p = poke the fly           (enter) = run clock")
    print("  o = the fly offers an answer\n")

    if not _fly_ok():
        print("⚠️  flybrain-sdk not installed — running in narrative mode")
        print("   (the engine still works; the fly's twitches are simulated)\n")

    while True:
        game.new_question()
        q = game.question
        _clear()
        print("=" * 60)
        print(f"TICKET — {q.client}")
        print(f"  \"{q.ask}\"")
        print("-" * 60)
        for i, a in enumerate(q.answers):
            print(f"  {chr(65 + i)}) {a}")
        print("=" * 60)
        print(f"  Billable estimate: {game.billable}h · nudges: {game.nudges} · rejects: {game.rejects}")
        print("  (the correct answer is hidden; the fly doesn't know it either)\n")

        resolved = False
        offers_made = 0
        while not resolved:
            cmd = input("[f/l/p/o/enter] ").strip().lower()
            if cmd == "f":
                try:
                    x = int(input("  food x: ").strip() or "14")
                    y = int(input("  food y: ").strip() or "7")
                except ValueError:
                    x, y = 14, 7
                r = game.nudge("food", x, y)
            elif cmd == "l":
                try:
                    x = int(input("  loom x: ").strip() or str(game.table.fx))
                    y = int(input("  loom y: ").strip() or str(game.table.fy))
                except ValueError:
                    x, y = 14, 7
                r = game.nudge("loom", x, y)
            elif cmd == "p":
                r = game.nudge("poke")
            elif cmd == "o":
                offer = game.offers if False else game.offer()
                offers_made += 1
                print(f"\n💬 The fly offers: \"{offer['answer']}\"  (cell {offer['cell']})")
                ok = _prompt_choice(
                    "   Ship this to the client?",
                    ["✅ OK — send it (right or wrong)", "❌ Reject — hurt the fly"],
                )
                if ok == 0:
                    res = game.decide("ok", offer["index"])
                    print("\n" + "=" * 60)
                    print("📄 PERFORMANCE REVIEW")
                    print("=" * 60)
                    print(res["review"]["text"])
                    print(f"   Correct? {res['review']['correct']}")
                    print(f"   ({(res['review']['flavor'])})")
                    print("=" * 60)
                    resolved = True
                else:
                    game.decide("reject", offer["index"])
                    print("   ✊ The fly flinched. It keeps wandering.\n")
            else:  # run
                r = game.nudge("run")

            if not resolved:
                pos = game.table.snapshot()["fly"]
                print(f"   🪰 at ({pos['x']:.1f}, {pos['y']:.1f})  nudges={game.nudges}  rejects={game.rejects}")

        cont = input("\nAnother ticket? [y/N]: ").strip().lower()
        if cont != "y":
            break

    print("\n🧱 Wall of reviews:")
    for e in wall.load():
        mark = "✅" if e["correct"] else "❌"
        print(f"  {mark} {e['manager_title']} — {e['answer']}")

    print("\nShutting down. The fly has been released back to the table.")


if __name__ == "__main__":
    play()

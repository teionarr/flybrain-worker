# flyworker

> Don't hire people. Don't hire AI. **Hire a fly.**

A satirical "AI-alignment consulting firm" where your only employee is a real,
open-source fruit-fly connectome simulation (MIT-licensed
[`flybrain-sdk`](https://github.com/freeman-1984-coder/flybrain-sdk)).

The fly does **not** know the answer. You — **Management** — nudge it with food,
scare it with looming shadows, and poke it, until it *stumbles* onto an answer it
will confidently present to the client. You can `accept` it, or `reject` it (which
hurts the fly). Rack up billable nonsense, then receive your **Performance Review**
and be added to the **Wall of Reviews** with a management title of your choosing.

---

## The joke

Big-4 consulting for AI alignment, boiled down to its essence: **nudge an organism
that doesn't understand the problem until it points at something, then invoice the
client.** Every word of it is real — the neurons actually fire; the fly's wandering
is genuinely its own. It's just *interpreted* as intent by the narrator.

---

## Quick start

```sh
git clone https://github.com/teionarr/flybrain-worker.git
cd flybrain-worker
python3 -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\Activate.ps1
pip install -e .
flyworker
```

Then open **http://127.0.0.1:8000** in a browser.

No GPU. No API keys. No network calls at runtime. The fly runs on your laptop.

---

## How to play

1. Pick a **question** (or let one be assigned) — a parody AI-alignment ask.
2. Watch the fly on the **table**. You see *where it is* and a readout of *what its
   neurons are doing* — never the correct answer.
3. Use the **Management** panel to nudge it:
   - **🍞 Food** — place food on a spot; the fly walks toward it.
   - **🎈 Loom** — scare it away from a wrong idea.
   - **👉 Poke** — random nudge.
   - **▶ Run** — let the clock tick and the fly obey its own wiring.
4. When the fly lingers on a candidate, it **offers that as the answer**.
   - **OK** → the answer is sent to the client. Correct = happy fly + food. Wrong =
     the client gets nonsense; the firm moves on anyway.
   - **Reject** → the fly feels pain and keeps wandering.
5. Finish the question, get your **Performance Review**, and be logged to the **Wall**.

---

## Files

```
src/flyworker/
  app.py         # Flask app, routes, game state
  brain.py       # thin wrapper over flybrain-sdk (the real connectome)
  table.py       # the 2D "table" and the fly's movement
  consulting.py  # questions, answers, the correct ("billable") answer
  reviews.py     # wall-of-reviews persistence
  templates/     # the management dashboard
  static/        # css / js
```

## Credits

Fly brain simulation: [`flybrain-sdk`](https://github.com/freeman-1984-coder/flybrain-sdk)
(MIT), an independent project unaffiliated with Janelia, FlyWire, or Google. This is
a parody; the connectome wiring is real, the dynamics and mappings are assumptions,
and no actual flies or clients were harmed.

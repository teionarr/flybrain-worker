# flyworker

> Don't hire people. Don't hire AI. **Hire a fly.**

A satirical 2D game where your only employee is a tiny **leaky-integrate-and-fire**
"fly brain" running entirely in the browser. Management nudges it with food,
looming shadows, and pokes until it stumbles onto an answer it confidently
presents to the client — then you get a sarcastic **performance review**, logged
to a **shared Wall of Reviews** visible to players around the world.

The theme: **Big-4 consulting for AI alignment**, reduced to its essence — nudge
an organism that doesn't understand the problem until it points at something, then
invoice the client.

---

## Run it (zero install)

Open `src/flyworker/static/index.html` in any browser. Nothing to install, no
server, no build step. Works from `file://` or any static host.

```
firefox src/flyworker/static/index.html
# or just double-click index.html
```

---

## How to play

1. Pick a **ticket** (a parody AI-alignment question) — the correct answer is hidden.
2. Watch the fly on **THE TABLE**. You see *where it is* and *what its neurons are
   doing* (`LOOK INSIDE`), never the correct answer.
3. Use **MANAGEMENT** to nudge it:
   - 🍞 **FOOD** — attract the fly toward a cell (click a cell first to target it)
   - 🎈 **LOOM** — scare it away from a wrong idea
   - 👉 **POKE** — random twitch
   - ▶ **RUN** — let the clock tick and the fly obey its own wiring
4. Click **💬 THE FLY OFFERS…** when it's resting on a spot. It will present that
   cell's answer as *the* answer:
   - ✅ **OK** → ship it to the client (right or wrong; the firm bills either way)
   - ❌ **REJECT** → the fly feels pain and keeps wandering
5. Finish the ticket → **PERFORMANCE REVIEW** → you're logged to the **Wall**.

Your **management title** is yours to invent ("VP of Vibe", "Chief Fly Whisperer"…).

---

## The joke

The fly is a real (tiny) neural circuit — it genuinely integrates sensory input,
leaks, spikes, and decodes to movement. It does **not** know the answer. The satire
is that *management* has to coax a creature with no understanding into producing a
billable answer, and the resulting "deliverable" is indistinguishable from real
consulting output.

---

## The shared Wall

The **Wall of Reviews** is shared across players worldwide. By default (offline) it
keeps reviews in your browser's `localStorage`. To make it **global**, open
`src/flyworker/static/config.js` and point it at any hosted JSON store:

```js
window.FLYWORKER_CONFIG = {
  // GET  -> list of reviews ; POST -> append one review
  WALL_ENDPOINT: "https://your-hosted-store.example/reviews",
  WALL_TOKEN: "your-write-token", // optional Bearer token
};
```

No endpoint configured = fully offline, still playable. The adapter is a tiny
`Wall` object in `app.js`; point it at jsonbin.io, Supabase, Firebase, a Cloudflare
KV function, or your own endpoint.

---

## Files

```
src/flyworker/static/
  index.html   # the whole game (open in browser)
  app.js       # fly brain (LIF), table, consulting, reviews, wall
  style.css    # dark telemetry/terminal UI
  config.js    # shared-wall endpoint config (optional)
tests/
  test_js.js   # headless logic test (node tests/test_js.js)
```

The `src/flyworker/*.py` files are an **optional Python backend** (`flybrain-sdk`
with the real connectome) from an earlier iteration — not required for the web
game, kept for reference.

---

## Test

```sh
node --check src/flyworker/static/app.js   # syntax
node tests/test_js.js                       # headless game-logic test
node -m pytest tests/                       # Python-side tests (optional)
```

## Credits

Fly-brain concept inspired by the open-source fruit-fly connectome work
([`flybrain-sdk`](https://github.com/freeman-1984-coder/flybrain-sdk), MIT) and
interface ideas from [DOOMFLY](https://fly-brain-doom.awormuth.chatgpt.site/).
This is a parody; no flies or clients were harmed.

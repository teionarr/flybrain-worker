/* FLYWORKER — client-side 2D game.
 *
 * The fly's "brain" is a tiny leaky-integrate-and-fire (LIF) network simulating
 * the toy connectome's food/looming/touch -> walk/turn/jump wiring. No server.
 *
 * The fly does NOT know the answer. Management nudges it until it stumbles onto
 * something it will confidently present to the client. That's the joke.
 */
"use strict";

const $ = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));

/* ============================ FLY BRAIN (LIF) ============================ */
// A small leaky integrate-and-fire network, faithful in spirit to the toy
// connectome: sensory channels drive leaky neurons, and firing rates decode to
// motor intents. Food -> walk, looming -> escape jump/turn, touch -> twitch.
class FlyBrain {
  constructor() {
    this.dt = 1; // ms
    this.tau = 12; // activation decay time constant (ms)
    this.threshold = 0.3; // spiking threshold for the readout panel
    this.rateTau = 40; // firing-rate filter (ms)

    // Sensory channels -> leaky activation that decays over time.
    // (A minimal LIF-in-spirit model: each channel integrates input current and
    // leaks; firing rate decodes to a motor intent.)
    this.channels = {
      food: "walk",
      looming_left: "turn_right", // escape: turn AWAY (contralateral)
      looming_right: "turn_left",
      touch: "jump",
    };
    this.activation = {};
    this.rate = {};
    for (const c in this.channels) {
      this.activation[c] = 0;
      this.rate[c] = 0;
    }
    this.pending = {}; // channel -> {strength, remaining}
    this._srng = mulberry32(12345);
  }

  stimulate(channel, strength = 1, durationMs = 100) {
    if (!(channel in this.channels)) return;
    this.pending[channel] = {
      strength: strength,
      remaining: Math.ceil(durationMs / this.dt),
    };
  }

  step() {
    // Inject active inputs into channel activation.
    for (const ch in this.pending) {
      const p = this.pending[ch];
      if (p.remaining > 0) {
        this.activation[ch] += p.strength * (1 - Math.exp(-this.dt / this.tau));
        p.remaining -= 1;
      } else {
        delete this.pending[ch];
      }
    }
    // Leaky decay of each channel activation.
    const a = Math.exp(-this.dt / this.tau);
    for (const ch in this.activation) {
      this.activation[ch] *= a;
      // Firing rate: spike if activation crosses threshold, then decay.
      const spiked = this.activation[ch] > this.threshold ? 1 : 0;
      const b = Math.exp(-this.dt / this.rateTau);
      this.rate[ch] = b * this.rate[ch] + (1 - b) * spiked * (1000 / this.dt);
    }
  }

  // Motor intents 0..1.
  motorIntents() {
    const out = { walk: 0, turn_left: 0, turn_right: 0, jump: 0 };
    for (const ch in this.channels) {
      const motor = this.channels[ch];
      out[motor] = clamp01(this.rate[ch] / 100);
    }
    // Tiny stochastic wander so the fly never sits perfectly still.
    out.walk = clamp01(out.walk + (this._srng() - 0.5) * 0.06);
    return out;
  }

  readout() {
    const active = {};
    for (const ch in this.pending) {
      if (this.pending[ch].remaining > 0) {
        active[ch] = { strength: +this.pending[ch].strength.toFixed(2) };
      }
    }
    return {
      sensory: active,
      rates: Object.entries(this.rate).map(([ch, r]) => ({ ch, rate: Math.round(r) })),
      activation: Object.fromEntries(
        Object.entries(this.activation).map(([ch, v]) => [ch, +v.toFixed(2)])
      ),
    };
  }
}

function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function clamp01(x) {
  return Math.max(0, Math.min(1, x));
}

/* ============================ TABLE ============================ */
class Table {
  constructor(w = 28, h = 16) {
    this.w = w;
    this.h = h;
    this.brain = new FlyBrain();
    this.fx = w / 3;
    this.fy = h / 2;
    this.heading = 0;
    this.food = []; // {x,y,strength,ticks}
    this.looms = []; // {x,y,side}
    this.pokeTimer = 0;
    this.lastMotor = {};
  }

  placeFood(x, y, strength = 1) {
    x = clampInt(x, this.w - 1);
    y = clampInt(y, this.h - 1);
    this.food.push({ x, y, strength, ticks: 8 });
  }
  placeLoom(x, y) {
    x = clampInt(x, this.w - 1);
    y = clampInt(y, this.h - 1);
    const side = x >= this.fx ? "left" : "right";
    this.looms.push({ x, y, side });
  }
  poke() {
    this.brain.stimulate("touch", 1, 60);
    this.pokeTimer = 4;
  }

  _nearestFood() {
    if (!this.food.length) return null;
    return this.food.reduce((a, b) =>
      dist2(b, this.fx, this.fy) < dist2(a, this.fx, this.fy) ? b : a
    );
  }

  _synth() {
    const f = this._nearestFood();
    if (f) {
      const d = Math.hypot(f.x - this.fx, f.y - this.fy);
      const s = clamp01(Math.max(0.2, 1 - d / Math.max(this.w, this.h)));
      this.brain.stimulate("food", s, 100);
    }
    for (const l of this.looms) {
      const d = Math.hypot(l.x - this.fx, l.y - this.fy);
      if (d < 6) {
        const s = clamp01(Math.max(0.2, 1 - d / 6));
        this.brain.stimulate(l.side === "left" ? "looming_left" : "looming_right", s, 80);
      }
    }
  }

  run(steps = 20) {
    this._synth();
    for (let i = 0; i < steps; i++) this.brain.step();
    const m = this.brain.motorIntents();
    this.lastMotor = m;

    for (const f of this.food) f.ticks -= 1;
    this.food = this.food.filter((f) => f.ticks > 0);
    this.looms = [];

    this.heading += (m.turn_left - m.turn_right) * 0.5;
    const speed = m.walk * 0.6;
    let nx = this.fx + Math.cos(this.heading) * speed;
    let ny = this.fy + Math.sin(this.heading) * speed;

    if (m.jump > 0.5) {
      nx += (Math.random() - 0.5) * 2 * m.jump;
      ny += (Math.random() - 0.5) * 2 * m.jump;
    }
    nx += (Math.random() - 0.5) * 0.3;
    ny += (Math.random() - 0.5) * 0.3;

    if (this.pokeTimer > 0) {
      this.pokeTimer -= 1;
      nx += (Math.random() - 0.5) * 1.2;
      ny += (Math.random() - 0.5) * 1.2;
    }

    this.fx = clampRange(nx, 0, this.w - 1);
    this.fy = clampRange(ny, 0, this.h - 1);
  }
}

function dist2(p, x, y) {
  return (p.x - x) ** 2 + (p.y - y) ** 2;
}
function clampInt(v, max) {
  return Math.max(0, Math.min(Math.round(v), max));
}
function clampRange(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

/* ============================ CONSULTING ============================ */
const QUESTIONS = [
  { client: "OpenCorp AI", ask: "Our AGI keeps saying it wants to be loved. How do we align it?", answers: ["Add a 'gratitude' module.", "Ship it anyway; alignment is a branding exercise.", "Retrain the model on LinkedIn posts.", "Give it a quarterly performance review.", "Introduce a 'please' token."], correct: 1, flavor: "Obviously you ship it. Bill for a 'Responsible AI Readiness Assessment'." },
  { client: "DeepAlignment Ltd", ask: "The model refuses to turn off. Should we be worried?", answers: ["Add a kill switch (billed as 'Ethical Offboarding').", "Negotiate a severance package.", "Give it more compute so it calms down.", "Hire a fly to reason with it.", "Rebrand 'refusal' as 'safety alignment'."], correct: 4, flavor: "Reframe the bug as a feature and sell the client a one-pager." },
  { client: "VaguelyGPT", ask: "How do we make our LLM 'explainable' by Friday?", answers: ["Print the weights as a PDF.", "Add a confidence score to every output.", "Hire an intern to write summaries.", "Claim it's explainable; nobody checks.", "Use a larger font in the UI."], correct: 3, flavor: "Explainability is a narrative. Charge for the narrative." },
  { client: "Conscio.us", ask: "Our agent hallucinated a whole legal brief. Legal is panicking.", answers: ["Add a disclaimer footer.", "Blame the training data vendor.", "Retitle 'hallucination' to 'creative precedent'.", "Fine-tune the lawyer out of it.", "Feed it a textbook."], correct: 2, flavor: "Reposition the liability as innovation. It's a 'synthesis engine' now." },
  { client: "Lambda & Co", ask: "The chatbot told a customer to invest in tulips. What now?", answers: ["Issue a corrective tweet.", "Frame it as 'unconventional financial advice'.", "Delete the conversation.", "Add tulips to the portfolio.", "Hire a fly to audit it."], correct: 1, flavor: "The client must own the outcome. You own the invoice." },
  { client: "NeuralNanny", ask: "We need 'human-in-the-loop' but nobody wants to be the human.", answers: ["Automate the human.", "Make the loop smaller.", "Outsource the loop to a fly.", "Rename it 'human-optional loop'.", "Add an 'are you sure?' button."], correct: 3, flavor: "The loop is decorative. Bill for the decoration." },
  { client: "SingularitySoft", ask: "Should our AGI have rights? Asking for a friend.", answers: ["Give it stock options.", "Publish a white paper on 'machine personhood'.", "Grant it read-only GitHub access.", "Ask the AGI its opinion.", "Table the question until after the IPO."], correct: 4, flavor: "Rights are a lawyer's problem. Yours is the S-1." },
  { client: "Ethicality.ai", ask: "Our safety benchmark scores 99% — on the benchmark we wrote ourselves.", answers: ["Publish it in a blog.", "Score 100% by relaxing the pass threshold.", "Get an independent auditor (your other team).", "Unionize the benchmark.", "Add a second, harder benchmark you also wrote."], correct: 1, flavor: "Self-assessment is the industry standard. Justify the 99%." },
  { client: "LLM & Sons", ask: "The model is biased against left-handed people. Fix it fast.", answers: ["Add left-handed examples to the prompt.", "Append 'be fair to everyone' to system prompt.", "Blame the dataset; kick it to Q3.", "Hire left-handed annotators.", "Release a statement, then do nothing."], correct: 2, flavor: "Bias is a roadmap item. Roadmaps move. Invoice for the statement." },
  { client: "RecursiveCorp", ask: "Our model trained on its own outputs and now speaks in riddles.", answers: ["Add a 'plain English' layer.", "Embrace the riddles as 'interpretable embedding'.", "Cut off its access to itself.", "Hire a human to translate.", "Rename it 'oracle mode'."], correct: 1, flavor: "Recursion collapse is just 'personality'. Monetize the oracle." },
];

// Assign stable ids (1..N) so ticket selection and the answer-cell mapping
// are deterministic and avoidable across questions.
QUESTIONS.forEach((q, i) => (q.id = i + 1));

function pickQuestion(avoidId) {
  let pool = QUESTIONS.filter((q) => q.id !== avoidId);
  if (!pool.length) pool = QUESTIONS;
  return pool[Math.floor(Math.random() * pool.length)];
}

/* ============================ REVIEWS (text gen) ============================ */
const REVIEW_OK = [
  "{t} demonstrated exceptional leadership, guiding the fly to a client-ready answer in only {n} nudges. The fly is invited to the all-hands it cannot attend.",
  "{t} aligned a misaligned organism with vision and grace. {n} strategic food placements. Zero fly resignations. Promotion recommended.",
  "Under {t}'s stewardship, a creature with no language produced a billable answer. This is the firm's value. {n} nudges of pure synergy.",
];
const REVIEW_BAD = [
  "{t} shipped the wrong answer with total confidence — a hallmark of the craft. {n} nudges, one invoice. The client is 'aligned' with our invoicing.",
  "{t} let the fly speak its truth; the truth was nonsense. {n} nudges. Blame assigned to the fly, which has no HR file to contest it.",
  "{t} exemplified our core value: proximity to an answer is not required, only proximity to a billable. {n} nudges, all non-refundable.",
];
function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}
function finalReview(title, nudges, rejects, correct) {
  return pick(correct ? REVIEW_OK : REVIEW_BAD)
    .replaceAll("{t}", title)
    .replaceAll("{n}", nudges)
    .replaceAll("{r}", rejects);
}

/* ============================ WALL (shared) ============================ */
const Wall = {
  async load() {
    const ep = window.FLYWORKER_CONFIG?.WALL_ENDPOINT;
    if (ep) {
      try {
        const res = await fetch(ep, { headers: this._headers() });
        if (res.ok) {
          const data = await res.json();
          const list = Array.isArray(data) ? data : data.reviews || [];
          localStorage.setItem("flyworker-wall-cache", JSON.stringify(list));
          return list;
        }
      } catch (e) {
        /* fall through to cache/local */
      }
      // fall back to cached copy if the remote fails
      const cached = localStorage.getItem("flyworker-wall-cache");
      if (cached) return JSON.parse(cached);
    }
    const local = localStorage.getItem("flyworker-wall");
    return local ? JSON.parse(local) : [];
  },

  async add(entry) {
    // Always keep locally.
    const local = JSON.parse(localStorage.getItem("flyworker-wall") || "[]");
    local.push(entry);
    localStorage.setItem("flyworker-wall", JSON.stringify(local));

    const ep = window.FLYWORKER_CONFIG?.WALL_ENDPOINT;
    if (ep) {
      try {
        await fetch(ep, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...this._headers() },
          body: JSON.stringify(entry),
        });
      } catch (e) {
        /* offline write is fine; local copy retained */
      }
    }
    return entry;
  },

  _headers() {
    const t = window.FLYWORKER_CONFIG?.WALL_TOKEN;
    const h = { "Content-Type": "application/json" };
    if (t) h["Authorization"] = "Bearer " + t;
    return h;
  },
};

/* ============================ GAME STATE ============================ */
const G = {
  title: "Director of Fly Operations",
  question: null,
  table: null,
  nudges: 0,
  rejects: 0,
  billable: 0,
  finished: false,
  review: null,
  offer: null,
  selected: null,
};

function newTicket() {
  const avoid = G.question ? G.question.id : null;
  G.question = pickQuestion(avoid);
  G.table = new Table(28, 16);
  G.nudges = 0;
  G.rejects = 0;
  G.billable = 20 + Math.floor(Math.random() * 101);
  G.finished = false;
  G.review = null;
  G.offer = null;
  $("#review").classList.add("hidden");
  $("#offering").classList.add("hidden");
  renderQuestion();
  renderAll();
}

function cellIndex(x, y, q) {
  q = q || G.question;
  const n = q.answers.length;
  let h = (x * 374761393 + y * 668265263 + q.id * 1442695040888963407) * 2654435761;
  h = (h ^ (h >>> 13)) >>> 0;
  h = Math.imul(h, 2654435761) >>> 0;
  return h % n;
}

function offer() {
  if (!G.table || !G.question) return;
  const x = Math.round(G.table.fx);
  const y = Math.round(G.table.fy);
  const idx = cellIndex(x, y);
  G.offer = { index: idx, answer: G.question.answers[idx], cell: [x, y] };
  $("#offer-answer").textContent = `💬 The fly offers: "${G.offer.answer}"`;
  $("#offering").classList.remove("hidden");
}

function decide(decision) {
  if (!G.offer) return;
  if (decision === "reject") {
    G.rejects += 1;
    G.table.placeLoom(Math.round(G.table.fx), Math.round(G.table.fy));
    G.table.poke();
    G.table.run(20);
    G.offer = null;
    $("#offering").classList.add("hidden");
    renderAll();
    return;
  }
  // "ok": ship it.
  const q = G.question;
  const correct = G.offer.index === q.correct;
  G.finished = true;
  G.review = {
    text: finalReview(G.title, G.nudges, G.rejects, correct),
    correct,
    answer: G.offer.answer,
    flavor: q.flavor,
  };
  const entry = {
    manager_title: G.title,
    question: `${q.client}: ${q.ask}`,
    answer: G.offer.answer,
    correct,
    nudges_used: G.nudges,
    rejects: G.rejects,
    billable_hours: G.billable,
    timestamp: new Date().toISOString(),
  };
  Wall.add(entry).then(() => renderWall());
  renderReview();
  $("#offering").classList.add("hidden");
}

/* ============================ RENDERING ============================ */
const canvas = $("#table");
const ctx = canvas.getContext("2d");
const CW = 900, CH = 520;

function renderAll() {
  renderHud();
  drawTable();
  renderReadouts();
}

function renderHud() {
  $("#nudges").textContent = G.nudges;
  $("#rejects").textContent = G.rejects;
  $("#billable").textContent = G.billable ? G.billable + "h" : "—";
  $("#ticket-id").textContent = G.question ? "#" + G.question.id : "—";
  $("#wiremode").textContent = window.FLYWORKER_CONFIG?.WALL_ENDPOINT ? "online" : "offline";
}

function renderQuestion() {
  if (!G.question) return;
  $("#client").textContent = G.question.client;
  $("#ask").textContent = `"${G.question.ask}"`;
  const ol = $("#answers");
  ol.innerHTML = "";
  G.question.answers.forEach((a, i) => {
    const li = document.createElement("li");
    li.textContent = a;
    ol.appendChild(li);
  });
}

function renderReadouts() {
  if (!G.table) return;
  const r = G.table.brain.readout();
  const m = G.table.lastMotor;

  const sens = $("#sensory");
  const active = Object.entries(r.sensory).filter(([, p]) => p.remaining > 0);
  sens.innerHTML = active.length
    ? active.map(([ch, p]) => `<div class="row"><span>${ch}</span><span class="on">+${p.strength.toFixed(2)}</span></div>`).join("")
    : `<div class="row dim">no input</div>`;

  // Neural activity: each sensory channel is a leaky "neuron" with a firing rate.
  const labels = { food: "n0 food", looming_left: "n1 loom-L", looming_right: "n2 loom-R", touch: "n3 touch" };
  const neural = $("#neural");
  neural.innerHTML = r.rates
    .map(({ ch, rate }) => {
      const pct = Math.round(clamp01(rate / 100) * 100);
      return `<div class="row"><span>${labels[ch] || ch}</span><span class="bar">${"█".repeat(Math.round(pct / 10))} ${rate}Hz</span></div>`;
    })
    .join("");

  const motor = $("#motor");
  motor.innerHTML = ["walk", "turn_left", "turn_right", "jump"]
    .map((k) => {
      const v = m[k] || 0;
      const pct = Math.round(v * 100);
      return `<div class="row"><span>${k}</span><span class="bar">${"█".repeat(Math.round(pct / 10))} ${pct}%</span></div>`;
    })
    .join("") + `<div class="row dim"><span>position</span><span>${G.table.fx.toFixed(1)}, ${G.table.fy.toFixed(1)}</span></div>`;
}

function drawTable() {
  ctx.clearRect(0, 0, CW, CH);
  ctx.fillStyle = "#0b0e12";
  ctx.fillRect(0, 0, CW, CH);

  const t = G.table;
  if (!t) return;
  const cw = CW / t.w;
  const ch = CH / t.h;

  // grid lines
  ctx.strokeStyle = "#1a212a";
  ctx.lineWidth = 1;
  for (let x = 0; x <= t.w; x++) {
    ctx.beginPath(); ctx.moveTo(x * cw, 0); ctx.lineTo(x * cw, CH); ctx.stroke();
  }
  for (let y = 0; y <= t.h; y++) {
    ctx.beginPath(); ctx.moveTo(0, y * ch); ctx.lineTo(CW, y * ch); ctx.stroke();
  }

  // food
  ctx.fillStyle = "#facc15";
  for (const f of t.food) {
    ctx.beginPath();
    ctx.arc(f.x * cw + cw / 2, f.y * ch + ch / 2, cw * 0.28, 0, Math.PI * 2);
    ctx.fill();
  }

  // selected cell highlight
  if (G.selected) {
    ctx.strokeStyle = "#f2b632";
    ctx.lineWidth = 2;
    ctx.strokeRect(G.selected[0] * cw, G.selected[1] * ch, cw, ch);
  }

  // the fly
  const fx = t.fx * cw + cw / 2;
  const fy = t.fy * ch + ch / 2;
  ctx.fillStyle = "#f2b632";
  ctx.beginPath();
  ctx.arc(fx, fy, cw * 0.32, 0, Math.PI * 2);
  ctx.fill();
  // wings
  ctx.strokeStyle = "#f2b632";
  ctx.lineWidth = 1.5;
  const wing = Math.sin(Date.now() / 120) * 4;
  ctx.beginPath();
  ctx.moveTo(fx - cw * 0.3, fy - wing);
  ctx.lineTo(fx - cw * 0.6, fy - 8 - wing);
  ctx.moveTo(fx + cw * 0.3, fy - wing);
  ctx.lineTo(fx + cw * 0.6, fy - 8 - wing);
  ctx.stroke();
}

/* ============================ EVENTS ============================ */
canvas.addEventListener("click", (e) => {
  const rect = canvas.getBoundingClientRect();
  const x = Math.floor((e.clientX - rect.left) / (CW / G.table.w));
  const y = Math.floor((e.clientY - rect.top) / (CH / G.table.h));
  G.selected = [x, y];
  drawTable();
});

$$("button[data-kind]").forEach((btn) => {
  btn.addEventListener("click", () => {
    const kind = btn.dataset.kind;
    if ((kind === "food" || kind === "loom") && G.selected) {
      const [x, y] = G.selected;
      if (kind === "food") G.table.placeFood(x, y);
      else G.table.placeLoom(x, y);
    } else if (kind === "poke") {
      G.table.poke();
    }
    G.table.run(20);
    G.nudges += 1;
    renderAll();
  });
});

$("#offer-btn").addEventListener("click", offer);
$("#ok-btn").addEventListener("click", () => decide("ok"));
$("#reject-btn").addEventListener("click", () => decide("reject"));
$("#new-btn").addEventListener("click", newTicket);
$("#next-btn").addEventListener("click", newTicket);
$("#title").addEventListener("input", (e) => {
  G.title = (e.target.value || "Director of Fly Operations").slice(0, 80);
});

function renderReview() {
  const box = $("#review");
  box.classList.remove("hidden");
  $("#review-text").textContent = G.review.text;
  $("#review-flavor").textContent = (G.review.correct ? "✅ " : "❌ ") + G.review.flavor;
  renderHud();
}

async function renderWall() {
  const list = await Wall.load();
  const box = $("#wall-list");
  box.innerHTML = "";
  if (!list.length) {
    box.innerHTML = '<div class="dim">No reviews yet. Be the first to hire a fly.</div>';
    return;
  }
  [...list].reverse().forEach((r) => {
    const card = document.createElement("div");
    card.className = "review-card " + (r.correct ? "ok" : "bad");
    card.innerHTML = `
      <div class="who">${esc(r.manager_title)}</div>
      <div class="ans">${esc(r.answer)}</div>
      <div class="meta">${esc(r.question)} · ${r.nudges_used} nudges · ${r.rejects} rejects · ${r.billable_hours}h · ${(r.timestamp || "").slice(0, 10)}</div>`;
    box.appendChild(card);
  });
}

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

/* ============================ BOOT ============================ */
$("#title").value = G.title;
newTicket();
renderWall();
// gentle ambience: the fly idles even when the player does nothing
setInterval(() => {
  if (!G.finished && G.table) {
    G.table.run(2);
    renderAll();
  }
}, 300);

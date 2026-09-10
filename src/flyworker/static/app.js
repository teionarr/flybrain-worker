// Management dashboard client.
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

let state = null;
let gridSize = null;
let selectedCell = null; // [x, y]

async function api(path, body) {
  const opts = body ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : {};
  const res = await fetch(path, opts);
  return res.json();
}

async function refresh() {
  state = await api("/api/state");
  render();
}

function render() {
  if (!state) return;
  $("#title").value = state.manager_title || "";
  $("#billable").textContent = state.billable ? `billable: ${state.billable}h` : "billable: —";

  if (state.finished && state.review) {
    $("#review").classList.remove("hidden");
    $("#review-text").textContent = state.review.text;
    $("#review-flavor").textContent = state.review.correct
      ? "✅ " + state.review.flavor
      : "❌ " + state.review.flavor;
  } else {
    $("#review").classList.add("hidden");
  }

  renderQuestion();
  renderTable();
  renderReadout();
  renderWall();
}

function renderWall() {
  const list = state.wall || [];
  const box = $("#wall-list");
  box.innerHTML = "";
  if (!list.length) {
    box.innerHTML = '<p class="hint">No reviews yet. Be the first to hire a fly.</p>';
    return;
  }
  // newest first
  [...list].reverse().forEach((r) => {
    const card = document.createElement("div");
    card.className = "review-card " + (r.correct ? "ok" : "bad");
    card.innerHTML = `
      <div class="who">${escapeHtml(r.manager_title)}</div>
      <div>${escapeHtml(r.answer)}</div>
      <div class="meta">${escapeHtml(r.question)} · ${r.nudges_used} nudges · ${r.rejects} rejects · ${r.billable_hours}h billed · ${(r.timestamp || "").slice(0, 10)}</div>`;
    box.appendChild(card);
  });
}

function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
}

function renderQuestion() {
  const q = state.question;
  const box = $("#question");
  if (!q) { box.classList.add("hidden"); return; }
  box.classList.remove("hidden");
  $("#client").textContent = q.client;
  $("#ask").textContent = q.ask;
  const ul = $("#answers");
  ul.innerHTML = "";
  q.answers.forEach((a, i) => {
    const li = document.createElement("li");
    li.textContent = `${String.fromCharCode(65 + i)}) ${a}`;
    ul.appendChild(li);
  });
}

function cellClass(x, y, tbl) {
  const cx = Math.round(tbl.fly.x);
  const cy = Math.round(tbl.fly.y);
  if (x === cx && y === cy) return "fly";
  for (const f of tbl.food) if (x === f.x && y === f.y) return "food";
  return "";
}

function renderTable() {
  const tbl = state.table;
  const grid = $("#grid");
  if (!tbl) { grid.innerHTML = ""; return; }
  const { w, h } = tbl.size || { w: 28, h: 16 };
  gridSize = { w, h };
  grid.style.gridTemplateColumns = `repeat(${w}, 1fr)`;
  grid.innerHTML = "";
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const div = document.createElement("div");
      div.className = "cell " + cellClass(x, y, tbl);
      div.dataset.x = x;
      div.dataset.y = y;
      div.textContent = cellClass(x, y, tbl) === "fly" ? "🪰" : (cellClass(x, y, tbl) === "food" ? "·" : "");
      div.addEventListener("click", () => { selectedCell = [x, y]; highlightSelected(); });
      grid.appendChild(div);
    }
  }
}

function highlightSelected() {
  if (!selectedCell) return;
  $$("#grid .cell").forEach((c) => {
    c.style.outline = (+c.dataset.x === selectedCell[0] && +c.dataset.y === selectedCell[1])
      ? "1px solid var(--accent)" : "none";
  });
}

function renderReadout() {
  const tbl = state.table;
  const box = $("#readout");
  if (!tbl) { box.innerHTML = "—"; return; }
  const m = tbl.motor || {};
  const rows = [
    ["walk", m.walk],
    ["turn_left", m.turn_left],
    ["turn_right", m.turn_right],
    ["jump", m.jump],
  ];
  box.innerHTML = rows.map(([k, v]) => {
    const pct = Math.round((v || 0) * 100);
    return `<div class="row"><span>${k}</span><span class="bar">${"█".repeat(Math.round(pct / 10))}${pct}%</span></div>`;
  }).join("") + `<div class="row"><span>position</span><span>${tbl.fly.x}, ${tbl.fly.y}</span></div>`;
}

// ---- controls --------------------------------------------------------------
$("#new-question").addEventListener("click", async () => {
  await api("/api/title", { title: $("#title").value });
  await api("/api/new_question", {});
  await refresh();
});

$("#title").addEventListener("change", async () => {
  await api("/api/title", { title: $("#title").value });
});

$$("#controls button[data-kind]").forEach((btn) => {
  btn.addEventListener("click", async () => {
    const kind = btn.dataset.kind;
    const body = { kind };
    if (selectedCell && (kind === "food" || kind === "loom")) {
      body.x = selectedCell[0];
      body.y = selectedCell[1];
    }
    await api("/api/nudge", body);
    await refresh();
  });
});

$("#offer").addEventListener("click", async () => {
  const res = await api("/api/offer");
  const box = $("#offer-box");
  if (res.ok) {
    box.classList.remove("hidden");
    box.innerHTML = `
      <div class="answer">💬 The fly offers: <strong>${res.answer}</strong></div>
      <div class="actions">
        <button data-decision="ok" data-index="${res.index}">✅ OK → client</button>
        <button data-decision="reject" data-index="${res.index}">❌ Reject (hurt the fly)</button>
      </div>`;
    box.querySelectorAll("button").forEach((b) => b.addEventListener("click", decide));
  }
});

async function decide(e) {
  const index = e.target.dataset.index;
  const decision = e.target.dataset.decision;
  const res = await api("/api/decide", { decision, index });
  if (decision === "ok") {
    $("#offer-box").classList.add("hidden");
  }
  await refresh();
}

// Seed the wall on load server-side; render it too.
refresh();

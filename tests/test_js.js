// Headless logic test for the client-side game (pure portion of app.js).
const fs = require('fs');
let src = fs.readFileSync('src/flyworker/static/app.js', 'utf8');
const cut = src.indexOf('/* ============================ RENDERING');
const pure = src.slice(0, cut);

const store = {};
globalThis.localStorage = { getItem: (k) => store[k] ?? null, setItem: (k, v) => (store[k] = v) };
globalThis.window = { FLYWORKER_CONFIG: {} };
globalThis.fetch = async () => { throw new Error('offline'); };

const M = new Function(pure + `; return { FlyBrain, Table, QUESTIONS, pickQuestion, finalReview, cellIndex, Wall, mulberry32, clamp01 };`)();

(async () => {
  // Brain behaviors
  let b = new M.FlyBrain();
  b.stimulate('food', 1, 200); for (let i = 0; i < 60; i++) b.step();
  const foodM = b.motorIntents();
  b = new M.FlyBrain();
  b.stimulate('looming_left', 1, 200); for (let i = 0; i < 60; i++) b.step();
  const loomM = b.motorIntents();
  b = new M.FlyBrain();
  b.stimulate('touch', 1, 100); for (let i = 0; i < 40; i++) b.step();
  const touchM = b.motorIntents();
  console.log('food -> walk>0:', foodM.walk > 0, foodM);
  console.log('loom-L -> turn_right>0:', loomM.turn_right > 0, loomM);
  console.log('touch -> jump>0:', touchM.jump > 0, touchM);

  // Table drift toward food
  const t = new M.Table(28, 16);
  t.placeFood(25, 3, 1);
  const sx = t.fx;
  for (let i = 0; i < 80; i++) t.run(20);
  console.log('drift toward food:', sx.toFixed(1), '->', t.fx.toFixed(1));

  // Questions have ids
  console.log('questions:', M.QUESTIONS.length, '| ids 1..N:', M.QUESTIONS.map(q => q.id).join(','));

  // cellIndex deterministic
  console.log('cellIndex deterministic:', M.cellIndex(5, 5, M.QUESTIONS[0]) === M.cellIndex(5, 5, M.QUESTIONS[0]));
  console.log('cellIndex in range:', M.cellIndex(12, 3, M.QUESTIONS[0]) >= 0 && M.cellIndex(12, 3, M.QUESTIONS[0]) < M.QUESTIONS[0].answers.length);

  // review
  const rv = M.finalReview('VP of Vibe', 9, 3, true);
  console.log('review has title:', rv.includes('VP of Vibe'));

  // Wall
  await M.Wall.add({ manager_title: 'VP of Vibe', question: 'c', answer: 'a', correct: true, nudges_used: 1, rejects: 0, billable_hours: 1, timestamp: new Date().toISOString() });
  const w = await M.Wall.load();
  console.log('wall entries:', w.length);

  console.log('\nALL OK');
})();

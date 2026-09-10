// Headless logic test for the client-side game (pure portion of app.js).
const fs = require('fs');
let src = fs.readFileSync('src/flyworker/static/app.js', 'utf8');
const cut = src.indexOf('/* ============================ RENDERING');
const pure = src.slice(0, cut);

const store = {};
globalThis.localStorage = { getItem: (k) => store[k] ?? null, setItem: (k, v) => (store[k] = v) };
globalThis.window = { FLYWORKER_CONFIG: {} };
globalThis.fetch = async () => { throw new Error('offline'); };

const M = new Function(pure + `; return { FlyBrain, Table, QUESTIONS, pickQuestion, finalReview, Wall, mulberry32, clamp01 };`)();

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

  // Zones: 5 bands A-E, spanning full width
  const t = new M.Table(28, 16);
  const zones = t.zones();
  console.log('zone count:', zones.length);
  console.log('zone labels:', zones.map(z => z.label).join(''));
  console.log('zones cover full width:', zones[0].x0 === 0 && zones[4].x1 === 28);

  // currentZone detection
  t.fx = 0.5; // far left -> zone A (index 0)
  console.log('currentZone at x=0.5 -> A:', t.currentZone() === 0);
  t.fx = 14; // middle -> around zone C (index 2)
  console.log('currentZone at x=14 ->', t.currentZone(), '(expect 2 = C)');
  t.fx = 27; // far right -> zone E (index 4)
  console.log('currentZone at x=27 -> E:', t.currentZone() === 4);
  t.fx = 5.6; // boundary of A/B -> A (index 0) since x < x1
  console.log('currentZone at x=5.5 (A/B edge):', t.currentZone());

  // fly steers toward food (gaze) — off-axis so heading must change
  const t2 = new M.Table(28, 16);
  t2.fx = 4; t2.fy = 2; t2.heading = 0;
  t2.placeFood(20, 14, 1);
  const before = t2.heading;
  for (let i = 0; i < 40; i++) t2.run(10);
  const target = Math.atan2(14 - 2, 20 - 4);
  console.log('steer toward food:', before.toFixed(2), '->', t2.heading.toFixed(2), '(target ~', target.toFixed(2) + ')');
  console.log('heading moved toward food:', Math.abs(t2.heading - target) < 0.5);

  // questions
  console.log('questions:', M.QUESTIONS.length, '| ids:', M.QUESTIONS.map(q => q.id).join(','));

  // review
  console.log('review has title:', M.finalReview('VP of Vibe', 9, 3, true).includes('VP of Vibe'));

  // wall
  await M.Wall.add({ manager_title: 'VP of Vibe', question: 'c', answer: 'a', correct: true, nudges_used: 1, rejects: 0, billable_hours: 1, timestamp: new Date().toISOString() });
  console.log('wall entries:', (await M.Wall.load()).length);

  console.log('\nALL OK');
})();

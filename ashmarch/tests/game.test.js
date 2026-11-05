import assert from "node:assert/strict";
import test from "node:test";
import {
  bearRally,
  buildingCost,
  claimChapter,
  claimDaily,
  claimGovernor,
  counterMod,
  createNewGame,
  defensePower,
  donate,
  fightRebelWave,
  governorBoard,
  hydrate,
  joinAlliance,
  levelHero,
  lockReason,
  rallyPreview,
  rebelWavePower,
  resolveKop,
  setBearPlan,
  setSpeed,
  startBear,
  startCastle,
  startGlaive,
  startKop,
  startMarch,
  startResearch,
  summon,
  tick,
  touch,
  train,
  upgrade,
  useSpeedup,
} from "../js/game.js";

const T = 1_700_000_000_000;

function game(name = "Ada") {
  const state = createNewGame(name, T);
  tick(state, T);
  return state;
}

function rich(state) {
  state.resources = { grain: 9e6, timber: 9e6, stone: 9e6, iron: 9e6, gold: 9e6, gems: 5000 };
  state.speedups.general = 500;
  return state;
}

function finishBuild(state) {
  assert.ok(state.build);
  const wait = state.build.endsAt - state.clock.gameNow + 20;
  tick(state, state.clock.realNow + wait);
}

test("new governor starts with a town, grain, and Seren", () => {
  const state = game();
  assert.equal(state.name, "Ada");
  assert.equal(state.buildings.keep.level, 1);
  assert.equal(state.buildings.farm.level, 1);
  assert.equal(state.heroes.seren.owned, true);
  assert.equal(state.heroes.vesper.owned, false);
  assert.ok(state.resources.grain >= 1000);
  assert.equal(lockReason(state, "daily"), null);
  assert.equal(lockReason(state, "bear"), "Town Center level 4");
});

test("farm upgrade spends resources and finishes on the clock", () => {
  const state = rich(game());
  const before = state.resources.grain;
  const result = upgrade(state, "farm");
  assert.equal(result.ok, true);
  assert.ok(state.resources.grain < before);
  assert.equal(state.buildings.farm.level, 1);
  finishBuild(state);
  assert.equal(state.buildings.farm.level, 2);
  assert.equal(state.build, null);
  assert.ok(state.governor.dayScore > 0);
});

test("training is refused without resources and completes into the army", () => {
  const state = game();
  state.resources.grain = 0;
  state.resources.timber = 0;
  assert.equal(train(state, "shield", 10).ok, false);
  rich(state);
  assert.equal(train(state, "shield", 25).ok, true);
  const wait = state.training.endsAt - state.clock.gameNow + 20;
  tick(state, state.clock.realNow + wait);
  assert.equal(state.troops.shield, 36 + 25);
  assert.equal(state.stats.trained, 25);
});

test("Strongest Governor scores builds on day 1 and troops on day 4 only", () => {
  const state = rich(game());
  upgrade(state, "mill");
  finishBuild(state);
  const buildPoints = state.governor.dayScore;
  assert.ok(buildPoints > 0);
  train(state, "shield", 30);
  const wait = state.training.endsAt - state.clock.gameNow + 20;
  tick(state, state.clock.realNow + wait);
  assert.equal(state.governor.dayScore, buildPoints);

  state.governor.startedAt = state.clock.gameNow - 3 * 6 * 60 * 1000;
  tick(state, state.clock.realNow + 30);
  assert.equal(state.governor.currentDay, 4);
  assert.equal(state.governor.dayScore, 0);
  const before = state.stats.govPoints;
  train(state, "shield", 20);
  tick(state, state.clock.realNow + (state.training.endsAt - state.clock.gameNow) + 20);
  assert.ok(state.governor.dayScore > 0);
  assert.ok(state.stats.govPoints > before);
  const scored = state.governor.dayScore;
  upgrade(state, "quarry");
  finishBuild(state);
  assert.equal(state.governor.dayScore, scored);
});

test("day 4 build does not add governor points", () => {
  const state = rich(game());
  state.governor.startedAt = state.clock.gameNow - 3 * 6 * 60 * 1000;
  tick(state, state.clock.realNow + 30);
  upgrade(state, "farm");
  finishBuild(state);
  assert.equal(state.governor.dayScore, 0);
});

test("governor milestones pay once", () => {
  const state = rich(game());
  state.governor.dayScore = 1000;
  const first = claimGovernor(state, 0);
  assert.equal(first.ok, true);
  assert.equal(claimGovernor(state, 0).ok, false);
  assert.equal(claimGovernor(state, 2).ok, false);
});

test("bear hunt rally deals damage and returns every troop", () => {
  const state = rich(game());
  state.buildings.keep.level = 4;
  state.buildings.pitfall.level = 2;
  state.alliance.joined = true;
  state.troops.marksman = 80;
  assert.equal(lockReason(state, "bear"), null);
  assert.equal(startBear(state).ok, true);
  setBearPlan(state, "marksman", "seren");
  const before = { ...state.troops };
  const preview = rallyPreview(state, "marksman", "seren");
  assert.ok(preview.damage > 500);
  const hit = bearRally(state);
  assert.equal(hit.ok, true);
  assert.equal(state.bear.personal, hit.damage);
  assert.deepEqual(state.troops, before);
  assert.equal(bearRally(state).ok, false);
  tick(state, state.clock.realNow + 8000);
  assert.equal(bearRally(state).ok, true);
});

test("counter triangle favors infantry over cavalry", () => {
  assert.equal(counterMod("shield", "rider"), 1.25);
  assert.equal(counterMod("rider", "marksman"), 1.25);
  assert.equal(counterMod("marksman", "shield"), 1.25);
  assert.equal(counterMod("shield", "marksman"), 0.8);
  assert.ok(rebelWavePower(1) < defensePower(game()));
});

test("rebel invasion clears early waves and stops when outmatched", () => {
  const state = game();
  state.buildings.keep.level = 2;
  const first = fightRebelWave(state, false);
  assert.equal(first.ok, true);
  assert.equal(first.logs[0].win, true);
  assert.equal(state.rebels.nextWave, 2);
  state.troops = { shield: 0, rider: 0, marksman: 0 };
  state.buildings.wall.level = 0;
  state.heroes.seren.level = 1;
  const stopped = fightRebelWave(state, false);
  assert.equal(stopped.logs.at(-1).win, false);
  assert.equal(state.rebels.nextWave, 1);
  assert.ok(state.rebels.best >= 1);
});

test("kingdom of power prep scores training and the default lanes can resolve", () => {
  const state = rich(game());
  state.buildings.keep.level = 5;
  state.troops = { shield: 200, rider: 200, marksman: 200 };
  assert.equal(startKop(state).ok, true);
  assert.equal(state.kop.phase, "prep");
  train(state, "shield", 10);
  tick(state, state.clock.realNow + (state.training.endsAt - state.clock.gameNow) + 20);
  assert.ok(state.kop.yourPrep > 0);
  state.kop.phase = "battle";
  const result = resolveKop(state);
  assert.equal(result.ok, true);
  assert.equal(result.wins, 3);
  assert.equal(state.kop.phase, "triage");
});

test("alliance gates the pit and helps construction", () => {
  const state = rich(game());
  assert.equal(joinAlliance(state).ok, false);
  state.buildings.keep.level = 3;
  assert.equal(joinAlliance(state).ok, true);
  assert.equal(donate(state, "grain").ok, true);
  assert.equal(state.alliance.contribution, 10);
  upgrade(state, "farm");
  const original = state.build.endsAt;
  tick(state, state.clock.realNow + 4000);
  assert.ok(state.build.endsAt < original);
  assert.equal(state.build.helps, 1);
});

test("speedups shorten a build and score on construction day", () => {
  const state = rich(game());
  state.buildings.keep.level = 2;
  upgrade(state, "storehouse");
  const before = state.governor.dayScore;
  const result = useSpeedup(state, "build", 5);
  assert.equal(result.ok, true);
  assert.ok(state.governor.dayScore >= before + 150);
});

test("daily report can be claimed once", () => {
  const state = game();
  const result = claimDaily(state, "login");
  assert.equal(result.ok, true);
  assert.equal(claimDaily(state, "login").ok, false);
  assert.ok(state.resources.gems > 100);
});

test("chapters pay the farm goal", () => {
  const state = rich(game());
  assert.equal(claimChapter(state).ok, false);
  upgrade(state, "farm");
  finishBuild(state);
  const result = claimChapter(state);
  assert.equal(result.ok, true);
  assert.equal(result.detail, "Break ground");
});

test("gather march returns grain and leaderboard includes the governor", () => {
  const state = game();
  const node = state.map.find((tile) => tile.kind === "grain");
  assert.equal(startMarch(state, node.id).ok, true);
  const wait = state.marches[0].endsAt - state.clock.gameNow + 20;
  const before = state.resources.grain;
  tick(state, state.clock.realNow + wait);
  assert.equal(state.stats.gathers, 1);
  assert.ok(state.resources.grain > before);
  assert.equal(state.marches.length, 0);
  const board = governorBoard(state, state.clock.gameNow);
  assert.ok(board.some((row) => row.you));
});

test("save roundtrip keeps the town and offline time finishes a build", () => {
  const state = rich(game());
  state.buildings.keep.level = 2;
  upgrade(state, "wall");
  const saved = JSON.stringify(state);
  const later = state.clock.realNow + (state.build.endsAt - state.clock.gameNow) + 5000;
  const loaded = hydrate(saved, later);
  tick(loaded, later);
  assert.equal(loaded.buildings.wall.level, 1);
  assert.equal(loaded.name, "Ada");
});

test("clock speed finishes work in less real time", () => {
  const state = rich(game());
  state.buildings.keep.level = 2;
  setSpeed(state, 10, state.clock.realNow);
  upgrade(state, "mine");
  const gameWait = state.build.endsAt - state.clock.gameNow;
  tick(state, state.clock.realNow + gameWait / 10 + 50);
  assert.equal(state.buildings.mine.level, 1);
});

test("hero summon spends gems and research can be queued", () => {
  const state = rich(game());
  state.buildings.hall.level = 1;
  state.buildings.academy.level = 1;
  const before = state.resources.gems;
  const summoned = summon(state);
  assert.equal(summoned.ok, true);
  assert.equal(state.resources.gems, before - 80);
  assert.equal(startResearch(state, "battle").ok, true);
  assert.equal(levelHero(state, "seren").ok, true);
  assert.equal(state.heroes.seren.level, 2);
});

test("golden glaives and castle refuse a brand new town", () => {
  const state = game();
  assert.equal(startGlaive(state, "ridge").ok, false);
  assert.equal(startCastle(state).ok, false);
  assert.ok(buildingCost("keep", 2).grain > 0);
});

test("castle battle with a large garrison holds", () => {
  const state = rich(game());
  state.buildings.keep.level = 6;
  state.troops = { shield: 400, rider: 200, marksman: 200 };
  assert.equal(startCastle(state).ok, true);
  tick(state, state.clock.realNow + 20000);
  assert.ok(state.castle.yourHold > 0);
  assert.equal(state.castle.rivalHold, 0);
});

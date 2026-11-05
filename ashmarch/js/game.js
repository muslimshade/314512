// Ashmarch rules. Season-1 events live here.
// Adding an event: state in createNewGame, actions, a tick step, and a screen in ui.js.

import {
  ALLIANCE,
  BEAR_ALLIANCE,
  BEAR_COOLDOWN_MS,
  BEAR_MS,
  BEAR_PERSONAL,
  BUILDINGS,
  CHAPTERS,
  DAILY_BONUS,
  DAILY_TASKS,
  DAY_MS,
  GLAIVE_MISSIONS,
  GLAIVE_SHOP,
  GOV_MILESTONES,
  GOVERNOR_DAYS,
  HEROES,
  NPC_GOVERNORS,
  RALLY_GAP_MS,
  RARITY_WEIGHT,
  RESEARCH,
  RESOURCE_KEYS,
  SUMMON_COST,
  TRAIN_POINTS,
  TROOP_IDS,
  TROOPS,
} from "./data.js";

const STAR_COST = [10, 20, 40, 80, 160];
const BEATS = { shield: "rider", rider: "marksman", marksman: "shield" };

export function createNewGame(name, realNow) {
  const buildings = {};
  for (const [id, def] of Object.entries(BUILDINGS)) {
    buildings[id] = { level: def.start || 0 };
  }
  const heroes = {};
  for (const hero of HEROES) {
    heroes[hero.id] = { owned: hero.id === "seren", level: 1, stars: 0, skill: 1, shards: 0 };
  }
  return {
    version: 1,
    name: cleanName(name),
    clock: { realNow, gameNow: realNow, speed: 1 },
    resources: { grain: 1600, timber: 1600, stone: 900, iron: 350, gold: 160, gems: 100 },
    frac: { grain: 0, timber: 0, stone: 0, iron: 0 },
    speedups: { general: 8 },
    stock: { aurum: 0, glaive: 0 },
    buildings,
    build: null,
    troops: { shield: 36, rider: 0, marksman: 0 },
    wounded: { shield: 0, rider: 0, marksman: 0 },
    training: null,
    heroes,
    leadHeroId: "seren",
    research: { growth: 0, economy: 0, battle: 0 },
    studying: null,
    stamina: 100,
    staminaAt: realNow,
    lastProd: realNow,
    healAt: realNow,
    seed: (realNow >>> 0) || 1,
    nextId: 1,
    alliance: { joined: false, contribution: 0, donations: 0 },
    map: makeMap(),
    marches: [],
    feed: [{ text: "The valley is quiet. The calendar is not.", at: realNow }],
    pendingNotes: [],
    tutorialStep: 0,
    chapterIndex: 0,
    banner: "ember",
    settings: { sound: true },
    stats: {
      trained: 0,
      rebels: 0,
      gathers: 0,
      rallies: 0,
      upgrades: 0,
      glaives: 0,
      kop: 0,
      castle: 0,
      govPoints: 0,
      summons: 0,
    },
    daily: freshDaily(dubaiKey(realNow)),
    governor: {
      startedAt: realNow,
      currentDay: 1,
      dayScore: 0,
      overall: 0,
      dayClaimed: [],
      overallClaimed: false,
      history: [],
    },
    bear: {
      endsAt: 0,
      cooldownUntil: 0,
      personal: 0,
      alliance: 0,
      rallies: 0,
      nextRally: 0,
      nextNpc: 0,
      claimedPersonal: [],
      claimedAlliance: [],
      formation: "marksman",
      heroId: "seren",
    },
    rebels: { best: 0, nextWave: 1 },
    glaiveSlots: [null, null, null],
    kop: freshKop(),
    castle: freshCastle(),
    awayMs: 0,
  };
}

function freshKop() {
  return {
    phase: "idle",
    endsAt: 0,
    cooldownUntil: 0,
    yourPrep: 0,
    rivalPrep: 0,
    lastTick: 0,
    assignment: ["shield", "rider", "marksman"],
    heroLane: 0,
    heroId: "seren",
    rivalLanes: ["rider", "marksman", "shield"],
    wins: 0,
    yourBattle: 0,
    rivalBattle: 0,
    triagePoints: 0,
    logs: [],
    claimed: false,
  };
}

function freshCastle() {
  return {
    active: false,
    endsAt: 0,
    cooldownUntil: 0,
    nextClash: 0,
    yourHold: 0,
    rivalHold: 0,
    continuous: 0,
    garrison: { shield: 0, rider: 0, marksman: 0 },
    inspire: false,
    result: null,
    claimed: false,
  };
}

function freshDaily(date) {
  return {
    date,
    progress: { login: 1, upgrades: 0, trained: 0, gathers: 0, rebels: 0, donations: 0, rallies: 0, glaives: 0 },
    claimed: [],
    bonusClaimed: false,
  };
}

function makeMap() {
  const spec = [
    ["grain", 1], ["timber", 1], ["stone", 1], ["iron", 1],
    ["grain", 2], ["timber", 2], ["rebel", 1], ["rebel", 2],
    ["stone", 2], ["iron", 2], ["rebel", 3], ["rebel", 4],
    ["grain", 3], ["bear", 1], ["castle", 1], ["rebel", 5],
  ];
  return spec.map(([kind, level], i) => ({ id: `n${i}`, kind, level, respawnAt: 0 }));
}

export function hydrate(raw, realNow) {
  const state = typeof raw === "string" ? JSON.parse(raw) : raw;
  migrate(state);
  const gap = Math.max(0, realNow - (state.clock?.realNow || realNow));
  const gameGap = Math.min(gap * (state.clock?.speed || 1), 8 * 3600 * 1000);
  state.clock.gameNow += gameGap;
  state.clock.realNow = realNow;
  state.awayMs = gap;
  state.pendingNotes = [];
  return state;
}

function migrate(state) {
  state.version = 1;
  state.stock ||= { aurum: 0, glaive: 0 };
  state.speedups ||= { general: 0 };
  state.frac ||= { grain: 0, timber: 0, stone: 0, iron: 0 };
  state.wounded ||= { shield: 0, rider: 0, marksman: 0 };
  state.stats ||= {};
  state.pendingNotes ||= [];
  state.feed ||= [];
  state.marches ||= [];
  state.map ||= makeMap();
  state.daily ||= freshDaily(dubaiKey(state.clock.realNow));
  state.governor ||= {
    startedAt: state.clock.gameNow,
    currentDay: 1,
    dayScore: 0,
    overall: 0,
    dayClaimed: [],
    overallClaimed: false,
    history: [],
  };
  state.bear ||= {
    endsAt: 0, cooldownUntil: 0, personal: 0, alliance: 0, rallies: 0,
    nextRally: 0, nextNpc: 0, claimedPersonal: [], claimedAlliance: [],
    formation: "marksman", heroId: "seren",
  };
  state.rebels ||= { best: 0, nextWave: 1 };
  state.glaiveSlots ||= [null, null, null];
  state.kop ||= freshKop();
  state.castle ||= freshCastle();
  state.banner ||= "ember";
  state.settings ||= { sound: true };
  if (!state.leadHeroId) state.leadHeroId = "seren";
}

export function touch(state, realNow) {
  const dt = Math.max(0, realNow - state.clock.realNow);
  state.clock.gameNow += dt * state.clock.speed;
  state.clock.realNow = realNow;
  return state.clock.gameNow;
}

export function setSpeed(state, speed, realNow) {
  touch(state, realNow);
  const allowed = [1, 3, 10];
  state.clock.speed = allowed.includes(speed) ? speed : 1;
  return { ok: true };
}

export function tick(state, realNow) {
  const now = touch(state, realNow);
  let changed = false;
  if (rollDaily(state)) changed = true;
  // Roll the event calendar before queues pay out, so a building
  // that finishes as the day changes scores on the new day.
  if (processGovernor(state, now)) changed = true;
  if (produce(state, now)) changed = false;
  if (regenStamina(state, now)) changed = false;
  if (processHelp(state, now)) changed = true;
  if (processBuild(state, now)) changed = true;
  if (processTraining(state, now)) changed = true;
  if (processResearch(state, now)) changed = true;
  if (processMarches(state, now)) changed = true;
  if (processHeal(state, now)) changed = false;
  if (processBear(state, now)) changed = true;
  if (processKop(state, now)) changed = true;
  if (processCastle(state, now)) changed = true;
  if (processGlaives(state, now)) changed = true;
  return { now, changed };
}

function rollDaily(state) {
  const key = dubaiKey(state.clock.realNow);
  if (state.daily.date === key) return false;
  state.daily = freshDaily(key);
  note(state, "A new day of missions is posted.");
  return true;
}

export function dubaiKey(realNow) {
  const d = new Date(realNow + 4 * 3600 * 1000);
  return d.toISOString().slice(0, 10);
}

function produce(state, now) {
  let dt = now - state.lastProd;
  if (dt <= 0) return false;
  dt = Math.min(dt, 8 * 3600 * 1000);
  const bonus = economyBonus(state);
  for (const [id, def] of Object.entries(BUILDINGS)) {
    if (!def.produces) continue;
    const level = state.buildings[id].level;
    if (level <= 0) continue;
    const perMs = (def.rate * level * bonus) / 60000;
    const key = def.produces;
    const acc = state.frac[key] + perMs * dt;
    const gain = Math.floor(acc);
    state.frac[key] = acc - gain;
    state.resources[key] += gain;
  }
  state.lastProd = now;
  return true;
}

function economyBonus(state) {
  return 1 + state.research.economy * 0.05 + state.buildings.storehouse.level * 0.03;
}

function regenStamina(state, now) {
  const dt = now - state.staminaAt;
  if (dt <= 0) return false;
  state.stamina = Math.min(100, state.stamina + dt / 45000);
  state.staminaAt = now;
  return true;
}

function processHelp(state, now) {
  const job = state.build;
  if (!job || !state.alliance.joined || job.helps >= 4) return false;
  if (now < job.nextHelpAt) return false;
  const remain = Math.max(0, job.endsAt - now);
  job.endsAt -= remain * 0.18;
  job.helps += 1;
  job.nextHelpAt = now + 4000;
  note(state, `Alliance help sped your ${BUILDINGS[job.id].name}. (${job.helps}/4)`);
  return true;
}

function processBuild(state, now) {
  if (!state.build || now < state.build.endsAt) return false;
  completeBuild(state);
  return true;
}

function completeBuild(state) {
  const job = state.build;
  if (!job) return;
  const b = state.buildings[job.id];
  b.level += 1;
  state.build = null;
  state.stats.upgrades += 1;
  bump(state, "upgrades", 1);
  const pts = addGovernor(state, "build", 1, { level: b.level });
  addKop(state, "build");
  note(state, `${BUILDINGS[job.id].name} is now level ${b.level}.${pts ? ` +${pts} Governor points.` : ""}`);
}

function processTraining(state, now) {
  if (!state.training || now < state.training.endsAt) return false;
  completeTraining(state);
  return true;
}

function completeTraining(state) {
  const job = state.training;
  if (!job) return;
  state.troops[job.kind] += job.count;
  state.stats.trained += job.count;
  bump(state, "trained", job.count);
  const pts = addGovernor(state, "train", job.count, { tier: job.tier });
  addKop(state, "train", job.count);
  state.training = null;
  note(state, `${job.count} ${TROOPS[job.kind].name} finished training.${pts ? ` +${pts} Governor points.` : ""}`);
}

function processResearch(state, now) {
  if (!state.studying || now < state.studying.endsAt) return false;
  const job = state.studying;
  state.research[job.tree] += 1;
  state.studying = null;
  const pts = addGovernor(state, "research", 1, { level: state.research[job.tree] });
  addKop(state, "research");
  const name = RESEARCH[job.tree][state.research[job.tree] - 1];
  note(state, `Research complete: ${name}.${pts ? ` +${pts} Governor points.` : ""}`);
  return true;
}

function processMarches(state, now) {
  let changed = false;
  const still = [];
  for (const march of state.marches) {
    if (now < march.endsAt) {
      still.push(march);
      continue;
    }
    resolveMarch(state, march);
    changed = true;
  }
  state.marches = still;
  return changed;
}

function resolveMarch(state, march) {
  const node = state.map.find((n) => n.id === march.nodeId);
  if (!node) return;
  if (march.kind === "gather") {
    const table = { grain: 280, timber: 280, stone: 180, iron: 120 };
    const amount = Math.floor(table[node.kind] * node.level * economyBonus(state));
    state.resources[node.kind] += amount;
    state.stats.gathers += 1;
    bump(state, "gathers", 1);
    const pts = addGovernor(state, "gather", amount);
    addKop(state, "gather");
    node.respawnAt = state.clock.gameNow + 45000;
    note(state, `Gathered ${amount} ${node.kind}.${pts ? ` +${pts} Governor points.` : ""}`);
    return;
  }
  const atk = armyPower(march.send, state, heroState(state, state.leadHeroId));
  const def = rebelCampPower(node.level);
  const win = atk >= def * 0.92;
  returnTroops(state, march.send, win);
  if (win) {
    const reward = {
      grain: 120 * node.level,
      timber: 90 * node.level,
      gold: 8 * node.level,
      gems: node.level >= 3 ? 2 : 0,
    };
    grant(state, reward);
    state.stats.rebels += 1;
    bump(state, "rebels", 1);
    node.respawnAt = state.clock.gameNow + 50000;
    note(state, `Rebel camp ${node.level} defeated.`);
  } else {
    node.respawnAt = state.clock.gameNow + 20000;
    note(state, `The camp held. Your march fell back.`);
  }
}

function processHeal(state, now) {
  const level = state.buildings.infirmary.level;
  if (level <= 0) {
    state.healAt = now;
    return false;
  }
  const dt = now - state.healAt;
  if (dt < 4000) return false;
  const heals = Math.floor(dt / 4000) * level;
  state.healAt += Math.floor(dt / 4000) * 4000;
  healTroops(state, heals);
  return false;
}

function processBear(state, now) {
  const bear = state.bear;
  if (!bear.endsAt || now >= bear.endsAt) {
    if (bear.endsAt && now >= bear.endsAt) return closeBear(state, now);
    return false;
  }
  let changed = false;
  if (now >= bear.nextNpc) {
    const steps = 1 + Math.floor((now - bear.nextNpc) / 5000);
    const before = bear.alliance;
    bear.alliance += steps * (1100 + state.buildings.pitfall.level * 80);
    bear.nextNpc += steps * 5000;
    if (crossed(BEAR_ALLIANCE, before, bear.alliance)) changed = true;
  }
  return changed;
}

function closeBear(state, now) {
  const bear = state.bear;
  bankBear(state);
  const dealt = bear.personal;
  bear.endsAt = 0;
  bear.cooldownUntil = now + BEAR_COOLDOWN_MS;
  note(state, `The trap snapped shut at ${dealt} personal damage. Rewards are in your stores.`);
  return true;
}

function bankBear(state) {
  BEAR_PERSONAL.forEach((tier, i) => {
    if (state.bear.personal >= tier.points && !state.bear.claimedPersonal[i]) {
      state.bear.claimedPersonal[i] = true;
      grant(state, tier.reward);
    }
  });
  BEAR_ALLIANCE.forEach((tier, i) => {
    if (state.bear.alliance >= tier.points && !state.bear.claimedAlliance[i]) {
      state.bear.claimedAlliance[i] = true;
      grant(state, tier.reward);
    }
  });
}

function processGovernor(state, now) {
  const gov = state.governor;
  const week = DAY_MS * 7;
  let changed = false;
  if (now >= gov.startedAt + week) {
    const cycles = Math.floor((now - gov.startedAt) / week);
    gov.startedAt += cycles * week;
    gov.currentDay = 1;
    gov.dayScore = 0;
    gov.overall = 0;
    gov.dayClaimed = [];
    gov.overallClaimed = false;
    gov.history = [];
    note(state, "A new Strongest Governor week has begun.");
    changed = true;
  }
  const day = Math.min(7, Math.floor((now - gov.startedAt) / DAY_MS) + 1);
  while (gov.currentDay < day) {
    gov.history.push({ day: gov.currentDay, score: gov.dayScore });
    gov.currentDay += 1;
    gov.dayScore = 0;
    gov.dayClaimed = [];
    note(state, `Strongest Governor is now Day ${gov.currentDay}: ${GOVERNOR_DAYS[gov.currentDay - 1].name}.`);
    changed = true;
  }
  return changed;
}

function processKop(state, now) {
  const kop = state.kop;
  if (kop.phase === "prep") {
    const until = Math.min(now, kop.endsAt);
    const dt = until - (kop.lastTick || kop.endsAt - 4 * 60 * 1000);
    if (dt > 0) kop.rivalPrep += Math.floor(dt / 1000) * 8;
    kop.lastTick = until;
    if (now >= kop.endsAt) {
      kop.phase = "battle";
      note(state, "Preparation is over. Set your three lanes.");
      return true;
    }
  }
  if (kop.phase === "battle" && kop.endsAt && now >= kop.endsAt + 8 * 60 * 1000) {
    resolveKop(state);
    return true;
  }
  if (kop.phase === "triage" && now >= kop.endsAt) {
    kop.phase = "done";
    kop.cooldownUntil = now + 12 * 60 * 1000;
    note(state, "Triage is closed. Claim your Kingdom of Power rewards.");
    return true;
  }
  return false;
}

function processCastle(state, now) {
  const castle = state.castle;
  if (!castle.active) return false;
  let changed = false;
  while (castle.active && now >= castle.nextClash && castle.nextClash < castle.endsAt) {
    resolveCastleClash(state);
    castle.nextClash += 8000;
    changed = true;
    if (castle.continuous >= 150000) {
      finishCastle(state, "hold");
      return true;
    }
  }
  if (castle.active && now >= castle.endsAt) {
    finishCastle(state, castle.yourHold >= castle.rivalHold ? "score" : "loss");
    changed = true;
  }
  return changed;
}

function processGlaives(state, now) {
  let changed = false;
  for (const slot of state.glaiveSlots) {
    if (slot && !slot.ready && now >= slot.endsAt) {
      slot.ready = true;
      changed = true;
      const mission = GLAIVE_MISSIONS.find((m) => m.id === slot.missionId);
      note(state, `${mission.name} returned. Claim the tokens.`);
    }
  }
  return changed;
}

export function upgrade(state, id) {
  const def = BUILDINGS[id];
  if (!def) return fail("Unknown building.");
  const gate = buildingGate(state, id);
  if (!gate.ok) return fail(gate.reason);
  const level = state.buildings[id].level;
  if (level >= def.max) return fail("This building is at max level.");
  if (state.build) return fail("A building is already underway.");
  const cost = buildingCost(id, level + 1);
  if (!spend(state, cost)) return fail("Not enough resources.");
  const time = buildingTime(state, id, level + 1);
  const now = state.clock.gameNow;
  state.build = { id, endsAt: now + time, helps: 0, nextHelpAt: now + 3500, total: time };
  return ok({ time });
}

export function useSpeedup(state, queue, minutes) {
  const job = queue === "build" ? state.build : queue === "train" ? state.training : state.studying;
  if (!job) return fail("Nothing is running in that queue.");
  const use = Math.min(minutes, state.speedups.general);
  if (use <= 0) return fail("No speedups stored.");
  state.speedups.general -= use;
  job.endsAt -= use * 60000;
  const pts = addGovernor(state, "speedup", use);
  const now = state.clock.gameNow;
  if (queue === "build" && now >= state.build.endsAt) completeBuild(state);
  if (queue === "train" && state.training && now >= state.training.endsAt) completeTraining(state);
  if (queue === "research" && state.studying && now >= state.studying.endsAt) {
    processResearch(state, now);
  }
  return ok({ detail: `Spent ${use}m speedup.${pts ? ` +${pts} Governor points.` : ""}` });
}

export function useAurum(state) {
  if (state.stock.aurum < 1) return fail("No aurum ingots.");
  state.stock.aurum -= 1;
  grant(state, { grain: 1500, timber: 1500, stone: 800, iron: 400, gold: 120 });
  const pts = addGovernor(state, "aurum", 1);
  return ok({
    detail: `Aurum spent.${pts ? ` +${pts} Governor points.` : " No Governor points today."}`,
    reward: { grain: 1500, timber: 1500, stone: 800, iron: 400, gold: 120 },
  });
}

export function train(state, kind, count) {
  const troop = TROOPS[kind];
  if (!troop) return fail("Unknown troop.");
  const gate = buildingGate(state, troop.building);
  const level = state.buildings[troop.building].level;
  if (!gate.ok || level < 1) return fail(`Build the ${BUILDINGS[troop.building].name} first.`);
  if (state.training) return fail("Troops are already training.");
  count = Math.max(0, Math.floor(count));
  if (count <= 0) return fail("Choose a squad size.");
  count = Math.min(count, 100, affordableTrain(state, kind));
  if (count <= 0) return fail("Not enough resources to train.");
  const tier = Math.max(1, Math.min(10, level));
  const cost = trainCost(kind, count, tier);
  if (!spend(state, cost)) return fail("Not enough resources.");
  const time = trainTime(state, kind, count, tier);
  state.training = { kind, count, tier, endsAt: state.clock.gameNow + time, total: time };
  return ok({ count, time });
}

export function startResearch(state, tree) {
  if (!RESEARCH[tree]) return fail("Unknown tree.");
  if (state.buildings.academy.level < 1) return fail("Build the Academy first.");
  if (state.studying) return fail("Research is already underway.");
  if (state.research[tree] >= RESEARCH[tree].length) return fail("That tree is finished.");
  const cost = researchCost(state, tree);
  if (!spend(state, cost)) return fail("Not enough iron or gold.");
  const time = researchTime(state, tree);
  state.studying = { tree, endsAt: state.clock.gameNow + time, total: time };
  return ok({ time });
}

export function summon(state) {
  if (state.buildings.hall.level < 1) return fail("Build the Hero Hall first.");
  if (state.resources.gems < SUMMON_COST) return fail(`Need ${SUMMON_COST} gems.`);
  state.resources.gems -= SUMMON_COST;
  let roll = rng(state);
  let rarity = "rare";
  for (const band of RARITY_WEIGHT) {
    if (roll < band.p) {
      rarity = band.rarity;
      break;
    }
    roll -= band.p;
  }
  const pool = HEROES.filter((h) => h.rarity === rarity);
  const hero = pool[Math.floor(rng(state) * pool.length)];
  const owned = state.heroes[hero.id];
  let detail;
  if (!owned.owned) {
    owned.owned = true;
    detail = `New hero: ${hero.name}`;
  } else {
    const gain = { rare: 8, epic: 14, mythic: 25 }[rarity];
    owned.shards += gain;
    detail = `${hero.name} duplicate. +${gain} shards.`;
  }
  state.stats.summons += 1;
  const pts = addGovernor(state, "summon", 1);
  addKop(state, "summon");
  return ok({ detail: `${detail}${pts ? ` +${pts} Governor points.` : ""}`, heroId: hero.id });
}

export function levelHero(state, id) {
  const hero = state.heroes[id];
  const def = HEROES.find((h) => h.id === id);
  if (!hero?.owned) return fail("You have not recruited this hero.");
  if (hero.level >= 20) return fail("This hero is at max level.");
  const cost = { grain: 150 * hero.level, gold: 25 * hero.level };
  if (!spend(state, cost)) return fail("Not enough grain or gold.");
  hero.level += 1;
  const pts = addGovernor(state, "hero_level", 1);
  addKop(state, "hero_level");
  return ok({ detail: `${def.name} is level ${hero.level}.${pts ? ` +${pts} Governor points.` : ""}` });
}

export function starHero(state, id) {
  const hero = state.heroes[id];
  const def = HEROES.find((h) => h.id === id);
  if (!hero?.owned) return fail("You have not recruited this hero.");
  if (hero.stars >= 5) return fail("This hero is fully ascended.");
  const need = STAR_COST[hero.stars];
  if (hero.shards < need) return fail(`Need ${need} shards.`);
  hero.shards -= need;
  hero.stars += 1;
  const pts = addGovernor(state, "star", 1, { rarity: def.rarity });
  return ok({ detail: `${def.name} ascended to ${hero.stars} star${hero.stars > 1 ? "s" : ""}.${pts ? ` +${pts} Governor points.` : ""}` });
}

export function skillHero(state, id) {
  const hero = state.heroes[id];
  const def = HEROES.find((h) => h.id === id);
  if (!hero?.owned) return fail("You have not recruited this hero.");
  if (hero.skill >= 5) return fail("This skill is maxed.");
  const gold = 50 * hero.skill * hero.skill;
  const shards = hero.skill;
  if (state.resources.gold < gold || hero.shards < shards) return fail(`Need ${gold} gold and ${shards} shards.`);
  state.resources.gold -= gold;
  hero.shards -= shards;
  hero.skill += 1;
  const pts = addGovernor(state, "skill", 1);
  return ok({ detail: `${def.skill} is rank ${hero.skill}.${pts ? ` +${pts} Governor points.` : ""}` });
}

export function setLead(state, id) {
  if (!state.heroes[id]?.owned) return fail("Recruit this hero first.");
  state.leadHeroId = id;
  return ok();
}

export function joinAlliance(state) {
  if (state.alliance.joined) return fail("You are already in the alliance.");
  if (state.buildings.keep.level < 3) return fail("Town Center level 3 unlocks alliances.");
  state.alliance.joined = true;
  note(state, `${ALLIANCE.name} welcomes you. Ask for help on every build.`);
  return ok({ detail: `Joined ${ALLIANCE.name}.` });
}

export function donate(state, resource) {
  if (!state.alliance.joined) return fail("Join an alliance first.");
  if (!["grain", "timber", "stone", "iron"].includes(resource)) return fail("Donate grain, wood, stone, or iron.");
  if (state.resources[resource] < 200) return fail("Need 200 to donate.");
  state.resources[resource] -= 200;
  state.alliance.donations += 1;
  state.alliance.contribution += 10;
  bump(state, "donations", 1);
  let reward = null;
  if (state.alliance.donations % 5 === 0) {
    reward = { gold: 30, gems: 5 };
    grant(state, reward);
  }
  return ok({ detail: "Donation sent.", reward });
}

export function startMarch(state, nodeId) {
  const node = state.map.find((n) => n.id === nodeId);
  if (!node) return fail("That tile is empty.");
  if (node.kind === "bear") return fail("Open Bear Hunt from Events.");
  if (node.kind === "castle") return fail("Open Castle Battle from Events.");
  if (node.respawnAt && state.clock.gameNow < node.respawnAt) return fail("This tile is spent. Wait for it to recover.");
  if (state.marches.some((m) => m.nodeId === nodeId)) return fail("A march is already on that tile.");
  if (state.marches.length >= marchCap(state)) return fail("All march slots are out.");
  regenStamina(state, state.clock.gameNow);
  if (node.kind === "rebel") {
    if (state.stamina < 10) return fail("Need 10 stamina.");
    const send = pickSquad(state, 24 + state.buildings.keep.level * 10);
    if (totalTroops(send) <= 0) return fail("Train troops before you attack.");
    state.stamina -= 10;
    takeTroops(state, send);
    const dist = 9000 + node.level * 2500;
    state.marches.push({ id: state.nextId++, nodeId, kind: "rebel", send, endsAt: state.clock.gameNow + dist });
    return ok({ detail: "Marching on the rebel camp." });
  }
  if (state.stamina < 5) return fail("Need 5 stamina.");
  state.stamina -= 5;
  const dist = 8000 + node.level * 4000;
  state.marches.push({ id: state.nextId++, nodeId, kind: "gather", endsAt: state.clock.gameNow + dist });
  return ok({ detail: "A cart is on the road." });
}

export function startBear(state) {
  const why = lockReason(state, "bear");
  if (why) return fail(why);
  const now = state.clock.gameNow;
  if (state.bear.endsAt && now < state.bear.endsAt) return fail("The hunt is already live.");
  if (now < state.bear.cooldownUntil) return fail("The pit is being reset.");
  state.bear.endsAt = now + BEAR_MS;
  state.bear.personal = 0;
  state.bear.alliance = 0;
  state.bear.rallies = 0;
  state.bear.nextRally = now;
  state.bear.nextNpc = now + 5000;
  state.bear.claimedPersonal = [];
  state.bear.claimedAlliance = [];
  note(state, "The hunting pit is sprung. Rally.");
  return ok();
}

export function setBearPlan(state, formation, heroId) {
  if (["marksman", "balanced", "rider"].includes(formation)) state.bear.formation = formation;
  if (heroId && state.heroes[heroId]?.owned) state.bear.heroId = heroId;
  return ok();
}

export function bearRally(state) {
  const now = state.clock.gameNow;
  if (!state.bear.endsAt || now >= state.bear.endsAt) return fail("Bear Hunt is not live.");
  if (now < state.bear.nextRally) return fail("Your next rally is still forming.");
  const preview = rallyPreview(state, state.bear.formation, state.bear.heroId);
  if (preview.damage <= 0) return fail("Train troops before you rally.");
  state.bear.nextRally = now + RALLY_GAP_MS;
  state.bear.personal += preview.damage;
  state.bear.alliance += preview.damage;
  state.bear.rallies += 1;
  state.stats.rallies += 1;
  bump(state, "rallies", 1);
  return ok({ detail: `Rally hit for ${preview.damage}.`, damage: preview.damage });
}

export function fightRebelWave(state, quick) {
  if (lockReason(state, "rebels")) return fail(lockReason(state, "rebels"));
  const logs = [];
  const loops = quick ? 15 : 1;
  if (quick && state.buildings.keep.level < 8) return fail("Quick Battle unlocks at Town Center 8.");
  for (let i = 0; i < loops; i += 1) {
    const wave = state.rebels.nextWave;
    if (wave > 15) break;
    const defense = defensePower(state);
    const enemy = rebelWavePower(wave);
    if (defense < enemy) {
      woundRatio(state, 0.12, 0.05);
      const cleared = wave - 1;
      state.rebels.best = Math.max(state.rebels.best, cleared);
      state.rebels.nextWave = 1;
      logs.push({ wave, win: false, defense, enemy });
      note(state, `The invasion broke through on wave ${wave}.`);
      break;
    }
    const tight = defense < enemy * 1.3;
    woundRatio(state, tight ? 0.05 : 0.02, 0);
    grant(state, {
      grain: 90 * wave,
      timber: 70 * wave,
      gold: 6 * wave,
      gems: wave % 3 === 0 ? 4 : 0,
    });
    state.rebels.nextWave = wave + 1;
    state.rebels.best = Math.max(state.rebels.best, wave);
    logs.push({ wave, win: true, defense, enemy });
    if (wave === 15) note(state, "Rebel Invasion cleared.");
  }
  return ok({ logs });
}

export function startGlaive(state, missionId) {
  if (lockReason(state, "glaives")) return fail(lockReason(state, "glaives"));
  const mission = GLAIVE_MISSIONS.find((m) => m.id === missionId);
  if (!mission) return fail("Unknown mission.");
  const open = glaiveOpenSlots(state);
  const index = state.glaiveSlots.findIndex((slot, i) => i < open && !slot);
  if (index < 0) return fail("All watchtower slots are busy.");
  state.glaiveSlots[index] = {
    missionId,
    endsAt: state.clock.gameNow + mission.time,
    ready: false,
  };
  return ok({ detail: `${mission.name} dispatched.` });
}

export function claimGlaive(state, index) {
  const slot = state.glaiveSlots[index];
  if (!slot?.ready) return fail("That mission is still out.");
  const mission = GLAIVE_MISSIONS.find((m) => m.id === slot.missionId);
  state.glaiveSlots[index] = null;
  state.stock.glaive += mission.tokens;
  state.stats.glaives += 1;
  bump(state, "glaives", 1);
  return ok({ detail: `+${mission.tokens} glaive tokens.`, reward: { glaive: mission.tokens } });
}

export function buyGlaive(state, itemId) {
  const item = GLAIVE_SHOP.find((entry) => entry.id === itemId);
  if (!item) return fail("Unknown trade.");
  if (state.stock.glaive < item.cost) return fail("Not enough glaive tokens.");
  state.stock.glaive -= item.cost;
  grant(state, item.reward);
  return ok({ detail: `Bought ${item.name}.`, reward: item.reward });
}

export function startKop(state) {
  if (lockReason(state, "kop")) return fail(lockReason(state, "kop"));
  const now = state.clock.gameNow;
  if (state.kop.phase === "done" && !state.kop.claimed) return fail("Claim your Kingdom of Power rewards first.");
  if (state.kop.phase !== "idle" && state.kop.phase !== "done") return fail("Kingdom of Power is already running.");
  if (now < state.kop.cooldownUntil) return fail("The kingdoms are still regrouping.");
  const heroId = state.heroes[state.leadHeroId]?.owned ? state.leadHeroId : "seren";
  state.kop = {
    ...freshKop(),
    phase: "prep",
    endsAt: now + 4 * 60 * 1000,
    lastTick: now,
    heroId,
    cooldownUntil: 0,
  };
  state.stats.kop += 1;
  note(state, "Kingdom of Power: preparation has started.");
  return ok();
}

export function setKopLane(state, lane, kind) {
  if (!TROOPS[kind]) return fail("Unknown troop.");
  if (!state.kop || state.kop.phase !== "battle" && state.kop.phase !== "prep") return fail("Lanes are not open.");
  state.kop.assignment[lane] = kind;
  return ok();
}

export function setKopHeroLane(state, lane) {
  if (lane < 0 || lane > 2) return fail("Pick a lane.");
  state.kop.heroLane = lane;
  return ok();
}

export function setKopHero(state, id) {
  if (!state.heroes[id]?.owned) return fail("Recruit this hero first.");
  state.kop.heroId = id;
  return ok();
}

export function resolveKop(state) {
  if (state.kop.phase !== "battle") return fail("Wait for the battle phase.");
  const logs = [];
  let wins = 0;
  for (let i = 0; i < 3; i += 1) {
    const yours = state.kop.assignment[i];
    const theirs = state.kop.rivalLanes[i];
    const mine = lanePower(state, yours) * (state.kop.heroLane === i ? heroLaneBonus(state, state.kop.heroId) : 1);
    const theirsPower = rivalLanePower(state);
    const score = mine * counterMod(yours, theirs);
    const win = score >= theirsPower;
    if (win) wins += 1;
    logs.push({ lane: i, yours, theirs, win, score: Math.floor(score), enemy: Math.floor(theirsPower) });
  }
  if (wins < 3) woundRatio(state, 0.04 * (3 - wins), 0.01 * (3 - wins));
  state.kop.wins = wins;
  state.kop.logs = logs;
  state.kop.yourBattle = wins * 500 + (wins >= 2 ? 800 : 0);
  state.kop.rivalBattle = (3 - wins) * 500 + (wins < 2 ? 600 : 0);
  state.kop.phase = "triage";
  state.kop.endsAt = state.clock.gameNow + 2 * 60 * 1000;
  note(state, `Clash ended ${wins}–${3 - wins}. Heal during triage.`);
  return ok({ logs, wins });
}

export function triage(state, count) {
  if (state.kop.phase !== "triage") return fail("Triage is not open.");
  const wounded = totalTroops(state.wounded);
  const n = Math.min(Math.floor(count), wounded);
  if (n <= 0) return fail("No wounded to treat.");
  const cost = { grain: n * 4, gold: n };
  if (!spend(state, cost)) return fail("Need 4 grain and 1 gold per troop.");
  healTroops(state, n);
  state.kop.triagePoints += n * 10;
  return ok({ detail: `Treated ${n} wounded. +${n * 10} triage points.` });
}

export function claimKop(state) {
  if (state.kop.phase !== "done") return fail("Rewards open when triage closes.");
  if (state.kop.claimed) return fail("Already claimed.");
  const yours = state.kop.yourPrep + state.kop.yourBattle + state.kop.triagePoints;
  const rival = state.kop.rivalPrep + state.kop.rivalBattle;
  const win = yours > rival;
  const reward = win
    ? { gems: 40, gold: 180, grain: 1200, timber: 1200, speedup: 10 }
    : { gems: 12, gold: 60, grain: 400 };
  grant(state, reward);
  state.kop.claimed = true;
  state.kop.phase = "idle";
  return ok({ detail: win ? "Your kingdom took the field." : "Northveil held the field.", reward });
}

export function startCastle(state) {
  if (lockReason(state, "castle")) return fail(lockReason(state, "castle"));
  const now = state.clock.gameNow;
  if (state.castle.active) return fail("The castle battle is live.");
  if (now < state.castle.cooldownUntil) return fail("The castle is quiet. Wait for the next battle.");
  const send = pickSquad(state, Math.max(20, totalTroops(state.troops)));
  if (totalTroops(send) <= 0) return fail("You need troops to garrison the castle.");
  takeTroops(state, send);
  state.castle = {
    ...freshCastle(),
    active: true,
    endsAt: now + 5 * 60 * 1000,
    nextClash: now + 8000,
    garrison: send,
  };
  state.stats.castle += 1;
  note(state, "Your host has entered the Crown Castle.");
  return ok();
}

export function reinforceCastle(state) {
  if (!state.castle.active) return fail("Castle Battle is not live.");
  const send = pickSquad(state, 40 + state.buildings.keep.level * 8);
  if (totalTroops(send) <= 0) return fail("No spare troops to send.");
  takeTroops(state, send);
  for (const key of TROOP_IDS) state.castle.garrison[key] += send[key];
  return ok({ detail: "Reinforcements entered the castle." });
}

export function inspireCastle(state) {
  if (!state.castle.active) return fail("Castle Battle is not live.");
  regenStamina(state, state.clock.gameNow);
  if (state.stamina < 8) return fail("Need 8 stamina.");
  state.stamina -= 8;
  state.castle.inspire = true;
  return ok({ detail: "The next clash is inspired." });
}

export function claimDaily(state, taskId) {
  const task = DAILY_TASKS.find((entry) => entry.id === taskId);
  if (!task) return fail("Unknown task.");
  if (taskBlocked(state, task)) return fail("That task is still locked.");
  if (state.daily.claimed.includes(taskId)) return fail("Already claimed.");
  if ((state.daily.progress[task.key] || 0) < task.goal) return fail("Not finished yet.");
  state.daily.claimed.push(taskId);
  grant(state, task.reward);
  return ok({ reward: task.reward, detail: task.name });
}

export function claimDailyBonus(state) {
  if (state.daily.bonusClaimed) return fail("Already claimed.");
  const open = DAILY_TASKS.filter((task) => !taskBlocked(state, task));
  if (!open.every((task) => state.daily.claimed.includes(task.id))) return fail("Finish the open tasks first.");
  state.daily.bonusClaimed = true;
  grant(state, DAILY_BONUS);
  return ok({ reward: DAILY_BONUS, detail: "Daily chest" });
}

export function claimChapter(state) {
  const view = chapterView(state);
  if (!view) return fail("The opening chapters are complete.");
  if (!view.ready) return fail("Keep going.");
  grant(state, view.reward);
  state.chapterIndex += 1;
  return ok({ reward: view.reward, detail: view.title });
}

export function advanceTutorial(state) {
  state.tutorialStep = Math.min(3, (state.tutorialStep || 0) + 1);
  return ok();
}

export function rename(state, name) {
  state.name = cleanName(name);
  return ok();
}

export function resetReady() {
  return ok();
}

export function buildingGate(state, id) {
  const def = BUILDINGS[id];
  if (state.buildings.keep.level < def.needKeep && id !== "keep") {
    return { ok: false, reason: `Requires Town Center ${def.needKeep}.` };
  }
  if (def.needAlliance && !state.alliance.joined) return { ok: false, reason: "Join an alliance first." };
  return { ok: true };
}

export function buildingCost(id, nextLevel) {
  const def = BUILDINGS[id];
  const mult = Math.pow(1.7, nextLevel - 1);
  const cost = {};
  for (const key of RESOURCE_KEYS) {
    if (def.base[key]) cost[key] = Math.floor(def.base[key] * mult);
  }
  return cost;
}

export function buildingTime(state, id, nextLevel) {
  const def = BUILDINGS[id];
  const raw = def.time * Math.pow(1.45, nextLevel - 1) * 1000;
  const cut = Math.min(0.4, state.research.growth * 0.04);
  return Math.max(4000, Math.floor(raw * (1 - cut)));
}

export function trainCost(kind, count, tier) {
  const base = TROOPS[kind].cost;
  const mult = count * (1 + (tier - 1) * 0.18);
  const cost = {};
  for (const [key, value] of Object.entries(base)) cost[key] = Math.ceil(value * mult);
  return cost;
}

export function trainTime(state, kind, count, tier) {
  const raw = count * TROOPS[kind].seconds * 1000 * (1 - Math.min(0.25, (tier - 1) * 0.03));
  const cut = Math.min(0.25, state.research.growth * 0.02);
  return Math.max(3000, Math.floor(raw * (1 - cut)));
}

export function affordableTrain(state, kind) {
  const tier = Math.max(1, state.buildings[TROOPS[kind].building].level || 1);
  let lo = 0;
  let hi = 100;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (canAfford(state, trainCost(kind, mid, tier))) lo = mid;
    else hi = mid - 1;
  }
  return lo;
}

export function researchCost(state, tree) {
  const step = state.research[tree] + 1;
  return { iron: 70 * step, gold: 35 * step };
}

export function researchTime(state, tree) {
  const step = state.research[tree];
  return Math.floor(14000 * Math.pow(1.32, step));
}

export function powerOf(state) {
  let power = 0;
  for (const [id, building] of Object.entries(state.buildings)) {
    power += building.level * (id === "keep" ? 200 : 80);
  }
  power += state.troops.shield * 6 + state.troops.rider * 8 + state.troops.marksman * 10;
  for (const hero of HEROES) {
    const owned = state.heroes[hero.id];
    if (!owned?.owned) continue;
    const rarity = { rare: 1, epic: 1.45, mythic: 2 }[hero.rarity];
    power += Math.floor((120 + owned.level * 28 + owned.stars * 70 + owned.skill * 36) * rarity);
  }
  power += (state.research.growth + state.research.economy + state.research.battle) * 120;
  return power;
}

export function productionPerMin(state, id) {
  const def = BUILDINGS[id];
  if (!def?.produces) return 0;
  return Math.floor(def.rate * state.buildings[id].level * economyBonus(state));
}

export function marchCap(state) {
  const keep = state.buildings.keep.level;
  return 1 + (keep >= 5 ? 1 : 0) + (keep >= 8 ? 1 : 0);
}

export function rallyPreview(state, formation, heroId) {
  const weights = {
    marksman: { shield: 0.1, rider: 0.2, marksman: 0.7 },
    balanced: { shield: 0.34, rider: 0.33, marksman: 0.33 },
    rider: { shield: 0.15, rider: 0.7, marksman: 0.15 },
  }[formation] || { shield: 0.34, rider: 0.33, marksman: 0.33 };
  const cap = 30 + state.buildings.keep.level * 20;
  const send = {};
  for (const key of TROOP_IDS) send[key] = Math.min(state.troops[key], Math.floor(cap * weights[key]));
  const hero = heroState(state, heroId);
  let damage = send.shield * 10 + send.rider * 14 + send.marksman * 22;
  if (hero?.owned) {
    damage *= 1 + (hero.level - 1) * 0.04 + hero.stars * 0.12 + (hero.skill - 1) * 0.08;
    const def = HEROES.find((item) => item.id === heroId);
    if (def?.role === "marksman") damage *= 1.12;
  }
  if (formation === "marksman") damage *= 1.08;
  damage *= 1 + state.buildings.pitfall.level * 0.08;
  damage *= 1 + state.research.battle * 0.05;
  return { damage: Math.floor(damage), send };
}

export function defensePower(state) {
  const wall = state.buildings.wall.level * 55;
  const troops = state.troops.shield * 8 + state.troops.rider * 7 + state.troops.marksman * 9;
  const hero = heroPower(state, state.leadHeroId);
  return Math.floor((wall + troops + hero) * (1 + state.research.battle * 0.05));
}

export function rebelWavePower(wave) {
  return Math.floor(100 * wave * (1 + (wave - 1) * 0.12));
}

export function rebelCampPower(level) {
  return Math.floor(70 * Math.pow(level, 1.35));
}

export function counterMod(attacker, defender) {
  if (BEATS[attacker] === defender) return 1.25;
  if (BEATS[defender] === attacker) return 0.8;
  return 1;
}

export function governorBoard(state, now) {
  const dayMs = DAY_MS;
  const into = Math.min(1, Math.max(0, (now - state.governor.startedAt - (state.governor.currentDay - 1) * dayMs) / dayMs));
  const rows = NPC_GOVERNORS.map((npc) => ({
    name: npc.name,
    score: Math.floor(npc.pace * into),
    you: false,
  }));
  rows.push({ name: state.name, score: state.governor.dayScore, you: true });
  rows.sort((a, b) => b.score - a.score || (a.you ? -1 : 1));
  return rows;
}

export function chapterView(state) {
  const chapter = CHAPTERS[state.chapterIndex];
  if (!chapter) return null;
  const current = chapterMeter(state, chapter.id);
  return { ...chapter, current: Math.min(chapter.goal, current), ready: current >= chapter.goal };
}

export function lockReason(state, id) {
  const keep = state.buildings.keep.level;
  if (id === "daily" || id === "governor") return null;
  if (id === "rebels") return keep >= 2 ? null : "Town Center level 2";
  if (id === "glaives") {
    if (keep < 3) return "Town Center level 3";
    if (state.buildings.watchtower.level < 1) return "Build the Watchtower";
    return null;
  }
  if (id === "bear") {
    if (keep < 4) return "Town Center level 4";
    if (!state.alliance.joined) return "Join an alliance";
    if (state.buildings.pitfall.level < 1) return "Build the Hunting Pit";
    return null;
  }
  if (id === "kop") return keep >= 5 ? null : "Town Center level 5";
  if (id === "castle") return keep >= 5 ? null : "Town Center level 5";
  return "Next season";
}

export function taskBlocked(state, task) {
  if (task.need === "alliance") return !state.alliance.joined;
  if (task.need === "bear") return Boolean(lockReason(state, "bear"));
  if (task.need === "glaives") return Boolean(lockReason(state, "glaives"));
  return false;
}

export function glaiveOpenSlots(state) {
  return Math.max(0, Math.min(3, state.buildings.watchtower.level));
}

export function kopScore(state) {
  const yours = state.kop.yourPrep + state.kop.yourBattle + state.kop.triagePoints;
  const rival = state.kop.rivalPrep + state.kop.rivalBattle;
  return { yours, rival };
}

export function armyPower(counts, state, hero) {
  let power = (counts.shield || 0) * 8 + (counts.rider || 0) * 11 + (counts.marksman || 0) * 13;
  power *= 1 + state.research.battle * 0.05;
  if (hero?.owned) power *= 1 + hero.level * 0.03 + hero.stars * 0.1 + hero.skill * 0.04;
  return power;
}

function lanePower(state, kind) {
  const count = Math.floor(state.troops[kind] / 3);
  return count * TROOPS[kind].stat * (1 + state.research.battle * 0.05);
}

function rivalLanePower(state) {
  return Math.floor(160 * (1 + state.buildings.keep.level * 0.12 + state.stats.trained / 800));
}

function heroLaneBonus(state, id) {
  const hero = state.heroes[id];
  if (!hero?.owned) return 1;
  return 1 + hero.level * 0.04 + hero.stars * 0.1;
}

function chapterMeter(state, id) {
  switch (id) {
    case "farm": return state.buildings.farm.level;
    case "train": return state.stats.trained;
    case "camp": return state.stats.rebels;
    case "ally": return state.alliance.joined ? 1 : 0;
    case "bear": return state.stats.rallies;
    case "gov": return state.stats.govPoints;
    case "wall": return state.rebels.best;
    case "glaive": return state.stats.glaives;
    case "kop": return state.stats.kop;
    case "castle": return state.stats.castle;
    default: return 0;
  }
}

function addGovernor(state, action, qty = 1, extra = {}) {
  const day = GOVERNOR_DAYS[state.governor.currentDay - 1];
  if (!day?.actions.includes(action)) return 0;
  let pts = 0;
  if (action === "build") pts = 180 * (extra.level || 1);
  else if (action === "train") pts = (TRAIN_POINTS[extra.tier] || 1) * qty;
  else if (action === "research") pts = 260 * (extra.level || 1);
  else if (action === "gather") pts = Math.floor(qty / 100) * 3;
  else if (action === "speedup") pts = 30 * qty;
  else if (action === "hero_level") pts = 220 * qty;
  else if (action === "summon") pts = 800 * qty;
  else if (action === "star") pts = ({ rare: 350, epic: 1220, mythic: 3040 }[extra.rarity] || 350) * qty;
  else if (action === "skill") pts = 500 * qty;
  else if (action === "aurum") pts = 2000 * qty;
  if (pts <= 0) return 0;
  state.governor.dayScore += pts;
  state.governor.overall += pts;
  state.stats.govPoints += pts;
  return pts;
}

function addKop(state, action, qty = 1) {
  if (state.kop.phase !== "prep") return;
  const table = { build: 90, train: 2, research: 80, gather: 40, summon: 50, hero_level: 40 };
  const gain = action === "train" ? table.train * qty : table[action] || 0;
  state.kop.yourPrep += gain;
}

function pickSquad(state, cap) {
  const send = { shield: 0, rider: 0, marksman: 0 };
  let left = cap;
  const order = ["shield", "marksman", "rider"];
  const owned = order.reduce((sum, key) => sum + state.troops[key], 0);
  if (owned <= 0 || left <= 0) return send;
  for (const key of order) {
    const take = Math.min(state.troops[key], left, Math.ceil((state.troops[key] / owned) * cap));
    send[key] = take;
    left -= take;
  }
  for (const key of order) {
    if (left <= 0) break;
    const extra = Math.min(left, state.troops[key] - send[key]);
    send[key] += extra;
    left -= extra;
  }
  return send;
}

function takeTroops(state, send) {
  for (const key of TROOP_IDS) state.troops[key] -= send[key] || 0;
}

function returnTroops(state, send, win) {
  for (const key of TROOP_IDS) {
    const n = send[key] || 0;
    if (win) {
      const wounded = Math.floor(n * 0.06);
      state.wounded[key] += wounded;
      state.troops[key] += n - wounded;
    } else {
      const wounded = Math.floor(n * 0.3);
      const dead = Math.floor(n * 0.15);
      state.wounded[key] += wounded;
      state.troops[key] += Math.max(0, n - wounded - dead);
    }
  }
}

function woundRatio(state, wound, dead) {
  for (const key of TROOP_IDS) {
    const n = state.troops[key];
    const w = Math.floor(n * wound);
    const d = Math.floor(n * dead);
    state.troops[key] = Math.max(0, n - w - d);
    state.wounded[key] += w;
  }
}

function healTroops(state, count) {
  let left = count;
  for (const key of TROOP_IDS) {
    if (left <= 0) break;
    const n = Math.min(left, state.wounded[key]);
    state.wounded[key] -= n;
    state.troops[key] += n;
    left -= n;
  }
  return count - left;
}

export function healNow(state, count) {
  const wounded = totalTroops(state.wounded);
  const n = Math.min(Math.floor(count), wounded);
  if (n <= 0) return fail("No wounded troops.");
  const cost = { grain: n * 5, gold: n };
  if (!spend(state, cost)) return fail("Need 5 grain and 1 gold per troop.");
  healTroops(state, n);
  return ok({ detail: `Healed ${n} troops.` });
}

function heroState(state, id) {
  return state.heroes[id];
}

function heroPower(state, id) {
  const hero = state.heroes[id];
  if (!hero?.owned) return 0;
  return hero.level * 18 + hero.stars * 24 + hero.skill * 12;
}

function finishCastle(state, how) {
  const castle = state.castle;
  castle.active = false;
  castle.result = how === "loss" ? "loss" : "win";
  castle.cooldownUntil = state.clock.gameNow + 10 * 60 * 1000;
  returnTroops(state, castle.garrison, castle.result === "win");
  castle.garrison = { shield: 0, rider: 0, marksman: 0 };
  const reward = castle.result === "win"
    ? { gems: 40, gold: 200, grain: 1000, timber: 800 }
    : { gems: 10, gold: 40 };
  grant(state, reward);
  castle.claimed = true;
  if (castle.result === "win") state.banner = "royal";
  note(state, castle.result === "win" ? "The Crown Castle is yours." : "The castle slipped away.");
}

function resolveCastleClash(state) {
  const castle = state.castle;
  const mine = armyPower(castle.garrison, state, heroState(state, state.leadHeroId)) * (castle.inspire ? 1.3 : 1);
  const rival = mine * 0.78 + 180;
  castle.inspire = false;
  const dt = 8000;
  if (mine >= rival) {
    castle.yourHold += dt;
    castle.continuous += dt;
  } else {
    castle.rivalHold += dt;
    castle.continuous = 0;
    const lost = {};
    for (const key of TROOP_IDS) {
      lost[key] = Math.floor(castle.garrison[key] * 0.08);
      castle.garrison[key] -= lost[key];
      state.wounded[key] += lost[key];
    }
  }
}

function grant(state, reward) {
  if (!reward) return;
  for (const key of RESOURCE_KEYS) {
    if (reward[key]) state.resources[key] += reward[key];
  }
  if (reward.speedup) state.speedups.general += reward.speedup;
  if (reward.aurum) state.stock.aurum += reward.aurum;
  if (reward.glaive) state.stock.glaive += reward.glaive;
  if (reward.shards) {
    const id = state.heroes[state.leadHeroId]?.owned ? state.leadHeroId : "seren";
    state.heroes[id].shards += reward.shards;
  }
}

function spend(state, cost) {
  if (!canAfford(state, cost)) return false;
  for (const [key, value] of Object.entries(cost)) state.resources[key] -= value;
  return true;
}

function canAfford(state, cost) {
  return Object.entries(cost).every(([key, value]) => (state.resources[key] || 0) >= value);
}

function bump(state, key, n) {
  if (!state.daily?.progress) return;
  state.daily.progress[key] = (state.daily.progress[key] || 0) + n;
}

function note(state, text) {
  state.feed.unshift({ text, at: state.clock.gameNow });
  if (state.feed.length > 40) state.feed.length = 40;
  state.pendingNotes.push(text);
  if (state.pendingNotes.length > 6) state.pendingNotes.shift();
}

function rng(state) {
  state.seed = (Math.imul(state.seed, 1664525) + 1013904223) >>> 0;
  return state.seed / 4294967296;
}

function totalTroops(counts) {
  return TROOP_IDS.reduce((sum, key) => sum + (counts[key] || 0), 0);
}

function crossed(tiers, before, after) {
  return tiers.some((tier) => before < tier.points && after >= tier.points);
}

function cleanName(name) {
  const text = String(name || "").replace(/[^\p{L}\p{N} '\-]/gu, "").trim().slice(0, 16);
  return text || "Governor";
}

function fail(error) {
  return { ok: false, error };
}

function ok(extra = {}) {
  return { ok: true, ...extra };
}

export function claimGovernor(state, index) {
  const tier = GOV_MILESTONES[index];
  if (!tier) return fail("Unknown chest.");
  if (state.governor.dayClaimed[index]) return fail("Already claimed.");
  if (state.governor.dayScore < tier.points) return fail("Score too low.");
  state.governor.dayClaimed[index] = true;
  grant(state, tier.reward);
  return ok({ reward: tier.reward });
}

export { DAY_MS, GOVERNOR_DAYS, HEROES, BUILDINGS, TROOPS };

import {
  ALLIANCE,
  BEAR_ALLIANCE,
  BEAR_PERSONAL,
  BUILDINGS,
  DAILY_BONUS,
  DAILY_TASKS,
  EVENTS,
  GLAIVE_MISSIONS,
  GLAIVE_SHOP,
  GOV_MILESTONES,
  GOVERNOR_DAYS,
  HEROES,
  RESEARCH,
  RESOURCE_LABEL,
  SUMMON_COST,
  TROOPS,
} from "./data.js";
import {
  affordableTrain,
  buildingCost,
  buildingGate,
  buildingTime,
  chapterView,
  defensePower,
  glaiveOpenSlots,
  governorBoard,
  kopScore,
  lockReason,
  marchCap,
  powerOf,
  productionPerMin,
  rallyPreview,
  rebelWavePower,
  researchCost,
  researchTime,
  taskBlocked,
  trainCost,
} from "./game.js";

const GROUPS = ["Economy", "Military", "Kingdom"];
const ROLE = { shield: "Infantry", rider: "Cavalry", marksman: "Archers" };

export function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, (ch) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[ch]));
}

export function fmtNum(n) {
  const value = Math.floor(Number(n) || 0);
  const sign = value < 0 ? "-" : "";
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toFixed(1)}m`;
  if (abs >= 10_000) return `${sign}${(abs / 1000).toFixed(1)}k`;
  return sign + abs.toLocaleString("en-US");
}

export function fmtTime(ms) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}h ${m % 60}m`;
  if (m > 0) return `${m}m ${String(s % 60).padStart(2, "0")}s`;
  return `${s}s`;
}

export function rewardText(reward) {
  if (!reward) return "";
  const labels = {
    ...RESOURCE_LABEL,
    speedup: "min speedup",
    aurum: "aurum",
    glaive: "tokens",
    shards: "shards",
  };
  return Object.entries(reward)
    .filter(([, amount]) => amount)
    .map(([key, amount]) => `${fmtNum(amount)} ${labels[key] || key}`)
    .join(" · ");
}

function afford(state, cost) {
  return Object.entries(cost).every(([key, amount]) => (state.resources[key] || 0) >= amount);
}

function icon(name) {
  const paths = {
    grain: '<path d="M12 3c2 3 2 5 2 7a5 5 0 1 1-10 0c0-2 0-4 2-7 1 2 2 3 3 3s2-1 3-3z"/>',
    timber: '<path d="M12 2 7 10h3v10h4V10h3L12 2z"/>',
    stone: '<path d="M4 16 8 6h8l4 10H4z"/>',
    iron: '<path d="M4 14h16v4H4zM7 6h10v6H7z"/>',
    gold: '<circle cx="12" cy="12" r="7"/>',
    gems: '<path d="M12 3 5 9l7 12 7-12-7-6z"/>',
    town: '<path d="M4 20V9l8-5 8 5v11H4zm6 0v-6h4v6"/>',
    world: '<circle cx="12" cy="12" r="8"/><path d="M4 12h16M12 4c2.5 2.4 2.5 13.6 0 16M12 4c-2.5 2.4-2.5 13.6 0 16"/>',
    host: '<path d="M12 3 5 6v6c0 4.2 3 6.8 7 8 4-1.2 7-3.8 7-8V6l-7-3z"/>',
    events: '<path d="M5 5h14v4H5zM5 11h14v8H5z"/>',
    ally: '<path d="M8 11a3 3 0 1 0-2-5.2A3 3 0 1 0 8 11zm8 0a3 3 0 1 0-2-5.2A3 3 0 1 0 16 11zM3 19c.4-3 2.4-4.5 5-4.5S12.6 16 13 19M11 19c.4-3 2.4-4.5 5-4.5S19.6 16 20 19"/>',
    gear: '<path d="M4 7h9M17 7h3M4 12h3M11 12h9M4 17h7M15 17h5"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="13" cy="17" r="2"/>',
  };
  return `<svg viewBox="0 0 24 24" aria-hidden="true">${paths[name] || paths.town}</svg>`;
}

export function render(app, ctx) {
  const { state, ui } = ctx;
  if (!state) {
    app.innerHTML = bootScreen();
    app.dataset.mode = "boot";
    return;
  }
  const now = state.clock.gameNow;
  if (!app.querySelector("#stage") || app.dataset.mode !== "play") {
    app.dataset.mode = "play";
    app.innerHTML = `<header id="top"></header><div id="res"></div><div id="stage" class="stage"></div><nav id="nav"></nav><div id="toasts"></div><div id="modals"></div>`;
  }
  app.querySelector("#top").innerHTML = header(state);
  app.querySelector("#res").innerHTML = resources(state);
  const stage = app.querySelector("#stage");
  const previous = stage.querySelector(".view");
  const scroll = previous ? previous.scrollTop : 0;
  stage.innerHTML = `<div class="view">${screen(state, ui, now)}</div>${overlay(state, ui, now)}`;
  const view = stage.querySelector(".view");
  if (view) view.scrollTop = scroll;
  app.querySelector("#nav").innerHTML = navigation(ui);
  app.querySelector("#modals").innerHTML = modalMarkup(state, ui);
}

export function patch(app, state) {
  if (!state || app.dataset.mode !== "play") return;
  const now = state.clock.gameNow;
  const values = liveValues(state, now);
  app.querySelectorAll("[data-k]").forEach((el) => {
    const value = values[el.dataset.k];
    if (value == null) return;
    if (el.dataset.as === "width") el.style.width = value;
    else if (el.textContent !== value) el.textContent = value;
  });
}

function liveValues(state, now) {
  const values = {
    power: fmtNum(powerOf(state)),
    "gov-name": state.name,
    stamina: `${Math.floor(state.stamina)}`,
    "speed-label": `${state.clock.speed}×`,
    "gov-score": fmtNum(state.governor.dayScore),
    "gov-overall": fmtNum(state.governor.overall),
    "bear-personal": fmtNum(state.bear.personal),
    "bear-alliance": fmtNum(state.bear.alliance),
    "kop-yours": fmtNum(kopScore(state).yours),
    "kop-rival": fmtNum(kopScore(state).rival),
    "castle-you": fmtTime(state.castle.yourHold),
    "castle-rival": fmtTime(state.castle.rivalHold),
    "castle-hold": fmtTime(state.castle.continuous),
    tokens: fmtNum(state.stock.glaive),
    aurum: fmtNum(state.stock.aurum),
  };
  for (const key of Object.keys(RESOURCE_LABEL)) values[key] = fmtNum(state.resources[key]);
  if (state.build) {
    values["build-time"] = fmtTime(state.build.endsAt - now);
    values["build-bar"] = bar(state.build, now);
  }
  if (state.training) {
    values["train-time"] = fmtTime(state.training.endsAt - now);
    values["train-bar"] = bar(state.training, now);
  }
  if (state.studying) {
    values["study-time"] = fmtTime(state.studying.endsAt - now);
    values["study-bar"] = bar(state.studying, now);
  }
  if (state.bear.endsAt > now) values["bear-time"] = fmtTime(state.bear.endsAt - now);
  else if (state.bear.cooldownUntil > now) values["bear-time"] = fmtTime(state.bear.cooldownUntil - now);
  const dayLeft = state.governor.startedAt + state.governor.currentDay * 6 * 60 * 1000 - now;
  values["gov-time"] = fmtTime(dayLeft);
  if (state.kop.phase === "prep" || state.kop.phase === "triage") values["kop-time"] = fmtTime(state.kop.endsAt - now);
  if (state.castle.active) values["castle-time"] = fmtTime(state.castle.endsAt - now);
  state.glaiveSlots.forEach((slot, index) => {
    if (slot && !slot.ready) values[`glaive-${index}`] = fmtTime(slot.endsAt - now);
  });
  state.marches.forEach((march) => {
    values[`march-${march.nodeId}`] = fmtTime(march.endsAt - now);
  });
  state.map.forEach((node) => {
    if (node.respawnAt > now) values[`respawn-${node.id}`] = fmtTime(node.respawnAt - now);
  });
  const rallyIn = state.bear.nextRally - now;
  values["rally-in"] = rallyIn > 0 ? fmtTime(rallyIn) : "Ready";
  return values;
}

function bar(job, now) {
  const total = job.total || 1;
  const left = Math.max(0, job.endsAt - now);
  return `${Math.max(0, Math.min(100, (1 - left / total) * 100))}%`;
}

function bootScreen() {
  return `<section class="boot">
    <p class="kicker">Frontier season</p>
    <h1>Ashmarch</h1>
    <p class="lede">Build a town, train a host, and fight the season calendar: Bear Hunt, Strongest Governor, Kingdom of Power, Golden Glaives, Rebel Invasion, and Castle Battle.</p>
    <form id="boot-form">
      <label for="gov-name">Governor name</label>
      <input id="gov-name" name="name" maxlength="16" placeholder="Your name" autocomplete="nickname" enterkeyhint="done" required>
      <button class="btn block" type="submit">Enter the valley</button>
    </form>
    <p class="fine">An original game inspired by kingdom-strategy seasons. Not affiliated with Kingshot or Century Games. Install it from Chrome on Android for a full-screen app.</p>
  </section>`;
}

function header(state) {
  const stripe = state.banner === "royal" ? "royal" : "ember";
  return `<div class="crest ${stripe}">${icon("host")}</div>
    <div class="govmeta">
      <strong data-k="gov-name">${esc(state.name)}</strong>
      <span>Power <b data-k="power">${fmtNum(powerOf(state))}</b> · <span data-k="speed-label">${state.clock.speed}×</span></span>
    </div>
    <span class="gemchip" aria-label="Gems">${icon("gems")}<b data-k="gems">${fmtNum(state.resources.gems)}</b></span>
    <button class="iconbtn" data-act="open-settings" aria-label="Settings">${icon("gear")}</button>`;
}

function resources(state) {
  const keys = ["grain", "timber", "stone", "iron", "gold"];
  return `<div class="resrow">${keys.map((key) => `<span class="chip" aria-label="${RESOURCE_LABEL[key]}"><i class="ico">${icon(key)}</i><span><small>${RESOURCE_LABEL[key]}</small><b data-k="${key}">${fmtNum(state.resources[key])}</b></span></span>`).join("")}</div>`;
}

function navigation(ui) {
  const tabs = [
    ["town", "Town", "town"],
    ["world", "World", "world"],
    ["host", "Host", "host"],
    ["events", "Events", "events"],
    ["alliance", "Alliance", "ally"],
  ];
  return tabs.map(([id, label, glyph]) => {
    const on = !ui.event && ui.tab === id;
    return `<button class="navbtn${on ? " on" : ""}" data-act="nav" data-tab="${id}" ${on ? 'aria-current="page"' : ""}>${icon(glyph)}<span>${label}</span></button>`;
  }).join("");
}

function screen(state, ui, now) {
  if (ui.event) return eventScreen(state, ui, now);
  if (ui.tab === "world") return worldScreen(state, now);
  if (ui.tab === "host") return hostScreen(state, ui, now);
  if (ui.tab === "events") return eventsScreen(state, now);
  if (ui.tab === "alliance") return allianceScreen(state);
  return townScreen(state, now);
}

function townScreen(state, now) {
  const chapter = chapterView(state);
  const banners = liveBanners(state, now);
  const sky = skyline(state.buildings.keep.level);
  const groups = GROUPS.map((group) => {
    const rows = Object.entries(BUILDINGS).filter(([, def]) => def.group === group).map(([id]) => buildingRow(state, id, now)).join("");
    return `<h2>${group}</h2><div class="stack">${rows}</div>`;
  }).join("");
  return `<section class="town">${sky}
    ${chapter ? chapterCard(chapter) : `<p class="fine">Opening chapters complete. The season calendar is yours.</p>`}
    ${banners}
    ${groups}
  </section>`;
}

function chapterCard(chapter) {
  return `<button class="chapter${chapter.ready ? " ready" : ""}" data-act="${chapter.ready ? "chapter" : "noop"}">
    <span class="kicker">Chapter ${chapter.title}</span>
    <strong>${esc(chapter.hint)}</strong>
    <small>${chapter.current}/${chapter.goal}${chapter.ready ? " · Tap to claim" : ""}</small>
  </button>`;
}

function liveBanners(state, now) {
  const items = [];
  if (state.bear.endsAt > now) items.push(["bear", "Bear Hunt is live"]);
  if (state.castle.active) items.push(["castle", "Castle Battle is live"]);
  if (state.kop.phase === "prep" || state.kop.phase === "battle" || state.kop.phase === "triage") {
    items.push(["kop", `Kingdom of Power · ${state.kop.phase}`]);
  }
  if (!items.length) return "";
  return `<div class="stack">${items.map(([id, label]) => `<button class="pill" data-act="event-open" data-event="${id}">${esc(label)}</button>`).join("")}</div>`;
}

function skyline(level) {
  const towers = Math.min(7, level + 2);
  const blocks = Array.from({ length: towers }, (_, i) => {
    const h = 28 + ((i * 17 + level * 5) % 36);
    const x = 18 + i * 34;
    return `<rect x="${x}" y="${78 - h}" width="22" height="${h}" rx="2"/>`;
  }).join("");
  return `<div class="sky" aria-hidden="true"><svg viewBox="0 0 320 92"><rect class="ground" x="0" y="74" width="320" height="18"/>${blocks}<path class="flag" d="M168 18v34M168 18h28l-8 8 8 8h-28"/></svg><div><span class="kicker">Town Center</span><strong>Level ${level}</strong></div></div>`;
}

function buildingRow(state, id, now) {
  const def = BUILDINGS[id];
  const level = state.buildings[id].level;
  const gate = buildingGate(state, id);
  const active = state.build?.id === id;
  const rate = def.produces && level > 0 ? `${fmtNum(productionPerMin(state, id))}/min` : "";
  let sub = `Lv ${level}`;
  if (!gate.ok && level === 0) sub = gate.reason.replace(/\.$/, "");
  else if (active) sub = `<span data-k="build-time">${fmtTime(state.build.endsAt - now)}</span>`;
  else if (rate) sub = `Lv ${level} · ${rate}`;
  else if (id === "barracks" || id === "range" || id === "stables") {
    const troop = Object.values(TROOPS).find((entry) => entry.building === id);
    const key = Object.keys(TROOPS).find((name) => TROOPS[name] === troop);
    sub = level > 0 ? `Lv ${level} · ${fmtNum(state.troops[key])} ${troop.name}` : sub;
  }
  return `<button class="brow" data-act="open-building" data-id="${id}">
    <span class="bico ${def.group === "Military" ? "mil" : def.group === "Kingdom" ? "king" : "eco"}">${icon(def.produces || "town")}</span>
    <span class="bmeta"><strong>${def.name}</strong><small>${sub}</small></span>
    <span class="chev">${level >= def.max ? "Max" : level === 0 ? "Build" : "Up"}</span>
  </button>`;
}

function worldScreen(state, now) {
  const tiles = state.map.map((node) => {
    const march = state.marches.find((entry) => entry.nodeId === node.id);
    const waiting = node.respawnAt > now;
    const label = { grain: "Grain", timber: "Wood", stone: "Stone", iron: "Iron", rebel: "Rebels", bear: "Bear", castle: "Castle" }[node.kind];
    let act = "march";
    if (node.kind === "bear") act = "event-open";
    if (node.kind === "castle") act = "event-open";
    const event = node.kind === "bear" ? "bear" : node.kind === "castle" ? "castle" : "";
    let status = `Lv ${node.level}`;
    if (march) status = `<span data-k="march-${node.id}">${fmtTime(march.endsAt - now)}</span>`;
    else if (waiting) status = `<span data-k="respawn-${node.id}">${fmtTime(node.respawnAt - now)}</span>`;
    return `<button class="tile kind-${node.kind}${waiting ? " dim" : ""}" data-act="${act}" data-id="${node.id}" data-event="${event}">
      <b>${label}</b><small>${status}</small>
    </button>`;
  }).join("");
  return `<section>
    <div class="rowhead"><h2>Valley</h2><span class="chip">Stamina <b data-k="stamina">${Math.floor(state.stamina)}</b>/100</span></div>
    <p class="fine">Marches ${state.marches.length}/${marchCap(state)}. Gather tiles cost 5 stamina. Rebel camps cost 10. Bear Hunt and the castle open from their own tiles.</p>
    <div class="mapgrid">${tiles}</div>
  </section>`;
}

function hostScreen(state, ui, now) {
  const tab = ui.host || "heroes";
  const tabs = ["heroes", "army", "academy"].map((id) => `<button class="subtab${tab === id ? " on" : ""}" data-act="host" data-host="${id}">${id[0].toUpperCase()}${id.slice(1)}</button>`).join("");
  return `<section><div class="subtabs">${tabs}</div>${tab === "army" ? armyPanel(state, now) : tab === "academy" ? academyPanel(state, now) : heroPanel(state)}</section>`;
}

function heroPanel(state) {
  const cards = HEROES.map((hero) => {
    const owned = state.heroes[hero.id];
    const stars = "★".repeat(owned.stars) + "☆".repeat(5 - owned.stars);
    return `<button class="hero ${hero.rarity}" data-act="open-hero" data-id="${hero.id}">
      <span class="portrait">${esc(hero.name.slice(0, 1))}</span>
      <span class="bmeta"><strong>${esc(hero.name)}</strong><small>${ROLE[hero.role]} · ${owned.owned ? `Lv ${owned.level} ${stars}` : hero.rarity}</small></span>
      ${state.leadHeroId === hero.id && owned.owned ? `<em>Lead</em>` : ""}
    </button>`;
  }).join("");
  return `<button class="btn block" data-act="summon">Summon · ${SUMMON_COST} gems</button>
    <p class="fine">Odds: rare 55%, epic 33%, mythic 12%. Duplicates become shards. Requires the Hero Hall.</p>
    <div class="stack">${cards}</div>`;
}

function armyPanel(state, now) {
  const troops = ["shield", "rider", "marksman"].map((kind) => {
    const def = TROOPS[kind];
    const level = state.buildings[def.building].level;
    const open = level > 0;
    const max = open ? affordableTrain(state, kind) : 0;
    const wounded = state.wounded[kind];
    return `<article class="panel">
      <div class="rowhead"><strong>${def.name}</strong><span>Tier ${Math.max(level, open ? level : 0)}</span></div>
      <p class="fine">${fmtNum(state.troops[kind])} ready${wounded ? ` · ${fmtNum(wounded)} wounded` : ""}</p>
      ${open ? `<div class="rowbtns">
        <button class="btn small" data-act="train" data-kind="${kind}" data-count="10">Train 10</button>
        <button class="btn small" data-act="train" data-kind="${kind}" data-count="50">Train 50</button>
        <button class="btn small ghost" data-act="train" data-kind="${kind}" data-count="${max}">Max ${max}</button>
      </div>` : `<p class="hint">Build the ${BUILDINGS[def.building].name}.</p>`}
    </article>`;
  }).join("");
  const training = state.training ? `<div class="panel"><strong>Training ${state.training.count} ${TROOPS[state.training.kind].name}</strong><div class="meter"><i data-k="train-bar" data-as="width" style="width:${bar(state.training, now)}"></i></div><small data-k="train-time">${fmtTime(state.training.endsAt - now)}</small>${speedButtons("train", state)}</div>` : "";
  const wounded = state.wounded.shield + state.wounded.rider + state.wounded.marksman;
  const heal = wounded > 0 ? `<button class="btn block ghost" data-act="heal" data-count="${wounded}">Heal ${wounded} · ${wounded} gold</button>` : "";
  return `${training}${troops}${heal}<p class="fine">Lead hero: ${esc(HEROES.find((h) => h.id === state.leadHeroId).name)}. Higher tier buildings score more on Combat Training days.</p>`;
}

function academyPanel(state, now) {
  if (state.buildings.academy.level < 1) {
    return `<p class="fine">Build the Academy to research growth, economy, and battle.</p><button class="btn block" data-act="goto-building" data-id="academy">Open the Academy</button>`;
  }
  const studying = state.studying ? `<div class="panel"><strong>${RESEARCH[state.studying.tree][state.research[state.studying.tree]]}</strong><div class="meter"><i data-k="study-bar" data-as="width" style="width:${bar(state.studying, now)}"></i></div><small data-k="study-time">${fmtTime(state.studying.endsAt - now)}</small>${speedButtons("research", state)}</div>` : "";
  const trees = Object.entries(RESEARCH).map(([tree, names]) => {
    const step = state.research[tree];
    const done = step >= names.length;
    const cost = done ? null : researchCost(state, tree);
    return `<article class="panel">
      <div class="rowhead"><strong>${tree[0].toUpperCase()}${tree.slice(1)}</strong><span>${step}/${names.length}</span></div>
      <p class="fine">${done ? "Finished" : `Next: ${names[step]} · ${costLine(cost)} · ${fmtTime(researchTime(state, tree))}`}</p>
      ${done ? "" : `<button class="btn small" data-act="research" data-tree="${tree}" ${state.studying ? "disabled" : ""}>Study</button>`}
    </article>`;
  }).join("");
  return studying + trees;
}

function eventsScreen(state, now) {
  const cards = EVENTS.map((event) => {
    const soon = event.status === "soon";
    const lock = soon ? "Next season" : lockReason(state, event.id);
    const badge = soon ? "Soon" : lock ? "Locked" : badgeFor(state, event.id, now);
    return `<button class="event ev-${event.id}${lock || soon ? " locked" : ""}" data-act="event-open" data-event="${event.id}">
      <span class="badge">${badge}</span>
      <strong>${event.name}</strong>
      <small>${esc(lock || event.blurb)}</small>
    </button>`;
  }).join("");
  return `<section><p class="kicker">Season 1</p><h2>Event calendar</h2><p class="fine">These are the opening events. Swordland, Blizzard Brawl, and the rest of the later season are listed and ready to be added.</p><div class="stack">${cards}</div></section>`;
}

function badgeFor(state, id, now) {
  if (id === "bear" && state.bear.endsAt > now) return "Live";
  if (id === "bear" && state.bear.cooldownUntil > now) return "Resetting";
  if (id === "castle" && state.castle.active) return "Live";
  if (id === "kop" && state.kop.phase !== "idle") return state.kop.phase;
  if (id === "governor") return `Day ${state.governor.currentDay}`;
  return "Open";
}

function eventScreen(state, ui, now) {
  const event = EVENTS.find((entry) => entry.id === ui.event);
  if (!event) return `<p>That event is missing.</p>`;
  const back = `<button class="textback" data-act="close">Back</button>`;
  if (event.status === "soon") {
    return `<section>${back}<h2>${event.name}</h2><p>${esc(event.blurb)}</p><p class="fine">Add it by registering the event, its rules, and this screen. The calendar already reserves the slot.</p></section>`;
  }
  const body = {
    daily: dailyView,
    governor: governorView,
    rebels: rebelView,
    bear: bearView,
    glaives: glaiveView,
    kop: kopView,
    castle: castleView,
  }[event.id];
  return `<section>${back}<h2>${event.name}</h2>${body ? body(state, now) : ""}</section>`;
}

function dailyView(state) {
  const tasks = DAILY_TASKS.map((task) => {
    const blocked = taskBlocked(state, task);
    const progress = state.daily.progress[task.key] || 0;
    const claimed = state.daily.claimed.includes(task.id);
    const ready = !blocked && progress >= task.goal && !claimed;
    return `<article class="panel">
      <div class="rowhead"><strong>${task.name}</strong><span>${blocked ? "Locked" : `${Math.min(progress, task.goal)}/${task.goal}`}</span></div>
      <p class="fine">${blocked ? "Unlock the matching system to add this order." : rewardText(task.reward)}</p>
      ${ready ? `<button class="btn small" data-act="daily" data-id="${task.id}">Claim</button>` : ""}
    </article>`;
  }).join("");
  const open = DAILY_TASKS.filter((task) => !taskBlocked(state, task));
  const bonusReady = !state.daily.bonusClaimed && open.every((task) => state.daily.claimed.includes(task.id));
  return `<p class="fine">Resets at midnight in Dubai (UTC+4). Locked orders do not block the chest.</p>${tasks}
    <button class="btn block" data-act="daily-bonus" ${bonusReady ? "" : "disabled"}>${state.daily.bonusClaimed ? "Chest claimed" : `Daily chest · ${rewardText(DAILY_BONUS)}`}</button>`;
}

function governorView(state, now) {
  const day = GOVERNOR_DAYS[state.governor.currentDay - 1];
  const board = governorBoard(state, now).map((row, index) => `<li class="${row.you ? "you" : ""}"><span>${index + 1}. ${esc(row.name)}</span><b>${fmtNum(row.score)}</b></li>`).join("");
  const chests = GOV_MILESTONES.map((tier, index) => {
    const claimed = state.governor.dayClaimed[index];
    const ready = !claimed && state.governor.dayScore >= tier.points;
    return `<button class="btn small ${ready ? "" : "ghost"}" data-act="gov-claim" data-index="${index}" ${ready ? "" : "disabled"}>${fmtNum(tier.points)}${claimed ? " claimed" : ""}</button>`;
  }).join("");
  return `<p class="kicker">Day ${day.day} · <span data-k="gov-time">${fmtTime(state.governor.startedAt + state.governor.currentDay * 6 * 60 * 1000 - now)}</span></p>
    <h3>${day.name}</h3>
    <p>${day.detail}</p>
    <div class="scoreline"><div><span>Today</span><strong data-k="gov-score">${fmtNum(state.governor.dayScore)}</strong></div><div><span>Week</span><strong data-k="gov-overall">${fmtNum(state.governor.overall)}</strong></div></div>
    <div class="rowbtns">${chests}</div>
    <h3>Today's ranking</h3>
    <ol class="ranks">${board}</ol>
    <p class="fine">Stages last 6 minutes in this realm so a full week can be played in one sitting. Live seasons run one stage per day. Only today's tasks score. 1× / 3× / 10× in Settings scales the clock.</p>`;
}

function rebelView(state) {
  const wave = state.rebels.nextWave;
  const enemy = wave <= 15 ? rebelWavePower(wave) : 0;
  const defense = defensePower(state);
  return `<div class="scoreline"><div><span>Your defense</span><strong>${fmtNum(defense)}</strong></div><div><span>Wave ${Math.min(wave, 15)}</span><strong>${fmtNum(enemy)}</strong></div></div>
    <p class="fine">Best clear: wave ${state.rebels.best}. Win the wave if your defense is at least the rebel power. Close wins wound a few troops.</p>
    <button class="btn block" data-act="rebel-wave" ${wave > 15 ? "disabled" : ""}>${wave > 15 ? "Invasion cleared" : `Fight wave ${wave}`}</button>
    <button class="btn block ghost" data-act="rebel-quick">Quick Battle${state.buildings.keep.level < 8 ? " · Town Center 8" : ""}</button>`;
}

function bearView(state, now) {
  const lock = lockReason(state, "bear");
  if (lock) {
    return `<p>${esc(lock)}.</p><p class="fine">Bear Hunt is an alliance damage race. The bear never hits back, so defense does not help. Archers deal the most damage. Build a Hunting Pit, join The Ashen Banner, and reach Town Center 4.</p>
      <button class="btn block" data-act="fix-lock" data-event="bear">Go unlock it</button>`;
  }
  const live = state.bear.endsAt > now;
  const preview = rallyPreview(state, state.bear.formation, state.bear.heroId);
  const formations = ["marksman", "balanced", "rider"].map((id) => `<button class="btn small ${state.bear.formation === id ? "" : "ghost"}" data-act="bear-form" data-formation="${id}">${id === "marksman" ? "Archers" : id === "rider" ? "Cavalry" : "Balanced"}</button>`).join("");
  const heroes = HEROES.filter((hero) => state.heroes[hero.id].owned).map((hero) => `<button class="btn small ${state.bear.heroId === hero.id ? "" : "ghost"}" data-act="bear-hero" data-id="${hero.id}">${esc(hero.name.split(" ")[0])}</button>`).join("");
  const personal = tierRow(BEAR_PERSONAL, state.bear.personal);
  const alliance = tierRow(BEAR_ALLIANCE, state.bear.alliance);
  if (!live && now < state.bear.cooldownUntil) {
    return `<p>The pit is resetting.</p><strong data-k="bear-time">${fmtTime(state.bear.cooldownUntil - now)}</strong><p class="fine">Last personal damage is already paid out.</p>`;
  }
  if (!live) {
    return `<p>Spring a 3 minute hunt. Rallies are free, cost no stamina, and do not kill troops. Your alliance adds damage beside you.</p><button class="btn block" data-act="bear-start">Spring the trap</button>`;
  }
  return `<p class="kicker">Live · <span data-k="bear-time">${fmtTime(state.bear.endsAt - now)}</span></p>
    <div class="scoreline"><div><span>You</span><strong data-k="bear-personal">${fmtNum(state.bear.personal)}</strong></div><div><span>Alliance</span><strong data-k="bear-alliance">${fmtNum(state.bear.alliance)}</strong></div></div>
    <p class="fine">Next rally <span data-k="rally-in">${state.bear.nextRally > now ? fmtTime(state.bear.nextRally - now) : "Ready"}</span> · preview ${fmtNum(preview.damage)} damage</p>
    <div class="rowbtns">${formations}</div>
    <div class="rowbtns">${heroes}</div>
    <button class="btn block" data-act="bear-rally">Launch rally</button>
    <h3>Personal rewards</h3>${personal}
    <h3>Alliance rewards</h3>${alliance}
    <p class="fine">Rewards are paid when the trap closes, including any tier you reached.</p>`;
}

function tierRow(tiers, score) {
  return `<ul class="tiers">${tiers.map((tier) => `<li class="${score >= tier.points ? "met" : ""}"><span>${fmtNum(tier.points)}</span><small>${esc(rewardText(tier.reward))}</small></li>`).join("")}</ul>`;
}

function glaiveView(state, now) {
  const lock = lockReason(state, "glaives");
  if (lock) {
    return `<p>${esc(lock)}.</p><button class="btn block" data-act="fix-lock" data-event="glaives">Go unlock it</button>`;
  }
  const open = glaiveOpenSlots(state);
  const missions = GLAIVE_MISSIONS.map((mission) => `<button class="btn ghost block" data-act="glaive-start" data-id="${mission.id}">${mission.name} · ${fmtTime(mission.time)} · ${mission.tokens} tokens</button>`).join("");
  const slots = state.glaiveSlots.map((slot, index) => {
    if (index >= open) return `<li>Slot ${index + 1} locked. Raise the Watchtower.</li>`;
    if (!slot) return `<li>Slot ${index + 1} empty.</li>`;
    const mission = GLAIVE_MISSIONS.find((entry) => entry.id === slot.missionId);
    if (slot.ready) return `<li>${mission.name} <button class="btn small" data-act="glaive-claim" data-index="${index}">Claim ${mission.tokens}</button></li>`;
    return `<li>${mission.name} · <span data-k="glaive-${index}">${fmtTime(slot.endsAt - now)}</span></li>`;
  }).join("");
  const shop = GLAIVE_SHOP.map((item) => `<button class="btn small ghost" data-act="glaive-buy" data-id="${item.id}">${item.name} · ${item.cost}</button>`).join("");
  return `<div class="scoreline"><div><span>Tokens</span><strong data-k="tokens">${fmtNum(state.stock.glaive)}</strong></div><div><span>Aurum</span><strong data-k="aurum">${fmtNum(state.stock.aurum)}</strong></div></div>
    <div class="stack">${missions}</div><ul class="plain">${slots}</ul><div class="rowbtns">${shop}</div>
    <button class="btn block" data-act="aurum">Use an aurum ingot</button>
    <p class="fine">Aurum pays a supply crate. On City Construction, Hero Development, and Basic Skills days it also scores like a premium material.</p>`;
}

function kopView(state, now) {
  const lock = lockReason(state, "kop");
  if (lock) return `<p>${esc(lock)}.</p><button class="btn block" data-act="fix-lock" data-event="kop">Raise the Town Center</button>`;
  const score = kopScore(state);
  const lanes = ["Left", "Center", "Right"].map((name, index) => {
    const yours = state.kop.assignment[index];
    const theirs = state.kop.rivalLanes[index];
    return `<div class="lane"><b>${name}</b><span>Northveil ${ROLE[theirs]}</span>
      <button class="btn small" data-act="kop-lane" data-lane="${index}" data-kind="${yours}">You: ${ROLE[yours]}</button>
      <button class="btn small ghost" data-act="kop-hero-lane" data-lane="${index}">${state.kop.heroLane === index ? "Hero here" : "Place hero"}</button></div>`;
  }).join("");
  if (state.kop.phase === "idle") {
    return `<p>Three phases: preparation, a lane clash, then triage. Infantry beats cavalry, cavalry beats archers, archers beat infantry.</p>
      <button class="btn block" data-act="kop-start" ${now < state.kop.cooldownUntil ? "disabled" : ""}>Sound the horns</button>
      ${now < state.kop.cooldownUntil ? `<p class="fine">Regrouping ${fmtTime(state.kop.cooldownUntil - now)}.</p>` : ""}`;
  }
  const head = `<div class="scoreline"><div><span>Ashmarch</span><strong data-k="kop-yours">${fmtNum(score.yours)}</strong></div><div><span>Northveil</span><strong data-k="kop-rival">${fmtNum(score.rival)}</strong></div></div>`;
  if (state.kop.phase === "prep") {
    return `${head}<p class="kicker">Preparation · <span data-k="kop-time">${fmtTime(state.kop.endsAt - now)}</span></p><p>Build, train, research, and gather. Northveil is scoring too.</p>${lanes}`;
  }
  if (state.kop.phase === "battle") {
    return `${head}<p>Northveil has committed. Tap a lane to cycle your troops, put your hero on one lane, then clash.</p>${lanes}<button class="btn block" data-act="kop-resolve">Resolve the clash</button>`;
  }
  if (state.kop.phase === "triage") {
    const wounded = state.wounded.shield + state.wounded.rider + state.wounded.marksman;
    return `${head}<p class="kicker">Triage · <span data-k="kop-time">${fmtTime(state.kop.endsAt - now)}</span></p><p>You took ${state.kop.wins} of 3 lanes. Heal wounded for 10 points each.</p>
      <button class="btn block" data-act="triage" data-count="${Math.min(wounded, 40)}">Treat ${Math.min(wounded, 40)} wounded</button>`;
  }
  return `${head}<p>The field is quiet.</p><button class="btn block" data-act="kop-claim">Claim rewards</button>`;
}

function castleView(state, now) {
  const lock = lockReason(state, "castle");
  if (lock) return `<p>${esc(lock)}.</p><button class="btn block" data-act="fix-lock" data-event="castle">Raise the Town Center</button>`;
  if (!state.castle.active) {
    const wait = state.castle.cooldownUntil > now;
    return `<p>Hold the Crown Castle for 5 minutes. A continuous hold of 2 minutes 30 seconds wins at once. Otherwise the longer occupation wins. A win dyes your banner royal.</p>
      <button class="btn block" data-act="castle-start" ${wait ? "disabled" : ""}>${wait ? "The castle is quiet" : "Garrison the castle"}</button>
      ${state.castle.result ? `<p class="fine">Last result: ${state.castle.result === "win" ? "victory" : "defeat"}.</p>` : ""}`;
  }
  const gar = state.castle.garrison;
  return `<p class="kicker">Live · <span data-k="castle-time">${fmtTime(state.castle.endsAt - now)}</span></p>
    <div class="scoreline"><div><span>Your hold</span><strong data-k="castle-you">${fmtTime(state.castle.yourHold)}</strong></div><div><span>Rival hold</span><strong data-k="castle-rival">${fmtTime(state.castle.rivalHold)}</strong></div></div>
    <p>Continuous hold <b data-k="castle-hold">${fmtTime(state.castle.continuous)}</b> / 2m 30s</p>
    <p class="fine">Garrison ${gar.shield} infantry, ${gar.rider} cavalry, ${gar.marksman} archers.</p>
    <button class="btn block" data-act="castle-reinforce">Send reinforcements</button>
    <button class="btn block ghost" data-act="castle-inspire">Inspire next clash · 8 stamina</button>`;
}

function allianceScreen(state) {
  if (!state.alliance.joined) {
    return `<section class="alliance">
      <p class="kicker">${ALLIANCE.tag}</p>
      <h2>${ALLIANCE.name}</h2>
      <p>${ALLIANCE.motto}</p>
      <p class="fine">Alliances open at Town Center 3. Members cut construction time, and Bear Hunt is an alliance event. This realm's banner is part of the single-player season.</p>
      <button class="btn block" data-act="join">Join ${ALLIANCE.name}</button>
      ${memberList()}
    </section>`;
  }
  const feed = state.feed.slice(0, 8).map((entry) => `<li>${esc(entry.text)}</li>`).join("");
  return `<section class="alliance">
    <p class="kicker">${ALLIANCE.tag} · you are R2</p>
    <h2>${ALLIANCE.name}</h2>
    <p>Contribution ${fmtNum(state.alliance.contribution)}</p>
    <div class="rowbtns">
      <button class="btn small" data-act="donate" data-res="grain">200 grain</button>
      <button class="btn small" data-act="donate" data-res="timber">200 wood</button>
      <button class="btn small" data-act="donate" data-res="stone">200 stone</button>
      <button class="btn small" data-act="donate" data-res="iron">200 iron</button>
    </div>
    <p class="fine">Every fifth donation returns a small gift. Helps arrive on their own while a building is underway.</p>
    <h3>Notice</h3><ul class="plain">${feed}</ul>
    ${memberList()}
  </section>`;
}

function memberList() {
  const rows = ALLIANCE.members.map((member) => `<li><span><b>${esc(member.name)}</b><small>${member.rank} · ${member.role}</small></span><em>${fmtNum(member.power)}</em></li>`).join("");
  return `<h3>Roster</h3><ul class="roster">${rows}</ul>`;
}

function overlay(state, ui, now) {
  if (!ui.sheet) return "";
  const body = ui.sheet.type === "settings" ? settingsSheet(state, ui) : ui.sheet.type === "hero" ? heroSheet(state, ui.sheet.id) : buildingSheet(state, ui.sheet.id, now);
  return `<button class="backdrop" data-act="close" aria-label="Close"></button><div class="sheet" role="dialog">${body}</div>`;
}

function buildingSheet(state, id, now) {
  const def = BUILDINGS[id];
  const level = state.buildings[id].level;
  const gate = buildingGate(state, id);
  const maxed = level >= def.max;
  const next = maxed ? null : buildingCost(id, level + 1);
  const time = maxed ? 0 : buildingTime(state, id, level + 1);
  let reason = null;
  if (!gate.ok) reason = gate.reason;
  else if (maxed) reason = "Max level.";
  else if (state.build && state.build.id !== id) reason = "Another building is underway.";
  else if (state.build?.id === id) reason = null;
  else if (!afford(state, next)) reason = "Need more resources.";
  const active = state.build?.id === id;
  const costs = next ? costLine(next) : "Max level";
  return `<div class="rowhead"><h3>${def.name}</h3><button class="textback" data-act="close">Close</button></div>
    <p>${def.blurb}</p>
    <p class="fine">Level ${level}${def.produces && level ? ` · ${fmtNum(productionPerMin(state, id))} ${RESOURCE_LABEL[def.produces]}/min` : ""}</p>
    ${active ? `<div class="meter"><i data-k="build-bar" data-as="width" style="width:${bar(state.build, now)}"></i></div><p data-k="build-time">${fmtTime(state.build.endsAt - now)}</p>${speedButtons("build", state)}` : `<p>${maxed ? "Finished" : `${level === 0 ? "Build" : "Upgrade"} · ${costs} · ${fmtTime(time)}`}</p>`}
    ${reason ? `<p class="hint">${esc(reason)}</p>` : ""}
    ${active || maxed || reason ? "" : `<button class="btn block" data-act="upgrade" data-id="${id}">${level === 0 ? "Build" : "Upgrade"}</button>`}`;
}

function heroSheet(state, id) {
  const def = HEROES.find((hero) => hero.id === id);
  const hero = state.heroes[id];
  if (!hero.owned) {
    return `<div class="rowhead"><h3>${esc(def.name)}</h3><button class="textback" data-act="close">Close</button></div><p>${def.blurb}</p><p class="fine">${def.rarity} · ${ROLE[def.role]}. Summon to recruit.</p>`;
  }
  const starNeed = [10, 20, 40, 80, 160][hero.stars] ?? 0;
  return `<div class="rowhead"><h3>${esc(def.name)}</h3><button class="textback" data-act="close">Close</button></div>
    <p>${def.skill}: ${def.blurb}</p>
    <p class="fine">${def.rarity} · ${ROLE[def.role]} · level ${hero.level} · skill ${hero.skill} · ${hero.shards} shards</p>
    <div class="stack">
      <button class="btn" data-act="hero-level" data-id="${id}">Level up · ${fmtNum(150 * hero.level)} grain, ${fmtNum(25 * hero.level)} gold</button>
      <button class="btn ghost" data-act="hero-star" data-id="${id}">Ascend · ${hero.stars >= 5 ? "max" : `${starNeed} shards`}</button>
      <button class="btn ghost" data-act="hero-skill" data-id="${id}">Skill up · ${hero.skill >= 5 ? "max" : `${50 * hero.skill * hero.skill} gold, ${hero.skill} shards`}</button>
      <button class="btn ghost" data-act="lead" data-id="${id}">${state.leadHeroId === id ? "Leading marches" : "Set as march lead"}</button>
    </div>`;
}

function settingsSheet(state, ui) {
  return `<div class="rowhead"><h3>Settings</h3><button class="textback" data-act="close">Close</button></div>
    <label for="rename">Governor name</label>
    <input id="rename" maxlength="16" value="${esc(state.name)}">
    <p class="fine">Clock speed scales builds, training, marches, hunts, and the event calendar.</p>
    <div class="rowbtns">
      ${[1, 3, 10].map((speed) => `<button class="btn small ${state.clock.speed === speed ? "" : "ghost"}" data-act="speed" data-speed="${speed}">${speed}×</button>`).join("")}
    </div>
    <button class="btn block ghost" data-act="sound">${state.settings.sound ? "Sound on" : "Sound off"}</button>
    ${ui.canInstall ? `<button class="btn block" data-act="install">Install app</button>` : ""}
    <h3>Android</h3>
    <p class="fine">Open Ashmarch in Chrome, tap the menu, then Install app or Add to Home screen. It runs full screen, in portrait, with your town saved on this device.</p>
    <button class="btn block danger" data-act="reset-ask">Reset this realm</button>`;
}

function speedButtons(queue, state) {
  if (!state.speedups.general) return `<p class="fine">No speedups stored.</p>`;
  return `<div class="rowbtns"><button class="btn small" data-act="speedup" data-queue="${queue}" data-min="1">1m speedup</button><button class="btn small ghost" data-act="speedup" data-queue="${queue}" data-min="${state.speedups.general}">All ${state.speedups.general}m</button></div>`;
}

function costLine(cost) {
  return Object.entries(cost).map(([key, amount]) => `${fmtNum(amount)} ${RESOURCE_LABEL[key] || key}`).join(" · ");
}

function modalMarkup(state, ui) {
  if (state.tutorialStep < 3) return tutorialModal(state.tutorialStep);
  const modal = ui.modal;
  if (!modal) return "";
  if (modal.type === "reward") {
    return dialog("Reward", `<p>${esc(modal.detail || "")}</p><strong>${esc(rewardText(modal.reward))}</strong>`, `<button class="btn block" data-act="dismiss">Take it</button>`);
  }
  if (modal.type === "away") {
    return dialog("While you were away", `<p>${esc(modal.detail)}</p>`, `<button class="btn block" data-act="dismiss">Continue</button>`);
  }
  if (modal.type === "lanes") {
    const rows = modal.logs.map((entry, index) => `<li>${["Left", "Center", "Right"][index]}: your ${ROLE[entry.yours]} ${entry.win ? "broke" : "lost to"} their ${ROLE[entry.theirs]}</li>`).join("");
    return dialog(`Clash ${modal.wins}–${3 - modal.wins}`, `<ul class="plain">${rows}</ul>`, `<button class="btn block" data-act="dismiss">On to triage</button>`);
  }
  if (modal.type === "confirm") {
    return dialog("Reset this realm?", "<p>Your town, heroes, and event progress on this device will be erased.</p>", `<button class="btn block danger" data-act="reset-yes">Erase</button><button class="btn block ghost" data-act="dismiss">Keep playing</button>`);
  }
  return "";
}

function tutorialModal(step) {
  const slides = [
    ["This town is yours", "Farms, mills, quarries, and mines fill your stores. Raise the Town Center to open the rest of the realm."],
    ["Train, then march", "Infantry come from the Barracks. On the world map, gather resources and break rebel camps."],
    ["The season is the game", "Daily Missions and Strongest Governor are open now. Bear Hunt, Golden Glaives, Rebel Invasion, Kingdom of Power, and Castle Battle unlock as the town grows."],
  ];
  const [title, copy] = slides[step] || slides[2];
  return dialog(title, `<p>${copy}</p><p class="fine">${step + 1} / 3</p>`, `<button class="btn block" data-act="tutorial">${step === 2 ? "Enter the town" : "Next"}</button>`);
}

function dialog(title, body, actions) {
  return `<div class="modal"><div class="modal-card" role="dialog" aria-modal="true"><h3>${title}</h3>${body}${actions}</div></div>`;
}

export function toastMarkup(toasts) {
  return toasts.map((toast) => `<div class="toast ${toast.kind || ""}">${esc(toast.text)}</div>`).join("");
}

import { sfx } from "./audio.js";
import {
  advanceTutorial,
  bearRally,
  buyGlaive,
  claimChapter,
  claimDaily,
  claimDailyBonus,
  claimGlaive,
  claimGovernor,
  claimKop,
  createNewGame,
  donate,
  fightRebelWave,
  healNow,
  hydrate,
  inspireCastle,
  joinAlliance,
  levelHero,
  reinforceCastle,
  rename,
  resolveKop,
  setBearPlan,
  setKopHeroLane,
  setKopLane,
  setLead,
  setSpeed,
  skillHero,
  starHero,
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
  triage,
  upgrade,
  useAurum,
  useSpeedup,
} from "./game.js";
import { RESOURCE_LABEL } from "./data.js";
import { fmtNum, patch, render, toastMarkup } from "./ui.js";

const KEY = "ashmarch-save-v1";
const app = document.querySelector("#app");
const TROOP_CYCLE = ["shield", "rider", "marksman"];

let state = null;
let ui = blankUi();
let deferredPrompt = null;
let lastSave = 0;
let toastSeq = 1;

function blankUi() {
  return { tab: "town", host: "heroes", sheet: null, event: null, modal: null, toasts: [], depth: 0, canInstall: false, dirty: false, pendingAway: null, cam: { x: 36, y: 48, scale: 1.62 }, suppressClick: false };
}

function save() {
  if (!state) return;
  const pending = state.pendingNotes;
  state.pendingNotes = [];
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } finally {
    state.pendingNotes = pending;
  }
  lastSave = Date.now();
}

function load() {
  const raw = localStorage.getItem(KEY);
  if (!raw) return null;
  try {
    return hydrate(raw, Date.now());
  } catch (error) {
    console.error(error);
    return null;
  }
}

function full() {
  render(app, { state, ui });
  paintToasts();
}

function paintToasts() {
  const root = document.querySelector("#toasts");
  if (root) root.innerHTML = toastMarkup(ui.toasts);
}

function pushToast(text, kind = "good") {
  if (!text) return;
  const id = toastSeq++;
  ui.toasts.push({ id, text, kind });
  if (ui.toasts.length > 2) ui.toasts.splice(0, ui.toasts.length - 2);
  paintToasts();
  setTimeout(() => {
    ui.toasts = ui.toasts.filter((toast) => toast.id !== id);
    paintToasts();
  }, 2600);
}

function drainNotes() {
  if (!state?.pendingNotes?.length) return;
  const notes = state.pendingNotes.splice(0, 3);
  for (const text of notes) pushToast(text, "good");
}

function typing() {
  const el = document.activeElement;
  return el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA");
}

function awaySummary(before) {
  const parts = [];
  for (const key of ["grain", "timber", "stone", "iron", "gold"]) {
    const gain = Math.floor(state.resources[key] - before[key]);
    if (gain > 0) parts.push(`${fmtNum(gain)} ${RESOURCE_LABEL[key]}`);
  }
  return parts.join(" · ");
}

function pushLayer() {
  history.pushState({ ash: 1 }, "");
  ui.depth += 1;
}

function openSheet(sheet) {
  const layered = ui.sheet || ui.event;
  ui.sheet = sheet;
  if (!layered) pushLayer();
  full();
}

function finish(result, sound = "good") {
  if (!result) return;
  if (!result.ok) {
    pushToast(result.error, "bad");
    sfx("bad", state.settings.sound);
    return;
  }
  if (result.reward) ui.modal = { type: "reward", detail: result.detail || "Reward", reward: result.reward };
  else if (result.detail) pushToast(result.detail, "good");
  sfx(result.damage ? "hit" : sound, state.settings.sound);
  if (navigator.vibrate && sound !== "bad") navigator.vibrate(8);
  drainNotes();
  save();
  full();
}

function act(run) {
  if (!state) return;
  touch(state, Date.now());
  const result = run();
  finish(result);
}

function fixLock(eventId) {
  ui.event = null;
  if (eventId === "bear" && state.buildings.keep.level >= 4 && !state.alliance.joined) {
    ui.tab = "alliance";
    ui.sheet = null;
    full();
    return;
  }
  let building = "keep";
  if (eventId === "glaives" && state.buildings.keep.level >= 3) building = "watchtower";
  if (eventId === "bear" && state.buildings.keep.level >= 4 && state.alliance.joined) building = "pitfall";
  ui.tab = "town";
  openSheet({ type: "building", id: building });
}

function onClick(event) {
  if (ui.suppressClick) {
    ui.suppressClick = false;
    return;
  }
  const button = event.target.closest("[data-act]");
  if (!button || !app.contains(button)) return;
  const { act: name, id, tab, host, kind, count, formation, queue, min, tree, index, lane, res, speed, event: eventId } = button.dataset;
  if (name === "noop") return;
  if (name !== "start") event.preventDefault();

  if (name === "zoom") {
    if (!ui.cam) ui.cam = { x: 36, y: 48, scale: 1.62 };
    if (button.dataset.dir === "home") {
      ui.cam.x = 36;
      ui.cam.y = 48;
      ui.cam.scale = 1.62;
    } else if (button.dataset.dir === "in") ui.cam.scale = Math.min(1.7, ui.cam.scale * 1.12);
    else ui.cam.scale = Math.max(0.62, ui.cam.scale * 0.9);
    full();
    return;
  }
  if (name === "nav") {
    ui.tab = tab;
    ui.event = null;
    ui.sheet = null;
    full();
    return;
  }
  if (name === "close") {
    if (ui.modal && state?.tutorialStep >= 3) {
      ui.modal = null;
      full();
      return;
    }
    if (ui.depth > 0 && (ui.sheet || ui.event)) {
      history.back();
      return;
    }
    ui.sheet = null;
    ui.event = null;
    full();
    return;
  }
  if (name === "dismiss") {
    ui.modal = null;
    full();
    return;
  }
  if (name === "tutorial") {
    act(() => advanceTutorial(state));
    if (state.tutorialStep >= 3 && ui.pendingAway) {
      ui.modal = ui.pendingAway;
      ui.pendingAway = null;
      full();
    }
    return;
  }
  if (name === "open-settings") {
    openSheet({ type: "settings" });
    return;
  }
  if (name === "open-building") {
    openSheet({ type: "building", id });
    return;
  }
  if (name === "open-hero") {
    openSheet({ type: "hero", id });
    return;
  }
  if (name === "goto-building") {
    ui.tab = "town";
    openSheet({ type: "building", id });
    return;
  }
  if (name === "host") {
    ui.host = host;
    full();
    return;
  }
  if (name === "event-open") {
    const target = eventId || (id === "n13" ? "bear" : id === "n14" ? "castle" : "");
    if (!target) return;
    const layered = ui.sheet || ui.event;
    ui.sheet = null;
    ui.event = target;
    if (!layered) pushLayer();
    full();
    return;
  }
  if (name === "fix-lock") {
    fixLock(eventId);
    return;
  }
  if (name === "speed") {
    act(() => setSpeed(state, Number(speed), Date.now()));
    return;
  }
  if (name === "sound") {
    state.settings.sound = !state.settings.sound;
    save();
    full();
    return;
  }
  if (name === "install") {
    deferredPrompt?.prompt();
    return;
  }
  if (name === "reset-ask") {
    ui.modal = { type: "confirm" };
    full();
    return;
  }
  if (name === "reset-yes") {
    localStorage.removeItem(KEY);
    state = null;
    ui = blankUi();
    full();
    return;
  }

  const table = {
    upgrade: () => upgrade(state, id),
    train: () => train(state, kind, Number(count)),
    research: () => startResearch(state, tree),
    speedup: () => useSpeedup(state, queue, Number(min)),
    summon: () => summon(state),
    "hero-level": () => levelHero(state, id),
    "hero-star": () => starHero(state, id),
    "hero-skill": () => skillHero(state, id),
    lead: () => setLead(state, id),
    heal: () => healNow(state, Number(count)),
    march: () => startMarch(state, id),
    join: () => joinAlliance(state),
    donate: () => donate(state, res),
    chapter: () => claimChapter(state),
    daily: () => claimDaily(state, id),
    "daily-bonus": () => claimDailyBonus(state),
    "gov-claim": () => claimGovernor(state, Number(index)),
    "bear-start": () => startBear(state),
    "bear-form": () => setBearPlan(state, formation, state.bear.heroId),
    "bear-hero": () => setBearPlan(state, state.bear.formation, id),
    "bear-rally": () => bearRally(state),
    "rebel-wave": () => fightRebelWave(state, false),
    "rebel-quick": () => fightRebelWave(state, true),
    "glaive-start": () => startGlaive(state, id),
    "glaive-claim": () => claimGlaive(state, Number(index)),
    "glaive-buy": () => buyGlaive(state, id),
    aurum: () => useAurum(state),
    "kop-start": () => startKop(state),
    "kop-resolve": () => resolveKop(state),
    "kop-claim": () => claimKop(state),
    triage: () => triage(state, Number(count)),
    "castle-start": () => startCastle(state),
    "castle-reinforce": () => reinforceCastle(state),
    "castle-inspire": () => inspireCastle(state),
  };

  if (name === "kop-lane") {
    const current = state.kop.assignment[Number(lane)];
    const next = TROOP_CYCLE[(TROOP_CYCLE.indexOf(current) + 1) % TROOP_CYCLE.length];
    act(() => setKopLane(state, Number(lane), next));
    return;
  }
  if (name === "kop-hero-lane") {
    act(() => setKopHeroLane(state, Number(lane)));
    return;
  }
  if (name === "rebel-wave" || name === "rebel-quick") {
    touch(state, Date.now());
    const result = table[name]();
    if (result?.ok) {
      const wins = result.logs.filter((entry) => entry.win).length;
      const last = result.logs.at(-1);
      result.detail = name === "rebel-quick"
        ? `Quick battle cleared ${wins} wave${wins === 1 ? "" : "s"}.`
        : last?.win ? `Wave ${last.wave} held.` : `The wall broke on wave ${last.wave}.`;
    }
    finish(result);
    return;
  }
  if (name === "kop-resolve") {
    touch(state, Date.now());
    const result = resolveKop(state);
    if (result.ok) ui.modal = { type: "lanes", logs: result.logs, wins: result.wins };
    finish(result);
    return;
  }
  if (table[name]) act(table[name]);
}

function onSubmit(event) {
  if (event.target.id !== "boot-form") return;
  event.preventDefault();
  const input = document.querySelector("#gov-name");
  state = createNewGame(input?.value, Date.now());
  ui = blankUi();
  save();
  full();
  sfx("good", true);
}

function onInput(event) {
  if (event.target.id !== "rename" || !state) return;
  rename(state, event.target.value);
  const label = document.querySelector("[data-k='gov-name']");
  if (label) label.textContent = state.name;
  save();
}

function bindCityPan() {
  const pointers = new Map();
  let drag = null;
  let pinch = null;
  const apply = () => {
    const world = document.querySelector(".city-world");
    if (!world || !ui.cam) return;
    world.style.transform = `translate(calc(-50% + ${ui.cam.x}px), calc(-50% + ${ui.cam.y}px)) scale(${ui.cam.scale})`;
  };
  app.addEventListener("pointerdown", (event) => {
    if (!event.target.closest(".city-viewport")) return;
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.size === 1) {
      drag = { x: event.clientX, y: event.clientY, ox: ui.cam.x, oy: ui.cam.y, moved: false };
      pinch = null;
    } else if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      pinch = { dist: Math.hypot(a.x - b.x, a.y - b.y) || 1, scale: ui.cam.scale };
      drag = null;
    }
  });
  app.addEventListener("pointermove", (event) => {
    if (!pointers.has(event.pointerId)) return;
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pinch && pointers.size >= 2) {
      const [a, b] = [...pointers.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y) || 1;
      ui.cam.scale = Math.min(1.7, Math.max(0.62, pinch.scale * (dist / pinch.dist)));
      apply();
      return;
    }
    if (!drag) return;
    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    if (Math.hypot(dx, dy) > 8) drag.moved = true;
    if (!drag.moved) return;
    ui.cam.x = drag.ox + dx;
    ui.cam.y = drag.oy + dy;
    apply();
  });
  const end = (event) => {
    if (drag?.moved) ui.suppressClick = true;
    drag = null;
    pointers.delete(event.pointerId);
    if (pointers.size < 2) pinch = null;
  };
  app.addEventListener("pointerup", end);
  app.addEventListener("pointercancel", end);
  app.addEventListener("wheel", (event) => {
    if (!event.target.closest(".city-viewport")) return;
    event.preventDefault();
    ui.cam.scale = Math.min(1.7, Math.max(0.62, ui.cam.scale * (event.deltaY > 0 ? 0.92 : 1.08)));
    apply();
  }, { passive: false });
}

function frame() {
  requestAnimationFrame(frame);
  if (!state) return;
  const result = tick(state, Date.now());
  drainNotes();
  const focused = typing();
  if ((result.changed || ui.dirty) && !focused) {
    ui.dirty = false;
    full();
  } else {
    if (result.changed) ui.dirty = true;
    patch(app, state);
  }
  if (Date.now() - lastSave > 4000) save();
}

function boot() {
  state = load();
  if (state) {
    const before = { ...state.resources };
    tick(state, Date.now());
    const summary = state.awayMs > 60000 ? awaySummary(before) : "";
    state.awayMs = 0;
    if (summary) {
      const modal = { type: "away", detail: summary };
      if (state.tutorialStep < 3) ui.pendingAway = modal;
      else ui.modal = modal;
    }
    drainNotes();
  }
  app.addEventListener("click", onClick);
  app.addEventListener("submit", onSubmit);
  app.addEventListener("input", onInput);
  bindCityPan();
  window.addEventListener("popstate", () => {
    ui.depth = Math.max(0, ui.depth - 1);
    ui.sheet = null;
    ui.event = null;
    full();
  });
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredPrompt = event;
    ui.canInstall = true;
    if (state) full();
  });
  full();
  requestAnimationFrame(frame);
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("./sw.js").catch(() => {});
}

boot();

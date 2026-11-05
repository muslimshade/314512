// Season calendar for Ashmarch.
// To add a later event: append it here, then give it state, actions, and a screen.
// Entries with status "soon" show on the Events tab until they are built.

export const TROOP_IDS = ["shield", "rider", "marksman"];

export const TROOPS = {
  shield: {
    name: "Infantry",
    building: "barracks",
    stat: 8,
    hunt: 10,
    cost: { grain: 10, timber: 6 },
    seconds: 0.28,
  },
  rider: {
    name: "Cavalry",
    building: "stables",
    stat: 11,
    hunt: 14,
    cost: { grain: 12, iron: 8 },
    seconds: 0.34,
  },
  marksman: {
    name: "Archers",
    building: "range",
    stat: 13,
    hunt: 22,
    cost: { timber: 12, iron: 8 },
    seconds: 0.36,
  },
};

export const BUILDINGS = {
  keep: {
    name: "Town Center",
    group: "Kingdom",
    blurb: "The heart of your settlement. Its level gates the rest of the realm.",
    base: { grain: 180, timber: 180, stone: 70 },
    time: 12,
    max: 15,
    start: 1,
    needKeep: 1,
  },
  farm: {
    name: "Farm",
    group: "Economy",
    blurb: "Grows grain for troops and construction.",
    base: { grain: 80, timber: 60 },
    time: 8,
    max: 12,
    start: 1,
    needKeep: 1,
    produces: "grain",
    rate: 42,
  },
  mill: {
    name: "Lumber Mill",
    group: "Economy",
    blurb: "Cuts timber for buildings and bows.",
    base: { grain: 70, timber: 40 },
    time: 8,
    max: 12,
    start: 1,
    needKeep: 1,
    produces: "timber",
    rate: 42,
  },
  quarry: {
    name: "Quarry",
    group: "Economy",
    blurb: "Breaks stone for walls and the Town Center.",
    base: { grain: 90, timber: 70 },
    time: 10,
    max: 12,
    start: 1,
    needKeep: 1,
    produces: "stone",
    rate: 24,
  },
  mine: {
    name: "Iron Mine",
    group: "Economy",
    blurb: "Pulls iron for cavalry, archers, and research.",
    base: { grain: 120, timber: 100, stone: 40 },
    time: 12,
    max: 12,
    start: 0,
    needKeep: 2,
    produces: "iron",
    rate: 16,
  },
  storehouse: {
    name: "Storehouse",
    group: "Economy",
    blurb: "Each level adds 3% to all production.",
    base: { grain: 100, timber: 100, stone: 40 },
    time: 10,
    max: 10,
    start: 0,
    needKeep: 2,
  },
  barracks: {
    name: "Barracks",
    group: "Military",
    blurb: "Trains infantry. Higher levels raise the troop tier.",
    base: { grain: 140, timber: 100 },
    time: 10,
    max: 10,
    start: 1,
    needKeep: 1,
  },
  range: {
    name: "Archery Range",
    group: "Military",
    blurb: "Trains archers. Archers hit hardest in Bear Hunt.",
    base: { grain: 160, timber: 140, iron: 40 },
    time: 12,
    max: 10,
    start: 0,
    needKeep: 3,
  },
  stables: {
    name: "Stables",
    group: "Military",
    blurb: "Trains cavalry for map fights and lane clashes.",
    base: { grain: 160, timber: 80, iron: 60 },
    time: 12,
    max: 10,
    start: 0,
    needKeep: 4,
  },
  wall: {
    name: "Wall",
    group: "Military",
    blurb: "Raises your defense when rebels reach the town.",
    base: { timber: 140, stone: 120 },
    time: 12,
    max: 12,
    start: 0,
    needKeep: 2,
  },
  infirmary: {
    name: "Infirmary",
    group: "Military",
    blurb: "Heals wounded troops over time.",
    base: { grain: 100, timber: 80, stone: 40 },
    time: 10,
    max: 10,
    start: 0,
    needKeep: 2,
  },
  academy: {
    name: "Academy",
    group: "Kingdom",
    blurb: "Researches growth, economy, and battle.",
    base: { grain: 150, timber: 120, stone: 60 },
    time: 14,
    max: 10,
    start: 0,
    needKeep: 3,
  },
  hall: {
    name: "Hero Hall",
    group: "Kingdom",
    blurb: "Recruit and raise the heroes who lead your host.",
    base: { grain: 140, timber: 100, gold: 20 },
    time: 12,
    max: 10,
    start: 0,
    needKeep: 2,
  },
  watchtower: {
    name: "Watchtower",
    group: "Kingdom",
    blurb: "Sends Golden Glaives missions for tokens and aurum.",
    base: { timber: 160, stone: 80, iron: 30 },
    time: 12,
    max: 3,
    start: 0,
    needKeep: 3,
  },
  pitfall: {
    name: "Hunting Pit",
    group: "Kingdom",
    blurb: "Alliance trap for Bear Hunt. Each level adds hunt damage.",
    base: { grain: 220, timber: 180, iron: 60 },
    time: 14,
    max: 8,
    start: 0,
    needKeep: 4,
    needAlliance: true,
  },
};

export const RESEARCH = {
  growth: ["Stonecutters", "Masonry", "Crane Crews", "Surveyors", "Siege Draft", "Keepwrights", "Night Shifts", "Grand Works"],
  economy: ["Granaries", "Sawmills", "Pack Mules", "Ore Carts", "Trade Road", "Deep Veins", "Tithe", "Prosperity"],
  battle: ["Drill", "Fletching", "Charge", "Armor", "Volley", "Banners", "Iron Discipline", "War Doctrine"],
};

export const HEROES = [
  { id: "seren", name: "Seren Vale", role: "shield", rarity: "epic", skill: "Bulwark", blurb: "Infantry captain. Steady damage on every march." },
  { id: "osric", name: "Osric Dunn", role: "shield", rarity: "rare", skill: "Hold the Line", blurb: "Shield specialist who steadies a weak lane." },
  { id: "kael", name: "Kael Thorn", role: "rider", rarity: "rare", skill: "Charge", blurb: "Cavalry raider. Best on open ground." },
  { id: "bram", name: "Bram Holt", role: "rider", rarity: "epic", skill: "Trample", blurb: "Breaks archer lines in a lane clash." },
  { id: "mira", name: "Mira Quill", role: "marksman", rarity: "epic", skill: "Lethality", blurb: "Archer. Her marches cut deepest into the bear." },
  { id: "vesper", name: "Vesper Lan", role: "marksman", rarity: "mythic", skill: "True Aim", blurb: "Mythic archer. The hunt's best damage lead." },
];

export const RARITY_WEIGHT = [
  { rarity: "mythic", p: 0.12 },
  { rarity: "epic", p: 0.33 },
  { rarity: "rare", p: 0.55 },
];

export const SUMMON_COST = 80;
export const DAY_MS = 6 * 60 * 1000;
export const BEAR_MS = 3 * 60 * 1000;
export const BEAR_COOLDOWN_MS = 8 * 60 * 1000;
export const RALLY_GAP_MS = 7000;

export const TRAIN_POINTS = { 1: 1, 2: 2, 3: 3, 4: 5, 5: 7, 6: 11, 7: 16, 8: 23, 9: 30, 10: 39 };

export const GOVERNOR_DAYS = [
  { day: 1, name: "City Construction", actions: ["build", "speedup", "aurum"], detail: "Finish buildings, spend speedups, and open aurum." },
  { day: 2, name: "Hero Development", actions: ["hero_level", "summon", "star", "speedup", "aurum"], detail: "Level heroes, summon, ascend with shards, and spend speedups." },
  { day: 3, name: "Basic Skills Up", actions: ["skill", "star", "summon"], detail: "Raise hero skills, ascend, and summon." },
  { day: 4, name: "Combat Training", actions: ["train"], detail: "Train troops. Higher barracks, range, and stable tiers score more." },
  { day: 5, name: "Basic Skills Up", actions: ["research", "skill", "speedup", "aurum"], detail: "Finish research, raise skills, and spend speedups." },
  { day: 6, name: "Combat Training", actions: ["train"], detail: "Train troops again. Bank them on this day if you can." },
  { day: 7, name: "Hero Development", actions: ["hero_level", "star", "build", "research", "gather", "speedup", "aurum"], detail: "Heroes, building, research, and map gathering all score. Gathering scores today." },
];

export const GOV_MILESTONES = [
  { points: 400, reward: { grain: 700, timber: 700 } },
  { points: 1000, reward: { gold: 90, speedup: 8 } },
  { points: 2200, reward: { gems: 30, iron: 400 } },
  { points: 4200, reward: { gems: 45, aurum: 1 } },
];

export const BEAR_PERSONAL = [
  { points: 2500, reward: { grain: 800, timber: 800 } },
  { points: 8000, reward: { iron: 350, gold: 100 } },
  { points: 20000, reward: { gems: 25, speedup: 10 } },
  { points: 45000, reward: { gems: 25, shards: 12 } },
];

export const BEAR_ALLIANCE = [
  { points: 20000, reward: { grain: 600, gold: 50 } },
  { points: 60000, reward: { gems: 15, timber: 900 } },
  { points: 140000, reward: { aurum: 1, gems: 20 } },
];

export const GLAIVE_MISSIONS = [
  { id: "ridge", name: "Scout the Ridge", time: 20000, tokens: 3 },
  { id: "caravan", name: "Escort the Caravan", time: 35000, tokens: 5 },
  { id: "cache", name: "Raid the Cache", time: 50000, tokens: 8 },
];

export const GLAIVE_SHOP = [
  { id: "speed5", name: "5m Speedup", cost: 4, reward: { speedup: 5 } },
  { id: "crate", name: "Supply Crate", cost: 6, reward: { grain: 1200, timber: 1200, stone: 500, iron: 250 } },
  { id: "shards", name: "Shard Crate", cost: 12, reward: { shards: 8 } },
  { id: "gems", name: "Gem Pouch", cost: 18, reward: { gems: 40 } },
  { id: "aurum", name: "Aurum Ingot", cost: 22, reward: { aurum: 1 } },
];

export const DAILY_TASKS = [
  { id: "login", name: "Report for duty", goal: 1, key: "login", reward: { gems: 5, gold: 25 } },
  { id: "upgrade", name: "Upgrade or build once", goal: 1, key: "upgrades", reward: { timber: 350, grain: 350 } },
  { id: "train", name: "Train 25 troops", goal: 25, key: "trained", reward: { gold: 40, speedup: 5 } },
  { id: "gather", name: "Gather in the valley", goal: 1, key: "gathers", reward: { stone: 250, iron: 120 } },
  { id: "rebel", name: "Defeat a rebel camp", goal: 1, key: "rebels", reward: { gems: 8 } },
  { id: "donate", name: "Donate to the alliance", goal: 1, key: "donations", need: "alliance", reward: { gold: 40 } },
  { id: "rally", name: "Rally in Bear Hunt", goal: 1, key: "rallies", need: "bear", reward: { gems: 12, grain: 500 } },
  { id: "glaive", name: "Finish a Golden Glaives mission", goal: 1, key: "glaives", need: "glaives", reward: { glaive: 6 } },
];

export const DAILY_BONUS = { gems: 25, speedup: 10, gold: 80 };

export const CHAPTERS = [
  { id: "farm", title: "Break ground", hint: "Raise the Farm to level 2.", goal: 2, reward: { gems: 15, grain: 500 } },
  { id: "train", title: "Raise shields", hint: "Train 20 troops.", goal: 20, reward: { timber: 500, iron: 180 } },
  { id: "camp", title: "Clear a camp", hint: "Defeat a rebel camp on the world map.", goal: 1, reward: { gems: 12, gold: 50 } },
  { id: "ally", title: "Take a banner", hint: "Reach Town Center 3 and join The Ashen Banner.", goal: 1, reward: { gems: 15, speedup: 5 } },
  { id: "bear", title: "Spring the trap", hint: "Build a Hunting Pit and launch a Bear Hunt rally.", goal: 1, reward: { gold: 100, glaive: 4 } },
  { id: "gov", title: "Earn your name", hint: "Score 400 points in Strongest Governor.", goal: 400, reward: { gems: 20 } },
  { id: "wall", title: "Hold the wall", hint: "Clear wave 3 of Rebel Invasion.", goal: 3, reward: { stone: 700, iron: 300 } },
  { id: "glaive", title: "Walk the watch", hint: "Claim a Golden Glaives mission.", goal: 1, reward: { glaive: 8, gems: 12 } },
  { id: "kop", title: "Answer the horns", hint: "Enter Kingdom of Power.", goal: 1, reward: { gems: 25, speedup: 10 } },
  { id: "castle", title: "March on the castle", hint: "Garrison the Crown Castle.", goal: 1, reward: { aurum: 1, gems: 40 } },
];

export const NPC_GOVERNORS = [
  { name: "Mara Quen", pace: 700 },
  { name: "Torin Ash", pace: 980 },
  { name: "Lira Voss", pace: 1240 },
  { name: "Edda Kline", pace: 1560 },
  { name: "Soren Pike", pace: 1900 },
  { name: "Nessa Holt", pace: 2400 },
];

export const ALLIANCE = {
  name: "The Ashen Banner",
  tag: "ASH",
  motto: "Hold the wall. Share the hunt.",
  members: [
    { name: "Hale Voss", rank: "R5", power: 48200, role: "Leader" },
    { name: "Ione Pell", rank: "R4", power: 36100, role: "Officer" },
    { name: "Rufus Kane", rank: "R4", power: 33840, role: "Officer" },
    { name: "Sable Quinn", rank: "R3", power: 22110, role: "Member" },
    { name: "Tarin Moss", rank: "R3", power: 19840, role: "Member" },
    { name: "Willa Crowe", rank: "R2", power: 14220, role: "Member" },
    { name: "Jory Fen", rank: "R2", power: 13100, role: "Member" },
    { name: "Nedda Vale", rank: "R1", power: 8640, role: "Member" },
    { name: "Cassio Wren", rank: "R1", power: 7920, role: "Member" },
    { name: "Bram Low", rank: "R1", power: 6400, role: "Member" },
    { name: "Helia Moss", rank: "R2", power: 11880, role: "Member" },
    { name: "Quill Arden", rank: "R3", power: 17650, role: "Member" },
  ],
};

export const EVENTS = [
  { id: "daily", name: "Daily Missions", season: 1, status: "live", blurb: "A fresh order list every day. Clear it for gems, gold, and speedups." },
  { id: "governor", name: "Strongest Governor", season: 1, status: "live", blurb: "Seven themed stages. Only today's tasks score. Four milestones a stage, plus a ranking." },
  { id: "rebels", name: "Rebel Invasion", season: 1, status: "live", blurb: "Waves hit your wall. Clear as many as your troops and heroes can hold." },
  { id: "bear", name: "Bear Hunt", season: 1, status: "live", blurb: "Alliance damage race. The bear never strikes back. Archers score the most." },
  { id: "glaives", name: "Golden Glaives", season: 1, status: "live", blurb: "Send watchtower missions. Spend tokens on speedups, shards, and aurum." },
  { id: "kop", name: "Kingdom of Power", season: 1, status: "live", blurb: "Preparation, a three-lane clash, then triage for the wounded." },
  { id: "castle", name: "Castle Battle", season: 1, status: "live", blurb: "Hold the Crown Castle. A long continuous hold wins it outright." },
  { id: "swordland", name: "Swordland Showdown", season: 2, status: "soon", blurb: "Relic marches and loot points. Coming in the next season." },
  { id: "blizzard", name: "Blizzard Brawl", season: 2, status: "soon", blurb: "A live brawl between governors. Coming in the next season." },
  { id: "fishing", name: "Fishing Tournament", season: 2, status: "soon", blurb: "A collection tournament. Coming in the next season." },
  { id: "brawl", name: "Alliance Brawl", season: 2, status: "soon", blurb: "Alliance versus alliance. Coming in the next season." },
  { id: "elites", name: "Duel of the Elites", season: 2, status: "soon", blurb: "The top hosts clash for preparation points. Coming in the next season." },
];

export const RESOURCE_KEYS = ["grain", "timber", "stone", "iron", "gold", "gems"];

export const RESOURCE_LABEL = {
  grain: "Grain",
  timber: "Wood",
  stone: "Stone",
  iron: "Iron",
  gold: "Gold",
  gems: "Gems",
};

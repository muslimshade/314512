// Isometric town. Plots sit on a grid inside a wall, and each one opens that building.
import { BUILDINGS } from "./data.js";
import { buildingGate } from "./game.js";

const TW = 56;
const TH = 28;
const OX = 430;
const OY = 250;

const PLOTS = [
  { id: "watchtower", c: 0.15, r: 0.15, w: 1, h: 1 },
  { id: "academy", c: 1, r: 1, w: 1, h: 1 },
  { id: "hall", c: 5, r: 1, w: 2, h: 1 },
  { id: "keep", c: 3, r: 2, w: 2, h: 2 },
  { id: "farm", c: 1, r: 4, w: 2, h: 1 },
  { id: "quarry", c: 3.15, r: 4.15, w: 1, h: 1 },
  { id: "mill", c: 5, r: 4, w: 2, h: 1 },
  { id: "barracks", c: 1, r: 5, w: 1, h: 2 },
  { id: "mine", c: 4, r: 5.15, w: 1, h: 1 },
  { id: "range", c: 6, r: 5, w: 1, h: 2 },
  { id: "infirmary", c: 1, r: 6.15, w: 1, h: 1 },
  { id: "stables", c: 1, r: 7.05, w: 2, h: 1 },
  { id: "storehouse", c: 5, r: 6.15, w: 1, h: 1 },
  { id: "pitfall", c: 6.15, r: 6.15, w: 1, h: 1 },
  { id: "wall", c: 3, r: 7.2, w: 2, h: 1 },
];

export function renderCity(state, ui, now, chapterHtml = "") {
  const cam = ui.cam || { x: 36, y: 48, scale: 1.62 };
  const plots = PLOTS
    .map((plot) => drawPlot(state, ui, plot, now))
    .sort((a, b) => a.z - b.z)
    .map((plot) => plot.html)
    .join("");
  return `<section class="city">
    <div class="city-viewport">
      <div class="city-world" style="transform: translate(calc(-50% + ${cam.x}px), calc(-50% + ${cam.y}px)) scale(${cam.scale})">
        ${groundSvg(state)}
        ${treeLayer()}
        ${wallLayer(state, "back")}
        ${plots}
        ${wallLayer(state, "front")}
        ${villagers(state)}
      </div>
    </div>
    <div class="city-hud">${chapterHtml}${hud(state, now)}</div>
    <div class="city-zoom">
      <button type="button" data-act="zoom" data-dir="in" aria-label="Zoom in">+</button>
      <button type="button" data-act="zoom" data-dir="out" aria-label="Zoom out">−</button>
      <button type="button" data-act="zoom" data-dir="home" aria-label="Center the city">⌂</button>
    </div>
  </section>`;
}

function hud(state, now) {
  const banners = [];
  if (state.bear.endsAt > now) banners.push(`<button class="pill" data-act="event-open" data-event="bear">Bear Hunt is live</button>`);
  if (state.castle.active) banners.push(`<button class="pill" data-act="event-open" data-event="castle">Castle Battle is live</button>`);
  if (["prep", "battle", "triage"].includes(state.kop.phase)) {
    banners.push(`<button class="pill" data-act="event-open" data-event="kop">Kingdom of Power</button>`);
  }
  return banners.join("");
}

function groundSvg(state) {
  const tiles = [];
  for (let r = -1; r <= 9; r += 1) {
    for (let c = -1; c <= 9; c += 1) {
      const outside = c < 0 || r < 0 || c > 8 || r > 8;
      const road = !outside && (c === 3 || c === 4) && r >= 4 && r <= 8;
      const plaza = c >= 3 && c <= 4 && r >= 2 && r <= 3;
      let fill = ((c + r) % 2 === 0) ? "#7dbe55" : "#74b44e";
      if (outside) fill = "#5f9a3e";
      else if (road) fill = "#e2c79a";
      else if (plaza) fill = "#d9c7a4";
      tiles.push(`<path d="${diamond(c, r, 1, 1)}" fill="${fill}"/>`);
    }
  }
  if (state.buildings.keep.level >= 3) {
    const [x, y] = at(6.6, 2.4);
    tiles.push(`<ellipse cx="${x}" cy="${y}" rx="16" ry="7" fill="#6eafc4"/>`);
    tiles.push(`<ellipse cx="${x - 4}" cy="${y - 2}" rx="6" ry="3" fill="#bfe3ef" opacity="0.7"/>`);
  }
  return `<svg class="city-ground" viewBox="0 0 860 740" width="860" height="740">${tiles.join("")}</svg>`;
}

function treeLayer() {
  const spots = [[-0.7, 2.4], [-0.5, 5.2], [8.7, 1.6], [8.8, 4.4], [8.6, 7.2], [2.4, -0.7], [6.2, -0.6], [-0.4, 8.6], [3.5, 9.1]];
  return spots.map(([c, r], i) => {
    const [x, y] = at(c, r);
    const h = 36 + (i % 3) * 6;
    return `<div class="tree" style="left:${x}px;top:${y - h}px;z-index:1">${treeSvg(h, i)}</div>`;
  }).join("");
}

function treeSvg(h, i) {
  const leaf = i % 2 ? "#2f7a42" : "#3d9454";
  return `<svg width="36" height="${h}" style="width:36px;height:${h}px" viewBox="0 0 36 ${h}">
    <ellipse cx="18" cy="${h - 3}" rx="10" ry="3" fill="rgba(30,60,20,.28)"/>
    <rect x="16" y="${h - 14}" width="4" height="12" fill="#6b4528"/>
    <polygon points="18,2 32,${h - 12} 4,${h - 12}" fill="${leaf}"/>
    <polygon points="18,12 27,${h - 14} 9,${h - 14}" fill="#9ed67a"/>
  </svg>`;
}

function wallLayer(state, side) {
  const level = state.buildings.wall.level;
  const h = 22 + Math.min(level, 6) * 4;
  const stone = level > 0;
  const face = stone ? "#d5cec2" : "#c9a56a";
  const shade = stone ? "#9a9286" : "#8d6a3c";
  const lip = stone ? "#f3eee4" : "#e6c98a";
  const segments = [];
  for (let i = 0; i < 8; i += 1) {
    const north = [i, 0, i + 1, 0];
    const south = [i, 8, i + 1, 8];
    const west = [0, i, 0, i + 1];
    const east = [8, i, 8, i + 1];
    if (side === "back") {
      segments.push(north, west);
    } else if (!(i === 3 || i === 4)) {
      segments.push(south);
      segments.push(east);
    } else {
      segments.push(east);
    }
  }
  const parts = segments.map(([c, r, c2, r2]) => fence(c, r, c2, r2, h, face, shade, lip, stone && level >= 2));
  const z = side === "back" ? 2 : 80;
  return `<svg class="city-walls" style="z-index:${z}" viewBox="0 0 860 740" width="860" height="740">${parts.join("")}</svg>`;
}

function fence(c, r, c2, r2, h, face, shade, lip, merlons) {
  const a = at(c, r);
  const b = at(c2, r2);
  const a2 = [a[0], a[1] - h];
  const b2 = [b[0], b[1] - h];
  const lift = 5;
  const a3 = [a2[0], a2[1] - lift];
  const b3 = [b2[0], b2[1] - lift];
  let extra = "";
  if (merlons) {
    for (const t of [0.2, 0.55]) {
      const p = mix(a2, b2, t);
      const q = mix(a2, b2, t + 0.16);
      extra += `<polygon points="${pt(p)} ${pt(q)} ${pt([q[0], q[1] - 6])} ${pt([p[0], p[1] - 6])}" fill="${lip}"/>`;
    }
  }
  return `<polygon points="${pt(a)} ${pt(b)} ${pt(b2)} ${pt(a2)}" fill="${c2 > c ? face : shade}"/>
    <polygon points="${pt(a2)} ${pt(b2)} ${pt(b3)} ${pt(a3)}" fill="${lip}"/>${extra}`;
}

function drawPlot(state, ui, plot, now) {
  const def = BUILDINGS[plot.id];
  const level = state.buildings[plot.id].level;
  const gate = buildingGate(state, plot.id);
  const busy = state.build?.id === plot.id;
  const selected = ui.sheet?.type === "building" && ui.sheet.id === plot.id;
  const locked = level === 0;
  const z = plot.c + plot.r + plot.w + plot.h;
  if (locked) {
    const [x, y] = at(plot.c + plot.w / 2, plot.r + plot.h / 2);
    const html = `<button type="button" class="plot locked${selected ? " selected" : ""}" style="left:${x - 16}px;top:${y - 28}px;z-index:${z}" data-act="open-building" data-id="${plot.id}" aria-label="${def.name}, ${gate.ok ? "ready to build" : "locked"}">${stakeSvg()}</button>`;
    return { z, html };
  }
  const colors = palette(plot.id, false);
  const height = heightFor(plot, level);
  const drawn = structure({
    w: plot.w,
    d: plot.h,
    height,
    ...colors,
    keep: plot.id === "keep" && !locked,
    door: !locked && !["farm", "quarry", "pitfall", "mine"].includes(plot.id),
    crops: plot.id === "farm" && !locked,
    wheel: plot.id === "mill" && !locked,
    dome: plot.id === "academy" && !locked,
    cross: plot.id === "infirmary" && !locked,
    target: plot.id === "range" && !locked,
    hole: plot.id === "mine" && !locked,
    pit: plot.id === "pitfall" && !locked,
    rocks: plot.id === "quarry" && !locked,
    crates: plot.id === "storehouse" && !locked,
    horses: plot.id === "stables" && !locked,
    gate: plot.id === "wall" && !locked,
    stake: locked,
    banner: state.banner,
    level,
  });
  const [x, y] = at(plot.c, plot.r);
  const [sx, sy] = at(plot.c + plot.w * 0.5, plot.r + plot.h * 0.15);
  const timer = busy
    ? `<span class="plot-tag" style="left:${sx}px;top:${sy - height - 18}px;z-index:90"><span data-k="build-time">${fmtTime(state.build.endsAt - now)}</span></span>`
    : "";
  const html = `<button type="button" class="plot${busy ? " busy" : ""}${selected ? " selected" : ""}" style="left:${x - drawn.padX}px;top:${y - drawn.padY}px;z-index:${z}" data-act="open-building" data-id="${plot.id}" aria-label="${def.name}, level ${level}">
    ${drawn.svg}
  </button>${timer}`;
  return { z, html };
}

function stakeSvg() {
  return `<svg width="32" height="32" style="width:32px;height:32px" viewBox="0 0 32 32" aria-hidden="true">
    <path d="M10 28 V12" stroke="#6b4a2a" stroke-width="2"/>
    <rect x="11" y="10" width="16" height="9" rx="1" fill="#f4e7cb" stroke="#6b4a2a"/>
  </svg>`;
}

function heightFor(plot, level) {
  const base = {
    keep: 46, watchtower: 70, barracks: 34, range: 30, stables: 28,
    hall: 32, academy: 36, mill: 26, mine: 18, farm: 8, quarry: 8,
    pitfall: 6, infirmary: 26, storehouse: 24, wall: 32,
  }[plot.id] || 26;
  return base + Math.max(0, level - 1) * (plot.id === "keep" || plot.id === "watchtower" ? 6 : 3);
}

function palette(id, locked) {
  if (locked) return { top: "#cbb892", left: "#8d7048", right: "#b08858", roof: "#cbb892" };
  const map = {
    keep: ["#f3e6c8", "#b7a27c", "#d9c49a", "#c4473a"],
    farm: ["#6eae45", "#4d7a32", "#87c45e", "#6eae45"],
    mill: ["#e2b56e", "#8a5a30", "#c48a48", "#a86832"],
    quarry: ["#c2bbb0", "#7a756c", "#a9a39a", "#b0a89c"],
    mine: ["#6a6258", "#3c3832", "#524c44", "#2c2824"],
    barracks: ["#f0d7b0", "#a86840", "#d7a878", "#a33b32"],
    range: ["#e7f0c0", "#6d8a40", "#c5d492", "#d0e0a4"],
    stables: ["#e8c488", "#7a5230", "#c99658", "#8d4a28"],
    hall: ["#f0dff8", "#7a6888", "#d4bce0", "#7a4a96"],
    academy: ["#e4eef8", "#607890", "#c5d6ea", "#3d6ea5"],
    watchtower: ["#f4ecdc", "#9a9080", "#ddd0b8", "#c4473a"],
    pitfall: ["#6b5340", "#3d2c22", "#564232", "#2a1e18"],
    infirmary: ["#f7faf6", "#8aa898", "#d5e4da", "#f4faf6"],
    storehouse: ["#f0d7a4", "#8a7044", "#d4b27a", "#b8873e"],
    wall: ["#f4ecde", "#9a9080", "#ddd0ba", "#c4473a"],
  };
  const [top, left, right, roof] = map[id] || map.keep;
  return { top, left, right, roof };
}

function structure(opts) {
  const { w, d, height, top, left, right, roof } = opts;
  const padX = d * TW / 2 + 8;
  const padY = height + (opts.keep ? 78 : 28);
  const parts = [];
  prism(parts, 0, 0, w, d, height, { top, left, right, roof: opts.stake ? top : roof }, padX, padY);
  if (opts.keep) {
    const tw = 0.34;
    const turret = height + 16;
    prism(parts, 0, 0, tw, tw, turret, { top, left, right, roof }, padX, padY);
    prism(parts, w - tw, 0, tw, tw, turret, { top, left, right, roof }, padX, padY);
    prism(parts, 0, d - tw, tw, tw, turret, { top, left, right, roof }, padX, padY);
    prism(parts, w - tw, d - tw, tw, tw, turret, { top, left, right, roof }, padX, padY);
    const towerH = height + 28;
    prism(parts, w * 0.32, d * 0.28, w * 0.36, d * 0.36, towerH, { top: "#f7f0dc", left, right, roof: "#a33b32" }, padX, padY);
    const pole = shift(local(w * 0.42, d * 0.36), padX, padY);
    const cloth = opts.banner === "royal" ? "#b7a6ef" : "#e25b32";
    parts.push(`<line x1="${pole[0]}" y1="${pole[1] - towerH}" x2="${pole[0]}" y2="${pole[1] - towerH - 22}" stroke="#5c4630" stroke-width="2"/>`);
    parts.push(`<polygon points="${pole[0]},${pole[1] - towerH - 20} ${pole[0] + 14},${pole[1] - towerH - 14} ${pole[0]},${pole[1] - towerH - 8}" fill="${cloth}"/>`);
    for (let i = 0; i < 3; i += 1) {
      const p = shift(local(w * (0.42 + i * 0.16), d * 0.82), padX, padY);
      parts.push(`<rect x="${p[0] - 3}" y="${p[1] - height * 0.62}" width="7" height="9" rx="1" fill="#f6e2a4"/>`);
    }
  }
  if (opts.level) {
    const mark = shift(local(w * 0.58, d * 0.38), padX, padY);
    const my = mark[1] - (opts.keep ? height + 30 : height) - 2;
    parts.push(`<circle cx="${mark[0]}" cy="${my}" r="7" fill="rgba(24,18,12,.88)"/>`);
    parts.push(`<text x="${mark[0]}" y="${my + 3.2}" text-anchor="middle" font-size="9" font-family="Georgia, serif" fill="#f6efe4">${opts.level}</text>`);
  }
  if (opts.door && !opts.gate) {
    const a = shift(local(0.08, d * 0.42), padX, padY);
    const b = shift(local(0.08, d * 0.68), padX, padY);
    const doorH = Math.min(16, height * 0.42);
    parts.push(`<polygon points="${a[0]},${a[1]} ${b[0]},${b[1]} ${b[0]},${b[1] - doorH} ${a[0]},${a[1] - doorH}" fill="#3a2a22"/>`);
  }
  if (opts.gate) {
    const a = shift(local(w * 0.35, d * 0.15), padX, padY);
    const b = shift(local(w * 0.65, d * 0.15), padX, padY);
    parts.push(`<polygon points="${a[0]},${a[1]} ${b[0]},${b[1]} ${b[0]},${b[1] - height * 0.55} ${a[0]},${a[1] - height * 0.55}" fill="#2a211c"/>`);
  }
  if (opts.crops) detailCrops(parts, w, d, height, padX, padY);
  if (opts.wheel) {
    const c = shift(local(w * 0.82, d * 0.72), padX, padY);
    parts.push(`<circle cx="${c[0]}" cy="${c[1] - 10}" r="9" fill="#f0d8a8" stroke="#5c3a22" stroke-width="2"/>`);
    parts.push(`<path d="M${c[0]} ${c[1] - 18} v16 M${c[0] - 8} ${c[1] - 10} h16" stroke="#5c3a22" stroke-width="1.4"/>`);
  }
  if (opts.dome) {
    const c = shift(local(w * 0.5, d * 0.45), padX, padY);
    parts.push(`<ellipse cx="${c[0]}" cy="${c[1] - height - 6}" rx="14" ry="8" fill="#6f9ec8"/>`);
    parts.push(`<ellipse cx="${c[0]}" cy="${c[1] - height - 8}" rx="6" ry="4" fill="#d5e8f6"/>`);
  }
  if (opts.cross) {
    const c = shift(local(w * 0.55, d * 0.4), padX, padY);
    parts.push(`<path d="M${c[0]} ${c[1] - height - 4} v14 M${c[0] - 6} ${c[1] - height + 2} h12" stroke="#d23b3b" stroke-width="2.4" fill="none"/>`);
  }
  if (opts.target) {
    const c = shift(local(w * 0.72, d * 0.28), padX, padY);
    parts.push(`<circle cx="${c[0]}" cy="${c[1] - height + 4}" r="8" fill="#f7f3ea" stroke="#c4473a" stroke-width="2"/>`);
    parts.push(`<circle cx="${c[0]}" cy="${c[1] - height + 4}" r="3" fill="#c4473a"/>`);
  }
  if (opts.hole) {
    const c = shift(local(w * 0.55, d * 0.5), padX, padY);
    parts.push(`<ellipse cx="${c[0]}" cy="${c[1] - 2}" rx="10" ry="5" fill="#1c1916"/>`);
  }
  if (opts.pit) {
    const c = shift(local(w * 0.5, d * 0.55), padX, padY);
    parts.push(`<ellipse cx="${c[0]}" cy="${c[1]}" rx="16" ry="7" fill="#241812"/>`);
    parts.push(`<path d="M${c[0] - 10} ${c[1]} l4 -12 l4 12 l4 -12 l4 12" stroke="#e6e0d6" stroke-width="1.5" fill="none"/>`);
  }
  if (opts.rocks) {
    const c = shift(local(w * 0.48, d * 0.48), padX, padY);
    parts.push(`<ellipse cx="${c[0] - 6}" cy="${c[1]}" rx="8" ry="4" fill="#9a958c"/>`);
    parts.push(`<ellipse cx="${c[0] + 7}" cy="${c[1] + 2}" rx="6" ry="3" fill="#6e6a64"/>`);
  }
  if (opts.crates) {
    const c = shift(local(w * 0.45, d * 0.4), padX, padY);
    parts.push(`<rect x="${c[0] - 8}" y="${c[1] - height + 2}" width="10" height="8" fill="#a86b32"/>`);
    parts.push(`<rect x="${c[0] + 3}" y="${c[1] - height + 4}" width="8" height="7" fill="#8a5528"/>`);
  }
  if (opts.horses) {
    const c = shift(local(w * 0.35, d * 0.45), padX, padY);
    parts.push(`<ellipse cx="${c[0]}" cy="${c[1] - 6}" rx="7" ry="4" fill="#f4efe4"/>`);
    parts.push(`<ellipse cx="${c[0] + 12}" cy="${c[1] - 4}" rx="6" ry="3.5" fill="#d8c4a0"/>`);
  }
  if (opts.stake) {
    const c = shift(local(w * 0.5, d * 0.45), padX, padY);
    parts.push(`<path d="M${c[0]} ${c[1] - 16} v14" stroke="#6b4a2a" stroke-width="2"/>`);
    parts.push(`<rect x="${c[0] + 1}" y="${c[1] - 15}" width="12" height="7" rx="1" fill="#f4e7cb" stroke="#6b4a2a"/>`);
  }
  const width = padX + w * TW / 2 + 20;
  const depth = padY + (w + d) * TH / 2 + 8;
  const svg = `<svg width="${width}" height="${depth}" style="width:${width}px;height:${depth}px" viewBox="0 0 ${width} ${depth}" aria-hidden="true">${parts.join("")}</svg>`;
  return { svg, padX, padY, width, depth };
}

function detailCrops(parts, w, d, height, padX, padY) {
  for (let i = 1; i <= 4; i += 1) {
    const a = shift(local(w * 0.12, d * (i / 5)), padX, padY);
    const b = shift(local(w * 0.88, d * (i / 5)), padX, padY);
    parts.push(`<line x1="${a[0]}" y1="${a[1] - height - 1}" x2="${b[0]}" y2="${b[1] - height - 1}" stroke="#3e7a2e" stroke-width="2"/>`);
  }
}

function prism(parts, c, r, w, d, height, colors, padX, padY) {
  const N = shift(local(c, r), padX, padY);
  const E = shift(local(c + w, r), padX, padY);
  const S = shift(local(c + w, r + d), padX, padY);
  const W = shift(local(c, r + d), padX, padY);
  const up = (p) => [p[0], p[1] - height];
  parts.push(`<polygon points="${poly([W, S, up(S), up(W)])}" fill="${colors.left}"/>`);
  parts.push(`<polygon points="${poly([S, E, up(E), up(S)])}" fill="${colors.right}"/>`);
  parts.push(`<polygon points="${poly([up(N), up(E), up(S), up(W)])}" fill="${colors.roof}"/>`);
}

function local(c, r) {
  return [(c - r) * TW / 2, (c + r) * TH / 2];
}

function shift(p, padX, padY) {
  return [round(p[0] + padX), round(p[1] + padY)];
}

function poly(pts) {
  return pts.map((p) => p.join(",")).join(" ");
}

function villagers(state) {
  const count = Math.min(5, Math.floor((state.troops.shield + state.troops.rider + state.troops.marksman) / 20));
  const spots = [[3.15, 6.35], [3.55, 6.7], [4.4, 6.4], [2.3, 2.55], [6.4, 4.6]];
  return spots.slice(0, count).map(([c, r], i) => {
    const [x, y] = at(c, r);
    return `<span class="villager" style="left:${x}px;top:${y}px;z-index:${Math.round(c + r) + 4}"><i class="${i % 2 ? "blue" : ""}"></i></span>`;
  }).join("");
}

function diamond(c, r, w, d) {
  const N = at(c, r);
  const E = at(c + w, r);
  const S = at(c + w, r + d);
  const W = at(c, r + d);
  return `M${N[0]} ${N[1]} L${E[0]} ${E[1]} L${S[0]} ${S[1]} L${W[0]} ${W[1]}Z`;
}

function at(c, r) {
  return [OX + (c - r) * TW / 2, OY + (c + r) * TH / 2];
}

function mix(a, b, t) {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
}

function pt(p) {
  return `${round(p[0])},${round(p[1])}`;
}

function round(n) {
  return Math.round(n * 10) / 10;
}

function fmtTime(ms) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(s / 60);
  if (m > 0) return `${m}m ${String(s % 60).padStart(2, "0")}s`;
  return `${s}s`;
}

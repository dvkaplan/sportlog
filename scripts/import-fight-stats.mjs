import { writeFileSync, readFileSync } from "fs";

const slugify = (n) =>
  (n ?? "")
    .toLowerCase()
    .replace(/ł/g, "l").replace(/ø/g, "o").replace(/đ/g, "d")
    .replace(/æ/g, "ae").replace(/ß/g, "ss").replace(/þ/g, "th")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const ymd = (d) => { const t = Date.parse(d); return isNaN(t) ? null : new Date(t).toISOString().slice(0, 10); };
const REPO = "Greco1899/scrape_ufc_stats";
let BRANCH = null;
async function resolveBranch() {
  if (BRANCH) return BRANCH;
  try {
    const r = await fetch(`https://api.github.com/repos/${REPO}`, { headers: { "User-Agent": "SPORTLOG/1.0" } });
    if (r.ok) BRANCH = (await r.json()).default_branch;
  } catch {}
  return BRANCH;
}
function parseCSV(text) {
  const rows = []; let row = [], cell = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += c; }
    else if (c === '"') q = true;
    else if (c === ",") { row.push(cell); cell = ""; }
    else if (c === "\n") { row.push(cell.replace(/\r$/, "")); rows.push(row); row = []; cell = ""; }
    else cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows;
}
async function getCSV(name) {
  const candidates = [await resolveBranch(), "main", "master"].filter(Boolean);
  for (const br of candidates) {
    const url = `https://raw.githubusercontent.com/${REPO}/${br}/${name}`;
    console.log(`Downloading ${name} (${br})…`);
    const res = await fetch(url);
    if (!res.ok) continue;
    const rows = parseCSV(await res.text());
    const head = rows[0].map((h) => h.trim().toUpperCase());
    const col = (frag) => head.findIndex((h) => h.includes(frag));
    return { rows: rows.slice(1), col };
  }
  throw new Error(`${name}: not found on branches ${candidates.join(", ")}`);
}
const ofPair = (s) => { const m = (s ?? "").match(/(\d+)\s*of\s*(\d+)/); return m ? [+m[1], +m[2]] : [0, 0]; };
const ctrlSecs = (s) => { const m = (s ?? "").match(/(\d+):(\d+)/); return m ? +m[1] * 60 + +m[2] : 0; };
const fmtCtrl = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

// 1) events -> date
const ev = await getCSV("ufc_event_details.csv");
const evDate = {};
for (const r of ev.rows) evDate[(r[ev.col("EVENT")] ?? "").trim()] = ymd(r[ev.col("DATE")]);

// 2) results -> bout meta
const rs = await getCSV("ufc_fight_results.csv");
const meta = {}; // key: pair|ymd
const evCount = {};
const keyOf = (a, b, d) => `${[slugify(a), slugify(b)].sort().join("|")}|${d ?? "nd"}`;
for (const r of rs.rows) {
  const bout = (r[rs.col("BOUT")] ?? "").split(/\s+vs\.?\s+/i);
  if (bout.length !== 2) continue;
  const event = (r[rs.col("EVENT")] ?? "").trim();
  const k = keyOf(bout[0], bout[1], evDate[event]);
  const ord = (evCount[event] = (evCount[event] ?? 0) + 1);
  meta[k] = {
    event, date: evDate[event],
    order: ord,
    a: bout[0].trim(), b: bout[1].trim(),
    weightclass: r[rs.col("WEIGHTCLASS")] ?? "",
    method: r[rs.col("METHOD")] ?? "",
    round: r[rs.col("ROUND")] ?? "",
    time: r[rs.col("TIME")] ?? "",
    format: r[rs.col("FORMAT")] ?? "",
    referee: r[rs.col("REFEREE")] ?? "",
    outcome: (r[rs.col("OUTCOME")] ?? "").trim(),
    details: r[rs.col("DETAILS")] ?? "",
  };
}

// 3) per-round stats -> totals per fighter per bout
const st = await getCSV("ufc_fight_stats.csv");
const totals = {}; // key -> { fighterName -> agg }
for (const r of st.rows) {
  const bout = (r[st.col("BOUT")] ?? "").split(/\s+vs\.?\s+/i);
  if (bout.length !== 2) continue;
  const event = (r[st.col("EVENT")] ?? "").trim();
  const k = keyOf(bout[0], bout[1], evDate[event]);
  const f = (r[st.col("FIGHTER")] ?? "").trim();
  totals[k] ??= {};
  const t = (totals[k][f] ??= { kd: 0, ss: [0, 0], ts: [0, 0], td: [0, 0], sub: 0, ctrl: 0, head: [0, 0], body: [0, 0], leg: [0, 0], dist: [0, 0], clinch: [0, 0], ground: [0, 0] });
  const add = (key, v) => { const [x, y] = ofPair(v); t[key][0] += x; t[key][1] += y; };
  t.kd += +(r[st.col("KD")] ?? 0) || 0;
  add("ss", r[st.col("SIG.STR.")]); add("ts", r[st.col("TOTAL STR.")]); add("td", r[st.col("TD")]);
  t.sub += +(r[st.col("SUB.ATT")] ?? 0) || 0;
  t.ctrl += ctrlSecs(r[st.col("CTRL")]);
  add("head", r[st.col("HEAD")]); add("body", r[st.col("BODY")]); add("leg", r[st.col("LEG")]);
  add("dist", r[st.col("DISTANCE")]); add("clinch", r[st.col("CLINCH")]); add("ground", r[st.col("GROUND")]);
}

// 4) join to OUR fight ids
const games = JSON.parse(readFileSync("src/lib/fight-games.json", "utf8"));
const byPair = {};
for (const k of Object.keys(meta)) { const p = k.split("|").slice(0, 2).join("|"); (byPair[p] ??= []).push(k); }
const out = {};
let matched = 0;
const usedKeys = new Set();
const existingIds = new Set(games.map((g) => g.id));
for (const g of games) {
  const [na, nb] = g.title.split(" vs ").map((s) => s.trim());
  if (!na || !nb) continue;
  const pair = [slugify(na), slugify(nb)].sort().join("|");
  const gd = ymd(g.date);
  let k = gd ? `${pair}|${gd}` : null;
  if (!k || !meta[k]) {
    const cands = byPair[pair] ?? [];
    if (cands.length === 1) k = cands[0];
    else if (gd && cands.length > 1) {
      k = cands.find((c) => { const cd = c.split("|")[2]; return cd !== "nd" && Math.abs(Date.parse(cd) - Date.parse(gd)) < 6 * 86400000; }) ?? null;
    } else k = null;
  }
  if (!k || !meta[k]) continue;
  const m = meta[k];
  usedKeys.add(k);
  const stat = totals[k] ?? {};
  const pack = (name) => {
    const t = stat[name] ?? stat[Object.keys(stat).find((x) => slugify(x) === slugify(name)) ?? ""] ?? null;
    return t ? { kd: t.kd, sig: `${t.ss[0]} of ${t.ss[1]}`, sigPct: t.ss[1] ? Math.round((t.ss[0] / t.ss[1]) * 100) : 0, total: `${t.ts[0]} of ${t.ts[1]}`, td: `${t.td[0]} of ${t.td[1]}`, sub: t.sub, ctrl: fmtCtrl(t.ctrl), head: `${t.head[0]} of ${t.head[1]}`, body: `${t.body[0]} of ${t.body[1]}`, leg: `${t.leg[0]} of ${t.leg[1]}`, dist: `${t.dist[0]} of ${t.dist[1]}`, clinch: `${t.clinch[0]} of ${t.clinch[1]}`, ground: `${t.ground[0]} of ${t.ground[1]}` } : null;
  };
  out[g.id] = { event: m.event, weightclass: m.weightclass, method: m.method, round: m.round, time: m.time, format: m.format, referee: m.referee, order: m.order, details: m.details, fighters: [{ name: m.a, ...(pack(m.a) ? { stats: pack(m.a) } : {}) }, { name: m.b, ...(pack(m.b) ? { stats: pack(m.b) } : {}) }] };
  matched++;
}
// Generate fight pages for bouts we didn't have (completes every UFC card)
let created = 0;
for (const [k, m] of Object.entries(meta)) {
  if (usedKeys.has(k)) continue;
  const id = `fight-${[slugify(m.a), slugify(m.b)].sort().join("-vs-")}-${m.date ?? "nd"}`;
  if (existingIds.has(id)) continue;
  existingIds.add(id);
  const winner = m.outcome?.startsWith("W") ? m.a : m.outcome?.startsWith("L") ? m.b : null;
  games.push({
    id, sportSlug: "mma", league: "MMA",
    title: `${m.a} vs ${m.b}`, date: m.date ?? "",
    score: winner ? `${winner} — ${m.method || "W"}` : m.method || "",
    blurb: m.event,
  });
  const stat = totals[k] ?? {};
  const pack = (name) => {
    const t = stat[name] ?? stat[Object.keys(stat).find((x) => slugify(x) === slugify(name)) ?? ""] ?? null;
    return t ? { kd: t.kd, sig: `${t.ss[0]} of ${t.ss[1]}`, sigPct: t.ss[1] ? Math.round((t.ss[0] / t.ss[1]) * 100) : 0, total: `${t.ts[0]} of ${t.ts[1]}`, td: `${t.td[0]} of ${t.td[1]}`, sub: t.sub, ctrl: fmtCtrl(t.ctrl), head: `${t.head[0]} of ${t.head[1]}`, body: `${t.body[0]} of ${t.body[1]}`, leg: `${t.leg[0]} of ${t.leg[1]}`, dist: `${t.dist[0]} of ${t.dist[1]}`, clinch: `${t.clinch[0]} of ${t.clinch[1]}`, ground: `${t.ground[0]} of ${t.ground[1]}` } : null;
  };
  out[id] = { event: m.event, weightclass: m.weightclass, method: m.method, round: m.round, time: m.time, format: m.format, referee: m.referee, order: m.order, details: m.details, fighters: [{ name: m.a, ...(pack(m.a) ? { stats: pack(m.a) } : {}) }, { name: m.b, ...(pack(m.b) ? { stats: pack(m.b) } : {}) }] };
  created++;
}
writeFileSync("src/lib/fight-games.json", JSON.stringify(games));
console.log(`Created ${created} new fight pages to complete UFC cards.`);
writeFileSync("src/lib/fight-stats.json", JSON.stringify(out));
console.log(`\nMatched stats for ${matched} of ${games.length} fight pages → src/lib/fight-stats.json`);
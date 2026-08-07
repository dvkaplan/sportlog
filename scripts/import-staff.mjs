import { writeFileSync, readFileSync } from "fs";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const WIKI_OVERRIDES = {
  "Arsenal": "Arsenal F.C.", "Chelsea": "Chelsea F.C.", "Liverpool": "Liverpool F.C.",
  "Barcelona": "FC Barcelona", "Real Madrid": "Real Madrid CF", "Bayern Munich": "FC Bayern Munich",
  "Paris Saint-Germain": "Paris Saint-Germain F.C.", "Inter Milan": "Inter Milan", "Juventus": "Juventus FC",
  "Manchester United": "Manchester United F.C.", "Manchester City": "Manchester City F.C.",
  "Tottenham Hotspur": "Tottenham Hotspur F.C.", "Everton": "Everton F.C.", "Fulham": "Fulham F.C.",
};

const teams = JSON.parse(readFileSync("src/lib/teams.json", "utf8"));
let staff = {};
try { staff = JSON.parse(readFileSync("src/lib/team-staff.json", "utf8")); } catch {}
let coachMedia = {};
try { coachMedia = JSON.parse(readFileSync("src/lib/coach-media.json", "utf8")); } catch {}

const personSlug = (n) =>
  (n ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const clean = (s) =>
  (s ?? "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<br\s*\/?>/gi, "|")
    .replace(/<\/li>/gi, "|")
    .replace(/<[^>]+>/g, " ")
    .replace(/&#91;/g, "[").replace(/&#93;/g, "]")
    .replace(/&amp;/g, "&").replace(/&nbsp;/g, " ")
    .replace(/\[[^\]]{0,25}\]/g, "")
    .replace(/\s*\|\s*/g, "|")
    .replace(/\s+/g, " ")
    .replace(/\s*\(\s*/g, " (").replace(/\s*\)\s*/g, ") ")
    .trim();

const infobox = (html, label) => {
  const re = new RegExp(`<th[^>]*>\\s*${label}[\\s\\S]{0,40}?</th>\\s*<td[^>]*>([\\s\\S]*?)</td>`, "i");
  const m = html.match(re);
  if (!m) return [];
  return clean(m[1])
    .split("|")
    .map((x) => x.trim().replace(/[,;]$/, ""))
    .filter((x) => x && !x.includes("{") && !/mw-parser|plainlist/.test(x) && x.length < 90);
};

async function wikiParse(title) {
  for (let a = 1; a <= 3; a++) {
    try {
      const res = await fetch(
        `https://en.wikipedia.org/w/api.php?action=parse&page=${encodeURIComponent(title)}&prop=text&format=json&origin=*&redirects=1`,
        { headers: { "User-Agent": "SPORTLOG/1.0 (student project)" } }
      );
      if (res.status === 429 || res.status === 503) { await sleep(6000 * a); continue; }
      const j = await res.json();
      return j?.parse?.text?.["*"] ?? null;
    } catch { await sleep(6000 * a); }
  }
  return null;
}
async function wikiSummary(title) {
  for (let a = 1; a <= 3; a++) {
    try {
      const res = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`,
        { headers: { "User-Agent": "SPORTLOG/1.0 (student project)" } });
      if (res.status === 429 || res.status === 503) { await sleep(5000 * a); continue; }
      if (!res.ok) return null;
      return await res.json();
    } catch { await sleep(5000 * a); }
  }
  return null;
}

let i = 0;
for (const t of teams) {
  i++;
  const prev = staff[t.idTeam];
  const isFootball = (t.strSport ?? "") === "American Football";
  // v3 complete → skip. v2 non-football is still good → skip. v2 football needs the season-page fix → refetch.
  if (prev?.v === 3 || (prev?.v === 2 && !isFootball)) {
    if (i % 25 === 0) console.log(`${i}/${teams.length} …done through here`);
    continue;
  }
  const title = WIKI_OVERRIDES[t.strTeam] ?? t.strTeam;
  const html = await wikiParse(title);
  if (!html) { console.log(`${i}/${teams.length} ${t.strTeam}: ✗ no page`); continue; }

  const entry = {
    v: 3,
    fetched: true,
    headCoach: infobox(html, "Head coach")[0] ?? infobox(html, "Manager")[0] ?? null,
    owners: [...new Set([...infobox(html, "Owner\\(s\\)"), ...infobox(html, "Principal owner"), ...infobox(html, "Owner")])].slice(0, 3),
    gm: infobox(html, "General manager")[0] ?? null,
    president: infobox(html, "President")[0] ?? null,
    oc: null, dc: null,
  };

  if (isFootball) {
    // current coordinators live on the season page's infobox, not the team page
    const y = new Date().getFullYear();
    for (const season of [`${y} ${t.strTeam} season`, `${y - 1} ${t.strTeam} season`]) {
      const sHtml = await wikiParse(season);
      if (!sHtml) continue;
      const oc = infobox(sHtml, "Offensive coordinator")[0] ?? null;
      const dc = infobox(sHtml, "Defensive coordinator")[0] ?? null;
      const hc = infobox(sHtml, "Head coach")[0] ?? null;
      if (oc || dc || hc) {
        entry.oc = oc;
        entry.dc = dc;
        if (hc) entry.headCoach = hc; // season page is the freshest source
        break;
      }
      await sleep(600);
    }
  }

  staff[t.idTeam] = entry;

  if (entry.headCoach) {
    const cs = personSlug(entry.headCoach);
    if (!coachMedia[cs]?.bio) {
      const sum = await wikiSummary(entry.headCoach);
      const e = sum?.extract ?? null;
      if (e && /coach|manager|basketball|football|baseball|soccer|hockey/i.test(e)) {
        coachMedia[cs] = { name: entry.headCoach, photo: sum.originalimage?.source ?? sum.thumbnail?.source ?? null, bio: e };
      }
      await sleep(400);
    }
  }

  console.log(`${i}/${teams.length} ${t.strTeam}: HC=${entry.headCoach ?? "✗"}${entry.oc ? ` OC=${entry.oc}` : ""}${entry.dc ? ` DC=${entry.dc}` : ""}`);
  if (i % 15 === 0) {
    writeFileSync("src/lib/team-staff.json", JSON.stringify(staff, null, 2));
    writeFileSync("src/lib/coach-media.json", JSON.stringify(coachMedia, null, 2));
  }
  await sleep(1200);
}
writeFileSync("src/lib/team-staff.json", JSON.stringify(staff, null, 2));
writeFileSync("src/lib/coach-media.json", JSON.stringify(coachMedia, null, 2));
console.log("\nDone.");
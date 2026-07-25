import { writeFileSync, readFileSync } from "fs";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const WIKI_OVERRIDES = {
  "Arsenal": "Arsenal F.C.", "Chelsea": "Chelsea F.C.", "Liverpool": "Liverpool F.C.",
  "Barcelona": "FC Barcelona", "Real Madrid": "Real Madrid CF", "Bayern Munich": "FC Bayern Munich",
  "Borussia Dortmund": "Borussia Dortmund", "Paris Saint-Germain": "Paris Saint-Germain F.C.",
  "AC Milan": "AC Milan", "Inter Milan": "Inter Milan", "Juventus": "Juventus FC",
  "Manchester United": "Manchester United F.C.", "Manchester City": "Manchester City F.C.",
  "Tottenham Hotspur": "Tottenham Hotspur F.C.", "Everton": "Everton F.C.", "Fulham": "Fulham F.C.",
  "New York Giants": "New York Giants", "New York Jets": "New York Jets",
};

const teams = JSON.parse(readFileSync("src/lib/teams.json", "utf8"));
let staff = {};
try { staff = JSON.parse(readFileSync("src/lib/team-staff.json", "utf8")); } catch {}

const clean = (s) =>
  (s ?? "").replace(/<br\s*\/?>/gi, "|").replace(/<[^>]+>/g, "").replace(/\[\d+\]/g, "").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
const infobox = (html, label) => {
  const re = new RegExp(`<th[^>]*>\\s*${label}[\\s\\S]{0,40}?</th>\\s*<td[^>]*>([\\s\\S]*?)</td>`, "i");
  const m = html.match(re);
  return m ? clean(m[1]).split("|").map((x) => x.trim()).filter(Boolean) : [];
};
const coordinator = (html, which) => {
  const re = new RegExp(`${which}\\s+[Cc]oordinator[^<]{0,20}<\\/[^>]+>[\\s\\S]{0,200}?<a[^>]*>([^<]+)<\\/a>`, "i");
  const m = html.match(re);
  return m ? clean(m[1]) : null;
};

let i = 0;
for (const t of teams) {
  i++;
  if (staff[t.idTeam]?.fetched) { if (i % 25 === 0) console.log(`${i}/${teams.length} …done through here`); continue; }
  const title = WIKI_OVERRIDES[t.strTeam] ?? t.strTeam;
  let html = null;
  for (let a = 1; a <= 3 && html === null; a++) {
    try {
      const res = await fetch(
        `https://en.wikipedia.org/w/api.php?action=parse&page=${encodeURIComponent(title)}&prop=text&format=json&origin=*&redirects=1`,
        { headers: { "User-Agent": "SPORTLOG/1.0 (student project)" } }
      );
      if (res.status === 429 || res.status === 503) { await sleep(6000 * a); continue; }
      const j = await res.json();
      html = j?.parse?.text?.["*"] ?? null;
      if (!html) break;
    } catch { await sleep(6000 * a); }
  }
  if (!html) { console.log(`${i}/${teams.length} ${t.strTeam}: ✗ no page`); continue; }

  const entry = {
    fetched: true,
    headCoach: infobox(html, "Head coach")[0] ?? infobox(html, "Manager")[0] ?? null,
    owners: infobox(html, "Owner\\(s\\)").concat(infobox(html, "Owner")).concat(infobox(html, "Principal owner")).slice(0, 4),
    gm: infobox(html, "General manager")[0] ?? null,
    president: infobox(html, "President")[0] ?? null,
    oc: null, dc: null,
  };
  if ((t.strSport ?? "") === "American Football") {
    entry.oc = coordinator(html, "Offensive");
    entry.dc = coordinator(html, "Defensive");
  }
  staff[t.idTeam] = entry;
  console.log(`${i}/${teams.length} ${t.strTeam}: HC=${entry.headCoach ?? "✗"}${entry.oc ? ` OC=${entry.oc}` : ""}${entry.dc ? ` DC=${entry.dc}` : ""}${entry.owners.length ? ` Owner=${entry.owners[0]}` : ""}`);
  if (i % 15 === 0) writeFileSync("src/lib/team-staff.json", JSON.stringify(staff, null, 2));
  await sleep(1300);
}
writeFileSync("src/lib/team-staff.json", JSON.stringify(staff, null, 2));
console.log("\nDone.");
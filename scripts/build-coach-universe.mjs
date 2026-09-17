import { readFileSync, writeFileSync } from "fs";
const UA = { "User-Agent": "SportLog/1.0 (https://sportlog-tau.vercel.app; dkaplan.sportlog@gmail.com) node-fetch" };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const slug = (n) => n.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const teams = JSON.parse(readFileSync("src/lib/teams.json", "utf8"));
const SUFFIX = { NBA: "head coaches", NFL: "head coaches", MLB: "managers", NHL: "coaches" };
const EXTRA = {
  NBA: ["NBA championship–winning head coaches", "NBA Coach of the Year Award winners"],
  NFL: ["Super Bowl–winning head coaches", "NFL Coach of the Year winners"],
  MLB: ["World Series–winning managers", "Major League Baseball Manager of the Year Award winners"],
  NHL: ["Stanley Cup championship–winning head coaches", "Jack Adams Award winners"],
};
const cats = {};
for (const lg of Object.keys(SUFFIX)) {
  cats[lg] = [...teams.filter((t) => t.strLeague === lg).map((t) => `${t.strTeam} ${SUFFIX[lg]}`), ...EXTRA[lg]];
}

async function members(cat) {
  const out = [];
  let cont = "";
  do {
    const url = `https://en.wikipedia.org/w/api.php?action=query&list=categorymembers&cmtitle=Category:${encodeURIComponent(cat)}&cmnamespace=0&cmlimit=500&format=json${cont ? `&cmcontinue=${encodeURIComponent(cont)}` : ""}`;
    let j = null;
    for (let a = 1; a <= 4 && j === null; a++) {
      try {
        const res = await fetch(url, { headers: UA });
        const text = await res.text();
        if (text.startsWith("{")) j = JSON.parse(text);
        else { console.log(`  throttled — waiting ${20 * a}s`); await sleep(20000 * a); }
      } catch { await sleep(10000 * a); }
    }
    if (!j) break;
    for (const m of j?.query?.categorymembers ?? []) out.push(m.title);
    cont = j?.continue?.cmcontinue ?? "";
    await sleep(3000);
  } while (cont);
  return out;
}

const out = {};
for (const [league, list] of Object.entries(cats)) {
  let n = 0, hits = 0;
  for (const cat of list) {
    const pages = await members(cat);
    if (pages.length) hits++;
    for (const title of pages) {
      if (/^List of/.test(title)) continue;
      const name = title.replace(/\s*\(.*\)$/, "");
      if (!/^[A-Z][^ ]+ [A-Z]/.test(name)) continue;
      const s = slug(name);
      if (!out[s]) { out[s] = { name, wiki: title, leagues: [league] }; n++; }
      else if (!out[s].leagues.includes(league)) out[s].leagues.push(league);
    }
  }
  console.log(`${league}: ${hits}/${list.length} categories found → +${n} coaches`);
  writeFileSync("src/lib/coach-universe.json", JSON.stringify(out, null, 2));
}
console.log(`\nDone. ${Object.keys(out).length} coaches → src/lib/coach-universe.json`);
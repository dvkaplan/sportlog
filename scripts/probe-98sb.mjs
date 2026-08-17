const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const clean = (s) => (s ?? "").replace(/<[^>]+>/g, " ").replace(/&#160;|&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/\[[^\]]{0,15}\]/g, "").replace(/\s+/g, " ").trim();

for (const title of ["1967 NFL Championship Game", "1966 AFL Championship Game", "1998 NFC Championship Game", "The Epic in Miami"]) {
  let html = "";
  for (let a = 1; a <= 4 && !html; a++) {
    try {
      const res = await fetch(`https://en.wikipedia.org/w/api.php?action=parse&page=${encodeURIComponent(title)}&prop=text&format=json&origin=*&redirects=1`,
        { headers: { "User-Agent": "SPORTLOG/1.0 (student project)" } });
      const raw = await res.text();
      if (raw.startsWith("You are") || res.status === 429) { await sleep(30000 * a); continue; }
      html = JSON.parse(raw)?.parse?.text?.["*"] ?? "";
    } catch { await sleep(20000 * a); }
  }
  console.log(`\n===== ${title} (length ${html.length}) =====`);
  const tables = [...html.matchAll(/<table[^>]*>[\s\S]*?<\/table>/g)].map((m) => m[0]);
  tables.forEach((t, i) => {
    if (!/first downs|passing/i.test(t)) return; // only the stat-bearing tables
    const rows = [...t.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)].map((m) =>
      [...m[1].matchAll(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/g)].map((c) => clean(c[1])));
    console.log(`--- table ${i} ---`);
    rows.slice(0, 12).forEach((r, j) => console.log(`  row ${j}: [${r.join(" | ")}]`));
  });
  await sleep(6000);
}
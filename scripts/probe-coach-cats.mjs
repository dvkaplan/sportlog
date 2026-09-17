const UA = { "User-Agent": "SPORTLOG/1.0 (student project; contact: sportlog dev)" };
for (const t of ["Gregg Popovich", "Bill Belichick", "Joe Torre", "Scotty Bowman"]) {
  const j = await fetch(`https://en.wikipedia.org/w/api.php?action=query&prop=categories&titles=${encodeURIComponent(t)}&cllimit=100&format=json`, { headers: UA }).then((r) => r.json());
  const page = Object.values(j?.query?.pages ?? {})[0];
  const cats = (page?.categories ?? []).map((c) => c.title.replace(/^Category:/, "")).filter((c) => /coach|manager/i.test(c));
  console.log(`\n${t}:`); for (const c of cats) console.log("  " + c);
  await new Promise((r) => setTimeout(r, 1500));
}
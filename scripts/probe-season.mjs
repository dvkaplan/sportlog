const res = await fetch(
  "https://en.wikipedia.org/w/api.php?action=parse&page=" +
    encodeURIComponent("2026 Pittsburgh Steelers season") +
    "&prop=text&format=json&origin=*&redirects=1",
  { headers: { "User-Agent": "SPORTLOG/1.0" } }
);
const html = (await res.json())?.parse?.text?.["*"] ?? "";
console.log("Page length:", html.length);
const labels = [...html.matchAll(/<th[^>]*>([\s\S]*?)<\/th>/gi)]
  .slice(0, 30)
  .map((m) => m[1].replace(/<[^>]+>/g, " ").replace(/&#160;|&nbsp;/g, " ").replace(/\s+/g, " ").trim());
console.log(labels);
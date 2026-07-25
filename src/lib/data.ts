import fightGames from "./fight-games.json";
import fightRedirects from "./fight-redirects.json";
export type Sport = {
  slug: string;
  name: string;
  emoji: string;
  leagues: string[];
};

export type Game = {
  id: string;
  sportSlug: string;
  league: string;
  title: string;
  date: string;
  score?: string;
  blurb: string;
  championship?: boolean;
};

export const SPORTS: Sport[] = [
  { slug: "basketball", name: "Basketball", emoji: "🏀", leagues: ["NBA", "NCAA"] },
  { slug: "football", name: "American Football", emoji: "🏈", leagues: ["NFL", "NCAA"] },
  { slug: "boxing", name: "Boxing", emoji: "🥊", leagues: ["Pro Boxing"] },
  { slug: "mma", name: "MMA", emoji: "🥋", leagues: ["UFC"] },
  { slug: "hockey", name: "Hockey", emoji: "🏒", leagues: ["NHL", "Olympics"] },
  { slug: "soccer", name: "Soccer", emoji: "⚽", leagues: ["Premier League", "Champions League", "World Cup"] },
  { slug: "baseball", name: "Baseball", emoji: "⚾", leagues: ["MLB"] },
];

export const GAMES: Game[] = [
  // BASKETBALL
  { id: "nba-1998-finals-g6", sportSlug: "basketball", league: "NBA", title: "Bulls vs Jazz — 1998 Finals, Game 6", date: "1998-06-14", score: "CHI 87–86 UTA", blurb: "Jordan's Last Dance ends with the steal and The Last Shot.", championship: true },
  { id: "nba-2016-finals-g7", sportSlug: "basketball", league: "NBA", title: "Cavaliers vs Warriors — 2016 Finals, Game 7", date: "2016-06-19", score: "CLE 93–89 GSW", blurb: "The Block, The Shot, The Stop. Cleveland's 52-year drought ends against a 73-win team.", championship: true },
  { id: "nba-2013-finals-g6", sportSlug: "basketball", league: "NBA", title: "Spurs vs Heat — 2013 Finals, Game 6", date: "2013-06-18", score: "MIA 103–100 SA (OT)", blurb: "Ray Allen's corner three with 5.2 left. The yellow rope was already out.", championship: true },
  // FOOTBALL
  { id: "sb-xxxviii", sportSlug: "football", league: "NFL", title: "Super Bowl XXXVIII — Patriots vs Panthers", date: "2004-02-01", score: "NE 32–29 CAR", blurb: "A slow burn that explodes: 37 fourth-quarter points, Vinatieri wins it with :04 left.", championship: true },
  { id: "sb-li", sportSlug: "football", league: "NFL", title: "Super Bowl LI — Patriots vs Falcons", date: "2017-02-05", score: "NE 34–28 ATL (OT)", blurb: "28–3. The greatest comeback in Super Bowl history.", championship: true },
  { id: "nfl-2025-pit-nyj", sportSlug: "football", league: "NFL", title: "Steelers at Jets — Week 1, 2025", date: "2025-09-07", score: "PIT 34–32 NYJ", blurb: "Rodgers returns to MetLife in black and gold. Shootout decided late.", championship: false },
  // BOXING
  { id: "box-hagler-hearns", sportSlug: "boxing", league: "Pro Boxing", title: "Hagler vs Hearns — The War", date: "1985-04-15", score: "Hagler TKO3", blurb: "Eight of the most violent minutes ever. Round 1 is the greatest round in boxing history.", championship: true },
  { id: "box-ali-frazier-3", sportSlug: "boxing", league: "Pro Boxing", title: "Ali vs Frazier III — Thrilla in Manila", date: "1975-10-01", score: "Ali TKO14", blurb: "'The closest thing to dying that I know of.' The trilogy's brutal conclusion.", championship: true },
  { id: "box-gatti-ward-1", sportSlug: "boxing", league: "Pro Boxing", title: "Gatti vs Ward I", date: "2002-05-18", score: "Ward MD10", blurb: "Round 9 alone is required viewing. No titles, all heart.", championship: false },
  // MMA
  { id: "ufc-229-khabib-mcgregor", sportSlug: "mma", league: "UFC", title: "UFC 229 — Khabib vs McGregor", date: "2018-10-06", score: "Khabib SUB4", blurb: "The biggest fight in UFC history, and then the brawl after.", championship: true },
  { id: "ufc-165-jones-gustafsson", sportSlug: "mma", league: "UFC", title: "UFC 165 — Jones vs Gustafsson", date: "2013-09-21", score: "Jones UD5", blurb: "The first time Jones looked mortal. Five-round war for the ages.", championship: true },
  // HOCKEY
  { id: "nhl-2010-scf-g6", sportSlug: "hockey", league: "NHL", title: "Blackhawks vs Flyers — 2010 Cup Final, Game 6", date: "2010-06-09", score: "CHI 4–3 PHI (OT)", blurb: "Kane's no-one-saw-it-go-in OT winner ends a 49-year drought.", championship: true },
  { id: "oly-1980-miracle", sportSlug: "hockey", league: "Olympics", title: "USA vs USSR — Miracle on Ice", date: "1980-02-22", score: "USA 4–3 USSR", blurb: "Do you believe in miracles? College kids beat the machine.", championship: true },
  // SOCCER
  { id: "wc-2022-final", sportSlug: "soccer", league: "World Cup", title: "Argentina vs France — 2022 World Cup Final", date: "2022-12-18", score: "ARG 3–3 FRA (4–2 pens)", blurb: "Messi vs Mbappé. Widely called the greatest final ever played.", championship: true },
  { id: "ucl-2005-final", sportSlug: "soccer", league: "Champions League", title: "Liverpool vs Milan — 2005 UCL Final", date: "2005-05-25", score: "LIV 3–3 MIL (3–2 pens)", blurb: "The Miracle of Istanbul. Down 3–0 at half.", championship: true },
  // BASEBALL
  { id: "mlb-2016-ws-g7", sportSlug: "baseball", league: "MLB", title: "Cubs vs Indians — 2016 World Series, Game 7", date: "2016-11-02", score: "CHC 8–7 CLE (10 inn)", blurb: "The 108-year curse dies in extra innings, after a rain delay. Cinema.", championship: true },
  { id: "mlb-1988-ws-g1", sportSlug: "baseball", league: "MLB", title: "Dodgers vs Athletics — 1988 World Series, Game 1", date: "1988-10-15", score: "LAD 5–4 OAK", blurb: "Kirk Gibson can barely walk. One swing. 'I don't believe what I just saw!'", championship: true },
  { id: "mlb-2004-alcs-g4", sportSlug: "baseball", league: "MLB", title: "Red Sox vs Yankees — 2004 ALCS, Game 4", date: "2004-10-17", score: "BOS 6–4 NYY (12 inn)", blurb: "Down 0–3 in the series, down one in the 9th vs Rivera. The comeback begins.", championship: false },
];

export function getSport(slug: string) {
  return SPORTS.find((s) => s.slug === slug);
}
export function getGamesBySport(slug: string) {
  return GAMES.filter((g) => g.sportSlug === slug);
}
export function getGame(id: string) {
  const REDIR = fightRedirects as Record<string, string>;
  const finalId = REDIR[id] ?? id;
  return GAMES.find((g) => g.id === finalId) ?? (fightGames as Game[]).find((g) => g.id === finalId);
}
export type Era = {
  slug: string;
  sportSlug: string;
  name: string;
  years: string;
  blurb: string;
};

export const ERAS: Era[] = [
  // BASKETBALL
  { slug: "nba-80s-magic-bird", sportSlug: "basketball", name: "The Magic–Bird Era", years: "1979–1988", blurb: "Lakers vs Celtics saved the league. Showtime fast breaks, garden wars, and the rivalry that built modern basketball." },
  { slug: "nba-90s-jordan", sportSlug: "basketball", name: "The Jordan Era", years: "1991–1998", blurb: "Six titles, two three-peats, one man. The Bulls dynasty and the global explosion of the NBA." },
  { slug: "nba-2000s-shaq-kobe", sportSlug: "basketball", name: "Shaq & Kobe / Spurs Era", years: "1999–2010", blurb: "Lakers three-peats, Spurs fundamentals, and the defensive grind years." },
  { slug: "nba-2010s-superteams", sportSlug: "basketball", name: "The Superteam Era", years: "2010–2019", blurb: "The Decision, the Heatles, 73 wins, KD to Golden State. Player empowerment changed everything." },
  { slug: "nba-pace-space", sportSlug: "basketball", name: "Pace & Space Era", years: "2015–present", blurb: "Three-point revolution, positionless basketball, offensive explosion." },
  // FOOTBALL
  { slug: "nfl-70s-steel", sportSlug: "football", name: "The Steel Curtain Era", years: "1970–1979", blurb: "Steelers dynasty, dominant defenses, and the birth of the modern NFL." },
  { slug: "nfl-80s-west-coast", sportSlug: "football", name: "The West Coast Era", years: "1981–1994", blurb: "Walsh, Montana, Rice. The 49ers dynasty and offensive innovation." },
  { slug: "nfl-brady-belichick", sportSlug: "football", name: "The Brady–Belichick Era", years: "2001–2019", blurb: "Six rings, the Patriot Way, and two decades of AFC domination." },
  { slug: "nfl-modern-qb", sportSlug: "football", name: "The Modern QB Era", years: "2018–present", blurb: "Mahomes, mobile quarterbacks, and offense-first rule changes." },
  // BOXING
  { slug: "box-golden-heavyweights", sportSlug: "boxing", name: "The Golden Age of Heavyweights", years: "1964–1981", blurb: "Ali, Frazier, Foreman. The biggest fights in the sport's history." },
  { slug: "box-four-kings", sportSlug: "boxing", name: "The Four Kings Era", years: "1980–1989", blurb: "Leonard, Hagler, Hearns, Durán. Nine fights against each other, all legendary." },
  { slug: "box-tyson", sportSlug: "boxing", name: "The Tyson Era", years: "1985–1997", blurb: "The baddest man on the planet and heavyweight chaos." },
  { slug: "box-mayweather-pacquiao", sportSlug: "boxing", name: "The Mayweather–Pacquiao Era", years: "2005–2015", blurb: "Pound-for-pound supremacy and the fight the world waited a decade for." },
  // MMA
  { slug: "ufc-pride-early", sportSlug: "mma", name: "The Pioneer Era", years: "1993–2005", blurb: "No weight classes, PRIDE in Japan, and the birth of a sport." },
  { slug: "ufc-gsp-silva", sportSlug: "mma", name: "The GSP–Silva Era", years: "2006–2013", blurb: "Two untouchable champions and MMA's mainstream arrival." },
  { slug: "ufc-conor", sportSlug: "mma", name: "The McGregor Era", years: "2013–2018", blurb: "Red panty night. The double champ and the sport's biggest star ever." },
  // HOCKEY
  { slug: "nhl-gretzky", sportSlug: "hockey", name: "The Gretzky Era", years: "1979–1999", blurb: "The Great One rewrites the record book; Oilers dynasty and firewagon hockey." },
  { slug: "nhl-dead-puck", sportSlug: "hockey", name: "The Dead Puck Era", years: "1995–2004", blurb: "The trap, clutch-and-grab, and 2–1 finals." },
  { slug: "nhl-crosby-ovechkin", sportSlug: "hockey", name: "The Crosby–Ovechkin Era", years: "2005–2020", blurb: "Two generational rivals define post-lockout hockey." },
  // SOCCER
  { slug: "soc-messi-ronaldo", sportSlug: "soccer", name: "The Messi–Ronaldo Era", years: "2008–2023", blurb: "Thirteen straight Ballons d'Or between two men. The greatest individual rivalry in sports history." },
  { slug: "soc-tiki-taka", sportSlug: "soccer", name: "The Tiki-Taka Era", years: "2008–2012", blurb: "Barcelona and Spain perfect possession football." },
  { slug: "soc-premier-modern", sportSlug: "soccer", name: "The Modern Premier League Era", years: "2016–present", blurb: "Pep vs Klopp, 100-point seasons, and tactical revolution." },
  // BASEBALL
  { slug: "mlb-yankees-dynasty", sportSlug: "baseball", name: "The Yankees Dynasty Era", years: "1996–2001", blurb: "Jeter, Rivera, four titles in five years." },
  { slug: "mlb-steroid", sportSlug: "baseball", name: "The Steroid Era", years: "1994–2004", blurb: "McGwire–Sosa, 73 home runs, and baseball's most complicated chapter." },
  { slug: "mlb-analytics", sportSlug: "baseball", name: "The Analytics Era", years: "2015–present", blurb: "Launch angles, openers, and the Moneyball endgame." },
];

export function getEra(slug: string) {
  return ERAS.find((e) => e.slug === slug);
}
export function getErasBySport(sportSlug: string) {
  return ERAS.filter((e) => e.sportSlug === sportSlug);
}
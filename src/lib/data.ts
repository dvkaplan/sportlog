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
];

export function getSport(slug: string) {
  return SPORTS.find((s) => s.slug === slug);
}
export function getGamesBySport(slug: string) {
  return GAMES.filter((g) => g.sportSlug === slug);
}
export function getGame(id: string) {
  return GAMES.find((g) => g.id === id);
}
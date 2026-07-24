import eventsData from "@/lib/events.json";

export type EventFight = {
  gameId: string; title: string; weightclass: string;
  method: string; round: string; time: string; result: string;
};
export type SportEvent = { slug: string; name: string; date: string; fights: EventFight[] };

export const EVENTS = eventsData as SportEvent[];
const BY_SLUG = Object.fromEntries(EVENTS.map((e) => [e.slug, e]));
const slugify = (n: string) =>
  n.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export function getEvent(slug: string) {
  return BY_SLUG[slug];
}
const CORE = /^((?:UFC(?:\s+Fight\s+Night)?|Bellator|PRIDE|Strikeforce|Invicta FC|PFL|WEC|Rizin|ONE(?:\s+Championship)?|K-1)\s*#?\s*\d+[a-z]?)/i;
export function eventSlugForName(name: string) {
  const m = (name ?? "").match(CORE);
  const core = m ? m[1].replace(/\s+/g, " ").trim() : (name ?? "").trim();
  const s = slugify(core);
  return BY_SLUG[s] ? s : null;
}
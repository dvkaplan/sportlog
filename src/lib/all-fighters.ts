import { FIGHTERS, type Fighter } from "@/lib/fighters";
import roster from "@/lib/ufc-roster.json";

const seen = new Set<string>();
export const ALL_FIGHTERS: Fighter[] = [...FIGHTERS, ...(roster as Fighter[])].filter((f) => {
  if (seen.has(f.slug)) return false;
  seen.add(f.slug);
  return true;
});

export function getAnyFighter(slug: string) {
  return ALL_FIGHTERS.find((f) => f.slug === slug);
}
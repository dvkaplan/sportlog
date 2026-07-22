import { FIGHTERS, type Fighter } from "@/lib/fighters";
import roster from "@/lib/ufc-roster.json";

export const ALL_FIGHTERS: Fighter[] = [...FIGHTERS, ...(roster as Fighter[])];

export function getAnyFighter(slug: string) {
  return ALL_FIGHTERS.find((f) => f.slug === slug);
}
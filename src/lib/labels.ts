// TheSportsDB files team-less players under placeholder "teams" like
// "_Deceased Basketball", "_Retired Soccer", "_Free Agent Basketball".
// We convert those into tasteful display labels.
export function cleanTeamLabel(raw: string | null | undefined): string {
  if (!raw) return "";
  if (!raw.startsWith("_")) return raw;
  const s = raw.slice(1).toLowerCase();
  if (s.startsWith("free agent")) return "Free Agent";
  if (s.startsWith("deceased") || s.startsWith("retired")) return ""; // no label at all
  return raw.slice(1); // any other underscore placeholder: just drop the underscore
}
// FTS5 treats quotes, parentheses, "-", ":" and AND / OR / NOT / NEAR as syntax: free text from
// the scribe is turned into plain quoted words so a search can never be a syntax error.
// (SPEC-034 RF-016.)
export function ftsQuery(raw: string): string {
  const words = raw
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w && !['and', 'or', 'not', 'near'].includes(w))
    .slice(0, 8);
  return words.map((w) => `"${w}"`).join(' ');
}

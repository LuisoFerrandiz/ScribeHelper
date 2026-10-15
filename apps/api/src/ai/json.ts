// Shared by the AI modules that ask the model for a JSON object (SPEC-034 T1).
// Strips a markdown fence, then falls back to the first "{" .. last "}" span.
// Throws when nothing parses.
export function parseJson(text: string): unknown {
  const unfenced = text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
  try {
    return JSON.parse(unfenced);
  } catch {
    const start = unfenced.indexOf('{');
    const end = unfenced.lastIndexOf('}');
    if (start === -1 || end <= start) throw new Error('the model did not return valid JSON');
    try {
      return JSON.parse(unfenced.slice(start, end + 1));
    } catch {
      throw new Error('the model did not return valid JSON');
    }
  }
}

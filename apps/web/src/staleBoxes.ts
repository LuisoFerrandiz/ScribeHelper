// SPEC-029 RF-005 — which earlier boxes of the chain were changed after this
// one was last edited. Pure: no DOM, no network.
// Chain: Facts Found -> Rules Applicable -> Conclusion -> Decision.

export type ChainBox = 'facts_found' | 'rules_applicable' | 'conclusion' | 'decision';

export interface BoxStamps {
  facts_found_at: string | null;
  rules_applicable_at: string | null;
  conclusion_at: string | null;
  decision_at: string | null;
}

export const CHAIN: ChainBox[] = ['facts_found', 'rules_applicable', 'conclusion', 'decision'];

export const BOX_LABEL: Record<ChainBox, string> = {
  facts_found: 'Facts Found',
  rules_applicable: 'Rules Applicable',
  conclusion: 'Conclusion',
  decision: 'Decision',
};

export function stampOf(stamps: BoxStamps, box: ChainBox): string | null {
  return stamps[`${box}_at` as keyof BoxStamps];
}

// A null stamp means unknown (older data) or an empty box: no warning. Stamps
// are "YYYY-MM-DD HH:MM:SS" (UTC, from the server), so string order is time order.
export function staleSources(box: ChainBox, stamps: BoxStamps): ChainBox[] {
  const own = stampOf(stamps, box);
  if (!own) return [];
  return CHAIN.slice(0, CHAIN.indexOf(box)).filter((earlier) => {
    const at = stampOf(stamps, earlier);
    return !!at && at > own;
  });
}

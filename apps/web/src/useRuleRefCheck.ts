import { useEffect, useState } from 'react';
import { api } from './api';

// SPEC-028 / SPEC-034 RF-021: typed references the loaded rules do not contain.
// Informative only. Debounced; the answer of an older text is dropped; no stale warning is
// left on an empty text, a failed call or another case. It runs only while `active` (the
// Rules Applicable tab), but lives in CaseForm so the warning does not depend on a tray
// being mounted.
export function useRuleRefCheck(caseId: number, text: string, active: boolean): string[] {
  const [unresolved, setUnresolved] = useState<string[]>([]);
  useEffect(() => {
    if (!active || !text.trim()) {
      setUnresolved([]);
      return;
    }
    let cancelled = false;
    const handle = setTimeout(() => {
      api
        .checkRuleRefs(caseId, text)
        .then((r) => {
          if (!cancelled) setUnresolved(r.unresolved);
        })
        .catch(() => {
          if (!cancelled) setUnresolved([]);
        });
    }, 500);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [text, caseId, active]);
  return unresolved;
}

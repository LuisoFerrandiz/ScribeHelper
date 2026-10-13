import { useEffect, useRef, useState } from 'react';
import { api } from './api';
import type { ExampleSuggestionBox } from './types';

// SPEC-020 RF-005. Module-level cache, per box and not per case: the
// request only depends on the box. Survives tab changes (boxes mount and
// unmount with the tab), lost on page reload. Errors are never cached.
const cache = new Map<ExampleSuggestionBox, string[]>();

export function useExampleSuggestions(box: ExampleSuggestionBox) {
  const [phrases, setPhrases] = useState<string[] | null>(cache.get(box) ?? null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadingRef = useRef(false);
  const boxRef = useRef(box);

  useEffect(() => {
    boxRef.current = box;
    setPhrases(cache.get(box) ?? null);
    setError(null);
  }, [box]);

  function request() {
    if (loadingRef.current) return; // double-click guard
    loadingRef.current = true;
    setLoading(true);
    setError(null);
    const requestedBox = box;
    api
      .suggestPhrasesFromExamples(requestedBox)
      .then((result) => {
        cache.set(requestedBox, result.phrases);
        if (boxRef.current === requestedBox) setPhrases(result.phrases);
      })
      .catch((e) => {
        if (boxRef.current === requestedBox) setError((e as Error).message);
      })
      .finally(() => {
        loadingRef.current = false;
        setLoading(false);
      });
  }

  // phrases === null: never requested. [] : requested, nothing usable.
  return { phrases, loading, error, request };
}

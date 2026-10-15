interface Props {
  missing: string[]; // citations registered for the case that are not in the text (SPEC-023 RF-011)
  hasText: boolean;
  unresolved: string[]; // typed references the loaded rules do not contain (SPEC-028)
  onInsertMissing: () => void;
}

// SPEC-034 RF-007: the two warnings of Rules Applicable, under the header of the box. Same
// words and same conditions as when they lived in the side column.
export function RulesWarnings({ missing, hasText, unresolved, onInsertMissing }: Props) {
  return (
    <>
      {hasText && missing.length > 0 && (
        <p className="rules-warning">
          {missing.length} cited {missing.length === 1 ? 'rule is' : 'rules are'} not in the text and will not
          appear in the document.{' '}
          <button type="button" onClick={onInsertMissing}>
            Insert missing
          </button>
        </p>
      )}
      {unresolved.length > 0 && (
        <p className="rules-warning">
          Not found in the loaded rules: {unresolved.join(', ')}. Check them or load the document.
        </p>
      )}
    </>
  );
}

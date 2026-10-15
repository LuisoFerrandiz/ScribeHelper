import type { DocType } from './types';

// SPEC-033: an event document is a kind (class rules / NoR / SI) plus an
// "amendment" flag; the stored doc_type composes both (`si` / `si_amendment`).
export type DocKind = 'class' | 'nor' | 'si';

export const DOC_KIND_LABEL: Record<DocKind, string> = {
  class: 'Class rules',
  nor: 'Notice of Race',
  si: 'Sailing Instructions',
};

export const DOC_KINDS = Object.keys(DOC_KIND_LABEL) as DocKind[];

export function composeDocType(kind: DocKind, amendment: boolean): DocType {
  return (amendment ? `${kind}_amendment` : kind) as DocType;
}

export function splitDocType(docType: DocType): { kind: DocKind; amendment: boolean } {
  const amendment = docType.endsWith('_amendment');
  return { kind: (amendment ? docType.slice(0, -'_amendment'.length) : docType) as DocKind, amendment };
}

export function docTypeLabel(docType: DocType): string {
  const { kind, amendment } = splitDocType(docType);
  return amendment ? `${DOC_KIND_LABEL[kind]} amendment` : DOC_KIND_LABEL[kind];
}

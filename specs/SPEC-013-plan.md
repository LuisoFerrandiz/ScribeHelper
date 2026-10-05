# SPEC-013 — Plan

Relacionado: `SPEC-013-scoped-refreshes.md` (requisitos).

## Cambio

`apps/web/src/components/CaseForm.tsx`. Tres funciones nuevas, junto a
`reloadJury()`/`refreshParties()` (mismo bloque, ~línea 175):

```tsx
// SPEC-013: refreshes ONLY caseFull.linkedCases — same criterion as
// reloadJury/refreshParties above, never the four free-text useState
// nor the General fields.
async function refreshLinkedCases() {
  const full = await api.getCaseFull(caseId);
  setCaseFull((prev) => (prev ? { ...prev, linkedCases: full.linkedCases } : full));
}

// SPEC-013: refreshes ONLY caseFull.attachments.
async function refreshAttachments() {
  const full = await api.getCaseFull(caseId);
  setCaseFull((prev) => (prev ? { ...prev, attachments: full.attachments } : full));
}

// SPEC-013: refreshes ONLY caseFull.ruleCitations.
async function refreshRuleCitations() {
  const full = await api.getCaseFull(caseId);
  setCaseFull((prev) => (prev ? { ...prev, ruleCitations: full.ruleCitations } : full));
}
```

Y los 6 handlers existentes cambian su única línea `await reload();`
por la función acotada correspondiente:

```tsx
async function handleLinkCase(linkedCaseId: number) {
  await api.createCaseLink({ case_id: caseId, linked_case_id: linkedCaseId });
  await refreshLinkedCases();
}

async function handleRemoveLink(linkedCaseId: number) {
  await api.deleteCaseLink({ case_id: caseId, linked_case_id: linkedCaseId });
  await refreshLinkedCases();
}

async function handleUploadAttachment(e: ChangeEvent<HTMLInputElement>) {
  // ... sin cambios hasta:
  await api.uploadCaseAttachment(caseId, file);
  await refreshAttachments();
  // ...
}

async function handleRemoveAttachment(id: number) {
  await api.deleteCaseAttachment(id);
  await refreshAttachments();
}

async function handleAddRule(e: FormEvent) {
  // ... sin cambios hasta la línea final:
  await refreshRuleCitations();
}

async function handleRemoveRule(id: number) {
  await api.deleteRuleCitation(id);
  await refreshRuleCitations();
}
```

Ningún otro archivo cambia — `api.getCaseFull` ya existe y ya devuelve
`linkedCases`/`attachments`/`ruleCitations` como parte de `CaseFull`
(`types.ts:224-226`).

## Verificación

- `npm run typecheck` (web) limpio.
- RF-001/002/003: para cada una de las 3 acciones, escribir un
  marcador sin guardar en una caja de texto libre, disparar la acción
  (vincular caso / subir adjunto / añadir regla), confirmar que el
  marcador sigue en pantalla sin guardar — mismo método ya usado para
  verificar RF-005 de SPEC-009/SPEC-011 (comparar antes/después,
  nunca pulsar Save en esa caja).
- RF-004: confirmar que la lista afectada (casos vinculados / adjuntos
  / reglas citadas) se actualiza igual que antes — mismo efecto visual.
- Revisión con el agente `reviewer`: QA de spec/plan antes de
  implementar, validación RF por RF después, verificación en vivo
  (localhost primero, luego confirmado contra el entorno desplegado).

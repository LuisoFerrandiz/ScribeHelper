# SPEC-026 — Plan

Relacionado: `SPEC-026-aviso-huecos-sin-rellenar.md`.

Solo `apps/web`. Reutiliza `phraseGaps` y `normalizePhraseText` de SPEC-025.

1. `apps/web/src/pendingMarks.ts` (nuevo): `pendingMarks(text)` y
   `describePending(p)`.
2. `CopyBox.tsx`: prop opcional `pendingText?: string`; si da `count > 0`,
   `<p className="pending-note">` entre `box-header` y `box-body` (fuera del
   `hidden` del colapso).
3. `WritingBox.tsx`: prop `pendingText` que reenvía a `CopyBox`. `CaseForm`
   pasa el texto de la caja en las cinco (Rules Applicable: `rulesApplicable`,
   no `copyText`). `PartiesTab` sin cambios.
4. `CaseForm.tsx`: tras `liveCase`, `pending = [{box, marks}]` para las cinco
   cajas; `handleDownload` hace `confirm` antes del Blob; pasa `pending` a
   `ReviewTab`.
5. `ReviewTab.tsx`: prop `pending`; resumen arriba de `<h2>Review`.
6. `styles.css`: `.pending-note` (ámbar discreto, como `.gap-hint`).
7. Script desechable `check_pending.ts` en el scratchpad de la sesión, con las
   frases leídas de la base local.
8. D-037 en DECISIONS.md: avisar, no bloquear.

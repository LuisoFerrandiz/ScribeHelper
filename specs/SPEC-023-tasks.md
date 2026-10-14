# SPEC-023 — Tareas

Estado: implementado y commiteado (`4acf5de`, ajuste de columnas
`4f24294`; este último sin push aún). Typecheck web, build api y build web
limpios; migración probada dos veces en una base temporal; regex de
`citationInText` probado con script. Pendiente: push de `4f24294`,
redeploy y verificación en vivo.

Relacionado: `SPEC-023-caja-reglas-aplicables.md` (requisitos).

- [x] **1. `migrate.ts`** — `ALTER TABLE protest_case ADD COLUMN
  rules_applicable` guardado (idempotente, probado dos arranques).
- [x] **2. `routes/index.ts`** — `rules_applicable` en los `fields` de `cases`.
- [x] **3. `ai/complete.ts` y `routes/complete.ts`** — `CompleteBox`, prompt
  propio sin números de regla y filtro determinista en el servidor.
- [x] **4. `types.ts`, `api.ts`, `GhostTextarea.tsx`** — `RulesBox`,
  `CaseRow.rules_applicable`.
- [x] **5. `format.ts`** — `formatRulesApplicable` (texto primero, fallback a
  citas) y `missingCitations` (límites de token).
- [x] **6. `RulesSuggestions.tsx`** — citas registradas con Insert/Remove (botones
  hermanos), alta manual, buscador de solo lectura, aviso "Insert missing".
- [x] **7. `CaseForm.tsx`** — estado, carga, Save, overlay `liveCase`, pestaña
  con `box-body-split-reverse`, cuadro en Review entre Conclusion y Decision;
  se retira el estado y el efecto del buscador movidos al componente.
- [x] **8. `styles.css`** — `.box-body-split-reverse`, `.suggestion-row`,
  `.rules-warning`.
- [x] **9. `DECISIONS.md`** — D-032.
- [ ] **10. Verificar en vivo** según la spec (pestaña, texto fantasma sin
  números, Insert/Remove, Save y recarga, Review, Copy/Download, caso antiguo
  con citas y cuadro vacío, aviso "Insert missing", ventana estrecha).
- [ ] **11. Commit y push (solo cuando el dueño lo ordene), "Pull and
  redeploy" y reconfirmación en producción.**

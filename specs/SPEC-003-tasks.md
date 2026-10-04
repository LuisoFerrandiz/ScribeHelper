# SPEC-003 — Tareas

Estado: documental, ya hecho salvo el commit.

Relacionado: `SPEC-003-documentacion-previa.md` (requisitos),
`SPEC-003-plan.md` (por qué no hay diseño de implementación).

- [x] 1. Leer código fuente de la funcionalidad existente (schema,
  rutas, extracción, frontend).
- [x] 2. Escribir `SPEC-003-documentacion-previa.md` reflejando el
  comportamiento real, no uno deseado.
- [x] 3. Detectar y corregir desajustes entre lo que se asumía
  (auto-rellenar formulario, .md agregado único) y lo que el código
  realmente hace.
- [x] 4. Señalar explícitamente los campos sin UI conectada
  (`conclusion_candidate`, `decision_candidate`,
  `rule_citations_candidate`) como `[GAP]`, incluyendo el riesgo de
  `rule_citations_candidate` respecto a D-004.
- [ ] 5. Commit de `SPEC-003-documentacion-previa.md`,
  `SPEC-003-plan.md`, `SPEC-003-tasks.md`.

## Fuera de esta tanda de tareas

- Conectar `conclusion_candidate`/`decision_candidate` a UI — spec
  futura, al llegar a esos tabs.
- Conectar `rule_citations_candidate` a UI y resolver su relación con
  D-004 — spec futura, al llegar a Rules Applicable.

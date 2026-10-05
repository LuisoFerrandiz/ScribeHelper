# SPEC-010 — Tareas

Estado: implementado, verificado en vivo, reviewer APROBADO. Pendiente
commit + push (push solo cuando el usuario lo pida) y redeploy en
Portainer.

Relacionado: `SPEC-010-general.md` (requisitos), `SPEC-010-plan.md`
(diseño detallado de cada tarea).

- [x] **1. Backend — `day_candidate`/`race_candidate` en
  `extract.ts`.** Interface `AttachmentExtraction`, shape JSON del
  prompt, párrafo nuevo en el `system` prompt (fecha del incidente, no
  de presentación; número/etiqueta de prueba tal cual; omitir si no
  está, nunca inventar), normalización en `parseExtraction`.
- [x] **2. `apps/web/src/types.ts` — mismo par de campos.** Interface
  `AttachmentExtraction` duplicado, sin tocar `api.ts`.
- [x] **3. `CaseForm.tsx` — apartado "General" nuevo.**
  `useSuggestedDay`/`useSuggestedRace` junto a `useSuggestedParty`;
  bloque `caseTab === 'general'` reestructurado en dos secciones
  hermanas: caja `.box.general-box` nueva (Case number, Day + Use
  suggested, Race + Use suggested, With case(s), Save) y el `CopyBox`
  de Parties & Witness existente sin cambios en su contenido. Quitado
  el `<form className="case-meta">` viejo y el input de "Informed at"
  (sin tocar `useState informedAt` ni `handleSaveGeneral`).
- [x] **4. CSS.** Quitado `.case-meta`/`.case-meta label`/
  `.case-meta input`; añadido `.general-box h2`/`.general-fields-row`/
  `.general-fields-row label`/`.general-fields-row input`, tokens ya
  existentes.
- [x] **5. Verificar.** `npm run typecheck` (web) / `npm run build`
  (api) limpios. Probado en vivo contra caso real TEST-02 con un
  protest form real adjunto (clics reales en el navegador, dev server
  local):
  - Apartado "General" separado de Parties & Witness, con el mismo
    tratamiento visual (`.box`) del resto de la app; "Informed at" no
    aparece en ningún sitio del DOM
    (`document.body.textContent.includes('Informed at') === false`).
  - Backend: tras "Process" sobre un PDF real,
    `day_candidate: "2026-09-29"` y `race_candidate: "1"` extraídos
    correctamente (confirmado vía `fetch` directo al endpoint).
  - UI: botones "Use suggested" aparecen junto a Day/Race solo tras
    procesar y solo si hay candidato; vaciar Day a mano y pulsar "Use
    suggested" lo rellenó con el valor correcto; nunca se aplica solo.
  - Guardado batcheado sin cambio de comportamiento: `handleSaveGeneral`
    no se tocó; With case(s) sigue actuando al instante.
  - Revisión del agente `reviewer`: **VEREDICTO APROBADO**, los 8 RF
    confirmados contra el código real línea por línea (incluye
    `git diff --stat` para confirmar que el alcance tocado coincide
    con lo descrito, typecheck/build re-ejecutados por el propio
    reviewer). Sin hallazgos bloqueantes. Una nota opcional, no
    bloqueante: los botones "Use suggested" de Day/Race quedan como
    hijos directos de `.general-fields-row` en vez de dentro de un
    `<label>` propio como los de Parties — decisión de layout menor,
    no incumple ningún RF.

## Fuera de esta tanda de tareas

- Reintroducir "Informed at" en algún sitio de la UI.
- Fusionar el apartado "General" con Parties & Witness.
- Tocar `SPEC-004-general-parties.md` o cualquier spec ya cerrada.

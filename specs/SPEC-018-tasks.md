# SPEC-018 — Tareas

Estado: implementado, verificado en vivo.

Relacionado: `SPEC-018-hearing-notes-compact.md` (requisitos).

- [x] **1. `CaseForm.tsx` — clase `hearing-notes-box` en la
  `<section>` de Hearing notes.** `rows={3}` → `rows={2}` también.
- [x] **2. `styles.css` — `.hearing-notes-box h2` y
  `.hearing-notes-box textarea` con tamaños menores.**
- [x] **3. Verificar.** `npm run typecheck` limpio. Probado en vivo
  contra localhost (caso real TEST-01): screenshot confirma caja
  compacta (textarea `min-height: 60px` real, título visiblemente más
  pequeño que "General"/otros `<h2>` de caja); resto de la página
  (General, pestañas, Save/Download) sin cambios visuales. Pendiente
  confirmar contra el entorno desplegado tras "Pull and redeploy".

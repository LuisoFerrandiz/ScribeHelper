# SPEC-018 — Caja "Hearing notes" más compacta

Estado: draft.

Relacionado: `SPEC-017-hearing-notes.md` (construyó la caja; esta spec
solo le ajusta tamaño/tipografía, sin tocar su comportamiento).

## Intención

La caja "Hearing notes" (SPEC-017) usa hoy el `<textarea>` genérico de
la app (`min-height: 42vh`, `font-size: 1.05rem` — pensado para las 4
cajas de redacción, de contenido largo) y el `<h2>` genérico de
`.box`. Al ser una caja de notas rápidas, siempre visible, el dueño la
quiere más pequeña: área de texto más baja, letra más pequeña (texto y
título).

## Alcance

**Dentro:**
- Área de texto de "Hearing notes" más baja y con letra más pequeña.
- Título "Hearing notes" con letra más pequeña que el resto de
  cabeceras `<h2>` de caja.
- Cambio acotado a esta caja únicamente, vía una clase nueva — no
  afecta al `<textarea>` genérico usado por las 4 cajas de redacción
  ni por Review, ni a ningún otro `<h2>` de `.box`.

**Fuera de esta spec:**
- Cualquier cambio de comportamiento (Process, disparo automático,
  persistencia) — ya cerrado en SPEC-017, sin tocar.

## Requisitos funcionales

- **RF-001 — Área más baja.** El `<textarea>` de Hearing notes ocupa
  visiblemente menos alto que antes, sin afectar la altura de ningún
  otro `<textarea>` de la app.
- **RF-002 — Letra más pequeña, texto y título.** El texto escrito y
  el `<h2>Hearing notes</h2>` se ven en un tamaño de letra menor que
  antes, sin afectar ningún otro `<h2>` de caja ni ningún otro
  `<textarea>`.

## Decisiones técnicas

- Clase nueva `.hearing-notes-box` en la `<section>` que envuelve la
  caja, con reglas CSS específicas para su `textarea`/`h2` — no se
  toca la regla genérica `textarea`/`.box h2` ni se introduce un
  componente nuevo.

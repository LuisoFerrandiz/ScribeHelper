# Scribe Helper — Decision Log

> Every significant decision, with the alternatives that were on the table
> and the reason one was chosen. This exists because in six months nobody
> remembers what problem a decision was solving, and undoing a decision
> without knowing its reason is how projects break.
>
> **Append only.** To change a decision, add a new entry that supersedes
> the old one. Do not edit history.

Format: `D-NNN` · date · status (`accepted`, `superseded by D-NNN`, `revisited`)

---

## D-001 · 2026-09-11 · accepted
### v1 covers protests only

**Options**
- Protests and requests for redress together
- Protests only

**Decision:** protests only.

**Why:** redress hearings have a different form and a different flow.
Building both at once doubles the surface before either is proven in a
real event.

**Consequence:** the data model must leave room for redress, so adding it
later is additive rather than a rewrite. Nothing else is built for it now.

---

## D-002 · 2026-09-11 · accepted
### The product is entirely in English

**Decision:** interface, buttons, menus, error messages, code, field names
and project documents are all in English.

**Why:** the defined terms of the racing rules are native to English and
carry exact technical meaning that does not survive translation. Drafting
in English means the tool's vocabulary matches the authoritative
vocabulary, with no translation layer to get wrong.

**Consequence:** no i18n layer, no language switching. This removes a whole
category of work.

---

## D-003 · 2026-09-11 · accepted
### Single user, local first. No accounts in v1.

**Options**
- Build multi-user from the start
- Build for one user, add sharing later

**Decision:** one user, running locally.

**Why:** the owner is the only user. Accounts, roles and permissions are
the classic sink for personal projects that will "one day" be multi-user.

**Consequence and the condition attached:** the application must not
hardcode the assumption that the person opening it is the owner. Whether
authentication is required is a matter of configuration, not of rewriting
the application. See D-012.

---

## D-004 · 2026-09-11 · accepted
### Nothing is cited unless it is in the corpus

**Decision:** an iron rule. Any rule number the system cannot trace to
loaded text does not get produced.

**Why:** a language model citing rules from memory invents numbering with
total confidence. In a protest, a misquoted rule is not a bug; it is a
badly founded decision. This risk grows when other judges use the tool,
because they sign what the tool produced.

**Consequence:** Phase 4 includes a validation pass that rejects rule
numbers absent from the corpus. Every rule statement shows where it came
from, from the first version.

---

## D-005 · 2026-09-11 · accepted
### No .docx export in v1. Copy-paste per box instead.

**Options**
- Fill the existing .docx template with placeholders
- Build the document from scratch with a document library
- No export; a copy button per box

**Decision:** copy button per box, plus a copy-all in form order.

**Why:** export was the least valuable and most tedious block of work. It
also carried a library licensing question that no longer needs answering.

**Consequence:** the application's boxes must still mirror the form
exactly, with the same names in the same order, so export can be added
later by connecting a wire. Two cheap safeguards against copy-paste
mistakes: a visual indicator of which boxes have been copied, and a
copy-all button.

**Revisit when:** export is wanted. This is a deliberate deferral, not a
rejection.

---

## D-006 · 2026-09-11 · accepted
### Editor: CodeMirror 6. TipTap rejected.

**Options**
- CodeMirror 6
- TipTap (ProseMirror)
- A standalone React ghost-text component

**Decision:** CodeMirror 6.

**Why, primary reason:** TipTap's official AI autocompletion (Content AI)
installs from a private registry, depends on TipTap's backend service and
requires a paid subscription on an eligible plan. It ships with
out-of-the-box support for OpenAI's models, and connecting a custom LLM
backend is reserved for the business plan. This project uses Claude and is
self-hosted. Paying a monthly subscription for the privilege of connecting
Claude is not defensible here.

**Why, secondary reasons:** CodeMirror covers both suggestion mechanisms
in one engine and at no cost. MIT-licensed inline-suggestion extensions
exist for ghost text; the native autocomplete extension, with a custom
completion source using `matchBefore`, covers the deterministic phrase
library.

**Why the standalone component was rejected:** it solves AI ghost text but
not the deterministic phrase library, leaving two autocomplete systems
built on different technologies fighting over the same key.

**Risks accepted:**
- CodeMirror is a code editor in disguise. Line wrapping must be enabled
  explicitly and the code-editor styling must be removed.
- Browser spellcheck works but must be enabled explicitly. This matters:
  all drafting is in English. **Verify this early, not in Phase 5.**
- If rich text (bold, lists) is ever needed, migration is required. The
  current form has no rich formatting in any box, so this is judged
  unlikely.

**Implementation note:** debounce the completion trigger and close any open
completion on each keystroke. Without this, every keypress fires a request,
which here means money per keystroke.

---

## D-007 · 2026-09-11 · accepted
### Three separate material stores: rules, examples, phrases

**Decision:** `rules/` is authority, `examples/` is style, `phrases/` is
the user's own wording. They are never merged.

**Why:** they have different levels of trust. A phrase written by the user
must never be presented as a rule. An example decision must never be cited
as authority.

**Naming:** `phrases/` was chosen over `boilerplate/`. Both are correct;
*boilerplate* is the legal-drafting term. `phrases/` explains itself to
anyone picking up the project cold. Renaming later touches folder,
database, API and UI at once, which is why it was decided up front.

---

## D-008 · 2026-09-11 · accepted
### The rules corpus is layered, and the layers have precedence

**Decision:** permanent material (RRS, class rules) and event material
(NoR, SIs, amendments) live in separate directories. Event material is
replaced at every regatta.

**Why:** sailing instructions and their amendments **modify** the RRS.
Citing the RRS while ignoring an event amendment yields a citation that is
correct and a decision that is wrong.

---

## D-009 · 2026-09-11 · accepted
### Everything is stored as Markdown, whatever it arrives as

**Decision:** PDF, Excel, Word and Markdown all enter; `.md` is the only
stored format. Conversion happens inside the application, once, at import.

**Why:** one format for the AI to read, one format for the index, no
per-format branching in the code.

**Attached decisions:**
- The **original is always kept** next to the `.md`. Conversion loses
  things, particularly tables and numbering.
- Conversion is **reviewable**: the user accepts or rejects the Markdown.
  Rejecting deletes everything, original included, leaving no orphans.
- **The `.md` is never hand-edited.** To fix a bad conversion, the user
  repairs the source outside the system and re-uploads.
- **Deleting the `.md` regenerates it** from the original and sends it back
  through review. Deleting is the "redo this" button.
- **Empty or near-empty conversion raises a warning.** That is what a
  scanned PDF looks like, and without the warning a rulebook can be
  "loaded" and empty exactly when it is needed.

**Open:** the conversion library has not been chosen. Decide in Phase 3,
verifying current options rather than picking from memory.

---

## D-010 · 2026-09-11 · accepted
### No OCR

**Decision:** scanned documents are processed by the user before upload.

**Why:** OCR is a heavy dependency inside the container, and the user's
workflow already handles it externally.

---

## D-011 · 2026-09-11 · accepted
### SQLite, not Postgres. FTS5, not a vector database.

**Decision:** SQLite as a file inside `data/db/`. SQLite FTS5 for corpus
search.

**Why:** one user, one writer. SQLite needs no container and no
administration, and the backup is a folder copy. For a corpus this size,
parsing the RRS by rule number and searching by keyword is more precise
and cheaper than embeddings.

**Consequence:** keep the data layer cleanly separated so moving to
Postgres is roughly a day's work if concurrent writing ever arrives.
Semantic search can be added later if keyword search proves insufficient.

---

## D-012 · 2026-09-11 · accepted
### Built to be containerised from day one

**Decision:** the target is the owner's home server (Ubuntu, CasaOS,
Portainer), as a multi-container stack.

**Rules adopted now, because they are free now and painful later:**
- All configuration through environment variables in `.env`. Nothing
  hardcoded.
- All data under a single `data/` directory, which becomes the mounted
  volume and doubles as the complete backup.
- Relative paths only. No Windows paths anywhere in the code.
- The server listens on `0.0.0.0`, not `localhost`. Inside a container,
  `localhost` is unreachable from outside. This is the most common
  first-time containerisation error.
- **Timezone via environment variable.** Containers default to UTC, and
  decisions carry the time the parties were informed, which must be event
  time.

**Consequence:** the `Dockerfile` and `docker-compose.yml` are written at
the end of Phase 1, even though they are not used yet, because they force
the directory structure to be correct.

**Deferred:** authentication. Running on a server means the assumption
behind D-003 no longer holds. Phase 5.5.

---

## D-013 · 2026-09-11 · accepted
### File sync exclusions

**Context:** the project lives under a path on the owner's PC that is
synchronised with Syncthing. (Synology Drive is disabled on both machines
and survives only in the folder name.)

**Decision:** a `.stignore` excluding `node_modules/`, build artifacts,
`.git/`, `data/db/` and Syncthing's own conflict files.

**Why:** real-time sync over thousands of small files corrupts
repositories, and syncing a live SQLite file mid-write corrupts the
database.

**Standing risk:** if the application ever runs on both the PC and the
server while the folder is synced, two processes would write the same
SQLite file. That is why `data/db/` is excluded. Database backup is a
periodic copy, not sync of the live file.

---

## D-014 · 2026-09-11 · accepted
### Rules Applicable stored as a separate table, not a text column

**Options**
- A `rules_applicable TEXT` column on the case, same as the other three
  written boxes
- A separate `case_rule_citation` table, one row per citation, free text
  in Phase 1

**Decision:** separate table.

**Why:** Rules Applicable is a hybrid (CONTEXT.md section 4): human-written
in Phase 1, but meant to come from a closed, validated list backed by the
corpus once Phase 3 exists. A table of rows survives that transition
without a schema change or a data migration; a single text column would
need to be split into rows later, migrating existing case data.

**Consequence:** in Phase 1 `case_rule_citation.rule_reference` is free
text, ordered by `position`, with no validation. Phase 3 adds corpus
validation on top of the same table.

---

## D-015 · 2026-09-11 · accepted
### Table named `protest_case`, not `case`

**Decision:** the case table is `protest_case`.

**Why:** `CASE` is a reserved SQL keyword. Using it as a table name works
in SQLite but forces quoting everywhere and invites mistakes.

**Consequence:** none beyond the name. Same content as the `case` entity
described in CONTEXT.md and RULES.md.

---

## D-016 · 2026-09-11 · accepted
### SQLite access via node:sqlite, not better-sqlite3

**Options**
- `better-sqlite3` — the more established library, native C++ addon
- `node:sqlite` — built into Node.js since 22.5, no external dependency

**Decision:** `node:sqlite`.

**Why:** `better-sqlite3` has no prebuilt binary for this Node version on
this machine and failed to compile from source (`node-gyp` could not find
a Visual Studio C++ toolchain on Windows). `node:sqlite` ships with Node
itself, needs no native compilation on any platform, and its synchronous
API (`prepare`, `.run`, `.get`, `.all`) is compatible with the code already
written against it.

**Consequence:** `engines.node` in `apps/api/package.json` set to
`>=22.5.0`. The Docker image (Phase 1 Step 4) must use a matching Node
version. Removes a native-dependency risk from containerisation (D-012)
entirely, at no cost found so far.

---

## D-017 · 2026-09-11 · accepted
### Copy-per-box covers all 8 form sections, not only the 4 human-written boxes

**Options**
- Copy button only on Procedural Matters, Facts Found, Conclusion, Decision
  — the four boxes CONTEXT.md section 4 names as "the only places where
  writing assistance applies"
- Copy button on all 8 sections of the fixed structure (Parties, Witness,
  Procedural Matters, Facts Found, Conclusion, Rules Applicable, Decision,
  Jury Members)

**Decision:** all 8 sections.

**Why:** "writing assistance" (section 5, phrase library and AI) is a
narrower concept than "copy to clipboard" (section 3, in scope for v1).
The whole document, auto-filled sections included, gets pasted into the
official decision one piece at a time. D-005 describes the boxes as
mirroring the form "exactly" for future export, which reads as the whole
form, not a subset.

**Consequence:** Parties, Witness, Rules Applicable and Jury Members are
formatted from structured data into plain text for copying (`format.ts`).
Jury Members is shown read-only in the case form — it belongs to the
event (CONTEXT.md section 4) and is edited from the event screen, not
duplicated as an editable control per case.

---

## D-018 · 2026-09-15 · accepted
### Event/case creation moved from forms to a find-or-create picker

**Options**
- Keep the explicit "New event" and "New case" forms (Name/Venue/Timezone;
  Case number/Day/Race) as the only way to create rows
- Remove those forms; a regatta/case picker at the top of the case screen
  resolves free text against existing rows, and creates one when there is
  no match

**Decision:** the picker. `EventList` becomes a read-only list (click to
open); a new `CaseSelector` component, shown above `CaseForm`, holds two
`<input>` + `<datalist>` fields (regatta, case number) and a Go button that
finds-or-creates both, matching the existing `findOrCreatePerson`/
`findOrCreateBoat` pattern already used for parties and jury.

**Why:** the judge works during a live regatta and wants to jump between
cases without a multi-screen click path; typing a name they already used
should just select it, typing a new one should just work.

**Consequence:** a new event created this way gets `venue: null,
timezone: 'UTC'` — editable later from the event list only by direct DB
access today, since there is no edit form yet (open question below). A new
case gets `day: null, race: null`, filled in by hand in the case form as
before. No backend changes: purely client-side find-or-create against
`/events` and `/cases`, same as the existing person/boat pattern.

**Open:** no UI yet to edit an event's venue/timezone after auto-creation,
or a case's event assignment after auto-creation. Revisit if this proves
annoying in practice.

---

## D-019 · 2026-09-15 · accepted
### Events list screen removed; Case screen is the app's entry point

**Options**
- Keep Events list as the landing screen, Case screen reached by
  drilling down through it
- Remove Events list; land directly on the Case screen (its
  `CaseSelector` already finds-or-creates the regatta, per D-018)

**Decision:** removed. `EventList.tsx` and `EventDetail.tsx` deleted.
`App.tsx` now holds a flat tab bar (`Case` / `Jury` / `Upload examples` /
`Upload rules`) instead of a drill-down view stack.

**Why:** during a live regatta the judge works case-by-case; a landing
list of regattas added a click with no value once the picker already
covers lookup and creation.

**Consequence:** Jury management (previously part of `EventDetail`) is
now `JuryPanel.tsx`, a utility reached from the top nav, scoped to
whichever regatta `CaseSelector` currently has selected (`currentEventId`
in `App.tsx`). The nav also gets two upload utility buttons for Phase 3
(`Upload examples`, `Upload rules`), currently `UploadPlaceholder.tsx`
stubs pending the ingestion backend.

---

## D-020 · 2026-09-15 · accepted
### Phase 3 ingestion: `resource` table, FTS5, per-format Node conversion

**Decision:** one `resource` table for both rules and examples (kind
column), storing original + converted paths relative to `dataDir`
(CONTEXT.md section 8 layout). Conversion via per-format Node libraries,
verified against DECISIONS.md D-009's open question:

- `.md`/`.markdown` — passthrough
- `.pdf` — `pdf-parse` v2 (class-based `PDFParse.getText()` API; its v1
  function-call API is gone in this version)
- `.docx` — `mammoth.convertToMarkdown` (present at runtime; its bundled
  `.d.ts` is stale and omits it, so the call is cast narrowly in
  `convert.ts` rather than typed through the package's own types)
- `.xlsx`/`.xls` — `xlsx`, sheets rendered as HTML tables (valid inside
  Markdown, handles merged/ragged cells better than a hand-rolled pipe
  table)

Upload is multipart (`@fastify/multipart`), FTS5 confirmed working under
`node:sqlite` (tested directly: `CREATE VIRTUAL TABLE ... USING fts5`
succeeds). Only accepted `kind = 'rule'` rows are indexed into
`resource_fts` — examples are never cited (D-007), so never searched for
citation purposes.

**Why one shared table instead of two:** rules and examples go through
the identical upload → convert → review → accept/reject flow (D-009);
splitting into two tables would duplicate every column and every route.
What differs (layer vs scope, FTS indexing) is handled with nullable
columns and a CHECK constraint tying them to `kind`.

**Reject deletes the row, not just the files:** CONTEXT.md section 7 says
reject leaves "no orphans" for files; extended here to mean no orphan
database row either, since a rejected resource carries no information
worth keeping. `status` therefore only has two values in practice
(`pending_review`, `accepted`); no `rejected` value.

**Open risk, unverified:** `pdf-parse` v2 depends on `@napi-rs/canvas`, a
native (Rust/napi-rs) binary. It should resolve a `linux-musl-x64`
prebuild automatically when `npm ci` runs inside the `node:24-alpine`
Docker build (D-012), same as any napi-rs package, but this has not been
verified by actually building the image — no Docker on this dev machine.
If the Alpine build fails on this dependency, the fallback is `pdfjs-dist`
directly (drop `pdf-parse`'s wrapper, use its text-extraction API without
the canvas-only image/screenshot features this project never calls).

---

## D-021 · 2026-09-15 · accepted
### Jury Members: per-case panel, not fixed for the whole event

**Context:** CONTEXT.md section 4 states jury members "belong to the
event, not the case." In practice (user's correction), judges rotate
between hearings at the same regatta — the panel sitting on one protest
is usually not the same as on the next one.

**Options**
- Keep jury fixed per event (as documented), shared read-only by every
  case
- Move jury entirely to the case, no event-level concept at all
- Two-tier: an event-level judge pool (added once) + a per-case panel
  picked from that pool, chairman decided per case

**Decision:** two-tier. `jury_member` (event, person, is_chairman)
becomes the event's judge pool — `is_chairman` there is now vestigial,
kept only for old rows, meaningless going forward. New table
`case_jury_member` (case, person, is_chairman) holds the panel actually
sitting on one case. Not FK-enforced against the pool — the pool is a
picker convenience, not a hard membership rule (consistent with Rules
Applicable being free text in Phase 1, D-014).

**Why not drop the event-level pool entirely:** the same handful of
judges typically works most hearings at a given regatta; without a pool,
every case would retype the same few names from scratch. The pool keeps
"enter once" (CONTEXT.md section 1) while the panel itself is picked per
case.

**Consequence:**
- `JuryPanel.tsx` (Jury utility, top nav) manages the pool only — no
  chairman toggle there any more.
- `CaseForm.tsx`'s Jury Members box is now editable (previously
  read-only): add/remove from the case's panel, chairman picked per
  case, choices offered from the datalist of the event's pool.
- `GET /cases/:id/full`'s `jury` array now reads from `case_jury_member`
  joined on `case_id`, not `jury_member` joined on `event_id`.
- This directly contradicts CONTEXT.md section 4's current wording,
  which should be corrected the next time that document is revised by
  its author — not done here per the standing rule against editing those
  three files without being asked.

---

## D-022 · 2026-09-15 · accepted
### Phase 2 phrase library, seeded from World Sailing's Preferred Standard Wording

**Context:** user has the World Sailing "Preferred Standard Wording"
spreadsheet (9 sheets: Procedural Matters, Validity, Protest/Redress
Conclusions, Protest/Redress Decisions, NO Hearing, Reopenings) — public
guidance wording with bracketed placeholders (`[X]`, `[##]`), organized
by which part of a decision each fragment belongs to.

**Decision:** built Phase 2 (CONTEXT.md phase table) around this file
instead of starting the phrase library empty. New `phrase` table
(box, label, body, origin) + `phrase_fts` (FTS5, same pattern as
`resource_fts`, D-020). `origin` reuses the base/own split already
established for examples (D-007): `base` = seeded, not user-editable or
deletable; `own` = saved by the user from a box's current text
(`POST /phrases`, "Save current text as phrase" in `PhrasePicker.tsx`).

**Sheet → box mapping**, decided when proposing this to the user:
Procedural Matters → `procedural_matters`; Validity, Protest/Redress
Conclusions, Reopenings → `conclusion`; Protest/Redress Decisions →
`decision`. "NO Hearing" is structured differently (one label heading
four grouped lines: Suggested Fact / Conclusion / Decision Short /
Decision) and is parsed specially (`seedPhrases.ts`), splitting each
group across `facts_found`, `conclusion` and `decision`.

**Seeding mechanics:** the spreadsheet ships in the repo at
`apps/api/seed/preferred-standard-wording.xlsx` (Dockerfile copies it
into the image). `seedBasePhrases()` runs from `migrate.ts` on every
container start, idempotent by checking `COUNT(*) WHERE origin='base'`
first — not a unique constraint, since near-duplicate wording rows in
the source are legitimate, not bugs.

**What this is not:** deterministic inline completion (ghost text) or
ranking phrases by keystroke context — CONTEXT.md's "deterministic
completion" and D-006's CodeMirror migration are still open. This is the
browse/search/insert/save half of Phase 2, using plain textareas.

---

## D-023 · 2026-09-15 · accepted
### Reclassify endpoint for resources; fixed an FTS5 type-coercion bug

**Context:** user had uploaded several files as `kind: 'rule'` that were
actually examples.

**Decision:** `POST /resources/:id/reclassify` (body: `kind`, `layer`
or `scope`, optional `event_id`) moves the markdown file to the correct
directory (`storage.ts`'s new `moveMarkdown`) and updates the row,
instead of requiring delete + re-upload + re-convert. `ResourceUpload.tsx`
exposes it as a "Move to examples/rules" button in the preview panel.

**Bug found and fixed while testing this:** `DELETE FROM resource_fts
WHERE resource_id = ?` (and the equivalent in `phrase_fts`) was being
called with the string `id` straight from `req.params`, never matching
the integer stored in that `UNINDEXED` FTS5 column — confirmed directly
against `node:sqlite`: an ordinary table coerces `'1'` to match integer
`1` in a WHERE clause, but an FTS5 virtual table's UNINDEXED column does
not apply that affinity coercion. Practical effect: reclassifying a rule
to an example (or deleting an accepted resource, or deleting a phrase)
left a stale row in the FTS index — search kept surfacing content that
should have disappeared. Fixed everywhere by wrapping the id in
`Number(id)` before comparing against `resource_id`/`phrase_id`.

**Consequence:** any future FTS delete-by-id must remember this — it is
not a one-off typo, it is how UNINDEXED columns behave in this SQLite
build.

---

## D-024 · 2026-09-15 · accepted
### Phase 4: AI draft panel, Anthropic API, per-box citation check

**Options**
- Anthropic API vs OpenAI vs a local model
- API key in `.env` (server-side) vs pasted into the UI and stored in the DB
- Citation validation: check existence in the uploaded corpus, check RRS
  reference format only, or both

**Decision**
- Anthropic API (`@anthropic-ai/sdk`, model `claude-sonnet-5`), called
  only from `apps/api/src/ai/draft.ts` — the first and only place in the
  app that reaches the network (RULES.md R-23 exception, ordering per
  R-34 and CONTEXT.md section 9: this comes after every offline-capable
  phase).
- `ANTHROPIC_API_KEY` read from the environment (`.env` → docker-compose
  → container), same pattern as every other deployment setting. Missing
  key returns a clear 502 from `POST /cases/:id/draft`, not a silent
  no-op.
- One request drafts one box (`procedural_matters`, `facts_found`,
  `conclusion`, `decision` — the same four as the phrase library, D-022).
  The prompt is built only from that case's own saved rows (parties,
  witnesses, the other boxes' current text, and its already-added rule
  citations) — never from other cases, and the model is told not to cite
  outside the rules it was given.
- Citation check = existence only: every `RRS n`/`Rule n` reference the
  model outputs is extracted (`extractCitations`, keyword-gated regex so
  ordinary numbers like a race number are never treated as a citation)
  and checked as a plain substring against the accepted rule corpus's
  converted Markdown (`validateCitations`). Not an FTS5 `MATCH` — a
  reference like `42.1(a)` has punctuation the FTS5 tokenizer splits on,
  same class of gotcha as D-023's UNINDEXED-column bug, so a phrase MATCH
  would misbehave; plain substring search on the small corpus is simpler
  and correct.
- Nothing is written to the case automatically. The panel
  (`AIDraftPanel.tsx`) shows the draft text and a found/not-found line per
  citation; the drafter presses Insert, same one-way flow as the phrase
  picker.

**Consequence:** deploying this feature requires setting
`ANTHROPIC_API_KEY` in the server's `.env` (Portainer "Repository" method
picks it up automatically, same as every other variable). Leaving it
unset keeps the rest of the app fully offline — the draft panel is the
only feature affected.

**Follow-up (same day):** the first version only sent the model each
cited rule's *reference string* ("RRS 42.1(a)"), never the rule's actual
text — the corpus was used solely to check the model's citations after
the fact, not to ground the draft while writing it. Fixed by loading the
accepted rule corpus once per request and pulling a ~500-character
excerpt around each cited reference's first match
(`loadAcceptedRuleCorpus`/`findExcerpt` in `apps/api/src/ai/draft.ts`),
included in the prompt as that rule's text; the system prompt now tells
the model to state what a rule requires only when its text was given,
never guess from the bare number. The same loaded corpus is reused for
the post-hoc citation check, so it is read from disk once per request,
not twice.

---

## D-025 · 2026-09-15 · accepted
### Phase 5: inline ghost-text completion, automatic + Haiku 4.5

**Options**
- Trigger: manual shortcut (request a continuation on demand) vs
  automatic ghost text after a typing pause (Copilot-style)
- Model: same as the draft panel (`claude-sonnet-5`) vs a faster/cheaper
  one, given this fires far more often

**Decision**
- Automatic: after `DEBOUNCE_MS` (900ms) of no typing, with the cursor
  at the end of the box and at least `MIN_CHARS` (15) characters typed,
  `GhostTextarea` (`apps/web/src/components/GhostTextarea.tsx`) requests
  a continuation and shows it as gray text after the cursor. Tab accepts
  it (appended to the real value); typing, moving the cursor, or Escape
  drops it. Only fires when the cursor is at the very end of the text —
  mid-text ghost completion is out of scope for this phase.
- Model: `claude-haiku-4-5-20251001`, a separate route
  (`POST /cases/:id/complete`, `apps/api/src/ai/complete.ts`) from the
  draft panel's — short output (`max_tokens: 60`), only the last 1500
  characters of the box sent as context, and the system prompt forbids
  introducing a new rule citation, boat, person, or fact: it continues
  wording already committed to, it does not draft new content the way
  the Phase 4 panel does. No corpus grounding here (D-024's excerpt
  lookup) — the cost/latency of reading the corpus on every keystroke
  pause was not worth it for a completion this short.
- Ghost text itself is a same-metrics mirror `<div>` behind the real
  `<textarea>` (`.ghost-textarea` CSS): the mirror's copy of the real
  text is `color: transparent` (the textarea draws the real glyphs on
  top, in the same position), and only the suggestion appended after it
  shows through the textarea's transparent background. Known limitation:
  the mirror does not track textarea scroll position, so a heavily
  scrolled box (long text, few visible rows) can misalign — accepted for
  this phase rather than syncing scroll, since the four boxes are short
  in practice.

**Consequence:** every one of the four free-text boxes now fires an API
call on a ~1 second typing pause whenever the drafter is actively
writing — distinct from Phase 4's on-demand draft panel, this is
metered, continuous usage. Kept cheap on purpose (Haiku, short output,
truncated context) but it is the first feature in the app whose cost
scales with how much you type, not with how many times you click a
button.

---

## Open questions

Not yet decided. Listed so they are not silently forgotten.

- **Prompt caching** for the rule corpus and system prompts — worth
  revisiting once real usage volume is known; Phase 4 and 5 both settled
  their models (`claude-sonnet-5`, `claude-haiku-4-5-20251001`) but ship
  without caching.
- **Network exposure** of the deployed instance: local network only, or
  reachable from outside. Phase 5.5.

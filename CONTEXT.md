# Scribe Helper — Context

> Read this first. It explains what the project is, who it serves, and what
> is deliberately left out. For *why* things were decided the way they were,
> see `DECISIONS.md`. For the non-negotiable working rules, see `RULES.md`.

Last updated: 2026-09-11

---

## 1. What this is

Scribe Helper is a drafting assistant for **sailing race protest decisions**.

It helps a judge write the written decision that follows a protest hearing.
It does **not** decide anything. The human decides; the tool removes typing,
removes re-entry of data already known, and makes the applicable rules easy
to find and cite correctly.

Two things it does that a blank document does not:

1. **Reuses what is already known.** Event, race, day, boats, sail numbers,
   parties, representatives, witnesses, jury members. Entered once, never
   retyped.
2. **Suggests wording.** Two separate mechanisms, described in §5.

## 2. Who uses it

- **Primary user: one person, the project owner.** A judge, writing real
  decisions at real events.
- **Secondary, later: temporary access for other judges.** This is a future
  phase, not a v1 requirement. The application must not hardcode the
  assumption that the person opening it is the owner, but no accounts,
  roles, or permissions are built in v1.

## 3. Scope

### In scope for v1

- Protest decisions only.
- Case data entry matching the existing decision form.
- Phrase library (deterministic, no AI).
- Rules corpus with traceable citation.
- AI panel that proposes a complete alternative draft.
- AI inline completion while typing.
- Copy-to-clipboard per box.

### Explicitly out of scope for v1

Listed so nobody rediscovers them as "missing features":

- **Requests for redress.** Planned for a later phase. The data model
  should leave room for them; nothing else.
- **Document export (.docx).** Replaced by copy-paste per box. The box
  structure must still mirror the form exactly so export can be added
  later by connecting a wire, not by redesigning.
- **Manual editing of converted Markdown.** The user fixes source files
  outside the system and re-uploads.
- **OCR.** Scanned PDFs are processed by the user before upload.
- **Accounts, login, roles.** See §2.
- **Multi-user concurrent writing.** SQLite is chosen accordingly.

## 4. The decision document

The form is the spine of the data model. Three layers:

### Fixed structure

Labels and ordering. Never change: Parties, Witness, Procedural Matters,
Facts Found, Conclusion, Rules Applicable, Decision, Jury Members.

> Note: the source template file spells this label "Fact Founds". The
> correct term is **Facts Found**. Scribe Helper uses the correct spelling.

### Auto-filled data

Never typed twice:

- Case number, Day, With Case(s), Race
- Initiator and Respondent: sail number, boat name
  (reference examples: *Deep Blue*, *Capricornio*)
- Represented by, for each party
- Witnesses with their Role
- Date and time the parties were informed
- Panel Chairman and jury members (these belong to the event, not the case)

### Human-written boxes

Only four. These are the only places where writing assistance applies:

- Procedural Matters
- Facts Found
- Conclusion
- Decision

**Rules Applicable is a hybrid**: written by the human, but drawn from a
closed, validated list backed by the corpus.

## 5. The two suggestion mechanisms

They are separate systems, not two modes of one system.

| | Inline completion | Alternative draft panel |
|---|---|---|
| Where | In the editor, as ghost text | A separate panel |
| What | Finishes the sentence being typed | A complete alternative version |
| Accept | Tab | Accept, edit, or ignore |
| Source | Phrase library (deterministic) and AI | AI |

The **phrase library is the important half**. It is deterministic: exact
prefix matching against phrases the user saved. Instant, free, offline,
incapable of hallucinating. It covers a large share of real drafting
without any AI involved at all.

The library is not built in a separate screen. The user **selects text
while drafting and saves it as a phrase**. It grows through use.

Two kinds of phrase, distinguished from day one:

- **Fixed** — inserted verbatim.
- **With gaps** — the application must know where to place the cursor.

## 6. The three material stores

Three kinds of uploaded material. They behave differently and must never
be merged.

### `rules/` — authority

Racing Rules of Sailing, class rules, Notice of Race, Sailing Instructions,
amendments, Cases and Calls. **This is the only material that may be cited.**

It is **layered, and the layers have precedence**:

1. RRS — stable for a quadrennium, global
2. Class rules — stable for a season
3. NoR and SIs — specific to the event
4. Amendments to the SIs — change during the event, sometimes mid-day
5. Cases, Calls, national appeals — interpretive, not prescriptive

**Layers 3 and 4 modify layer 1.** A sailing instruction can change a rule
of the RRS. Citing the RRS while ignoring an event amendment produces a
citation that is correct and a decision that is wrong. This is the worst
class of error: one that looks well founded.

Consequence for storage: **permanent material and event material are kept
in separate directories.** Event material is replaced at every regatta.

### `examples/` — style

Previous decisions, in the style of those published on a major event notice
board. Used as style samples for the AI and as a searchable archive.

**Never cited as authority.** An example founds nothing.

Two sets, separated from the start:

- **Base** — ships with the project, identical for everyone, not editable
- **Own** — uploaded by the user, editable and deletable

### `phrases/` — the user's own wording

Reusable fragments the user writes, tagged by which box they belong to.

The legal-drafting term for this is *boilerplate*; in software it is
*snippets*. The project uses **`phrases/`** because the name explains
itself.

**A phrase is never presented as a rule.** Three stores, three treatments.

## 7. Ingestion

Files enter as **PDF, Excel, Word, or Markdown**. They are **always stored
as `.md`**. One internal format: one thing for the AI to read, one thing
for the index.

Flow:

1. User uploads a source file.
2. The system converts it to Markdown, once.
3. **The user reviews the Markdown and accepts or rejects it.**
4. Accept: the `.md` and the original are both kept.
   Reject: everything is deleted, original included. No orphans.

Rules of this flow:

- **The original is always kept** next to the `.md`. Conversion loses
  things, especially in tables and numbering. When something reads
  strangely, the original must be one click away.
- **Review matters most in `rules/`.** A PDF that converts badly and loses
  rule numbering will cause confident, wrong citation.
- **The `.md` is never edited by hand.** To correct a bad conversion, the
  user fixes the source file outside the system and re-uploads.
- **Deleting the `.md` regenerates it** from the original, and it goes
  through review again. Deleting is the "redo this" button.
- **If conversion yields an empty or near-empty result, warn.** This is
  what a scanned PDF looks like. Without the warning, a rulebook can be
  "loaded" and empty exactly when it is needed.
- **No OCR.** Scanned documents are processed by the user beforehand.

## 8. Architecture at a glance

Full rationale in `DECISIONS.md`.

- **TypeScript** throughout, front and back.
- **React + Vite** frontend, **CodeMirror 6** as the editor.
- **Node + Fastify** API. It exists so that **the API key never lives in
  the browser**.
- **SQLite** for data. One file, inside `data/`.
- **SQLite FTS5** for corpus search. No vector database in v1: the RRS is
  numbered and structured, so it is parsed by rule number and searched by
  keyword. More precise and cheaper than embeddings at this corpus size.
- **Docker**, multi-container stack, run on the owner's home server
  (Ubuntu, CasaOS, Portainer) in a later phase.
- Configuration via `.env`. All data under `data/`, which is both the
  mounted volume and the complete backup.

### Directory layout

```
scribe_helper/
  .env                  # never committed
  .env.example          # committed, no real values
  .stignore             # Syncthing exclusions
  docker-compose.yml
  CONTEXT.md
  DECISIONS.md
  RULES.md
  apps/
    web/                # React + CodeMirror
    api/                # Node + Fastify
  data/                 # the volume, and the backup
    rules/
      rrs/              # permanent
      class/            # per season
      event/            # replaced every regatta
    examples/
      base/             # ships with the project
      own/              # uploaded by the user
    phrases/
    originals/          # source files kept alongside their .md
    db/                 # excluded from file sync
```

## 9. Phases

Each phase ends with something usable. Nothing offline-capable is
postponed behind something that needs the network.

| Phase | Content | AI |
|---|---|---|
| 0 | These three documents, repo, folder structure | no |
| 1 | Data model, case form, copy per box, copy all, local save | no |
| 2 | Phrase library, deterministic completion, save-as-phrase | no |
| 3 | Corpus ingestion, conversion, review, FTS search, rule picker | no |
| 4 | Alternative draft panel, with citation validation | yes |
| 5 | Inline AI completion | yes |
| 5.5 | Deployment to the home server, volume, password | — |
| 6 | Sharing, requests for redress | — |

**The ordering principle:** everything that works offline and cannot fail
silently comes first. Everything that can be wrong in a convincing way
comes last.

**After Phase 2 the tool already saves real time at a regatta**, with no AI
and no network.

## 10. Language

- **The product is entirely in English**: interface, buttons, menus, error
  messages, code, field names, and these documents.
- Conversations between the owner and an AI assistant are currently in
  Spanish. That is a working convenience, not a product requirement.

Working in English is not only a delivery constraint; it is an advantage.
The defined terms of the racing rules are native to English (*keep clear*,
*clear astern*, *mark-room*, *proper course*, *obstruction*). They carry
exact technical meaning that does not survive translation. Drafting
directly in English means the vocabulary of the tool matches the
authoritative vocabulary of the rules, with no bridge in between.

## 11. Glossary

| Term | Meaning |
|---|---|
| RRS | Racing Rules of Sailing |
| NoR | Notice of Race |
| SI | Sailing Instructions |
| Protest | A claim that a boat broke a rule |
| Redress | A request that a boat's score be corrected; out of scope for v1 |
| Facts Found | The findings of fact, written by the jury |
| Boilerplate | Standard pre-written text; called `phrases` in this project |
| Corpus | The citable material in `rules/` |
| Ghost text | Greyed-out inline suggestion, accepted with Tab |

# Scribe Helper — Working Rules

> Rules that anyone continuing this project must follow. Human or AI.
>
> These are not style preferences. Each one exists because breaking it
> causes a specific failure, and the failure is named.
>
> If you need to break one, do not break it quietly. Add an entry to
> `DECISIONS.md` explaining why.

Last updated: 2026-09-11

---

## 1. Correctness of citation

**R-01 · Nothing is cited unless it is in the corpus.**
Any rule number that cannot be traced to text loaded in `rules/` does not
get produced. Not by the AI, not by a template, not by a fallback.
*Failure if broken:* a confidently invented rule number in a signed
decision.

**R-02 · Every rule statement shows its source.**
The user must be able to see the rule text behind any citation without
leaving the screen.
*Failure if broken:* the user cannot check, so they trust; and trust is
exactly what must not be required here.

**R-03 · Event material overrides permanent material.**
Sailing instructions and their amendments modify the RRS. Any retrieval
that touches a rule must consider whether the event layer changed it.
*Failure if broken:* a citation that is correct and a decision that is
wrong. The worst kind, because it looks well founded.

**R-04 · The three stores never mix.**
A phrase is never presented as a rule. An example is never cited as
authority. Only `rules/` is authority.
*Failure if broken:* the user's own past wording acquires the appearance
of legal force.

**R-05 · When the system is unsure, it says so.**
No plausible filler. An empty suggestion is better than a confident wrong
one. This applies to the AI panel, inline completion, and conversion.

## 2. The human decides

**R-06 · The tool never decides a case.**
It proposes, fills, finds and formats. Facts Found, Conclusion and
Decision are authored by the human. Suggestions are always accept, edit,
or ignore.

**R-07 · Nothing is inserted without the user's action.**
No auto-accept, no silent replacement of text the user wrote.

**R-08 · Conversion is reviewed before it counts.**
Imported material is not usable until the user has seen the Markdown and
accepted it.

## 3. Data and files

**R-09 · Everything is stored as Markdown.**
PDF, Excel, Word and Markdown all enter. `.md` is the only stored format.

**R-10 · The original is always kept.**
Next to its `.md`, for as long as the `.md` exists. Rejecting an import
deletes both, leaving no orphans.

**R-11 · The `.md` is never hand-edited.**
It is always the product of conversion. To correct a bad conversion, fix
the source outside the system and re-upload. Deleting the `.md`
regenerates it from the original and sends it back through review.

**R-12 · Warn on an empty conversion.**
A near-empty result is what a scanned PDF looks like.
*Failure if broken:* a rulebook that is "loaded" and empty, discovered at
the exact moment it is needed.

**R-13 · All data lives under `data/`.**
Database, corpus, examples, phrases, originals. One directory, which is
also the mounted volume and the complete backup.
*Failure if broken:* containerisation becomes a puzzle and backup becomes
unreliable.

**R-14 · Permanent and event material stay in separate directories.**
Event material is replaced at every regatta. See R-03.

## 4. Code

**R-15 · Relative paths only.**
No Windows path, no absolute path, anywhere in the code. The same project
must run unchanged on the Ubuntu server.

**R-16 · All configuration through environment variables.**
Port, API key, paths, timezone. Nothing hardcoded.

**R-17 · The `.env` file is never committed.**
`.env.example` is committed, with variable names and no real values.
*Failure if broken:* the API key is in the Git history forever, even after
it is deleted from the working tree.

**R-18 · The API key never reaches the browser.**
This is the entire reason the backend exists. All model calls go through
the API.

**R-19 · The server listens on `0.0.0.0`.**
Not `localhost`. Inside a container, `localhost` is unreachable from
outside.

**R-20 · Timezone comes from configuration, never from the host.**
Containers default to UTC. Decisions record the time the parties were
informed, and that must be event time.

**R-21 · The application does not assume the user is the owner.**
Whether authentication is required is configuration, not a rewrite.

**R-22 · Keep the data layer separable.**
SQLite is the choice today. Moving to Postgres should be a day's work, not
a rewrite.

## 5. Offline and cost

**R-23 · Everything that is not AI works offline.**
Case form, phrase library, corpus search, copy buttons. Connections fail
at events; the tool must not.

**R-24 · Prefer the deterministic path.**
If a suggestion can be produced by exact matching against the phrase
library, do not call a model for it. Cheaper, faster, and incapable of
being wrong.

**R-25 · Debounce every model call, and cancel superseded ones.**
Close any open completion on each keystroke before triggering a new one.
*Failure if broken:* a request per keypress, which here means money per
keypress.

**R-26 · Use prompt caching for the corpus and system prompt.**
This is the single largest saving in this usage pattern.

## 6. Language

**R-27 · The product is in English.**
Interface, buttons, menus, error messages, code, field names, comments,
commit messages, and these documents.

**R-28 · Use the defined terms.**
*Keep clear*, *clear astern*, *mark-room*, *proper course*, *obstruction*
and the rest carry exact technical meaning. A paraphrase in Facts Found is
an error, not a stylistic choice. Suggestion mechanisms should steer
towards the defined term, never away from it.

**R-29 · The form's labels are authoritative, with one correction.**
Box names and their order mirror the decision form exactly. The one
deliberate departure: the source template reads "Fact Founds"; the correct
term is **Facts Found**, and Scribe Helper uses it.

## 7. Privacy

**R-30 · No real case content in examples shipped with the project.**
Base examples are published material or anonymised. Personal data of
competitors does not go into a repository.

**R-31 · A user's own material stays their own.**
When access is extended to other people, `examples/own` and `phrases/` are
per-user. Sharing the tool does not mean sharing case files.

## 8. Process

**R-32 · Every significant decision goes in `DECISIONS.md`.**
With the alternatives that were on the table and the reason. Append only;
supersede rather than edit.

**R-33 · Each phase ends with something usable.**
No phase leaves the tool in a state where it cannot be taken to a regatta.

**R-34 · Offline first, uncertain last.**
Everything that works without a network and cannot fail silently is built
before anything that can be wrong in a convincing way. This is why inline
AI completion is the last feature, not the first.

**R-35 · Verify product facts against current documentation.**
Model names, pricing, library licences and API behaviour change. Check
them at implementation time rather than relying on what was true when this
file was written.

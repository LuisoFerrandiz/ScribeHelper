# Graph Report - Scribe_helper  (2026-09-21)

## Corpus Check
- 60 files · ~96,746 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 15 file(s) not represented in the graph (top: (none) 13, .example 1, .css 1)

## Summary
- 316 nodes · 385 edges · 49 communities (17 shown, 32 thin omitted)
- Extraction: 95% EXTRACTED · 5% INFERRED · 1% AMBIGUOUS · INFERRED: 18 edges (avg confidence: 0.86)
- Token cost: 626,787 input · 0 output

## Community Hubs (Navigation)
- RRS Rules & Case Citations
- Web App UI Components
- API Server & Routes
- Web App Dependencies
- API Dependencies
- CaseForm Handlers & Formatting
- RRS Original PDFs & Cases
- Web TypeScript Config
- API TypeScript Config
- Architecture Decisions
- Product Scope Decisions
- Markdown Ingestion Flow
- Config & Deployment
- EventDetail Component
- Inline Completion & Phrases
- RRS Rules 30-62 PDFs
- OG24 Case 02 Rules
- Web Docker Entrypoint
- OG24 Case 08 & Rule 18.3
- OG24 Case 28 & Rule 66
- Web Entry Point
- Alternative Draft Panel
- Project Phases
- OG24 Case 12
- RRS Appendix PDF Doc
- RRS Parts PDF Doc
- RRS Rule 60
- RRS Rule 61
- Rule R02 Source Visible
- Rule R05 Say When Unsure
- Rule R06 Tool Never Decides
- Rule R07 No Silent Insert
- Rule R08 Conversion Reviewed
- Rule R14 Event Directories
- Rule R15 Relative Paths
- Rule R17 Env Not Committed
- Rule R18 API Key Server Only
- Rule R23 Offline Except AI
- Rule R26 Prompt Caching
- Rule R27 Product English
- Rule R28 Defined Terms
- Rule R29 Form Labels
- Rule R30 No Real Case Content
- Rule R31 Own Material Stays Own
- Rule R32 Decisions Logged
- Rule R33 Phase Ends Usable
- Rule R34 Offline First
- Rule R35 Verify Product Facts

## God Nodes (most connected - your core abstractions)
1. `CaseForm()` - 20 edges
2. `examples/ material store (style)` - 14 edges
3. `compilerOptions` - 13 edges
4. `compilerOptions` - 11 edges
5. `reload()` - 9 edges
6. `formatFullDecision()` - 8 edges
7. `SOF26 Protest 01 (GER v FRA, kite tacking incident + redress)` - 8 edges
8. `SOF26 Protest 01 - Formula Kite Men, GER v FRA` - 8 edges
9. `react` - 7 edges
10. `EventDetail()` - 7 edges

## Surprising Connections (you probably didn't know these)
- `OG24 Case 02 (49er BRA - equipment breach)` --conceptually_related_to--> `rules/ material store (authority)`  [AMBIGUOUS]
  data/examples/base/OG24_Case02_Final-e25c488d-e8af-44a6-b321-9c5e84367b01.md → CONTEXT.md
- `SOF26 Protest 02 (SGP v FRA, kiteboard avoiding action)` --conceptually_related_to--> `rules/ material store (authority)`  [AMBIGUOUS]
  data/examples/own/SOF26_Case_02_Final_pdf-942b7f22-8889-40e2-a98f-be0a88c297c7.md → CONTEXT.md
- `SOF26 Protest 10 (SWE v FRA, 49erFX, heard with case 13)` --conceptually_related_to--> `rules/ material store (authority)`  [AMBIGUOUS]
  data/examples/own/SOF26_Case_10_Final-4f289d53-9f3e-442e-abfc-597ff6fffc52.md → CONTEXT.md
- `OG24 Case 02 (49er BRA - equipment breach)` --conceptually_related_to--> `examples/ material store (style)`  [INFERRED]
  data/examples/base/OG24_Case02_Final-e25c488d-e8af-44a6-b321-9c5e84367b01.md → CONTEXT.md
- `OG24 Case 08 (ESP v IRL, mark-room)` --conceptually_related_to--> `examples/ material store (style)`  [INFERRED]
  data/examples/own/OG24_Case_08_Decision-fc4bbaf7-29b0-47ac-be59-980f186eccf8.md → CONTEXT.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Three material stores: rules (authority), examples (style), phrases (own wording)** — context_rules_store, context_examples_store, context_phrases_store, decisions_d007_three_material_stores [INFERRED 0.85]
- **Two suggestion mechanisms: phrase library and alternative draft panel, unified on CodeMirror with inline completion** — context_phrase_library, context_alternative_draft_panel, context_inline_completion, decisions_d006_codemirror_editor [INFERRED 0.85]
- **Ingestion review flow: convert, keep original, never hand-edit, warn on empty** — context_ingestion_flow, rules_r08_conversion_reviewed, rules_r09_everything_markdown, rules_r10_original_kept, rules_r11_md_never_hand_edited [INFERRED 0.80]
- **RRS 10 Port/Starboard Crossing Incidents (SOF26)** — data_originals_sof26_case_01_final_e5cefa28_b7d3_4b81_81db_f87589bc7966_case, data_originals_sof26_case_02_final_pdf_942b7f22_8889_40e2_a98f_be0a88c297c7_case, data_originals_sof26_case_05_final_bac9df4e_1782_48d0_ba9d_09849f0a1bc1_case, data_originals_sof26_case_09_final_6a4ad32a_5f0a_40b9_99f6_c1442045671e_case, data_originals_rrs_parts_9809480a_f5d7_411a_ada9_11ef039dc4d3_rule_10 [INFERRED 0.80]
- **International Jury Panel Composed Under N1.4(b)** — data_originals_sof26_case_05_final_bac9df4e_1782_48d0_ba9d_09849f0a1bc1_case, data_originals_sof26_case_08_final_d0e5eb58_5b97_425f_98ba_f4e8339234a6_case, data_originals_sof26_case_09_final_6a4ad32a_5f0a_40b9_99f6_c1442045671e_case, data_originals_sof26_case_10_final_4f289d53_9f3e_442e_abfc_597ff6fffc52_case, data_originals_rrs_appendix_d328d3b7_04f1_4a1d_a7a6_e1cda08ce2eb_n1_4_b [INFERRED 0.85]
- **RRS 11 Windward/Leeward Keep-Clear Incidents** — data_originals_og24_case_07_final_84d6da70_3e62_4906_a169_ea9915f0afc9_case, data_originals_sof26_case_08_final_d0e5eb58_5b97_425f_98ba_f4e8339234a6_case, data_originals_rrs_parts_9809480a_f5d7_411a_ada9_11ef039dc4d3_rule_11 [INFERRED 0.80]

## Communities (49 total, 32 thin omitted)

### Community 0 - "RRS Rules & Case Citations"
Cohesion: 0.05
Nodes (48): examples/ material store (style), phrases/ material store (user wording), rules/ material store (authority), OG24 Case 02 (49er BRA - equipment breach), OG24 Case 07 (JPN v CHN, contact at start), OG24 Case 08 (ESP v IRL, mark-room), OG24 Case 12 (CRO v ISR, references Case 11), OG24 Case 13 (NOR v RC, redress for BFD scoring) (+40 more)

### Community 1 - "Web App UI Components"
Cohesion: 0.09
Nodes (34): api, del(), post(), put(), request(), Window, App(), View (+26 more)

### Community 2 - "API Server & Routes"
Cohesion: 0.15
Nodes (17): config, db, dbPath, schema, schemaPath, registerCaseDetailRoute(), registerCaseLinkRoutes(), CrudOptions (+9 more)

### Community 3 - "Web App Dependencies"
Cohesion: 0.08
Nodes (23): dependencies, react, react-dom, devDependencies, @types/react, @types/react-dom, typescript, vite (+15 more)

### Community 4 - "API Dependencies"
Cohesion: 0.09
Nodes (22): dependencies, dotenv, fastify, @fastify/cors, devDependencies, tsx, @types/node, typescript (+14 more)

### Community 5 - "CaseForm Handlers & Formatting"
Cohesion: 0.20
Nodes (19): CaseForm(), findOrCreateBoat(), findOrCreatePerson(), handleAddLink(), handleAddRule(), handleAddWitness(), handleCopyAll(), handleRemoveLink() (+11 more)

### Community 6 - "RRS Original PDFs & Cases"
Cohesion: 0.14
Nodes (19): OG24 Case 7 - Women's Skiff Collision (JPN v CHN), RRS N1.4(b) International Jury Panel Composition, RRS 10 On Opposite Tacks, RRS 11 On the Same Tack, Overlapped, RRS 14 Avoiding Contact, RRS 2 Fair Sailing, RRS 36 Races Restarted or Resailed, RRS 44 Penalties at the Time of an Incident (+11 more)

### Community 7 - "Web TypeScript Config"
Cohesion: 0.13
Nodes (14): compilerOptions, esModuleInterop, isolatedModules, jsx, lib, module, moduleResolution, noEmit (+6 more)

### Community 8 - "API TypeScript Config"
Cohesion: 0.15
Nodes (12): compilerOptions, esModuleInterop, forceConsistentCasingInFileNames, module, moduleResolution, outDir, resolveJsonModule, rootDir (+4 more)

### Community 9 - "Architecture Decisions"
Cohesion: 0.25
Nodes (8): Scribe Helper Architecture (TS, React/Vite, CodeMirror 6, Fastify, SQLite, Docker), D-011 SQLite, not Postgres; FTS5, not a vector database, D-012 Built to be containerised from day one, D-013 File sync exclusions (.stignore), D-015 Table named protest_case, not case, D-016 SQLite access via node:sqlite, not better-sqlite3, R-16 All configuration through environment variables, R-22 Keep the data layer separable

### Community 10 - "Product Scope Decisions"
Cohesion: 0.25
Nodes (8): Scribe Helper Project, D-001 v1 covers protests only, D-002 Product entirely in English, D-003 Single user, local first, no accounts in v1, D-005 No .docx export in v1, copy-paste per box, D-014 Rules Applicable stored as a separate table, D-017 Copy-per-box covers all 8 form sections, R-21 The application does not assume the user is the owner

### Community 11 - "Markdown Ingestion Flow"
Cohesion: 0.29
Nodes (7): Ingestion / Conversion Flow, D-009 Everything is stored as Markdown, D-010 No OCR, R-09 Everything is stored as Markdown, R-10 The original is always kept, R-11 The .md is never hand-edited, R-12 Warn on an empty conversion

### Community 12 - "Config & Deployment"
Cohesion: 0.33
Nodes (6): config.js runtime script (index.html), docker-compose api service, docker-compose web service, R-13 All data lives under data/, R-19 The server listens on 0.0.0.0, R-20 Timezone comes from configuration, never the host

### Community 13 - "EventDetail Component"
Cohesion: 0.60
Nodes (6): EventDetail(), findOrCreatePerson(), handleAddJury(), handleCreateCase(), handleRemoveJury(), refresh()

### Community 14 - "Inline Completion & Phrases"
Cohesion: 0.40
Nodes (5): Inline AI Completion, Phrase Library, D-006 Editor: CodeMirror 6, TipTap rejected, R-24 Prefer the deterministic path, R-25 Debounce every model call, cancel superseded ones

### Community 15 - "RRS Rules 30-62 PDFs"
Cohesion: 0.40
Nodes (5): OG24 Case 13 - Women's Skiff BFD Redress Request (NOR v RC), OG24 Case 29 - Touching Finish Mark, Protest Withdrawn (CHN), RRS 30.4 Black Flag Rule, RRS 31 Touching a Mark, RRS 62 Support Persons

### Community 16 - "OG24 Case 02 Rules"
Cohesion: 0.50
Nodes (4): OG24 Case 2 - 49er Class Rules Breach (BRA), 49er Class Rules C.6.1 / C.7.1, ER 1.7 (Equipment Rules of Sailing), NoR 1.9 / 1.10 (Notice of Race)

## Ambiguous Edges - Review These
- `rules/ material store (authority)` → `OG24 Case 02 (49er BRA - equipment breach)`  [AMBIGUOUS]
  data/examples/base/OG24_Case02_Final-e25c488d-e8af-44a6-b321-9c5e84367b01.md · relation: conceptually_related_to
- `rules/ material store (authority)` → `SOF26 Protest 02 (SGP v FRA, kiteboard avoiding action)`  [AMBIGUOUS]
  data/examples/own/SOF26_Case_02_Final_pdf-942b7f22-8889-40e2-a98f-be0a88c297c7.md · relation: conceptually_related_to
- `rules/ material store (authority)` → `SOF26 Protest 10 (SWE v FRA, 49erFX, heard with case 13)`  [AMBIGUOUS]
  data/examples/own/SOF26_Case_10_Final-4f289d53-9f3e-442e-abfc-597ff6fffc52.md · relation: conceptually_related_to

## Knowledge Gaps
- **124 isolated node(s):** `name`, `version`, `private`, `type`, `node` (+119 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 175 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **32 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `rules/ material store (authority)` and `OG24 Case 02 (49er BRA - equipment breach)`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `rules/ material store (authority)` and `SOF26 Protest 02 (SGP v FRA, kiteboard avoiding action)`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `rules/ material store (authority)` and `SOF26 Protest 10 (SWE v FRA, 49erFX, heard with case 13)`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **Why does `react` connect `Web App UI Components` to `Web App Dependencies`?**
  _High betweenness centrality (0.036) - this node is a cross-community bridge._
- **Why does `CaseForm()` connect `CaseForm Handlers & Formatting` to `Web App UI Components`?**
  _High betweenness centrality (0.023) - this node is a cross-community bridge._
- **Are the 13 inferred relationships involving `examples/ material store (style)` (e.g. with `OG24 Case 02 (49er BRA - equipment breach)` and `OG24 Case 07 (JPN v CHN, contact at start)`) actually correct?**
  _`examples/ material store (style)` has 13 INFERRED edges - model-reasoned connections that need verification._
- **What connects `name`, `version`, `private` to the rest of the system?**
  _124 weakly-connected nodes found - possible documentation gaps or missing edges._
import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { api } from '../api';
import { CopyBox } from './CopyBox';
import { GhostTextarea } from './GhostTextarea';
import { JurySlots } from './JurySlots';
import { SuggestionsPanel } from './SuggestionsPanel';
import {
  buildDecisionFilename,
  formatAutoProceduralLines,
  formatFullDecisionHtml,
  formatParties,
  formatRulesApplicable,
  formatWitnesses,
} from '../format';
import type {
  AttachmentExtraction,
  BoatRow,
  CaseFull,
  CaseRow,
  PartyRole,
  PersonRow,
  ResourceSearchHit,
} from '../types';

interface Props {
  caseId: number;
}

interface PartyEdit {
  sailNumber: string;
  boatName: string;
  representedBy: string;
}

interface WitnessDraft {
  id: number | null; // null = not yet persisted, created on Save
  fullName: string;
  role: string;
}

const emptyParty: PartyEdit = { sailNumber: '', boatName: '', representedBy: '' };

// The case form. Boxes in fixed form order for the official document
// (CONTEXT.md section 4, format.ts's formatFullDecision — never
// reordered): Parties, Witness, Procedural Matters, Facts Found,
// Conclusion, Rules Applicable, Decision, Jury Members. The on-screen
// tab layout is a separate, editable concern. Per DECISIONS.md D-029
// (internal coherence, SPEC-011): every tab with editable content has
// its own Save button that persists only that tab's own data — no
// shared/batched save across tabs any more. Parties & Witness got
// split out of "General" into its own tab for the same reason
// (General is a plain form, Parties & Witness is a document box —
// mixing the two in one tab is what D-029 rule 1 forbids).
// Per-case jury assignment (Jury Members) has no tab here any more —
// pulled out 2026-10-05 to become its own top-level tab in a later spec.
export function CaseForm({ caseId }: Props) {
  const [caseFull, setCaseFull] = useState<CaseFull | null>(null);
  const [boats, setBoats] = useState<BoatRow[]>([]);
  const [people, setPeople] = useState<PersonRow[]>([]);
  const [otherCases, setOtherCases] = useState<CaseRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  // SPEC-011: one Save per tab, each scoped to just its own data — a
  // save in progress on one tab never disables/labels "Saving…" the
  // button on another. Keys: general, parties, procedural, facts,
  // conclusion, decision, review.
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [copied, setCopied] = useState<Record<string, boolean>>({});

  // Scalar fields, edited locally and saved together (Save button).
  const [caseNumber, setCaseNumber] = useState('');
  const [day, setDay] = useState('');
  const [race, setRace] = useState('');
  const [informedAt, setInformedAt] = useState('');
  const [proceduralMatters, setProceduralMatters] = useState('');
  const [factsFound, setFactsFound] = useState('');
  const [conclusion, setConclusion] = useState('');
  const [decision, setDecision] = useState('');

  const [initiator, setInitiator] = useState<PartyEdit>(emptyParty);
  const [respondent, setRespondent] = useState<PartyEdit>(emptyParty);

  // Staged locally, reconciled against the server in one batch by the
  // General tab's single Save button (no more per-witness Add call).
  const [witnessDraft, setWitnessDraft] = useState<WitnessDraft[]>([]);
  const [witnessName, setWitnessName] = useState('');
  const [witnessRole, setWitnessRole] = useState('');

  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const attachmentInputRef = useRef<HTMLInputElement>(null);
  const [extraction, setExtraction] = useState<AttachmentExtraction | null>(null);
  const [extracting, setExtracting] = useState(false);

  // Stable identity across renders — GhostTextarea's useEffect depends on
  // this array, and a fresh one every render would re-run it (clearing
  // any visible ghost-text) on every keystroke elsewhere in the form.
  const sailNumberRoles = useMemo(
    () => [
      ...(initiator.sailNumber ? [{ sailNumber: initiator.sailNumber, role: 'initiator' as const }] : []),
      ...(respondent.sailNumber ? [{ sailNumber: respondent.sailNumber, role: 'respondent' as const }] : []),
    ],
    [initiator.sailNumber, respondent.sailNumber],
  );

  const [ruleText, setRuleText] = useState('');
  const [ruleQuery, setRuleQuery] = useState('');
  const [ruleHits, setRuleHits] = useState<ResourceSearchHit[]>([]);
  const [searching, setSearching] = useState(false);

  // UI grouping only — copy-all still walks the fixed CONTEXT.md box
  // order (formatFullDecision), unaffected by which tab is active.
  // Per-case jury assignment used to live here as its own tab; pulled
  // out (2026-10-05, user's call) to become its own top-level tab in a
  // later spec instead of a CaseForm sub-tab.
  type CaseTab =
    | 'attachments'
    | 'general'
    | 'parties'
    | 'procedural'
    | 'facts'
    | 'conclusion'
    | 'decision'
    | 'review';
  const [caseTab, setCaseTab] = useState<CaseTab>('general');

  async function reload() {
    try {
      const [full, allBoats, allPeople, allCases] = await Promise.all([
        api.getCaseFull(caseId),
        api.listBoats(),
        api.listPeople(),
        api.listCases(),
      ]);
      setCaseFull(full);
      setBoats(allBoats);
      setPeople(allPeople);
      setOtherCases(allCases.filter((c) => c.event_id === full.event_id && c.id !== caseId));

      setCaseNumber(full.case_number);
      setDay(full.day ?? '');
      setRace(full.race ?? '');
      setInformedAt(full.informed_at ?? '');
      setProceduralMatters(full.procedural_matters);
      setFactsFound(full.facts_found);
      setConclusion(full.conclusion);
      setDecision(full.decision);

      const i = full.parties.find((p) => p.role === 'initiator');
      const r = full.parties.find((p) => p.role === 'respondent');
      setInitiator({
        sailNumber: i?.sail_number ?? '',
        boatName: i?.boat_name ?? '',
        representedBy: i?.represented_by ?? '',
      });
      setRespondent({
        sailNumber: r?.sail_number ?? '',
        boatName: r?.boat_name ?? '',
        representedBy: r?.represented_by ?? '',
      });

      setWitnessDraft(full.witnesses.map((w) => ({ id: w.id, fullName: w.full_name, role: w.role ?? '' })));

      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  // Refreshes ONLY caseFull.jury — never the four free-text useState
  // (unlike reload() above, which re-seeds them from the server and
  // would silently discard unsaved edits made on the Review tab,
  // SPEC-009 RF-007). JurySlots calls this, never reload().
  async function reloadJury() {
    const full = await api.getCaseFull(caseId);
    setCaseFull((prev) => (prev ? { ...prev, jury: full.jury } : full));
  }

  // SPEC-011: refreshes ONLY parties/witnesses (and what's derived
  // from them: initiator/respondent/witnessDraft) — never
  // caseNumber/day/race/informedAt nor the four free-text useState
  // (same criterion as reloadJury above). New witnesses get a
  // server-assigned id the local draft doesn't have yet;
  // findOrCreateBoat/findOrCreatePerson already keep boats/people
  // current on their own, no need to re-fetch those here.
  async function refreshParties() {
    const full = await api.getCaseFull(caseId);
    setCaseFull((prev) => (prev ? { ...prev, parties: full.parties, witnesses: full.witnesses } : full));

    const i = full.parties.find((p) => p.role === 'initiator');
    const r = full.parties.find((p) => p.role === 'respondent');
    setInitiator({
      sailNumber: i?.sail_number ?? '',
      boatName: i?.boat_name ?? '',
      representedBy: i?.represented_by ?? '',
    });
    setRespondent({
      sailNumber: r?.sail_number ?? '',
      boatName: r?.boat_name ?? '',
      representedBy: r?.represented_by ?? '',
    });
    setWitnessDraft(full.witnesses.map((w) => ({ id: w.id, fullName: w.full_name, role: w.role ?? '' })));
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseId]);

  // Rule picker (Phase 3): a debounced lookup against the loaded corpus
  // (FTS5, accepted rule resources only, D-020) — surfaces where a rule
  // number actually appears so a citation can be verified before typing
  // it into the box below (D-004: nothing cited without a trace). Whole
  // documents are indexed, not individual numbered rules, so this finds
  // the right document/snippet; the exact reference is still typed by
  // hand into ruleText.
  useEffect(() => {
    if (!ruleQuery.trim()) {
      setRuleHits([]);
      return;
    }
    setSearching(true);
    const handle = setTimeout(() => {
      api
        .searchResources(ruleQuery.trim())
        .then(setRuleHits)
        .catch(() => setRuleHits([]))
        .finally(() => setSearching(false));
    }, 300);
    return () => clearTimeout(handle);
  }, [ruleQuery]);

  async function findOrCreateBoat(sailNumber: string, boatName: string | null): Promise<number> {
    const existing = boats.find(
      (b) =>
        b.sail_number.toLowerCase() === sailNumber.toLowerCase() &&
        (b.boat_name ?? '') === (boatName ?? ''),
    );
    if (existing) return existing.id;
    const created = await api.createBoat({ sail_number: sailNumber, boat_name: boatName });
    setBoats((prev) => [...prev, created]);
    return created.id;
  }

  async function findOrCreatePerson(fullName: string): Promise<number> {
    const existing = people.find((p) => p.full_name.toLowerCase() === fullName.toLowerCase());
    if (existing) return existing.id;
    const created = await api.createPerson({ full_name: fullName });
    setPeople((prev) => [...prev, created]);
    return created.id;
  }

  function markCopied(key: string) {
    setCopied((prev) => ({ ...prev, [key]: true }));
  }

  async function savePartyRole(role: PartyRole) {
    const state = role === 'initiator' ? initiator : respondent;
    const boatId = state.sailNumber.trim()
      ? await findOrCreateBoat(state.sailNumber.trim(), state.boatName.trim() || null)
      : null;
    const representedById = state.representedBy.trim()
      ? await findOrCreatePerson(state.representedBy.trim())
      : null;

    const existing = caseFull?.parties.find((p) => p.role === role);
    if (existing) {
      await api.updateParty(existing.id, { boat_id: boatId, represented_by_id: representedById });
    } else {
      await api.createParty({ case_id: caseId, role, boat_id: boatId, represented_by_id: representedById });
    }
  }

  // SPEC-011: one Save per tab, each scoped to just its own data.
  // Generic one-PATCH save with its own `saving` key — never touches
  // `caseFull` or any other useState: for the fields it's used for
  // (General, the four free-text boxes), local state is already the
  // source of truth that liveCase/Copy/the .html export read. A save
  // that ever needs a refresh writes its own scoped one (see
  // refreshParties above), never the blanket reload().
  async function saveField(key: string, patch: Partial<CaseRow>) {
    setSaving((prev) => ({ ...prev, [key]: true }));
    try {
      await api.updateCase(caseId, patch);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving((prev) => ({ ...prev, [key]: false }));
    }
  }

  // "1. General" — informed_at still has no input (SPEC-010) but
  // travels unchanged in the payload.
  function handleSaveGeneral(e: FormEvent) {
    e.preventDefault();
    saveField('general', {
      case_number: caseNumber.trim(),
      day: day.trim() || null,
      race: race.trim() || null,
      informed_at: informedAt.trim() || null,
    });
  }

  // "2. Parties & Witness" — the one save that needs a refresh after
  // (refreshParties), so it doesn't use saveField. Witness
  // reconciliation unchanged from before SPEC-011.
  async function handleSaveParties() {
    setSaving((prev) => ({ ...prev, parties: true }));
    try {
      await savePartyRole('initiator');
      await savePartyRole('respondent');

      const keptIds = new Set(witnessDraft.filter((w) => w.id !== null).map((w) => w.id));
      for (const w of caseFull?.witnesses ?? []) {
        if (!keptIds.has(w.id)) await api.deleteWitness(w.id);
      }
      for (const w of witnessDraft) {
        if (w.id === null && w.fullName.trim()) {
          const personId = await findOrCreatePerson(w.fullName.trim());
          await api.createWitness({ case_id: caseId, person_id: personId, role: w.role.trim() || null });
        }
      }

      await refreshParties();
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving((prev) => ({ ...prev, parties: false }));
    }
  }

  function handleSaveProcedural() {
    saveField('procedural', { procedural_matters: proceduralMatters });
  }

  function handleSaveFacts() {
    saveField('facts', { facts_found: factsFound });
  }

  // Rules Applicable keeps saving instantly via handleAddRule/
  // handleRemoveRule, unchanged — never part of this save.
  function handleSaveConclusion() {
    saveField('conclusion', { conclusion });
  }

  function handleSaveDecision() {
    saveField('decision', { decision });
  }

  // "7. Review" — all four boxes together in one PATCH, since that's
  // "all of this tab's information".
  function handleSaveReview() {
    saveField('review', {
      procedural_matters: proceduralMatters,
      facts_found: factsFound,
      conclusion,
      decision,
    });
  }

  function handleStageWitness(e: FormEvent) {
    e.preventDefault();
    if (!witnessName.trim()) return;
    setWitnessDraft((prev) => [...prev, { id: null, fullName: witnessName.trim(), role: witnessRole.trim() }]);
    setWitnessName('');
    setWitnessRole('');
  }

  function handleUnstageWitness(index: number) {
    setWitnessDraft((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleAddRule(e: FormEvent) {
    e.preventDefault();
    if (!ruleText.trim() || !caseFull) return;
    await api.createRuleCitation({
      case_id: caseId,
      rule_reference: ruleText.trim(),
      position: caseFull.ruleCitations.length,
    });
    setRuleText('');
    await reload();
  }

  async function handleRemoveRule(id: number) {
    await api.deleteRuleCitation(id);
    await reload();
  }

  // "With Case(s)" (top row, general tab): link/unlink is a discrete
  // action of its own, not part of the batched Save — it takes effect
  // as soon as you pick a case.
  async function handleLinkCase(linkedCaseId: number) {
    await api.createCaseLink({ case_id: caseId, linked_case_id: linkedCaseId });
    await reload();
  }

  async function handleRemoveLink(linkedCaseId: number) {
    await api.deleteCaseLink({ case_id: caseId, linked_case_id: linkedCaseId });
    await reload();
  }

  // Tab 0: protest form(s) for this case (DECISIONS.md D-027). Any
  // format, uploaded immediately on selection — no queue/review, unlike
  // the resource (rules/examples) upload flow.
  async function handleUploadAttachment(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploadingAttachment(true);
    try {
      await api.uploadCaseAttachment(caseId, file);
      await reload();
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setUploadingAttachment(false);
    }
  }

  async function handleRemoveAttachment(id: number) {
    await api.deleteCaseAttachment(id);
    await reload();
  }

  // Manual "Process" (D-027 follow-up) — reads the uploaded protest
  // form(s) and returns candidate suggestions for other boxes. Never
  // writes anything itself; the drafter inserts what's useful.
  async function handleProcessAttachments() {
    setExtracting(true);
    setError(null);
    try {
      setExtraction(await api.extractAttachments(caseId));
    } catch (err) {
      setError((err as Error).message);
      setExtraction(null);
    } finally {
      setExtracting(false);
    }
  }

  function useSuggestedParty(role: PartyRole) {
    const suggested = extraction?.parties[role];
    if (!suggested) return;
    const setState = role === 'initiator' ? setInitiator : setRespondent;
    setState({
      sailNumber: suggested.sail_number ?? '',
      boatName: suggested.boat_name ?? '',
      representedBy: suggested.represented_by ?? '',
    });
  }

  function useSuggestedDay() {
    if (extraction?.day_candidate) setDay(extraction.day_candidate);
  }

  function useSuggestedRace() {
    if (extraction?.race_candidate) setRace(extraction.race_candidate);
  }

  function addSuggestedWitness(w: { full_name: string; role?: string }) {
    setWitnessDraft((prev) => [...prev, { id: null, fullName: w.full_name, role: w.role ?? '' }]);
  }

  if (!caseFull) return <p>Loading…</p>;

  // Live view: saved structured data plus whatever is currently typed in
  // the four free-text boxes, so Copy reflects what is on screen even
  // before Save is pressed.
  const liveCase: CaseFull = {
    ...caseFull,
    procedural_matters: proceduralMatters,
    facts_found: factsFound,
    conclusion,
    decision,
  };
  const autoProceduralLines = formatAutoProceduralLines(liveCase);

  // D-005 follow-up: single-click .html export of the full decision,
  // matching the source Word template's layout, built from the live
  // (possibly unsaved) case data — replaces the old "Copy all" button.
  function handleDownload() {
    const html = formatFullDecisionHtml(liveCase);
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = buildDecisionFilename(liveCase);
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="page">
      <div className="case-header">
        <h2>Case {caseFull.event.name} — {caseNumber || '(no number)'}</h2>
      </div>
      {error && <p className="error">{error}</p>}

      <div className="tab-bar-row">
        <nav className="tab-bar tab-bar-pill">
        <button
          type="button"
          className={caseTab === 'attachments' ? 'active' : undefined}
          aria-current={caseTab === 'attachments'}
          onClick={() => setCaseTab('attachments')}
        >
          0. Protest Form(s)
        </button>
        <button
          type="button"
          className={caseTab === 'general' ? 'active' : undefined}
          aria-current={caseTab === 'general'}
          onClick={() => setCaseTab('general')}
        >
          1. General
        </button>
        <button
          type="button"
          className={caseTab === 'parties' ? 'active' : undefined}
          aria-current={caseTab === 'parties'}
          onClick={() => setCaseTab('parties')}
        >
          2. Parties &amp; Witness
        </button>
        <button
          type="button"
          className={caseTab === 'procedural' ? 'active' : undefined}
          aria-current={caseTab === 'procedural'}
          onClick={() => setCaseTab('procedural')}
        >
          3. Procedural Matters
        </button>
        <button
          type="button"
          className={caseTab === 'facts' ? 'active' : undefined}
          aria-current={caseTab === 'facts'}
          onClick={() => setCaseTab('facts')}
        >
          4. Facts Found
        </button>
        <button
          type="button"
          className={caseTab === 'conclusion' ? 'active' : undefined}
          aria-current={caseTab === 'conclusion'}
          onClick={() => setCaseTab('conclusion')}
        >
          5. Conclusion
        </button>
        <button
          type="button"
          className={caseTab === 'decision' ? 'active' : undefined}
          aria-current={caseTab === 'decision'}
          onClick={() => setCaseTab('decision')}
        >
          6. Decision
        </button>
        <button
          type="button"
          className={caseTab === 'review' ? 'active' : undefined}
          aria-current={caseTab === 'review'}
          onClick={() => setCaseTab('review')}
        >
          7. Review
        </button>
      </nav>
        <button type="button" className="btn-accent" onClick={handleDownload}>
          Download decision (.html)
        </button>
      </div>

      {caseTab === 'attachments' && (
        <div className="tab-panel">
          <section className="box">
            <h2>Protest Form(s)</h2>
            <p className="muted">
              Any file format — scan, photo, PDF. Converted to Markdown when possible for later
              use; the original is always kept.
            </p>
            <ul className="list">
              {caseFull.attachments.map((a) => (
                <li key={a.id}>
                  <a href={api.attachmentFileUrl(a.id)} download>
                    {a.original_filename}
                  </a>{' '}
                  <span className="muted">{new Date(a.uploaded_at).toLocaleString()}</span>
                  {!!a.conversion_empty && (
                    <span className="error"> — empty conversion, check original</span>
                  )}{' '}
                  <button type="button" onClick={() => handleRemoveAttachment(a.id)}>
                    Remove
                  </button>
                </li>
              ))}
              {caseFull.attachments.length === 0 && <li className="muted">No files uploaded yet.</li>}
            </ul>
            <input
              ref={attachmentInputRef}
              type="file"
              onChange={handleUploadAttachment}
              disabled={uploadingAttachment}
              hidden
            />
            <button
              type="button"
              onClick={() => attachmentInputRef.current?.click()}
              disabled={uploadingAttachment}
            >
              {uploadingAttachment ? 'Uploading…' : 'Upload file'}
            </button>{' '}
            <button
              type="button"
              onClick={handleProcessAttachments}
              disabled={extracting || caseFull.attachments.length === 0}
            >
              {extracting ? 'Processing…' : 'Process'}
            </button>
            {extraction && (
              <p className="muted">
                Processed. Suggestions from it are offered on the General, Parties &amp; Witness,
                Procedural Matters, Facts Found, Conclusion and Decision tabs — nothing was
                inserted automatically.
              </p>
            )}
          </section>
        </div>
      )}

      {caseTab === 'general' && (
        <div className="tab-panel">
          <section className="box general-box">
            <h2>General</h2>
            <form onSubmit={handleSaveGeneral} className="general-fields-row">
              <label>
                Case number
                <input value={caseNumber} onChange={(e) => setCaseNumber(e.target.value)} required />
              </label>
              <label>
                Day
                <input value={day} onChange={(e) => setDay(e.target.value)} />
              </label>
              {extraction?.day_candidate && (
                <button type="button" onClick={useSuggestedDay}>
                  Use suggested
                </button>
              )}
              <label>
                Race
                <input value={race} onChange={(e) => setRace(e.target.value)} />
              </label>
              {extraction?.race_candidate && (
                <button type="button" onClick={useSuggestedRace}>
                  Use suggested
                </button>
              )}
              <label>
                With case(s)
                <div className="with-case-inline">
                  {caseFull.linkedCases.map((lc) => (
                    <span key={lc.id} className="chip">
                      {lc.case_number}
                      <button type="button" onClick={() => handleRemoveLink(lc.id)} aria-label={`Unlink case ${lc.case_number}`}>
                        ×
                      </button>
                    </span>
                  ))}
                  <select
                    value=""
                    onChange={(e) => {
                      if (e.target.value) handleLinkCase(Number(e.target.value));
                    }}
                  >
                    <option value="">+ Link case…</option>
                    {otherCases
                      .filter((c) => !caseFull.linkedCases.some((lc) => lc.id === c.id))
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          Case {c.case_number}
                        </option>
                      ))}
                  </select>
                </div>
              </label>
              <button type="submit" disabled={!!saving.general}>
                {saving.general ? 'Saving…' : 'Save'}
              </button>
            </form>
          </section>
        </div>
      )}

      {caseTab === 'parties' && (
        <div className="tab-panel">
          {/* Parties & Witness — one box, matching the fixed document
              order (Parties, then Witness — format.ts's
              formatFullDecision) both in the UI and in Copy. */}
          <CopyBox
            label="Parties & Witness"
            text={`${formatParties(liveCase)}\n\n${formatWitnesses(liveCase)}`}
            copied={!!copied.parties && !!copied.witness}
            onCopied={() => {
              markCopied('parties');
              markCopied('witness');
            }}
            onSave={handleSaveParties}
            saving={!!saving.parties}
          >
            <h3>Parties</h3>
            {(['initiator', 'respondent'] as PartyRole[]).map((role) => {
              const state = role === 'initiator' ? initiator : respondent;
              const setState = role === 'initiator' ? setInitiator : setRespondent;
              return (
                <div key={role} className="party-row">
                  <strong>{role === 'initiator' ? 'Initiator' : 'Respondent'}</strong>
                  <input
                    list="boat-sail-numbers"
                    placeholder="Sail number"
                    value={state.sailNumber}
                    onChange={(e) => setState({ ...state, sailNumber: e.target.value })}
                  />
                  <input
                    list="boat-names"
                    placeholder="Boat name"
                    value={state.boatName}
                    onChange={(e) => setState({ ...state, boatName: e.target.value })}
                  />
                  <input
                    list="people-list"
                    placeholder="Represented by"
                    value={state.representedBy}
                    onChange={(e) => setState({ ...state, representedBy: e.target.value })}
                  />
                  {extraction?.parties[role] && (
                    <button type="button" onClick={() => useSuggestedParty(role)}>
                      Use suggested
                    </button>
                  )}
                </div>
              );
            })}

            <h3>Witness</h3>
            <ul className="list">
              {witnessDraft.map((w, i) => (
                <li key={`${w.id ?? 'new'}-${i}`}>
                  {w.fullName}
                  {w.role ? ` — ${w.role}` : ''}{' '}
                  <button type="button" onClick={() => handleUnstageWitness(i)}>
                    Remove
                  </button>
                </li>
              ))}
              {witnessDraft.length === 0 && <li className="muted">No witnesses yet.</li>}
            </ul>
            {extraction && extraction.witnesses.length > 0 && (
              <ul className="list">
                {extraction.witnesses.map((w, i) => (
                  <li key={i}>
                    Suggested: {w.full_name}
                    {w.role ? ` — ${w.role}` : ''}{' '}
                    <button type="button" onClick={() => addSuggestedWitness(w)}>
                      Add
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <form onSubmit={handleStageWitness} className="inline-form">
              <input
                list="people-list"
                placeholder="Full name"
                value={witnessName}
                onChange={(e) => setWitnessName(e.target.value)}
                required
              />
              <input placeholder="Role" value={witnessRole} onChange={(e) => setWitnessRole(e.target.value)} />
              <button type="submit">Add</button>
            </form>
            <datalist id="boat-sail-numbers">
              {boats.map((b) => (
                <option key={b.id} value={b.sail_number} />
              ))}
            </datalist>
            <datalist id="boat-names">
              {boats.map((b) => b.boat_name && <option key={b.id} value={b.boat_name} />)}
            </datalist>
            <datalist id="people-list">
              {people.map((p) => (
                <option key={p.id} value={p.full_name} />
              ))}
            </datalist>
          </CopyBox>
        </div>
      )}

      {caseTab === 'procedural' && (
        <div className="tab-panel">
      {/* 3. Procedural Matters */}
      <CopyBox
        label="Procedural Matters"
        text={proceduralMatters}
        copied={!!copied.procedural_matters}
        onCopied={() => markCopied('procedural_matters')}
        onSave={handleSaveProcedural}
        saving={!!saving.procedural}
      >
        <div className="box-body-split">
          <div className="textarea-col">
            <GhostTextarea
              caseId={caseId}
              box="procedural_matters"
              value={proceduralMatters}
              onChange={setProceduralMatters}
              rows={4}
            />
          </div>
          <div className="suggestions-col">
            <SuggestionsPanel
              caseId={caseId}
              box="procedural_matters"
              currentText={proceduralMatters}
              onInsert={(text) => setProceduralMatters((prev) => (prev ? `${prev}\n\n${text}` : text))}
              protestForm={{
                lines: autoProceduralLines,
                paragraph: extraction?.procedural_matters_candidate
                  ? { label: 'From protest form', text: extraction.procedural_matters_candidate }
                  : undefined,
              }}
            />
          </div>
        </div>
      </CopyBox>
        </div>
      )}

      {caseTab === 'facts' && (
        <div className="tab-panel">
      {/* 4. Facts Found */}
      <CopyBox
        label="Facts Found"
        text={factsFound}
        copied={!!copied.facts_found}
        onCopied={() => markCopied('facts_found')}
        onSave={handleSaveFacts}
        saving={!!saving.facts}
      >
        <div className="box-body-split">
          <div className="textarea-col">
            <GhostTextarea
              caseId={caseId}
              box="facts_found"
              value={factsFound}
              onChange={setFactsFound}
              rows={6}
              sailNumberRoles={sailNumberRoles}
            />
          </div>
          <div className="suggestions-col">
            <SuggestionsPanel
              caseId={caseId}
              box="facts_found"
              currentText={factsFound}
              onInsert={(text) => setFactsFound((prev) => (prev ? `${prev}\n\n${text}` : text))}
              protestForm={{ lines: extraction?.facts_found_candidates }}
              partyReference={{
                initiator: { sailNumber: initiator.sailNumber, boatName: initiator.boatName },
                respondent: { sailNumber: respondent.sailNumber, boatName: respondent.boatName },
              }}
            />
          </div>
        </div>
      </CopyBox>
        </div>
      )}

      {caseTab === 'conclusion' && (
        <div className="tab-panel">
      <div className="two-col">
        {/* 5. Conclusion */}
        <CopyBox
          label="Conclusion"
          text={conclusion}
          copied={!!copied.conclusion}
          onCopied={() => markCopied('conclusion')}
          onSave={handleSaveConclusion}
          saving={!!saving.conclusion}
        >
          <div className="box-body-split">
            <div className="textarea-col">
              <GhostTextarea caseId={caseId} box="conclusion" value={conclusion} onChange={setConclusion} rows={4} />
            </div>
            <div className="suggestions-col">
              <SuggestionsPanel
                caseId={caseId}
                box="conclusion"
                currentText={conclusion}
                onInsert={(text) => setConclusion((prev) => (prev ? `${prev}\n\n${text}` : text))}
                protestForm={
                  extraction?.conclusion_candidate
                    ? { paragraph: { label: 'From protest form', text: extraction.conclusion_candidate } }
                    : undefined
                }
              />
            </div>
          </div>
        </CopyBox>

        {/* 6. Rules Applicable */}
        <CopyBox
          label="Rules Applicable"
          text={formatRulesApplicable(liveCase)}
          copied={!!copied.rules_applicable}
          onCopied={() => markCopied('rules_applicable')}
        >
          <ul className="list">
            {caseFull.ruleCitations.map((r) => (
              <li key={r.id}>
                {r.rule_reference}{' '}
                <button type="button" onClick={() => handleRemoveRule(r.id)}>
                  Remove
                </button>
              </li>
            ))}
            {caseFull.ruleCitations.length === 0 && <li className="muted">No rules cited yet.</li>}
          </ul>
          <form onSubmit={handleAddRule} className="inline-form">
            <input
              placeholder="e.g. RRS 18.2(b)"
              value={ruleText}
              onChange={(e) => setRuleText(e.target.value)}
              required
            />
            <button type="submit">Add</button>
          </form>

          <div className="rule-picker">
            <input
              placeholder="Search the loaded rules corpus (e.g. propulsion)"
              value={ruleQuery}
              onChange={(e) => setRuleQuery(e.target.value)}
            />
            {searching && <p className="muted">Searching…</p>}
            {!searching && ruleQuery.trim() !== '' && ruleHits.length === 0 && (
              <p className="muted">No match in the loaded corpus. Upload it first (Upload rules, top nav).</p>
            )}
            <ul className="list">
              {ruleHits.map((h) => (
                <li key={h.id}>
                  <strong>{h.title}</strong> <span className="muted">({h.layer})</span>
                  <br />
                  <span className="muted">{h.snippet}</span>
                </li>
              ))}
            </ul>
          </div>
        </CopyBox>
      </div>
        </div>
      )}

      {caseTab === 'decision' && (
        <div className="tab-panel">
      {/* 7. Decision */}
      <CopyBox
        label="Decision"
        text={decision}
        copied={!!copied.decision}
        onCopied={() => markCopied('decision')}
        onSave={handleSaveDecision}
        saving={!!saving.decision}
      >
        <div className="box-body-split">
          <div className="textarea-col">
            <GhostTextarea caseId={caseId} box="decision" value={decision} onChange={setDecision} rows={4} />
          </div>
          <div className="suggestions-col">
            <SuggestionsPanel
              caseId={caseId}
              box="decision"
              currentText={decision}
              onInsert={(text) => setDecision((prev) => (prev ? `${prev}\n\n${text}` : text))}
              protestForm={
                extraction?.decision_candidate
                  ? { paragraph: { label: 'From protest form', text: extraction.decision_candidate } }
                  : undefined
              }
              partyReference={{
                initiator: { sailNumber: initiator.sailNumber, boatName: initiator.boatName },
                respondent: { sailNumber: respondent.sailNumber, boatName: respondent.boatName },
                race,
              }}
            />
          </div>
        </div>
      </CopyBox>
        </div>
      )}

      {caseTab === 'review' && (
        <div className="tab-panel">
          <section className="box review-box">
            <div className="box-header">
              <h2>Review</h2>
              <button type="button" onClick={handleSaveReview} disabled={!!saving.review}>
                {saving.review ? 'Saving…' : 'Save'}
              </button>
            </div>
            <h3>Procedural Matters</h3>
            <textarea value={proceduralMatters} onChange={(e) => setProceduralMatters(e.target.value)} rows={4} />
            <h3>Facts Found</h3>
            <textarea value={factsFound} onChange={(e) => setFactsFound(e.target.value)} rows={6} />
            <h3>Conclusion</h3>
            <textarea value={conclusion} onChange={(e) => setConclusion(e.target.value)} rows={4} />
            <h3>Decision</h3>
            <textarea value={decision} onChange={(e) => setDecision(e.target.value)} rows={4} />
          </section>

          <JurySlots
            caseId={caseId}
            eventId={caseFull.event.id}
            jury={caseFull.jury}
            onJuryChange={reloadJury}
            findOrCreatePerson={findOrCreatePerson}
          />
        </div>
      )}
    </div>
  );
}

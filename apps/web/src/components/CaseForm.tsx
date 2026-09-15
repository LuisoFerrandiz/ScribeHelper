import { useEffect, useState, type FormEvent } from 'react';
import { api } from '../api';
import { AIDraftPanel } from './AIDraftPanel';
import { CopyBox } from './CopyBox';
import { GhostTextarea } from './GhostTextarea';
import { PhrasePicker } from './PhrasePicker';
import {
  formatFullDecision,
  formatJuryMembers,
  formatParties,
  formatRulesApplicable,
  formatWitnesses,
} from '../format';
import type { BoatRow, CaseFull, CaseRow, PartyRole, PersonRow, ResourceSearchHit } from '../types';

interface PoolEntry {
  personId: number;
  fullName: string;
}

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
// tab layout is a separate, editable concern (user's call, 2026-09-15):
// Parties & Witness share one box, edited in document order (Parties,
// then Witness), Jury Members gets its own tab, and one Save button on
// the General
// tab persists case meta + parties + witnesses + the four free-text
// boxes together.
export function CaseForm({ caseId }: Props) {
  const [caseFull, setCaseFull] = useState<CaseFull | null>(null);
  const [boats, setBoats] = useState<BoatRow[]>([]);
  const [people, setPeople] = useState<PersonRow[]>([]);
  const [otherCases, setOtherCases] = useState<CaseRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
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

  const [ruleText, setRuleText] = useState('');
  const [ruleQuery, setRuleQuery] = useState('');
  const [ruleHits, setRuleHits] = useState<ResourceSearchHit[]>([]);
  const [searching, setSearching] = useState(false);

  // Judge pool for this case's event (D-021) — who actually sits on THIS
  // case, and who chairs it, is picked here, not fixed for the event.
  const [judgePool, setJudgePool] = useState<PoolEntry[]>([]);
  const [juryPersonName, setJuryPersonName] = useState('');
  const [juryIsChairman, setJuryIsChairman] = useState(false);

  // UI grouping only — copy-all still walks the fixed CONTEXT.md box
  // order (formatFullDecision), unaffected by which tab is active.
  type CaseTab = 'general' | 'jury' | 'procedural' | 'facts' | 'conclusion' | 'decision';
  const [caseTab, setCaseTab] = useState<CaseTab>('general');

  async function reload() {
    try {
      const [full, allBoats, allPeople, allCases, allPool] = await Promise.all([
        api.getCaseFull(caseId),
        api.listBoats(),
        api.listPeople(),
        api.listCases(),
        api.listJuryMembers(),
      ]);
      setCaseFull(full);
      setBoats(allBoats);
      setPeople(allPeople);
      setOtherCases(allCases.filter((c) => c.event_id === full.event_id && c.id !== caseId));
      const nameById = new Map(allPeople.map((p) => [p.id, p.full_name]));
      setJudgePool(
        allPool
          .filter((j) => j.event_id === full.event_id)
          .map((j) => ({ personId: j.person_id, fullName: nameById.get(j.person_id) ?? '—' })),
      );

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

  // The one Save button for the General tab (user's call, 2026-09-15):
  // case meta, both parties, the witness list, and the four free-text
  // boxes all persist together. Witnesses are reconciled against the
  // last-loaded list — anything staged locally with no id yet is
  // created, anything that was persisted but is no longer in the draft
  // is deleted.
  async function handleSaveGeneral(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.updateCase(caseId, {
        case_number: caseNumber.trim(),
        day: day.trim() || null,
        race: race.trim() || null,
        informed_at: informedAt.trim() || null,
        procedural_matters: proceduralMatters,
        facts_found: factsFound,
        conclusion,
        decision,
      });

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

      await reload();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
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

  async function handleAddJury(e: FormEvent) {
    e.preventDefault();
    const entry = judgePool.find((p) => p.fullName.toLowerCase() === juryPersonName.trim().toLowerCase());
    if (!entry) return; // must be in the event's pool — added via the Jury utility
    await api.createCaseJuryMember({
      case_id: caseId,
      person_id: entry.personId,
      is_chairman: juryIsChairman ? 1 : 0,
    });
    setJuryPersonName('');
    setJuryIsChairman(false);
    await reload();
  }

  async function handleRemoveJury(id: number) {
    await api.deleteCaseJuryMember(id);
    await reload();
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

  async function handleCopyAll() {
    await navigator.clipboard.writeText(formatFullDecision(liveCase));
    setCopied({
      parties: true,
      witness: true,
      procedural_matters: true,
      facts_found: true,
      conclusion: true,
      rules_applicable: true,
      decision: true,
      jury_members: true,
    });
  }

  return (
    <div className="page">
      <div className="case-header">
        <h2>Case {caseFull.event.name} — {caseNumber || '(no number)'}</h2>
        <button type="button" onClick={handleCopyAll}>
          Copy all (form order)
        </button>
      </div>
      {error && <p className="error">{error}</p>}

      <nav className="tab-bar tab-bar-pill">
        <button
          type="button"
          className={caseTab === 'general' ? 'active' : undefined}
          aria-current={caseTab === 'general'}
          onClick={() => setCaseTab('general')}
        >
          1. General &amp; Parties
        </button>
        <button
          type="button"
          className={caseTab === 'jury' ? 'active' : undefined}
          aria-current={caseTab === 'jury'}
          onClick={() => setCaseTab('jury')}
        >
          2. Jury
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
      </nav>

      {caseTab === 'general' && (
        <div className="tab-panel">
          <form onSubmit={handleSaveGeneral} className="case-meta">
            <label>
              Case number
              <input value={caseNumber} onChange={(e) => setCaseNumber(e.target.value)} required />
            </label>
            <label>
              Day
              <input value={day} onChange={(e) => setDay(e.target.value)} />
            </label>
            <label>
              Race
              <input value={race} onChange={(e) => setRace(e.target.value)} />
            </label>
            <label>
              Informed at (event time)
              <input
                placeholder="e.g. 2026-09-11 18:30"
                value={informedAt}
                onChange={(e) => setInformedAt(e.target.value)}
              />
            </label>
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
            <button type="submit" disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </button>
          </form>

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
            <p className="muted">Parties and witnesses save with the Save button above.</p>
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

      {caseTab === 'jury' && (
        <div className="tab-panel">
          {/* Jury Members — the panel sitting on THIS case (D-021), picked
              from the event's judge pool (Jury utility, top nav) */}
          <CopyBox
            label="Jury Members"
            text={formatJuryMembers(liveCase)}
            copied={!!copied.jury_members}
            onCopied={() => markCopied('jury_members')}
          >
            <ul className="list">
              {caseFull.jury.map((j) => (
                <li key={j.id}>
                  {j.full_name}
                  {j.is_chairman ? ' (Chairman)' : ''}{' '}
                  <button type="button" onClick={() => handleRemoveJury(j.id)}>
                    Remove
                  </button>
                </li>
              ))}
              {caseFull.jury.length === 0 && <li className="muted">No jury members assigned to this case yet.</li>}
            </ul>
            {judgePool.length === 0 ? (
              <p className="muted">No judges in this event's pool yet — add them from the Jury utility (top nav).</p>
            ) : (
              <form onSubmit={handleAddJury} className="inline-form">
                <input
                  list="judge-pool-list"
                  placeholder="Judge name"
                  value={juryPersonName}
                  onChange={(e) => setJuryPersonName(e.target.value)}
                  required
                />
                <label>
                  <input type="checkbox" checked={juryIsChairman} onChange={(e) => setJuryIsChairman(e.target.checked)} />
                  Chairman
                </label>
                <button type="submit">Add to this case</button>
              </form>
            )}
            <datalist id="judge-pool-list">
              {judgePool.map((p) => (
                <option key={p.personId} value={p.fullName} />
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
      >
        <GhostTextarea
          caseId={caseId}
          box="procedural_matters"
          value={proceduralMatters}
          onChange={setProceduralMatters}
          rows={4}
        />
        <div className="box-tools">
          <PhrasePicker
            box="procedural_matters"
            currentText={proceduralMatters}
            onInsert={(text) => setProceduralMatters((prev) => (prev ? `${prev}\n\n${text}` : text))}
          />
          <AIDraftPanel
            caseId={caseId}
            box="procedural_matters"
            onInsert={(text) => setProceduralMatters((prev) => (prev ? `${prev}\n\n${text}` : text))}
          />
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
      >
        <GhostTextarea caseId={caseId} box="facts_found" value={factsFound} onChange={setFactsFound} rows={6} />
        <div className="box-tools">
          <PhrasePicker
            box="facts_found"
            currentText={factsFound}
            onInsert={(text) => setFactsFound((prev) => (prev ? `${prev}\n\n${text}` : text))}
          />
          <AIDraftPanel
            caseId={caseId}
            box="facts_found"
            onInsert={(text) => setFactsFound((prev) => (prev ? `${prev}\n\n${text}` : text))}
          />
        </div>
      </CopyBox>
        </div>
      )}

      {caseTab === 'conclusion' && (
        <div className="tab-panel">
      {/* 5. Conclusion */}
      <CopyBox
        label="Conclusion"
        text={conclusion}
        copied={!!copied.conclusion}
        onCopied={() => markCopied('conclusion')}
      >
        <GhostTextarea caseId={caseId} box="conclusion" value={conclusion} onChange={setConclusion} rows={4} />
        <div className="box-tools">
          <PhrasePicker
            box="conclusion"
            currentText={conclusion}
            onInsert={(text) => setConclusion((prev) => (prev ? `${prev}\n\n${text}` : text))}
          />
          <AIDraftPanel
            caseId={caseId}
            box="conclusion"
            onInsert={(text) => setConclusion((prev) => (prev ? `${prev}\n\n${text}` : text))}
          />
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
      )}

      {caseTab === 'decision' && (
        <div className="tab-panel">
      {/* 7. Decision */}
      <CopyBox
        label="Decision"
        text={decision}
        copied={!!copied.decision}
        onCopied={() => markCopied('decision')}
      >
        <GhostTextarea caseId={caseId} box="decision" value={decision} onChange={setDecision} rows={4} />
        <div className="box-tools">
          <PhrasePicker
            box="decision"
            currentText={decision}
            onInsert={(text) => setDecision((prev) => (prev ? `${prev}\n\n${text}` : text))}
          />
          <AIDraftPanel
            caseId={caseId}
            box="decision"
            onInsert={(text) => setDecision((prev) => (prev ? `${prev}\n\n${text}` : text))}
          />
        </div>
      </CopyBox>
        </div>
      )}
    </div>
  );
}

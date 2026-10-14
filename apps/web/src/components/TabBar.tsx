import { CASE_TABS, type CaseTab } from '../caseTabs';

interface Props {
  caseTab: CaseTab;
  onSelect: (tab: CaseTab) => void;
}

// SPEC-024 step 1a: only the <nav>; Download and Save stay siblings inside
// CaseForm's div.tab-bar-row.
export function TabBar({ caseTab, onSelect }: Props) {
  return (
    <nav className="tab-bar tab-bar-pill">
      {CASE_TABS.map((t) => (
        <button
          key={t.id}
          type="button"
          className={caseTab === t.id ? 'active' : undefined}
          aria-current={caseTab === t.id}
          onClick={() => onSelect(t.id)}
        >
          {t.label}
        </button>
      ))}
    </nav>
  );
}

import { useState, type ReactNode } from 'react';

interface CopyBoxProps {
  label: string;
  text: string;
  copied: boolean;
  onCopied: () => void;
  children: ReactNode;
}

// One section of the decision form (RULES.md R-29: labels and order are
// authoritative). Every section gets its own copy button and a visual
// indicator once it has been copied (DECISIONS.md D-005). Collapsible
// so a wide screen with several boxes open at once can be tidied down
// to just the titles — collapsing never hides the Copy button, so a
// box can still be copied without opening it.
export function CopyBox({ label, text, copied, onCopied, children }: CopyBoxProps) {
  const [failed, setFailed] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setFailed(false);
      onCopied();
    } catch {
      setFailed(true);
    }
  }

  return (
    <section className={`box${copied ? ' box-copied' : ''}${collapsed ? ' box-collapsed' : ''}`}>
      <div className="box-header">
        <button
          type="button"
          className="box-collapse-toggle"
          onClick={() => setCollapsed((c) => !c)}
          aria-expanded={!collapsed}
          aria-label={collapsed ? `Expand ${label}` : `Collapse ${label}`}
        >
          <span className="box-collapse-chevron">▾</span>
          <h2>
            {label}
            {copied && <span className="copied-badge"> ✓ Copied</span>}
          </h2>
        </button>
        <button type="button" onClick={handleCopy}>
          Copy
        </button>
      </div>
      <div className="box-body" hidden={collapsed}>
        {children}
        {failed && <p className="error">Copy failed. Select and copy manually.</p>}
      </div>
    </section>
  );
}

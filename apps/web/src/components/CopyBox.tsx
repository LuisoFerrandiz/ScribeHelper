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
// indicator once it has been copied (DECISIONS.md D-005).
export function CopyBox({ label, text, copied, onCopied, children }: CopyBoxProps) {
  const [failed, setFailed] = useState(false);

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
    <section className={`box${copied ? ' box-copied' : ''}`}>
      <div className="box-header">
        <h2>
          {label}
          {copied && <span className="copied-badge"> ✓ Copied</span>}
        </h2>
        <button type="button" onClick={handleCopy}>
          Copy
        </button>
      </div>
      {children}
      {failed && <p className="error">Copy failed. Select and copy manually.</p>}
    </section>
  );
}

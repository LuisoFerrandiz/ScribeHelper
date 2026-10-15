import { useProposals } from '../useProposals';
import type { ChainContext, PhraseBox } from '../types';
import { MoreMenu } from './MoreMenu';
import { ProposalsStrip } from './ProposalsStrip';

interface Props {
  caseId: number;
  box: PhraseBox;
  text: string;
  notes: string;
  chain?: ChainContext;
  refreshKey?: number;
  instantLines?: string[];
  onInsert: (text: string) => void;
  getSelectedText: () => string;
  onPhraseSaved: () => void;
}

// SPEC-034: mounted INSIDE the tab of its box, so the requests exist only while the
// scribe is on that box and nothing is kept between tabs (decision of the owner).
export function ProposalsTray({ onInsert, getSelectedText, onPhraseSaved, ...args }: Props) {
  const { cards, aiState, refresh } = useProposals(args);
  return (
    <ProposalsStrip
      cards={cards}
      aiState={aiState}
      onInsert={onInsert}
      onRefresh={refresh}
      more={
        <MoreMenu
          box={args.box}
          currentText={args.text}
          getSelectedText={getSelectedText}
          onInsert={onInsert}
          onPhraseSaved={onPhraseSaved}
        />
      }
    />
  );
}

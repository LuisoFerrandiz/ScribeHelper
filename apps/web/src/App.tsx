import { useEffect, useState } from 'react';
import { AuthError, api } from './api';
import { CaseForm } from './components/CaseForm';
import { CaseSelector } from './components/CaseSelector';
import { JuryPanel } from './components/JuryPanel';
import { Login } from './components/Login';
import { ResourceUpload } from './components/ResourceUpload';
import { UsersPanel } from './components/UsersPanel';
import type { SessionUser } from './types';

type Tab = 'case' | 'jury' | 'upload-examples' | 'upload-rules' | 'users';

// Case screen is the app's entry point (D-018): pick or create a regatta
// and case from the top selector, no separate Events list. Jury and
// resource uploads are utilities reached from the top nav, scoped to
// whichever regatta is currently selected. Login (D-026) gates all of
// it — nothing renders until the initial /auth/me check resolves.
export function App() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [tab, setTab] = useState<Tab>('case');
  const [currentEventId, setCurrentEventId] = useState<number | null>(null);
  const [currentCaseId, setCurrentCaseId] = useState<number | null>(null);

  useEffect(() => {
    api
      .me()
      .then(setUser)
      .catch((e) => {
        if (!(e instanceof AuthError)) console.error(e);
        setUser(null);
      })
      .finally(() => setAuthChecked(true));
  }, []);

  async function handleLogout() {
    await api.logout();
    setUser(null);
  }

  if (!authChecked) return null;
  if (!user) return <Login onLogin={setUser} />;

  return (
    <div className="app">
      <header className="app-header">
        <nav className="tab-bar tab-bar-pill">
          <button
            type="button"
            className={tab === 'case' ? 'active' : undefined}
            aria-current={tab === 'case'}
            onClick={() => setTab('case')}
          >
            Case
          </button>
          <button
            type="button"
            className={tab === 'jury' ? 'active' : undefined}
            aria-current={tab === 'jury'}
            onClick={() => setTab('jury')}
            disabled={currentEventId === null}
            title={currentEventId === null ? 'Pick a regatta on the Case tab first' : undefined}
          >
            Jury
          </button>
          <button
            type="button"
            className={tab === 'upload-examples' ? 'active' : undefined}
            aria-current={tab === 'upload-examples'}
            onClick={() => setTab('upload-examples')}
          >
            Upload examples
          </button>
          <button
            type="button"
            className={tab === 'upload-rules' ? 'active' : undefined}
            aria-current={tab === 'upload-rules'}
            onClick={() => setTab('upload-rules')}
          >
            Upload rules
          </button>
          {user.role === 'admin' && (
            <button
              type="button"
              className={tab === 'users' ? 'active' : undefined}
              aria-current={tab === 'users'}
              onClick={() => setTab('users')}
            >
              Users
            </button>
          )}
        </nav>
        <div className="app-header-user">
          <span className="muted">{user.username}</span>
          <button type="button" onClick={handleLogout}>
            Log out
          </button>
        </div>
      </header>

      {tab === 'case' && (
        <>
          <CaseSelector
            eventId={currentEventId}
            caseId={currentCaseId}
            onSelect={(eventId, caseId) => {
              setCurrentEventId(eventId);
              setCurrentCaseId(caseId);
            }}
          />
          {currentCaseId !== null ? (
            <CaseForm caseId={currentCaseId} />
          ) : (
            <p className="muted">Pick or create a regatta and case above.</p>
          )}
        </>
      )}

      {tab === 'jury' && currentEventId !== null && <JuryPanel eventId={currentEventId} />}

      {tab === 'upload-examples' && <ResourceUpload kind="example" eventId={currentEventId} />}
      {tab === 'upload-rules' && <ResourceUpload kind="rule" eventId={currentEventId} />}

      {tab === 'users' && user.role === 'admin' && <UsersPanel />}
    </div>
  );
}

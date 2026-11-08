import { useEffect, useState } from 'react';
import { api, setCurrentUser, getCurrentUserId } from './api';
import KudosForm from './components/KudosForm';
import KudosFeed from './components/KudosFeed';
import AdminModerationQueue from './components/AdminModerationQueue';

export default function App() {
  const [meId, setMeId] = useState(getCurrentUserId());
  const [users, setUsers] = useState([]);
  const [tab, setTab] = useState('dashboard');
  const [latest, setLatest] = useState(null); // last submitted kudos → prepended to feed

  useEffect(() => {
    api.devUsers().then((d) => setUsers(d.users)).catch(() => {});
  }, []);

  const me = users.find((u) => u.id === meId) || { id: meId, name: '…', is_admin: false };

  function switchUser(id) {
    setCurrentUser(id);
    setMeId(id);
    setTab('dashboard');
    setLatest(null);
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>Kudos</h1>
        <nav>
          <button
            className={tab === 'dashboard' ? 'tab active' : 'tab'}
            onClick={() => setTab('dashboard')}
          >
            Dashboard
          </button>
          {me.is_admin && (
            <button
              className={tab === 'moderation' ? 'tab active' : 'tab'}
              onClick={() => setTab('moderation')}
            >
              Moderation
            </button>
          )}
        </nav>
        <label className="user-switcher">
          Acting as{' '}
          <select value={meId} onChange={(e) => switchUser(Number(e.target.value))}>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
                {u.is_admin ? ' (admin)' : ''}
              </option>
            ))}
          </select>
        </label>
      </header>

      <main>
        {tab === 'dashboard' && (
          <div className="dashboard" key={meId}>
            <KudosForm onSubmitted={setLatest} />
            <KudosFeed isAdmin={me.is_admin} injected={latest} />
          </div>
        )}
        {tab === 'moderation' && me.is_admin && (
          <AdminModerationQueue key={`mod-${meId}`} />
        )}
      </main>
    </div>
  );
}

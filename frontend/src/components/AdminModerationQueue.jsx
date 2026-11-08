import { useEffect, useState } from 'react';
import { api } from '../api';
import KudosCard from './KudosCard';

// Admin moderation queue (spec: AdminModerationQueue, route /admin/moderation).
// Fetches with include_hidden=true (server-enforced admin-only) and offers
// Visible / Hidden / All filter tabs (AC-4.7).
const TABS = [
  { key: 'all', label: 'All' },
  { key: 'visible', label: 'Visible' },
  { key: 'hidden', label: 'Hidden' },
];

export default function AdminModerationQueue() {
  const [items, setItems] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState('all');

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function load(cursorArg) {
    if (!cursorArg) setLoading(true);
    setError(null);
    try {
      const d = await api.listKudos({ cursor: cursorArg, includeHidden: true });
      setItems((prev) => {
        const ids = new Set(prev.map((k) => k.id));
        return [...prev, ...d.kudos.filter((k) => !ids.has(k.id))];
      });
      setCursor(d.next_cursor);
      setHasMore(d.has_more);
    } catch (err) {
      setError(err.message || 'Could not load the moderation queue');
    } finally {
      setLoading(false);
    }
  }

  function handleModerated(updated) {
    setItems((prev) => prev.map((k) => (k.id === updated.id ? updated : k)));
  }

  const filtered = items.filter((k) => {
    if (tab === 'visible') return k.is_visible;
    if (tab === 'hidden') return !k.is_visible;
    return true;
  });

  return (
    <section className="feed">
      <h2>Moderation queue</h2>
      <div className="queue-filters">
        {TABS.map((t) => (
          <button
            key={t.key}
            className={tab === t.key ? 'tab active' : 'tab'}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="feed-list">
        {loading && <div className="skeleton" />}
        {!loading && error && (
          <div className="feed-error">
            {error}
            <br />
            <button className="btn-small" onClick={() => load()}>Retry</button>
          </div>
        )}
        {!loading && !error && filtered.length === 0 && (
          <div className="empty-state">Nothing here.</div>
        )}
        {!loading &&
          filtered.map((k) => (
            <KudosCard key={k.id} kudos={k} isAdmin onModerated={handleModerated} />
          ))}
      </div>
      {hasMore && !loading && (
        <button className="load-more" onClick={() => load(cursor)}>Load more</button>
      )}
    </section>
  );
}

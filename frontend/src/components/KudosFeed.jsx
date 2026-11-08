import { useEffect, useState } from 'react';
import { api } from '../api';
import KudosCard from './KudosCard';

// Public feed on the dashboard (spec: KudosFeed).
// Cursor pagination via "Load more", skeleton/empty/error states,
// optimistic prepend of freshly submitted kudos (deduped by id).
export default function KudosFeed({ isAdmin, injected }) {
  const [items, setItems] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Optimistic prepend when the form submits a new kudos.
  useEffect(() => {
    if (injected) {
      setItems((prev) => (prev.some((k) => k.id === injected.id) ? prev : [injected, ...prev]));
    }
  }, [injected]);

  async function load(cursorArg) {
    const isFirst = !cursorArg;
    isFirst ? setLoading(true) : setLoadingMore(true);
    setError(null);
    try {
      const d = await api.listKudos({ cursor: cursorArg });
      setItems((prev) => {
        const ids = new Set(prev.map((k) => k.id));
        return [...prev, ...d.kudos.filter((k) => !ids.has(k.id))];
      });
      setCursor(d.next_cursor);
      setHasMore(d.has_more);
    } catch (err) {
      setError(err.message || 'Could not load the feed');
    } finally {
      isFirst ? setLoading(false) : setLoadingMore(false);
    }
  }

  // Hide → remove from the visible list; restore → replace in place.
  function handleModerated(updated) {
    setItems((prev) =>
      updated.is_visible
        ? prev.map((k) => (k.id === updated.id ? updated : k))
        : prev.filter((k) => k.id !== updated.id)
    );
  }

  return (
    <section className="feed">
      <h2>Recent kudos</h2>
      <div className="feed-list">
        {loading && (
          <>
            <div className="skeleton" />
            <div className="skeleton" />
            <div className="skeleton" />
          </>
        )}
        {!loading && error && (
          <div className="feed-error">
            {error}
            <br />
            <button className="btn-small" onClick={() => load()}>Retry</button>
          </div>
        )}
        {!loading && !error && items.length === 0 && (
          <div className="empty-state">No kudos yet — be the first to recognize a colleague!</div>
        )}
        {!loading &&
          items.map((k) => (
            <KudosCard key={k.id} kudos={k} isAdmin={isAdmin} onModerated={handleModerated} />
          ))}
      </div>
      {hasMore && !loading && (
        <button className="load-more" onClick={() => load(cursor)} disabled={loadingMore}>
          {loadingMore ? 'Loading…' : 'Load more'}
        </button>
      )}
    </section>
  );
}

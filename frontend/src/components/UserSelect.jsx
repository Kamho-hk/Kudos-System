import { useEffect, useRef, useState } from 'react';
import { api } from '../api';
import Avatar from './Avatar';

// Typeahead recipient picker (spec: UserSelect). Debounced server search,
// keyboard-navigable dropdown, selected-user chip with clear button.
export default function UserSelect({ selected, onSelect }) {
  const [query, setQuery] = useState('');
  const [options, setOptions] = useState([]);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const boxRef = useRef(null);

  // Debounced search (200 ms)
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => {
      api.listUsers(query).then((d) => {
        setOptions(d.users);
        setHighlight(0);
      }).catch(() => setOptions([]));
    }, 200);
    return () => clearTimeout(t);
  }, [query, open]);

  // Close dropdown on outside click
  useEffect(() => {
    function onClickOutside(e) {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  function onKeyDown(e) {
    if (!open) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setHighlight((h) => Math.min(h + 1, options.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHighlight((h) => Math.max(h - 1, 0)); }
    else if (e.key === 'Enter' && options[highlight]) { e.preventDefault(); pick(options[highlight]); }
    else if (e.key === 'Escape') setOpen(false);
  }

  function pick(user) {
    onSelect(user);
    setOpen(false);
    setQuery('');
  }

  if (selected) {
    return (
      <div className="user-select">
        <div className="selected">
          <Avatar user={selected} />
          <span>{selected.name}</span>
          <button type="button" className="clear" aria-label="Clear recipient" onClick={() => onSelect(null)}>
            ×
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="user-select" ref={boxRef}>
      <input
        type="text"
        placeholder="Search a colleague…"
        value={query}
        onFocus={() => setOpen(true)}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        onKeyDown={onKeyDown}
      />
      {open && (
        <div className="dropdown" role="listbox">
          {options.length === 0 && <div className="user-option" style={{ color: 'var(--muted)' }}>No matches</div>}
          {options.map((u, i) => (
            <button
              type="button"
              key={u.id}
              role="option"
              className={i === highlight ? 'user-option highlighted' : 'user-option'}
              onMouseDown={(e) => { e.preventDefault(); pick(u); }}
              onMouseEnter={() => setHighlight(i)}
            >
              <Avatar user={u} />
              {u.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

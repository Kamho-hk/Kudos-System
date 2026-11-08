import { useState } from 'react';

// Modal dialog collecting the (required) reason for hiding a kudos (AC-4.4).
export default function ModerationReasonDialog({ onSubmit, onCancel }) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!reason.trim()) return setError('A reason is required to hide this kudos');
    setBusy(true);
    setError(null);
    try {
      await onSubmit(reason.trim());
    } catch (err) {
      setError(err.message || 'Failed to hide kudos');
      setBusy(false);
    }
  }

  return (
    <div className="dialog-overlay" onMouseDown={onCancel}>
      <div className="dialog" onMouseDown={(e) => e.stopPropagation()}>
        <h3>Hide this kudos</h3>
        <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 0 }}>
          It will disappear from everyone&apos;s feed. The entry is kept for audit.
        </p>
        {error && <div className="alert error">{error}</div>}
        <textarea
          autoFocus
          maxLength={500}
          placeholder="Reason for moderation (required)"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
        <div className="dialog-actions">
          <button type="button" className="btn-small" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
          <button type="button" className="submit-btn" onClick={submit} disabled={busy}>
            {busy ? 'Hiding…' : 'Hide kudos'}
          </button>
        </div>
      </div>
    </div>
  );
}

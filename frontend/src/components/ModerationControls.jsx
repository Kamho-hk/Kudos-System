import { useState } from 'react';
import { api } from '../api';
import ModerationReasonDialog from './ModerationReasonDialog';

// Admin-only Hide/Restore controls on a KudosCard (spec: ModerationControls).
export default function ModerationControls({ kudos, onModerated }) {
  const [showDialog, setShowDialog] = useState(false);
  const [busy, setBusy] = useState(false);

  async function hide(reason) {
    const { kudos: updated } = await api.moderate(kudos.id, { is_visible: false, reason });
    setShowDialog(false);
    onModerated(updated);
  }

  async function restore() {
    if (!window.confirm('Restore this kudos to the public feed?')) return;
    setBusy(true);
    try {
      const { kudos: updated } = await api.moderate(kudos.id, { is_visible: true });
      onModerated(updated);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="moderation-controls">
      {kudos.is_visible ? (
        <button type="button" className="btn-small danger" onClick={() => setShowDialog(true)}>
          Hide
        </button>
      ) : (
        <button type="button" className="btn-small" onClick={restore} disabled={busy}>
          {busy ? 'Restoring…' : 'Restore'}
        </button>
      )}
      {showDialog && (
        <ModerationReasonDialog onSubmit={hide} onCancel={() => setShowDialog(false)} />
      )}
    </div>
  );
}

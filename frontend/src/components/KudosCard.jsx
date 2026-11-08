import Avatar from './Avatar';
import RelativeTime from './RelativeTime';
import ModerationControls from './ModerationControls';

// One feed item (spec: KudosCard). Message is rendered as plain text via
// React's auto-escaping (AC-2.6) — never dangerouslySetInnerHTML.
export default function KudosCard({ kudos, isAdmin, onModerated }) {
  const hidden = kudos.is_visible === false;

  return (
    <article className={hidden ? 'card kudos-card hidden-card' : 'card kudos-card'}>
      {hidden && (
        <div className="moderation-banner">
          Hidden by {kudos.moderation?.moderated_by?.name ?? 'an admin'}
          {kudos.moderation?.reason ? ` — ${kudos.moderation.reason}` : ''}
        </div>
      )}
      <div className="kudos-header">
        <span className="who">
          <Avatar user={kudos.sender} />
          {kudos.sender?.name}
        </span>
        <span className="arrow">recognized</span>
        <span className="who">
          <Avatar user={kudos.recipient} />
          {kudos.recipient?.name}
        </span>
        <RelativeTime iso={kudos.created_at} />
      </div>
      <p className="kudos-message">{kudos.message}</p>
      {isAdmin && <ModerationControls kudos={kudos} onModerated={onModerated} />}
    </article>
  );
}

// Serializers. Moderation metadata is included ONLY for admin callers (spec §2.4).
import { users } from '../store.js';

const pickUser = (u) => u && { id: u.id, name: u.name, avatar_url: u.avatar_url };

export function toKudosDTO(k, { forAdmin = false } = {}) {
  const dto = {
    id: k.id,
    message: k.message,
    created_at: k.created_at,
    is_visible: k.is_visible,
    sender: pickUser(users.find((u) => u.id === k.sender_id)),
    recipient: pickUser(users.find((u) => u.id === k.recipient_id)),
  };
  if (forAdmin) {
    dto.moderation = k.moderated_at
      ? {
          moderated_by: pickUser(users.find((u) => u.id === k.moderated_by)),
          moderated_at: k.moderated_at,
          reason: k.reason_for_moderation,
        }
      : null;
  }
  return dto;
}

export function apiError(res, status, code, message) {
  return res.status(status).json({ error: { code, message } });
}

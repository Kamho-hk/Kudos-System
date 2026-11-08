// Kudos controllers — implements spec §2.2.2 (create), §2.2.3 (feed), §2.2.4 (moderate).
import { kudos, users, allocKudosId } from '../store.js';
import { toKudosDTO, apiError } from '../lib/serialize.js';

const PAGE_DEFAULT = 20;
const PAGE_MAX = 50;
const RATE_LIMIT_PER_DAY = 30;
const DUPLICATE_WINDOW_MS = 10 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

// Cursor = base64(JSON { created_at, id }) of the last item of the previous page.
const encodeCursor = (k) =>
  Buffer.from(JSON.stringify({ created_at: k.created_at, id: k.id })).toString('base64');
const decodeCursor = (raw) => {
  try {
    const c = JSON.parse(Buffer.from(raw, 'base64').toString('utf8'));
    return typeof c.created_at === 'string' && Number.isInteger(c.id) ? c : null;
  } catch {
    return null;
  }
};

// GET /api/kudos?limit=&cursor=&include_hidden=
export function listKudos(req, res) {
  const limit = Math.min(Number(req.query.limit) || PAGE_DEFAULT, PAGE_MAX);
  const isAdmin = req.user.is_admin;
  const includeHidden = req.query.include_hidden === 'true' && isAdmin; // ignored for non-admins

  let items = kudos.filter((k) => includeHidden || k.is_visible);
  // ISO-8601 UTC strings sort lexicographically; id is the tie-breaker (newest first).
  items.sort((a, b) => b.created_at.localeCompare(a.created_at) || b.id - a.id);

  if (req.query.cursor) {
    const c = decodeCursor(req.query.cursor);
    if (!c) return apiError(res, 400, 'INVALID_CURSOR', 'Invalid pagination cursor');
    items = items.filter(
      (k) => k.created_at < c.created_at || (k.created_at === c.created_at && k.id < c.id)
    );
  }

  const page = items.slice(0, limit + 1); // limit+1 to compute has_more
  const hasMore = page.length > limit;
  const results = page.slice(0, limit);
  const last = results[results.length - 1];

  res.json({
    kudos: results.map((k) => toKudosDTO(k, { forAdmin: isAdmin })),
    next_cursor: hasMore ? encodeCursor(last) : null,
    has_more: hasMore,
  });
}

// POST /api/kudos { recipient_id, message }
export function createKudos(req, res) {
  const { recipient_id, message } = req.body ?? {};

  // Validation chain per spec §2.2.2, in order:
  // 1. recipient_id present & numeric
  const rid = Number(recipient_id);
  if (!Number.isInteger(rid)) {
    return apiError(res, 400, 'VALIDATION_ERROR', 'recipient_id is required');
  }
  // 2. no self-kudos
  if (rid === req.user.id) {
    return apiError(res, 400, 'SELF_KUDOS', 'You cannot give kudos to yourself');
  }
  // 3. recipient exists and is active
  const recipient = users.find((u) => u.id === rid);
  if (!recipient || !recipient.is_active) {
    return apiError(res, 404, 'RECIPIENT_UNAVAILABLE', 'That colleague is unavailable');
  }
  // 4. message: trimmed, 1–280 chars
  const trimmed = typeof message === 'string' ? message.trim() : '';
  if (!trimmed) {
    return apiError(res, 400, 'VALIDATION_ERROR', 'Message is required');
  }
  if (trimmed.length > 280) {
    return apiError(res, 400, 'VALIDATION_ERROR', 'Message must be 280 characters or fewer');
  }
  // 5. rate limit: 30 per rolling 24h
  const dayAgo = Date.now() - DAY_MS;
  const sentToday = kudos.filter(
    (k) => k.sender_id === req.user.id && Date.parse(k.created_at) > dayAgo
  ).length;
  if (sentToday >= RATE_LIMIT_PER_DAY) {
    return apiError(res, 429, 'RATE_LIMITED', 'Daily kudos limit reached (30). Try again tomorrow.');
  }
  // 6. duplicate: same sender + recipient + trimmed message within 10 minutes
  const windowStart = Date.now() - DUPLICATE_WINDOW_MS;
  const duplicate = kudos.find(
    (k) =>
      k.sender_id === req.user.id &&
      k.recipient_id === rid &&
      k.message === trimmed &&
      Date.parse(k.created_at) > windowStart
  );
  if (duplicate) {
    return apiError(res, 409, 'DUPLICATE_KUDOS', 'You already sent this kudos recently');
  }
  // 7. insert
  const k = {
    id: allocKudosId(),
    sender_id: req.user.id,
    recipient_id: rid,
    message: trimmed,
    created_at: new Date().toISOString(),
    is_visible: true,
    moderated_by: null,
    moderated_at: null,
    reason_for_moderation: null,
  };
  kudos.push(k);
  res.status(201).json({ kudos: toKudosDTO(k, { forAdmin: req.user.is_admin }) });
}

// PATCH /api/kudos/:id/moderate { is_visible, reason? } — admin only
export function moderateKudos(req, res) {
  if (!req.user.is_admin) {
    return apiError(res, 403, 'FORBIDDEN', 'Administrator access required');
  }
  const k = kudos.find((x) => x.id === Number(req.params.id));
  if (!k) {
    return apiError(res, 404, 'NOT_FOUND', 'Kudos not found');
  }

  const { is_visible, reason } = req.body ?? {};
  if (typeof is_visible !== 'boolean') {
    return apiError(res, 400, 'VALIDATION_ERROR', 'is_visible (boolean) is required');
  }

  if (is_visible === false) {
    // Hide — reason required (1–500 chars). Re-hiding overwrites the stamp (last-action-wins).
    const r = typeof reason === 'string' ? reason.trim() : '';
    if (!r) {
      return apiError(res, 400, 'VALIDATION_ERROR', 'A reason is required to hide this kudos');
    }
    if (r.length > 500) {
      return apiError(res, 400, 'VALIDATION_ERROR', 'Reason must be 500 characters or fewer');
    }
    k.is_visible = false;
    k.moderated_by = req.user.id;
    k.moderated_at = new Date().toISOString();
    k.reason_for_moderation = r;
  } else {
    // Restore — reason must not be provided; already-visible is a no-op (idempotent).
    if (reason !== undefined && reason !== null && String(reason).trim() !== '') {
      return apiError(res, 400, 'VALIDATION_ERROR', 'reason must not be provided when restoring');
    }
    if (k.is_visible === false) {
      k.is_visible = true;
      k.moderated_by = req.user.id;
      k.moderated_at = new Date().toISOString();
      k.reason_for_moderation = null;
    }
  }

  res.json({ kudos: toKudosDTO(k, { forAdmin: true }) });
}

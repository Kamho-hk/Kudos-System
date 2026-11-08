// Users controller — implements spec §2.2.1 (recipient picker list).
import { users } from '../store.js';

// GET /api/users?search=&limit=
// Active users only, excluding the requester, name search (case-insensitive), name-sorted.
export function listUsers(req, res) {
  const q = String(req.query.search ?? '').toLowerCase();
  const limit = Math.min(Number(req.query.limit) || 50, 100);

  const list = users
    .filter((u) => u.is_active && u.id !== req.user.id && u.name.toLowerCase().includes(q))
    .sort((a, b) => a.name.localeCompare(b.name))
    .slice(0, limit)
    .map((u) => ({ id: u.id, name: u.name, avatar_url: u.avatar_url }));

  res.json({ users: list });
}

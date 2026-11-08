// Demo authentication middleware.
// The real app would use session cookies; here the client sends `x-user-id`
// and we resolve it against the mock users table (spec §0.3: identity always
// comes from the session, never from the request body).
import { users } from '../store.js';

export function auth(req, res, next) {
  const id = Number(req.header('x-user-id') ?? 7); // default demo user: Grace Hopper
  const user = users.find((u) => u.id === id && u.is_active);
  if (!user) {
    return res.status(401).json({
      error: { code: 'UNAUTHENTICATED', message: 'Authentication required' },
    });
  }
  req.user = user;
  next();
}

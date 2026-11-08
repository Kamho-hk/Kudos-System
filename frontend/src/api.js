// API client. Identity is sent via the `x-user-id` header (demo stand-in for
// a session cookie — see backend/middleware/auth.js).
const STORAGE_KEY = 'kudos.userId';
let currentUserId = Number(localStorage.getItem(STORAGE_KEY)) || 7; // default: Grace Hopper

export function setCurrentUser(id) {
  currentUserId = id;
  localStorage.setItem(STORAGE_KEY, String(id));
}
export function getCurrentUserId() {
  return currentUserId;
}

export class ApiError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

async function request(path, options = {}) {
  const res = await fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': String(currentUserId),
      ...(options.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(res.status, data?.error?.code, data?.error?.message || 'Request failed');
  }
  return data;
}

export const api = {
  listUsers: (search = '') => request(`/api/users?search=${encodeURIComponent(search)}`),
  listKudos: ({ cursor, includeHidden } = {}) =>
    request(
      `/api/kudos?limit=20${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}${
        includeHidden ? '&include_hidden=true' : ''
      }`
    ),
  createKudos: (recipient_id, message) =>
    request('/api/kudos', { method: 'POST', body: JSON.stringify({ recipient_id, message }) }),
  moderate: (id, body) =>
    request(`/api/kudos/${id}/moderate`, { method: 'PATCH', body: JSON.stringify(body) }),
  // Demo-only helper for the user switcher (not part of the spec).
  devUsers: () => request('/api/dev/users'),
};

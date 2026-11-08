# Kudos Feature — Demo Implementation

Runnable demonstration of the [Kudos specification](kudos-specification.md) (v1.1): give kudos to colleagues, see them in a public dashboard feed, and (as an admin) hide/restore inappropriate kudos.

**Stack:** React 18 + Vite (frontend), Node.js + Express (backend), in-memory mock database standing in for PostgreSQL. Data resets on backend restart.

## Project structure

```
Kudos_System/
├── kudos-specification.md        # Approved spec v1.1
├── database/
│   └── migrations/
│       └── 001_create_kudos_table.sql   # Real PostgreSQL schema (spec §2.1)
├── backend/                      # Express API on http://localhost:3001
│   ├── server.js
│   ├── store.js                  # In-memory mock DB + seed data
│   ├── middleware/auth.js        # x-user-id header → session user (demo auth)
│   ├── routes/api.js
│   ├── controllers/
│   │   ├── kudos.controller.js   # POST/GET kudos, PATCH moderate
│   │   └── users.controller.js
│   └── lib/serialize.js          # DTOs; moderation fields only for admins
└── frontend/                     # React app on http://localhost:5173
    └── src/
        ├── App.jsx               # Header, user switcher, tabs
        ├── api.js
        └── components/
            ├── KudosForm.jsx / UserSelect.jsx / MessageInput.jsx
            ├── KudosFeed.jsx / KudosCard.jsx
            ├── AdminModerationQueue.jsx
            ├── ModerationControls.jsx / ModerationReasonDialog.jsx
            └── Avatar.jsx / RelativeTime.jsx
```

## Prerequisites

- Node.js 18+ (uses built-in fetch/watch; only runtime dependency is Express)

## Run it

Two terminals:

```powershell
# Terminal 1 — backend (http://localhost:3001)
cd backend
npm install
npm start

# Terminal 2 — frontend (http://localhost:5173)
cd frontend
npm install
npm run dev
```

Open http://localhost:5173 — Vite proxies `/api` to the backend, so no CORS setup is needed.

## Demo guide

| What to try | How |
|---|---|
| Give kudos | Pick a colleague in "To", write a message, **Send kudos** — it appears at the top of the feed. |
| Validation | Submit with no recipient or an empty message; watch the 280-char counter turn red ≥ 260. |
| Duplicate rejection (409) | Send the same message to the same person twice within 10 minutes. |
| Pagination | The seed has 25 kudos — click **Load more** for the next page. |
| Switch identity | "Acting as" dropdown (top right) changes the `x-user-id` sent to the API. |
| Moderate (admin) | Switch to **Root Admin (admin)** → a **Moderation** tab appears, plus Hide buttons on feed cards. Hide with a reason; find it under Moderation → **Hidden**; **Restore** it. |
| Non-admin protection | A non-admin calling `PATCH /api/kudos/:id/moderate` gets **403**; moderation metadata is never serialized to non-admins. |

Seeded identities: Root Admin (admin), Grace Hopper (default), Ada Lovelace, Alan Turing, Edsger Dijkstra, Katherine Johnson, Margaret Hamilton, Dennis Ritchie, Radia Perlman. One pre-hidden kudos is seeded for the moderation queue.

## API quick reference (curl)

```powershell
# Recipient picker list (excludes requester)
curl.exe "http://localhost:3001/api/users?search=ada" -H "x-user-id: 7"

# Feed — first page, then follow next_cursor
curl.exe "http://localhost:3001/api/kudos?limit=20" -H "x-user-id: 7"

# Create kudos
curl.exe -X POST "http://localhost:3001/api/kudos" -H "x-user-id: 7" -H "Content-Type: application/json" -d '{\"recipient_id\": 42, \"message\": \"Thanks for the help!\"}'

# Admin: hide (reason required) / restore
curl.exe -X PATCH "http://localhost:3001/api/kudos/3/moderate" -H "x-user-id: 1" -H "Content-Type: application/json" -d '{\"is_visible\": false, \"reason\": \"Inappropriate language\"}'
curl.exe -X PATCH "http://localhost:3001/api/kudos/3/moderate" -H "x-user-id: 1" -H "Content-Type: application/json" -d '{\"is_visible\": true}'

# Admin: queue including hidden kudos
curl.exe "http://localhost:3001/api/kudos?include_hidden=true" -H "x-user-id: 1"
```

Status codes per spec §2.2: 400 validation/self-kudos · 401 unauthenticated · 403 non-admin moderation · 404 unknown recipient/kudos · 409 duplicate (10 min window) · 429 rate limit (30/day).

## Notes & limits (demo scope)

- **Mock DB:** `backend/store.js` keeps data in process memory; restart resets seeds. The SQL migration is provided for a real deployment but is not executed by the demo.
- **Demo auth:** identity comes from the `x-user-id` header instead of session cookies; `/api/dev/users` exists only to power the frontend user switcher.
- **Not included** (per spec §0.2): editing kudos content, notifications, reactions, user-driven flagging, automated pre-screening.
- Tests/E2E (plan tasks 7–9) are out of scope for this runnable demo; the curl commands above cover the main verification paths.

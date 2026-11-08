# Kudos Feature — Formal Specification

**Version:** 1.1
**Date:** 2026-11-08
**Status:** Draft for review

**Changelog:**
- **1.1** — Added content moderation: US-4 (admin hide/restore), moderation columns on `kudos`, `PATCH /api/kudos/:id/moderate`, `AdminModerationQueue` UI, duplicate-submission rejection.
- **1.0** — Initial draft.

---

## 0. Overview

### 0.1 Purpose
Enable employees to publicly recognize colleagues ("kudos") through the internal web app. A user selects a colleague, writes a short appreciation message, and submits it. All submitted kudos appear in a public feed on the main dashboard. Administrators can hide or restore kudos that violate conduct guidelines.

### 0.2 Scope
**In scope (v1):**
- Selecting a recipient from the existing user base
- Composing and submitting a short text message
- A public, reverse-chronological kudos feed on the main dashboard
- **Content moderation: admins can hide/restore kudos with a recorded reason; hidden kudos are removed from the public feed but retained for audit**
- Duplicate-submission rejection (anti-spam)

**Out of scope (v1, possible future iterations):**
- Editing kudos content after submission (message text and recipient are immutable)
- Reactions, comments, or replies on kudos
- Private (non-public) kudos
- Notifications (email/Slack) to recipients, or to users whose kudos were moderated
- Leaderboards, analytics, or kudos "points"
- User-driven reporting/flagging ("report this kudos") — v1 moderation is admin-initiated only
- Automated pre-screening (profanity filters, ML classifiers)

### 0.3 Assumptions
- An authenticated internal web app with an existing `users` table providing: `id`, display name, avatar URL, active/deactivated status, and an **`is_admin` boolean** used to authorize moderation actions.
- Reference stack for concrete examples: **React (frontend), Node.js + Express (backend), PostgreSQL (database)**. Equivalents in other stacks are acceptable; the contract (endpoints, schema, behavior) is what matters.
- All API routes require an authenticated session; the current user's identity comes from the session, never from the request body.

---

## 1. Functional Requirements

### 1.1 User Stories & Acceptance Criteria

#### US-1 — Give kudos to a colleague
> As an authenticated employee, I want to select a colleague, write a short message of appreciation, and submit it, so that their contribution is publicly recognized.

**AC-1.1** — Given I am on the "Give Kudos" form, when I open the recipient picker, then I see a list of active users, alphabetically sorted, **excluding myself**.

**AC-1.2** — Given the recipient list is long, when I type into the picker's search box, then the list is filtered by name (case-insensitive substring match) within 300 ms (client-side or server round-trip).

**AC-1.3** — Given I have selected a recipient and entered a message between 1 and 280 characters, when I click Submit, then the kudos is persisted, I see a success confirmation, the form resets, and my new kudos appears at the top of the feed without a full page reload.

**AC-1.4** — Given the message field is empty or contains only whitespace, when I click Submit, then submission is blocked and an inline validation error "Message is required" is shown.

**AC-1.5** — Given no recipient is selected, when I click Submit, then submission is blocked and an inline validation error "Please select a colleague" is shown.

**AC-1.6** — Given the message exceeds 280 characters, then the input prevents or blocks submission and shows a live character counter indicating the limit.

**AC-1.7** — Given the selected recipient has been deactivated after I opened the form, when I submit, then the request fails with an error explaining the recipient is unavailable, and my message text is preserved in the form.

**AC-1.8** — Given a submission is in flight, then the submit button is disabled to prevent duplicate submissions.

**AC-1.9** — Given I submit a kudos identical (same recipient, same trimmed message) to one I submitted within the last 10 minutes, when the server detects the duplicate, then the submission is rejected (HTTP 409) with a message "You already sent this kudos recently", and my form content is preserved.

#### US-2 — View the public kudos feed
> As an authenticated employee, I want to see recently submitted kudos on the main dashboard, so that I can stay aware of recognition happening across the company.

**AC-2.1** — Given kudos exist, when I open the dashboard, then the feed displays the 20 most recent **visible** kudos, newest first. Kudos hidden by an administrator never appear in this feed.

**AC-2.2** — Each feed item displays: sender name + avatar, recipient name + avatar, the message text, and a human-readable timestamp (e.g., "2 hours ago", with full datetime on hover).

**AC-2.3** — Given more than 20 visible kudos exist, when I reach the end of the loaded list, then the next 20 load automatically (infinite scroll) or via a "Load more" button.

**AC-2.4** — Given no visible kudos exist yet, then an empty state is shown: "No kudos yet — be the first to recognize a colleague!"

**AC-2.5** — Given the feed fails to load, then an inline error with a retry option is shown instead of a blank section.

**AC-2.6** — Message text containing HTML/script is rendered as plain text (no markup execution).

#### US-3 — System integrity rules
> As the system, I must enforce data integrity regardless of client behavior.

**AC-3.1** — A kudos whose sender equals the recipient is rejected server-side with HTTP 400, even if the client is bypassed.

**AC-3.2** — The sender is always derived from the authenticated session; a `sender_id` in the request body is ignored/rejected.

**AC-3.3** — A user is limited to 30 kudos submissions per rolling 24 hours; exceeding this returns HTTP 429 with a user-friendly message.

**AC-3.4** — A duplicate kudos (same sender, same recipient, same trimmed message) created within 10 minutes of the original is rejected server-side with HTTP 409.

**AC-3.5** — Kudos content is immutable: no endpoint can edit the message, sender, recipient, or timestamp. The only permitted post-creation change is the moderation state (visibility), and only by admins (see US-4).

#### US-4 — Moderate inappropriate kudos (Administrator)
> As an administrator, I want to hide or restore inappropriate kudos and record the reason, so that the public feed stays respectful while a full audit trail is preserved.

**AC-4.1** — Given I am an admin, when I view any kudos (in the feed or the moderation queue), then I see a "Hide" control on visible kudos and a "Restore" control on hidden kudos. Non-admin users never see moderation controls.

**AC-4.2** — Given a visible kudos, when I hide it and provide a reason, then the kudos immediately disappears from the public feed for all users (on next feed load/refresh), and the action is recorded with my admin identity (`moderated_by`), the timestamp (`moderated_at`), and the reason (`reason_for_moderation`).

**AC-4.3** — Given a hidden kudos, when I restore it, then it reappears in the public feed at its original chronological position, and the restore action is recorded (`moderated_by`/`moderated_at` updated; `reason_for_moderation` cleared).

**AC-4.4** — Given I attempt to hide a kudos without providing a reason, then the request is rejected with HTTP 400 and no state change occurs.

**AC-4.5** — Given I am not an admin, when I call the moderation endpoint directly (e.g., via API client), then the request is rejected with HTTP 403 and the kudos is unchanged.

**AC-4.6** — Given a kudos has been hidden, when a non-admin user (including the sender and recipient) views any feed or kudos list, then the kudos is not visible, and moderation metadata (reason, moderator identity) is never exposed to non-admins in any API response.

**AC-4.7** — Given an admin views the `AdminModerationQueue`, when they filter by "Hidden", then they see all hidden kudos with sender, recipient, message, original timestamp, moderation reason, and which admin hid each one.

**AC-4.8** — Given the feed is open in my browser when an admin hides a kudos, then the hidden kudos remains in my already-loaded list until my next feed refresh (real-time removal is not required in v1).

### 1.2 Business Rules Summary
| Rule | Value |
|---|---|
| Message length | 1–280 characters (after trimming) |
| Message format | Plain text only; rendered escaped |
| Self-kudos | Forbidden (client-hidden, server-enforced, DB-constrained) |
| Rate limit | 30 submissions / user / 24h |
| Duplicate window | Identical (sender, recipient, message) rejected within 10 minutes → HTTP 409 |
| Feed ordering | `created_at` descending |
| Feed page size | 20 |
| Visibility (default) | `is_visible = TRUE` on creation |
| Feed visibility | Only `is_visible = TRUE` kudos returned to non-admins |
| Hide action | Requires admin + non-empty reason; stamps moderator identity and time |
| Restore action | Requires admin; re-stamps moderator/time; clears reason |
| Moderation metadata | Reflects the most recent moderation action (last-action-wins); visible to admins only |
| Hard deletion | Not supported; hidden kudos are retained indefinitely for audit |

---

## 2. Technical Design

### 2.1 Database Schema (PostgreSQL)

Assumed existing table (not created by this feature):

```sql
-- existing (is_admin added/assumed for moderation)
users (
  id          BIGSERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  avatar_url  TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  is_admin    BOOLEAN NOT NULL DEFAULT FALSE
)
```

New table (v1.1, with moderation support):

```sql
CREATE TABLE kudos (
  id                     BIGSERIAL PRIMARY KEY,
  sender_id              BIGINT NOT NULL REFERENCES users(id),
  recipient_id           BIGINT NOT NULL REFERENCES users(id),
  message                VARCHAR(280) NOT NULL
                         CHECK (char_length(btrim(message)) > 0),
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Moderation
  is_visible             BOOLEAN NOT NULL DEFAULT TRUE,
  moderated_by           BIGINT REFERENCES users(id),
  moderated_at           TIMESTAMPTZ,
  reason_for_moderation  TEXT,

  CONSTRAINT no_self_kudos CHECK (sender_id <> recipient_id),
  CONSTRAINT moderation_stamp_consistency
    CHECK ((moderated_at IS NULL) = (moderated_by IS NULL))
);

-- Feed query: newest-first listing of visible kudos (partial index)
CREATE INDEX idx_kudos_visible_created
  ON kudos (created_at DESC, id DESC)
  WHERE is_visible = TRUE;

-- Future-proofing: "kudos received by user"
CREATE INDEX idx_kudos_recipient ON kudos (recipient_id, created_at DESC);
```

**Notes:**
- If the v1.0 `kudos` table is already deployed, migrate with `ALTER TABLE kudos ADD COLUMN is_visible BOOLEAN NOT NULL DEFAULT TRUE, ADD COLUMN moderated_by BIGINT REFERENCES users(id), ADD COLUMN moderated_at TIMESTAMPTZ, ADD COLUMN reason_for_moderation TEXT;` plus the constraint and index changes above.
- `ON DELETE` behavior intentionally left restrictive: user records should be soft-deleted (`is_active = FALSE`), preserving kudos history.
- The `moderation_stamp_consistency` CHECK ensures `moderated_by` and `moderated_at` are always set (or cleared) together.
- Hidden kudos are **soft-hidden, never hard-deleted** — the row, message, and moderation metadata persist for audit.
- The partial index keeps the hot feed query scanning only visible rows; hidden rows add no feed-query overhead.

### 2.2 API Endpoints (REST, JSON)

Base path `/api`. All endpoints require authentication (401 if unauthenticated). All errors use the shape:

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "Human-readable message", "details": {} } }
```

#### 2.2.1 List users (recipient picker)
```
GET /api/users?search=<string>&limit=50
```
Returns active users, excluding the requester, sorted by name.

**200 Response:**
```json
{
  "users": [
    { "id": 42, "name": "Ada Lovelace", "avatar_url": "https://..." }
  ]
}
```

#### 2.2.2 Create kudos
```
POST /api/kudos
Content-Type: application/json

{ "recipient_id": 42, "message": "Thanks for unblocking the release!" }
```

| Status | Condition |
|---|---|
| 201 | Created. Returns the full kudos object (below). |
| 400 | Validation failure: missing/blank message, message > 280 chars, `recipient_id` missing/self |
| 401 | Unauthenticated |
| 404 | Recipient not found or inactive |
| 409 | Duplicate: identical (sender, recipient, trimmed message) submitted within 10 minutes |
| 429 | Rate limit exceeded |

**201 Response:**
```json
{
  "kudos": {
    "id": 101,
    "message": "Thanks for unblocking the release!",
    "created_at": "2026-11-08T10:15:30Z",
    "is_visible": true,
    "sender":    { "id": 7,  "name": "Grace Hopper", "avatar_url": "https://..." },
    "recipient": { "id": 42, "name": "Ada Lovelace", "avatar_url": "https://..." }
  }
}
```

**Validation logic (server-side, in order):**
1. `recipient_id` present, numeric → 400 `VALIDATION_ERROR`
2. `recipient_id != session user id` → 400 `SELF_KUDOS`
3. Recipient exists and `is_active` → 404 `RECIPIENT_UNAVAILABLE`
4. `message` present, trimmed length 1–280 → 400 `VALIDATION_ERROR`
5. Rate limit check → 429 `RATE_LIMITED`
6. Duplicate check (same sender + recipient + trimmed message, `created_at` within 10 minutes) → 409 `DUPLICATE_KUDOS`
7. Insert (defaults `is_visible = TRUE`) and return with joined sender/recipient data.

#### 2.2.3 Get kudos feed
```
GET /api/kudos?limit=20&cursor=<opaque>&include_hidden=<bool>
```
Cursor-based pagination (cursor encodes `created_at` + `id` of the last item of the previous page). Offset pagination is rejected to avoid skipped/duplicated items under concurrent inserts.

- **Non-admins:** always receive only `is_visible = TRUE` kudos; `include_hidden` is ignored.
- **Admins:** may pass `include_hidden=true` (used by the moderation queue); hidden items then include the `moderation` block below.
- The `moderation` block is included **only for admins**; it is never serialized for non-admin callers.

**200 Response:**
```json
{
  "kudos": [
    {
      "id": 101,
      "message": "Thanks for unblocking the release!",
      "created_at": "2026-11-08T10:15:30Z",
      "is_visible": true,
      "sender":    { "id": 7,  "name": "Grace Hopper", "avatar_url": "https://..." },
      "recipient": { "id": 42, "name": "Ada Lovelace", "avatar_url": "https://..." },
      "moderation": null
    },
    {
      "id": 98,
      "message": "…",
      "created_at": "2026-11-08T08:02:11Z",
      "is_visible": false,
      "sender":    { "id": 12, "name": "Alan Turing", "avatar_url": "https://..." },
      "recipient": { "id": 33, "name": "Edsger Dijkstra", "avatar_url": "https://..." },
      "moderation": {
        "moderated_by": { "id": 1, "name": "Root Admin" },
        "moderated_at": "2026-11-08T09:30:00Z",
        "reason": "Inappropriate language"
      }
    }
  ],
  "next_cursor": "eyJjcmVhdGVkX2F0Ijoi...",
  "has_more": true
}
```

**Query (reference SQL, non-admin feed):**
```sql
SELECT k.id, k.message, k.created_at,
       s.id, s.name, s.avatar_url,
       r.id, r.name, r.avatar_url
FROM kudos k
JOIN users s ON s.id = k.sender_id
JOIN users r ON r.id = k.recipient_id
WHERE k.is_visible = TRUE
  AND (k.created_at, k.id) < ($1::timestamptz, $2::bigint)  -- omitted on first page
ORDER BY k.created_at DESC, k.id DESC
LIMIT 21;  -- limit+1 to compute has_more
```

#### 2.2.4 Moderate kudos (admin only)
```
PATCH /api/kudos/:id/moderate
Content-Type: application/json

{ "is_visible": false, "reason": "Inappropriate language" }
```

| Status | Condition |
|---|---|
| 200 | Moderation applied. Returns the updated kudos including the `moderation` block. |
| 400 | Invalid body: `is_visible` missing/non-boolean, or hiding (`is_visible=false`) with missing/blank `reason` |
| 401 | Unauthenticated |
| 403 | Authenticated but not an admin |
| 404 | Kudos `:id` does not exist |

**Behavior:**
- **Hide** (`is_visible: false`): sets `is_visible = FALSE`, `moderated_by = <admin id>`, `moderated_at = now()`, `reason_for_moderation = <trimmed reason>`. `reason` is **required** (1–500 chars after trim).
- **Restore** (`is_visible: true`): sets `is_visible = TRUE`, re-stamps `moderated_by` and `moderated_at`, and sets `reason_for_moderation = NULL`. `reason` must not be provided (400 if present).
- Idempotent: hiding an already-hidden kudos simply overwrites the moderation stamp with the latest admin/reason (last-action-wins); restoring an already-visible kudos is a no-op returning 200.
- The endpoint is the **only** write path to moderation columns; no other endpoint may set them.

**200 Response:**
```json
{
  "kudos": {
    "id": 98,
    "message": "…",
    "created_at": "2026-11-08T08:02:11Z",
    "is_visible": false,
    "sender":    { "id": 12, "name": "Alan Turing", "avatar_url": "https://..." },
    "recipient": { "id": 33, "name": "Edsger Dijkstra", "avatar_url": "https://..." },
    "moderation": {
      "moderated_by": { "id": 1, "name": "Root Admin" },
      "moderated_at": "2026-11-08T11:00:00Z",
      "reason": "Inappropriate language"
    }
  }
}
```

### 2.3 Frontend Components

Component tree (React naming, framework-agnostic responsibilities):

```
DashboardPage
├── KudosForm
│   ├── UserSelect            # typeahead recipient picker
│   │   └── UserOption        # avatar + name row
│   ├── MessageInput          # textarea + live char counter (n/280)
│   └── SubmitButton          # disabled while invalid or submitting
├── KudosFeed
│   ├── KudosCard             # one feed item
│   │   ├── Avatar (sender)   # existing shared component
│   │   ├── Avatar (recipient)
│   │   ├── RelativeTime      # "2 hours ago", title=full ISO datetime
│   │   └── ModerationControls# admin-only: Hide / Restore buttons
│   ├── FeedSkeleton          # loading placeholder rows
│   ├── EmptyState
│   └── LoadMoreSentinel      # IntersectionObserver trigger / "Load more" button
└── (route: /admin/moderation, admin-gated)
    └── AdminModerationQueue
        ├── ModerationFilters # tabs: Visible | Hidden | All
        ├── KudosCard (with ModerationControls)
        └── ModerationReasonDialog  # reason input, required for Hide
```

**Component contracts:**

| Component | Props | Behavior |
|---|---|---|
| `KudosForm` | `onSubmitted(kudos)` | Validates locally (recipient selected, trimmed message 1–280). Calls `POST /api/kudos`. On 201: clears fields, shows success toast, invokes `onSubmitted`. On error (incl. 409 duplicate): shows inline error, preserves inputs. |
| `UserSelect` | `onSelect(user)`, `excludeUserId` | Debounced (200 ms) `GET /api/users?search=`. Keyboard-navigable dropdown. |
| `MessageInput` | `value`, `onChange`, `maxLength=280` | Hard-stops at 280 chars; counter turns red at ≥ 260. |
| `KudosFeed` | `isAdmin` | Fetches first page (visible only) on mount. Appends subsequent pages via `next_cursor`. Optimistically prepends kudos passed from `KudosForm` (dedupes by `id`). When an admin hides a card, removes it from the local list immediately. |
| `KudosCard` | `kudos`, `isAdmin`, `onModerated(kudos)` | Renders sender → recipient header ("Grace Hopper recognized Ada Lovelace"), message as **plain text** (no `dangerouslySetInnerHTML`), relative timestamp. Renders `ModerationControls` only when `isAdmin`. |
| `ModerationControls` | `kudos`, `onModerated(kudos)` | Visible kudos → "Hide" button opening `ModerationReasonDialog`; hidden kudos → "Restore" button (with confirm). Calls `PATCH /api/kudos/:id/moderate`; on 200 invokes `onModerated` with the updated kudos. |
| `ModerationReasonDialog` | `onSubmit(reason)`, `onCancel` | Textarea for reason (required, max 500 chars), inline validation "A reason is required to hide this kudos". |
| `AdminModerationQueue` | — | Route `/admin/moderation`, client-side role-gated **and** enforced server-side (non-admins get 403 from the API; the route itself redirects non-admins to the dashboard). Fetches `GET /api/kudos?include_hidden=true`. Tabs filter Visible / Hidden / All. Hidden cards are visually distinct (muted styling + "Hidden by {admin} — {reason}" banner). |

**Admin experience summary:**
- Admins see moderation controls in two places: (1) inline on each `KudosCard` in the dashboard feed for fast action, and (2) the dedicated `AdminModerationQueue` page for reviewing everything including hidden items.
- Non-admins receive no admin-only data (enforced server-side) and never see the controls (client rendering check only as UX, not security).

**State/data flow:**
- Feed state lives in `KudosFeed`; `DashboardPage` wires `KudosForm.onSubmitted` → `KudosFeed.prepend` via shared parent state or lightweight query-cache invalidation (e.g., React Query mutation + `setQueryData`).
- Moderation mutations update the local cache: hide → remove from visible list; restore in the queue → move between tabs.
- No global store required for v1.

### 2.4 Security & Abuse Considerations
- **AuthN:** session cookie required on all endpoints.
- **AuthZ:** `PATCH /api/kudos/:id/moderate` and `GET /api/kudos?include_hidden=true` require `is_admin = TRUE` on the session user, checked **server-side on every request**. All other endpoints are open to any authenticated user.
- **Data exposure:** moderation metadata (`moderated_by`, `moderated_at`, `reason_for_moderation`) is serialized only for admin callers; non-admin responses never contain these fields.
- **XSS:** message and moderation reason are stored raw, escaped at render time; API returns `Content-Type: application/json` only.
- **Rate limiting:** 30 POSTs/user/24h (sliding window, e.g., Redis counter or DB count on `sender_id` + `created_at`).
- **Spam/duplicates:** 10-minute identical-content rejection (409) blocks accidental double-clicks and trivial spam floods; the daily rate limit bounds sustained abuse; the admin moderation queue is the human response path for anything that slips through.
- **Auditability:** moderation is soft-hide with last-action-wins stamps; rows are never hard-deleted via the API.

---

## 3. Implementation Plan

Each step is independently reviewable; steps 2–4 (backend) and 5–6 (frontend) can partially parallelize after step 1.

| # | Task | Details | Definition of Done |
|---|---|---|---|
| 1 | **DB migration** | Migration creating `kudos` table **with moderation columns**, CHECK constraints (incl. `moderation_stamp_consistency`), and indexes (incl. partial index on visible rows). | Migration applies cleanly up/down; constraints verified with manual invalid-insert attempts. |
| 2 | **Backend: POST /api/kudos** | Endpoint with full validation chain (§2.2.2), rate limiting, duplicate rejection (409), joined response payload. | Unit tests cover: happy path, blank message, >280 chars, self-kudos, inactive recipient, unauthenticated, rate limit, duplicate within 10 min. |
| 3 | **Backend: GET /api/kudos** | Cursor-paginated feed with sender/recipient joins, `has_more`, `is_visible` filter, admin-only `include_hidden` + `moderation` serialization. | Integration tests: empty feed, page boundary, pagination continuity, newest-first ordering, hidden kudos excluded for non-admins, admin-only metadata never leaked to non-admins. |
| 4 | **Backend: GET /api/users** | Active users, excludes requester, name search, name-sorted. | Tested: search filtering, self-exclusion, inactive-user exclusion. |
| 5 | **Frontend: KudosForm** | `UserSelect` + `MessageInput` + submit flow with all client validation and error states, incl. 409 duplicate handling (AC-1.1–1.9). | Component tests: validation messages, disabled submit, success reset, error preservation (incl. duplicate). |
| 6 | **Frontend: KudosFeed on dashboard** | `KudosCard` list, cursor pagination, skeleton/empty/error states, optimistic prepend on submit (AC-2.1–2.6). | Component tests: rendering, empty state, load-more; manual check on dashboard layout. |
| 7 | **Moderation: endpoint + admin UI** | `PATCH /api/kudos/:id/moderate` with hide/restore semantics; `ModerationControls` + `ModerationReasonDialog` on `KudosCard`; `AdminModerationQueue` page with Visible/Hidden/All tabs (AC-4.1–4.8). | API tests: 200 hide/restore, 400 missing reason, 403 non-admin, 404 unknown id, stamp overwrite on re-hide. UI tests: controls hidden for non-admins, reason dialog validation, queue filtering, hidden-item banner. |
| 8 | **End-to-end tests** | Playwright/Cypress: (a) submit kudos → appears in feed; (b) validation errors; (c) pagination with seeded data; (d) **admin hides kudos → gone for regular user on refresh → admin restores → visible again; (e) duplicate submission rejected.** | E2E suite green in CI. |
| 9 | **XSS & security check** | Submit payload containing `<script>`/HTML in message **and** moderation reason; confirm inert rendering. Rate-limit probe. Confirm moderation metadata absent from non-admin API responses. | Findings documented and resolved. |
| 10 | **Staging verification & rollout** | Deploy to staging, product walkthrough against all ACs, then production. | Stakeholder sign-off; feature enabled for all users. |

**Suggested implementation order:** 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10.

---

## Appendix A — Open Questions for Review
1. Should recipients be notified (in-app badge / email / Slack) in v1.1?
2. Should senders be notified when their kudos is hidden, or stay silent (v1 default)?
3. Is 280 characters the right message cap, or do we want longer-form recognition?
4. Do we need user-driven "report this kudos" flagging to feed the moderation queue, or is admin-initiated moderation sufficient for now?
5. Do we want automated pre-screening (profanity list / ML classifier) before publication?
6. Who grants/revokes the `is_admin` role, and is a separate `moderator` role needed?

-- Kudos Feature — Migration 001 (spec v1.1, §2.1)
-- Creates the kudos table with moderation support.
-- If a v1.0 kudos table already exists, use the ALTER variant at the bottom instead.

CREATE TABLE kudos (
  id                     BIGSERIAL PRIMARY KEY,
  sender_id              BIGINT NOT NULL REFERENCES users(id),
  recipient_id           BIGINT NOT NULL REFERENCES users(id),
  message                VARCHAR(280) NOT NULL
                         CHECK (char_length(btrim(message)) > 0),
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Moderation (soft-hide; rows are never hard-deleted)
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

-- ---------------------------------------------------------------------------
-- ALTER variant (only if upgrading an existing v1.0 table):
--
-- ALTER TABLE kudos
--   ADD COLUMN is_visible BOOLEAN NOT NULL DEFAULT TRUE,
--   ADD COLUMN moderated_by BIGINT REFERENCES users(id),
--   ADD COLUMN moderated_at TIMESTAMPTZ,
--   ADD COLUMN reason_for_moderation TEXT,
--   ADD CONSTRAINT moderation_stamp_consistency
--     CHECK ((moderated_at IS NULL) = (moderated_by IS NULL));
-- CREATE INDEX idx_kudos_visible_created
--   ON kudos (created_at DESC, id DESC) WHERE is_visible = TRUE;
-- ---------------------------------------------------------------------------

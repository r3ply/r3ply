CREATE TABLE IF NOT EXISTS comments_via_email (
  id TEXT PRIMARY KEY NOT NULL, -- UUID stored as TEXT
  message_id TEXT UNIQUE NOT NULL, -- Email Message-ID must be globally unique
  created_utc DATETIME DEFAULT CURRENT_TIMESTAMP, -- Auto-generated timestamp for when the record was created
  state TEXT NOT NULL CHECK(state IN ('accepted', 'deliverable', 'undeliverable', 'prepared', 'unpreparable', 'processed', 'unprocessable', 'delivered')), -- comment state, note: comments are always in exactly one state
  files_id TEXT UNIQUE, -- comment files ID, E.g. gist, S3, R2
  files_url TEXT UNIQUE -- comment files URL, E.g. gist, S3, R2
);
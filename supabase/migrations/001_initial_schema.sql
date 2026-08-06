-- Events table
CREATE TABLE IF NOT EXISTS events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','countdown','voting','locked','result')),
  open_at timestamptz,
  end_at timestamptz,
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Candidates table
CREATE TABLE IF NOT EXISTS candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name text NOT NULL,
  image_path text NOT NULL,
  display_order integer NOT NULL CHECK (display_order BETWEEN 1 AND 5),
  vote_count integer NOT NULL DEFAULT 0 CHECK (vote_count >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(event_id, display_order)
);

-- Voters table
CREATE TABLE IF NOT EXISTS voters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES events(id) ON DELETE SET NULL,
  display_name text NOT NULL,
  session_token_hash text UNIQUE NOT NULL,
  has_voted boolean NOT NULL DEFAULT false,
  voted_at timestamptz,
  event_version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Votes table
CREATE TABLE IF NOT EXISTS votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  voter_id uuid NOT NULL REFERENCES voters(id) ON DELETE CASCADE,
  candidate_id uuid NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  idempotency_key uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(event_id, voter_id),
  UNIQUE(event_id, idempotency_key)
);

-- Admin audit logs
CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_candidates_event ON candidates(event_id);
CREATE INDEX IF NOT EXISTS idx_votes_event ON votes(event_id);
CREATE INDEX IF NOT EXISTS idx_votes_voter ON votes(voter_id);
CREATE INDEX IF NOT EXISTS idx_voters_session ON voters(session_token_hash);
CREATE INDEX IF NOT EXISTS idx_voters_event ON voters(event_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON admin_audit_logs(created_at);

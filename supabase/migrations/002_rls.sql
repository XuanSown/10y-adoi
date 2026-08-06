-- Enable RLS
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE voters ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- Events: everyone can read
CREATE POLICY events_select ON events FOR SELECT USING (true);

-- Candidates: everyone can read
CREATE POLICY candidates_select ON candidates FOR SELECT USING (true);

-- Voters: no direct client access (all via RPC)
-- Votes: no direct client access (all via RPC)
-- Admin audit logs: no direct client access

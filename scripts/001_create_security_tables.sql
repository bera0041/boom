-- SentinelCare Security Tables
-- This script creates the necessary tables for user consent tracking and audit logging

-- User consent tracking table
-- Stores explicit consent records for monitoring
CREATE TABLE IF NOT EXISTS user_consent (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  consent_given BOOLEAN NOT NULL DEFAULT false,
  consent_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster lookups by user_id
CREATE INDEX IF NOT EXISTS idx_user_consent_user_id ON user_consent(user_id);

-- Audit log table
-- Tracks security-relevant events for compliance and debugging
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  event_data JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for audit log queries
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_event_type ON audit_log(event_type);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at DESC);

-- Enable Row Level Security
ALTER TABLE user_consent ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_consent
-- Users can only view their own consent records
CREATE POLICY "Users can view own consent" ON user_consent
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own consent records
CREATE POLICY "Users can insert own consent" ON user_consent
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own consent records
CREATE POLICY "Users can update own consent" ON user_consent
  FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for audit_log
-- Users can view their own audit entries
CREATE POLICY "Users can view own audit logs" ON audit_log
  FOR SELECT USING (auth.uid() = user_id);

-- Users can create audit entries for themselves
CREATE POLICY "Users can create own audit logs" ON audit_log
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at on user_consent
DROP TRIGGER IF EXISTS update_user_consent_updated_at ON user_consent;
CREATE TRIGGER update_user_consent_updated_at
  BEFORE UPDATE ON user_consent
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE user_consent IS 'Stores user consent records for home monitoring';
COMMENT ON TABLE audit_log IS 'Tracks security-relevant events like logins, alerts, and consent changes';
COMMENT ON COLUMN user_consent.consent_given IS 'Whether user has explicitly consented to monitoring';
COMMENT ON COLUMN user_consent.consent_timestamp IS 'When consent was given or updated';
COMMENT ON COLUMN audit_log.event_type IS 'Type of event: login, logout, alert_triggered, alert_acknowledged, consent_updated, etc.';
COMMENT ON COLUMN audit_log.event_data IS 'JSON payload with event-specific details';

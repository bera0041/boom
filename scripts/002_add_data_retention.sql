-- SentinelCare Data Retention Policy
-- Implements automatic cleanup of old data to protect user privacy

-- Add retention policy configuration table
CREATE TABLE IF NOT EXISTS data_retention_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  audit_log_retention_days INTEGER NOT NULL DEFAULT 30,
  consent_history_retention_days INTEGER NOT NULL DEFAULT 90,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE data_retention_config ENABLE ROW LEVEL SECURITY;

-- RLS policies for data_retention_config
CREATE POLICY "Users can view own retention config" ON data_retention_config
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own retention config" ON data_retention_config
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own retention config" ON data_retention_config
  FOR UPDATE USING (auth.uid() = user_id);

-- Function to clean up old audit logs based on retention policy
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  retention_days INTEGER;
  user_record RECORD;
BEGIN
  -- For each user with a retention config, delete old logs
  FOR user_record IN 
    SELECT user_id, audit_log_retention_days 
    FROM data_retention_config
  LOOP
    DELETE FROM audit_log 
    WHERE user_id = user_record.user_id 
      AND created_at < NOW() - (user_record.audit_log_retention_days || ' days')::INTERVAL;
  END LOOP;
  
  -- For users without config, use default 30 days
  DELETE FROM audit_log 
  WHERE created_at < NOW() - INTERVAL '30 days'
    AND user_id NOT IN (SELECT user_id FROM data_retention_config);
END;
$$;

-- Function to clean up old consent history (keep only latest + configurable history)
CREATE OR REPLACE FUNCTION cleanup_old_consent_history()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  retention_days INTEGER;
  user_record RECORD;
BEGIN
  -- For each user, keep only consent records within retention period
  -- Always keep the most recent consent record regardless of age
  FOR user_record IN 
    SELECT DISTINCT user_id FROM user_consent
  LOOP
    retention_days := COALESCE(
      (SELECT consent_history_retention_days FROM data_retention_config WHERE user_id = user_record.user_id),
      90  -- Default 90 days
    );
    
    DELETE FROM user_consent 
    WHERE user_id = user_record.user_id 
      AND created_at < NOW() - (retention_days || ' days')::INTERVAL
      AND id != (
        SELECT id FROM user_consent 
        WHERE user_id = user_record.user_id 
        ORDER BY created_at DESC 
        LIMIT 1
      );
  END LOOP;
END;
$$;

-- Create a combined cleanup function
CREATE OR REPLACE FUNCTION run_data_retention_cleanup()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM cleanup_old_audit_logs();
  PERFORM cleanup_old_consent_history();
END;
$$;

-- Add trigger to auto-update updated_at on data_retention_config
DROP TRIGGER IF EXISTS update_data_retention_config_updated_at ON data_retention_config;
CREATE TRIGGER update_data_retention_config_updated_at
  BEFORE UPDATE ON data_retention_config
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE data_retention_config IS 'User-configurable data retention policies';
COMMENT ON COLUMN data_retention_config.audit_log_retention_days IS 'Days to retain audit logs (default 30)';
COMMENT ON COLUMN data_retention_config.consent_history_retention_days IS 'Days to retain consent history (default 90, always keeps latest)';
COMMENT ON FUNCTION run_data_retention_cleanup() IS 'Call periodically to purge old data per retention policies';

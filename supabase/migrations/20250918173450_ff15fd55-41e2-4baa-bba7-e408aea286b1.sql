-- Add automatic cleanup for leftover reassignment placeholders
-- This prevents future accumulation of orphaned placeholder organizations

-- Create a cleanup function that can be called periodically
CREATE OR REPLACE FUNCTION cleanup_reassignment_placeholders()
RETURNS TABLE(cleaned_count INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cleanup_count INTEGER := 0;
BEGIN
  -- Delete orphaned reassignment requests first
  DELETE FROM organization_reassignment_requests 
  WHERE organization_id IN (
    SELECT id FROM organizations 
    WHERE name LIKE '%__reassign_%' 
      AND membership_status = 'pending'
      AND created_at < NOW() - INTERVAL '24 hours' -- Only clean up old ones
  );

  -- Delete old reassignment placeholder organizations
  DELETE FROM organizations 
  WHERE name LIKE '%__reassign_%' 
    AND membership_status = 'pending'
    AND created_at < NOW() - INTERVAL '24 hours'; -- Only clean up old ones
    
  GET DIAGNOSTICS cleanup_count = ROW_COUNT;
  
  -- Log the cleanup if any records were removed
  IF cleanup_count > 0 THEN
    INSERT INTO audit_log (action, entity_type, details)
    VALUES (
      'automated_cleanup_reassignment_placeholders', 
      'system', 
      jsonb_build_object(
        'description', 'Automated cleanup of leftover reassignment placeholders',
        'cleaned_count', cleanup_count,
        'timestamp', NOW()
      )
    );
  END IF;
  
  RETURN QUERY SELECT cleanup_count;
END;
$$;

-- Add a comment explaining the function
COMMENT ON FUNCTION cleanup_reassignment_placeholders() IS 
'Automatically cleanup leftover reassignment placeholder organizations that are older than 24 hours. This prevents UI pollution and database bloat from interrupted reassignment processes.';
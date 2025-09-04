-- Add registration categories and enhanced tracking
ALTER TABLE pending_registrations 
ADD COLUMN priority_level TEXT DEFAULT 'normal' CHECK (priority_level IN ('low', 'normal', 'high', 'urgent'));

ALTER TABLE pending_registrations 
ADD COLUMN admin_notes TEXT;

ALTER TABLE pending_registrations 
ADD COLUMN duplicate_check_status TEXT DEFAULT 'pending' CHECK (duplicate_check_status IN ('pending', 'clean', 'flagged'));

ALTER TABLE pending_registrations 
ADD COLUMN flags TEXT[] DEFAULT '{}';

-- Add indexed columns for better performance
CREATE INDEX IF NOT EXISTS idx_pending_registrations_status_priority ON pending_registrations(approval_status, priority_level);
CREATE INDEX IF NOT EXISTS idx_pending_registrations_created_at ON pending_registrations(created_at);
CREATE INDEX IF NOT EXISTS idx_pending_registrations_email ON pending_registrations(email);
CREATE INDEX IF NOT EXISTS idx_pending_registrations_organization ON pending_registrations(organization_name);

-- Add registration analytics table
CREATE TABLE IF NOT EXISTS registration_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_name TEXT NOT NULL,
  metric_value NUMERIC NOT NULL,
  metric_date DATE NOT NULL DEFAULT CURRENT_DATE,
  additional_data JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_registration_analytics_date_metric ON registration_analytics(metric_date, metric_name);

-- Enable RLS on registration analytics
ALTER TABLE registration_analytics ENABLE ROW LEVEL SECURITY;

-- Add policy for admins to view analytics
CREATE POLICY "Admins can view registration analytics" ON registration_analytics
FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

-- Add function to update analytics
CREATE OR REPLACE FUNCTION update_registration_analytics()
RETURNS TRIGGER AS $$
BEGIN
  -- Update daily registration counts
  INSERT INTO registration_analytics (metric_name, metric_value, metric_date)
  VALUES ('daily_registrations', 1, CURRENT_DATE)
  ON CONFLICT (metric_date, metric_name) 
  DO UPDATE SET metric_value = registration_analytics.metric_value + 1;
  
  -- Track by priority level
  INSERT INTO registration_analytics (metric_name, metric_value, metric_date, additional_data)
  VALUES ('registrations_by_priority', 1, CURRENT_DATE, jsonb_build_object('priority', NEW.priority_level))
  ON CONFLICT DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for analytics
DROP TRIGGER IF EXISTS trigger_registration_analytics ON pending_registrations;
CREATE TRIGGER trigger_registration_analytics
  AFTER INSERT ON pending_registrations
  FOR EACH ROW EXECUTE FUNCTION update_registration_analytics();

-- Add bulk operations tracking
CREATE TABLE IF NOT EXISTS bulk_operations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_type TEXT NOT NULL CHECK (operation_type IN ('bulk_approve', 'bulk_reject', 'bulk_priority_update')),
  performed_by UUID REFERENCES profiles(id),
  registration_ids UUID[] NOT NULL,
  operation_data JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE bulk_operations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage bulk operations" ON bulk_operations
FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Add re-approval workflow support
ALTER TABLE pending_registrations 
ADD COLUMN resubmission_count INTEGER DEFAULT 0;

ALTER TABLE pending_registrations 
ADD COLUMN original_submission_id UUID REFERENCES pending_registrations(id);

ALTER TABLE pending_registrations 
ADD COLUMN rejection_requires_resubmission BOOLEAN DEFAULT false;
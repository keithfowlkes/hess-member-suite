-- Fix security warnings by updating function search path
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
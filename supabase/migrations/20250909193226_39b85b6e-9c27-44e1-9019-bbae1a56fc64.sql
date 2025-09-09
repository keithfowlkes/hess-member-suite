-- Add institution_details column to system_analytics_datacube table
ALTER TABLE system_analytics_datacube 
ADD COLUMN institution_details JSONB;
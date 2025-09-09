-- Fix the ON CONFLICT constraint error in registration_analytics
-- The update_registration_analytics function uses ON CONFLICT (metric_date, metric_name)
-- but there's no unique constraint on these columns

ALTER TABLE public.registration_analytics 
ADD CONSTRAINT registration_analytics_metric_date_name_key 
UNIQUE (metric_date, metric_name);
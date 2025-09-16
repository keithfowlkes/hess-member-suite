-- Remove corrupted 'none' entries from system_field_options table
DELETE FROM system_field_options 
WHERE LOWER(option_value) IN ('none', 'nonespecified') 
   OR option_value = 'None';
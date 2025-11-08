-- Delete old Collegix variations from system_field_options (keeping only 'Aptron Collegix')
DELETE FROM system_field_options 
WHERE field_name = 'financial_system'
  AND option_value ILIKE '%Collegix%'
  AND option_value != 'Aptron Collegix';

-- Normalize financial_system Collegix entries in organizations
UPDATE organizations 
SET financial_system = 'Aptron Collegix'
WHERE financial_system ILIKE '%Collegix%'
  AND financial_system != 'Aptron Collegix';
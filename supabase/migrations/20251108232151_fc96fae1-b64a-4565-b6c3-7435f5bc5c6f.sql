-- Delete old Campus Management variations from system_field_options (keeping only 'Anthology')
DELETE FROM system_field_options 
WHERE field_name = 'payroll_system'
  AND option_value ILIKE '%Campus Management%'
  AND option_value != 'Anthology';

-- Normalize payroll_system Campus Management entries in organizations
UPDATE organizations 
SET payroll_system = 'Anthology'
WHERE payroll_system ILIKE '%Campus Management%'
  AND payroll_system != 'Anthology';
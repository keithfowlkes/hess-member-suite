-- Delete old In-house variations from system_field_options (keeping only 'In-house')
DELETE FROM system_field_options 
WHERE field_name = 'student_information_system'
  AND (option_value ILIKE 'In-house developed' OR option_value ILIKE 'In-house Developed')
  AND option_value != 'In-house';

-- Normalize student_information_system In-house entries in organizations
UPDATE organizations 
SET student_information_system = 'In-house'
WHERE (student_information_system ILIKE 'In-house developed' OR student_information_system ILIKE 'In-house Developed')
  AND student_information_system != 'In-house';
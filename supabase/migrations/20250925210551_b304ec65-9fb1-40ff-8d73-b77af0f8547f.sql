-- Normalize Student Information System data for Anthology variants
UPDATE organizations 
SET student_information_system = 'Anthology',
    updated_at = now()
WHERE student_information_system IN ('Campus Management', 'Anthology/Campus Management');
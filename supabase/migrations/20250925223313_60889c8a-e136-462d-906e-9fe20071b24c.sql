-- Normalize Jenzabar variants in organizations table
UPDATE organizations 
SET student_information_system = CASE 
    WHEN student_information_system IN ('Jenzabar CX/JX', 'Jenzabar CX (legacy)', 'Jenzabar EX ') THEN 'Jenzabar EX'
    WHEN student_information_system = 'Jenzabar SONIS' THEN 'Jenzabar ONE'
    ELSE student_information_system
END,
updated_at = now()
WHERE student_information_system IN ('Jenzabar CX/JX', 'Jenzabar CX (legacy)', 'Jenzabar EX ', 'Jenzabar SONIS');

-- Normalize Jenzabar variants in profiles table
UPDATE profiles 
SET student_information_system = CASE 
    WHEN student_information_system IN ('Jenzabar CX/JX', 'Jenzabar CX (legacy)', 'Jenzabar EX ') THEN 'Jenzabar EX'
    WHEN student_information_system = 'Jenzabar SONIS' THEN 'Jenzabar ONE'
    ELSE student_information_system
END,
updated_at = now()
WHERE student_information_system IN ('Jenzabar CX/JX', 'Jenzabar CX (legacy)', 'Jenzabar EX ', 'Jenzabar SONIS');
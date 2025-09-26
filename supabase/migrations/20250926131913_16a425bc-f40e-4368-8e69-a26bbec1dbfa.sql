-- Normalize all Jenzabar variants to Jenzabar ONE in organizations table
UPDATE organizations 
SET student_information_system = 'Jenzabar ONE',
    updated_at = now()
WHERE student_information_system ILIKE '%jenzabar%' 
  AND student_information_system != 'Jenzabar ONE';

-- Normalize all Jenzabar variants to Jenzabar ONE in profiles table
UPDATE profiles 
SET student_information_system = 'Jenzabar ONE',
    updated_at = now()
WHERE student_information_system ILIKE '%jenzabar%' 
  AND student_information_system != 'Jenzabar ONE';
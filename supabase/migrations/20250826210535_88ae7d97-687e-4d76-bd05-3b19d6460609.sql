-- Add student_fte column to organizations table
ALTER TABLE public.organizations ADD COLUMN student_fte INTEGER;

-- Migrate existing student_fte data from profiles to organizations
UPDATE public.organizations 
SET student_fte = profiles.student_fte
FROM public.profiles 
WHERE organizations.contact_person_id = profiles.id 
AND profiles.student_fte IS NOT NULL;

-- Create index for better performance on student_fte queries
CREATE INDEX idx_organizations_student_fte ON public.organizations(student_fte);
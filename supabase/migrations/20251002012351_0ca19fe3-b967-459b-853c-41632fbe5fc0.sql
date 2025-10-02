-- Rename primary_office_asus to primary_office_lenovo in organizations table
ALTER TABLE organizations 
RENAME COLUMN primary_office_asus TO primary_office_lenovo;

-- Rename primary_office_asus to primary_office_lenovo in pending_registrations table
ALTER TABLE pending_registrations 
RENAME COLUMN primary_office_asus TO primary_office_lenovo;
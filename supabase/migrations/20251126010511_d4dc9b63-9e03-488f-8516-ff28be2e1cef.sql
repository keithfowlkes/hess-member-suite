-- Add partner program interest fields to pending_registrations and organizations tables
ALTER TABLE pending_registrations 
ADD COLUMN IF NOT EXISTS partner_program_interest text[] DEFAULT '{}';

ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS partner_program_interest text[] DEFAULT '{}';

COMMENT ON COLUMN pending_registrations.partner_program_interest IS 'Array of partner programs the organization is interested in learning about (Ellucian, Jenzabar, Oracle, Workday)';
COMMENT ON COLUMN organizations.partner_program_interest IS 'Array of partner programs the organization is interested in learning about (Ellucian, Jenzabar, Oracle, Workday)';
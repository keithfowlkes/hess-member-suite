ALTER TABLE public.organization_transfer_requests DROP CONSTRAINT organization_transfer_requests_status_check;

ALTER TABLE public.organization_transfer_requests ADD CONSTRAINT organization_transfer_requests_status_check CHECK (status = ANY (ARRAY['pending'::text, 'accepted'::text, 'ready_for_approval'::text, 'completed'::text, 'rejected'::text, 'cancelled'::text, 'expired'::text]));
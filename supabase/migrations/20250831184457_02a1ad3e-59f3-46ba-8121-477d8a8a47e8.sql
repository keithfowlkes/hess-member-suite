-- Add opened_at column to invoices table for email tracking
ALTER TABLE public.invoices 
ADD COLUMN opened_at TIMESTAMP WITH TIME ZONE;
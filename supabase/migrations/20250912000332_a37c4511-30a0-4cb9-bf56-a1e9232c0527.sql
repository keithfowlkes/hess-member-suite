-- Add organization column to user_messages table
ALTER TABLE public.user_messages 
ADD COLUMN organization TEXT;
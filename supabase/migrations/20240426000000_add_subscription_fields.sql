-- Add subscription status fields to profiles table
ALTER TABLE IF EXISTS profiles
  ADD COLUMN IF NOT EXISTS subscription_status text,
  ADD COLUMN IF NOT EXISTS subscription_id text; 
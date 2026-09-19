-- Migration: Make instagram_accounts.user_id nullable
-- Rationale: MVP single-user mode does not use Supabase Auth, so user_id
-- is not a valid UUID referencing auth.users. Making it nullable lets the
-- OAuth callback upsert accounts without violating the FK constraint.

ALTER TABLE public.instagram_accounts
  DROP CONSTRAINT IF EXISTS instagram_accounts_user_id_fkey;

ALTER TABLE public.instagram_accounts
  ALTER COLUMN user_id DROP NOT NULL;

-- Re-add as optional FK (nullable UUID, references profiles if present)
ALTER TABLE public.instagram_accounts
  ADD CONSTRAINT instagram_accounts_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE
  NOT VALID; -- NOT VALID skips retroactive check on existing null rows

-- Update the RLS policies to handle null user_id gracefully
-- Drop existing policies that require user_id = auth.uid()
DROP POLICY IF EXISTS "Users can view own instagram accounts" ON public.instagram_accounts;
DROP POLICY IF EXISTS "Users can insert own instagram accounts" ON public.instagram_accounts;
DROP POLICY IF EXISTS "Users can update own instagram accounts" ON public.instagram_accounts;
DROP POLICY IF EXISTS "Users can delete own instagram accounts" ON public.instagram_accounts;

-- Recreate policies: allow access if user_id matches OR if user_id is null (single-user MVP mode)
CREATE POLICY "Users can view own instagram accounts" ON public.instagram_accounts
  FOR SELECT USING (user_id IS NULL OR auth.uid() = user_id);

CREATE POLICY "Users can insert own instagram accounts" ON public.instagram_accounts
  FOR INSERT WITH CHECK (user_id IS NULL OR auth.uid() = user_id);

CREATE POLICY "Users can update own instagram accounts" ON public.instagram_accounts
  FOR UPDATE USING (user_id IS NULL OR auth.uid() = user_id);

CREATE POLICY "Users can delete own instagram accounts" ON public.instagram_accounts
  FOR DELETE USING (user_id IS NULL OR auth.uid() = user_id);

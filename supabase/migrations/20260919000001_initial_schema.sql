-- CommentFlow Database Schema Migration
-- Designed for Supabase PostgreSQL with Row Level Security (RLS)

-- 1. Profiles Table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger to auto-create profile on auth.users sign up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. Instagram Accounts Table
CREATE TABLE IF NOT EXISTS public.instagram_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  instagram_user_id TEXT NOT NULL UNIQUE,
  username TEXT NOT NULL,
  profile_picture_url TEXT,
  account_type TEXT DEFAULT 'BUSINESS' CHECK (account_type IN ('BUSINESS', 'CREATOR')),
  access_token_encrypted TEXT NOT NULL,
  token_expires_at TIMESTAMPTZ,
  status TEXT DEFAULT 'CONNECTED' CHECK (status IN ('CONNECTED', 'DISCONNECTED', 'EXPIRED')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ig_accounts_user_id ON public.instagram_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_ig_accounts_ig_user_id ON public.instagram_accounts(instagram_user_id);

-- 3. Media (Posts & Reels) Table
CREATE TABLE IF NOT EXISTS public.media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instagram_account_id UUID NOT NULL REFERENCES public.instagram_accounts(id) ON DELETE CASCADE,
  instagram_media_id TEXT NOT NULL UNIQUE,
  media_type TEXT NOT NULL CHECK (media_type IN ('IMAGE', 'VIDEO', 'REEL', 'CAROUSEL_ALBUM')),
  caption TEXT,
  thumbnail_url TEXT,
  permalink TEXT,
  timestamp TIMESTAMPTZ NOT NULL,
  like_count INT DEFAULT 0,
  comments_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_media_account_id ON public.media(instagram_account_id);
CREATE INDEX IF NOT EXISTS idx_media_ig_media_id ON public.media(instagram_media_id);

-- 4. Automations Table
CREATE TABLE IF NOT EXISTS public.automations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  instagram_account_id UUID NOT NULL REFERENCES public.instagram_accounts(id) ON DELETE CASCADE,
  media_id UUID REFERENCES public.media(id) ON DELETE SET NULL, -- NULL indicates applies to all content
  name TEXT NOT NULL,
  status TEXT DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'PAUSED', 'ERROR')),
  match_type TEXT DEFAULT 'CONTAINS' CHECK (match_type IN ('CONTAINS', 'EXACT', 'STARTS_WITH', 'ENDS_WITH')),
  match_mode TEXT DEFAULT 'ANY' CHECK (match_mode IN ('ANY', 'ALL')),
  error_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_automations_user_id ON public.automations(user_id);
CREATE INDEX IF NOT EXISTS idx_automations_account_id ON public.automations(instagram_account_id);
CREATE INDEX IF NOT EXISTS idx_automations_media_id ON public.automations(media_id);

-- 5. Triggers Table (Keywords)
CREATE TABLE IF NOT EXISTS public.triggers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  automation_id UUID NOT NULL REFERENCES public.automations(id) ON DELETE CASCADE,
  keyword TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_triggers_automation_id ON public.triggers(automation_id);

-- 6. Actions Table
CREATE TABLE IF NOT EXISTS public.actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  automation_id UUID NOT NULL REFERENCES public.automations(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL CHECK (action_type IN ('PUBLIC_REPLY', 'PRIVATE_MESSAGE')),
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_actions_automation_id ON public.actions(automation_id);

-- 7. Processed Events Table (Idempotency Key for Webhooks)
CREATE TABLE IF NOT EXISTS public.processed_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT NOT NULL UNIQUE,
  source TEXT DEFAULT 'instagram_webhook',
  processed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_processed_events_event_id ON public.processed_events(event_id);

-- 8. Automation Events (Audit & Activity Logs)
CREATE TABLE IF NOT EXISTS public.automation_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  automation_id UUID REFERENCES public.automations(id) ON DELETE SET NULL,
  instagram_account_id UUID NOT NULL REFERENCES public.instagram_accounts(id) ON DELETE CASCADE,
  instagram_comment_id TEXT NOT NULL,
  commenter_username TEXT NOT NULL,
  comment_text TEXT NOT NULL,
  action_type TEXT NOT NULL CHECK (action_type IN ('PUBLIC_REPLY', 'PRIVATE_MESSAGE')),
  response_content TEXT,
  status TEXT NOT NULL CHECK (status IN ('SENT', 'SIMULATED_SENT', 'FAILED', 'SKIPPED')),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_automation_events_account_id ON public.automation_events(instagram_account_id);
CREATE INDEX IF NOT EXISTS idx_automation_events_comment_id ON public.automation_events(instagram_comment_id);
CREATE INDEX IF NOT EXISTS idx_automation_events_created_at ON public.automation_events(created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.instagram_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.triggers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_events ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can view and edit their own profile
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Instagram Accounts: Users can access their own accounts
CREATE POLICY "Users can view own instagram accounts" ON public.instagram_accounts
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own instagram accounts" ON public.instagram_accounts
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own instagram accounts" ON public.instagram_accounts
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own instagram accounts" ON public.instagram_accounts
  FOR DELETE USING (auth.uid() = user_id);

-- Automations: Users can access their own automations
CREATE POLICY "Users can manage own automations" ON public.automations
  FOR ALL USING (auth.uid() = user_id);

-- Triggers: Users can manage triggers belonging to their automations
CREATE POLICY "Users can manage triggers" ON public.triggers
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.automations
      WHERE automations.id = triggers.automation_id
      AND automations.user_id = auth.uid()
    )
  );

-- Actions: Users can manage actions belonging to their automations
CREATE POLICY "Users can manage actions" ON public.actions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.automations
      WHERE automations.id = actions.automation_id
      AND automations.user_id = auth.uid()
    )
  );

-- Media: Users can view media for their connected accounts
CREATE POLICY "Users can view own media" ON public.media
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.instagram_accounts
      WHERE instagram_accounts.id = media.instagram_account_id
      AND instagram_accounts.user_id = auth.uid()
    )
  );

-- Activity logs: Users can view logs for their connected accounts
CREATE POLICY "Users can view own activity logs" ON public.automation_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.instagram_accounts
      WHERE instagram_accounts.id = automation_events.instagram_account_id
      AND instagram_accounts.user_id = auth.uid()
    )
  );

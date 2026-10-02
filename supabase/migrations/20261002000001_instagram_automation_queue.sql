-- Migration: Instagram Comments Durable Queue & Automation Schema
-- Designed for Supabase PostgreSQL with high-concurrency atomic locking (SKIP LOCKED)

-- 1. Create instagram_comments table (Durable Queue)
CREATE TABLE IF NOT EXISTS public.instagram_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instagram_comment_id TEXT NOT NULL UNIQUE,
  instagram_account_id TEXT NOT NULL,
  comment_text TEXT NOT NULL,
  username TEXT,
  media_id TEXT,
  matched_keyword TEXT,
  processing_status TEXT NOT NULL DEFAULT 'PENDING'
    CHECK (processing_status IN ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'SKIPPED')),
  dm_status TEXT NOT NULL DEFAULT 'PENDING'
    CHECK (dm_status IN ('PENDING', 'SENT', 'FAILED', 'SKIPPED')),
  retry_count INT NOT NULL DEFAULT 0,
  next_retry_at TIMESTAMPTZ DEFAULT NOW(),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processing_started_at TIMESTAMPTZ,
  processed_at TIMESTAMPTZ
);

-- Optimize indices for queue polling and status lookup
CREATE INDEX IF NOT EXISTS idx_ig_comments_queue 
  ON public.instagram_comments (processing_status, next_retry_at, created_at)
  WHERE processing_status = 'PENDING';

CREATE INDEX IF NOT EXISTS idx_ig_comments_comment_id 
  ON public.instagram_comments (instagram_comment_id);

CREATE INDEX IF NOT EXISTS idx_ig_comments_account_id 
  ON public.instagram_comments (instagram_account_id);

CREATE INDEX IF NOT EXISTS idx_ig_comments_created_at 
  ON public.instagram_comments (created_at DESC);

-- 2. Atomic job claiming function using PostgreSQL row-level SKIP LOCKED
CREATE OR REPLACE FUNCTION public.claim_pending_instagram_comments(batch_size INT)
RETURNS SETOF public.instagram_comments AS $$
BEGIN
  RETURN QUERY
  UPDATE public.instagram_comments
  SET
    processing_status = 'PROCESSING',
    processing_started_at = NOW()
  WHERE id IN (
    SELECT id
    FROM public.instagram_comments
    WHERE processing_status = 'PENDING'
      AND (next_retry_at IS NULL OR next_retry_at <= NOW())
    ORDER BY created_at ASC
    LIMIT batch_size
    FOR UPDATE SKIP LOCKED
  )
  RETURNING *;
END;
$$ LANGUAGE plpgsql;

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.instagram_comments ENABLE ROW LEVEL SECURITY;

-- Allow service role full access; authenticated/anon read policy for dashboard display
DROP POLICY IF EXISTS "Public can view instagram_comments" ON public.instagram_comments;
CREATE POLICY "Public can view instagram_comments" ON public.instagram_comments
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Service role manage instagram_comments" ON public.instagram_comments;
CREATE POLICY "Service role manage instagram_comments" ON public.instagram_comments
  FOR ALL USING (true);

-- ============================================================================
-- Vio — Database Migrations
-- Run this in the Supabase SQL Editor (https://app.supabase.com → SQL Editor)
-- ============================================================================

-- ============================================================================
-- SECTION 1: RPC Functions for Comments
-- These provide atomic comment count updates.
-- NOTE: The Vio client now also uses direct count-based updates as a fallback.
-- ============================================================================

-- Increment comment count on a post
CREATE OR REPLACE FUNCTION public.increment_comments(post_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.posts
  SET comments_count = comments_count + 1
  WHERE id = post_id;
END;
$$;

-- Decrement comment count on a post (floor at 0)
CREATE OR REPLACE FUNCTION public.decrement_comments(post_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.posts
  SET comments_count = GREATEST(comments_count - 1, 0)
  WHERE id = post_id;
END;
$$;

-- ============================================================================
-- SECTION 2: RLS Policies for Comments
-- Run these if comments are not visible to all authenticated users.
-- ============================================================================

-- Allow any authenticated user to read comments
DROP POLICY IF EXISTS "Authenticated users can read all comments" ON public.comments;
CREATE POLICY "Authenticated users can read all comments"
  ON public.comments FOR SELECT
  TO authenticated
  USING (true);

-- Allow authenticated users to insert their own comments
DROP POLICY IF EXISTS "Users can insert their own comments" ON public.comments;
CREATE POLICY "Users can insert their own comments"
  ON public.comments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Allow users to delete their own comments
DROP POLICY IF EXISTS "Users can delete their own comments" ON public.comments;
CREATE POLICY "Users can delete their own comments"
  ON public.comments FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Allow anon key reads (for public visibility)
DROP POLICY IF EXISTS "Public can read comments" ON public.comments;
CREATE POLICY "Public can read comments"
  ON public.comments FOR SELECT
  TO anon
  USING (true);

-- ============================================================================
-- SECTION 3: Profiles Table Extensions
-- ============================================================================

-- Professional Information
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS occupation TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS company TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS school TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS education TEXT;

-- Personal (JSON arrays)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS skills JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS interests JSONB DEFAULT '[]'::jsonb;

-- Social Links
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS twitter TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS instagram TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS linkedin TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS github TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS tiktok TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS youtube TEXT;

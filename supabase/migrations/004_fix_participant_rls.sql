-- Vio Messaging — Fix RLS for conversation_participants
-- The INSERT and UPDATE policies were missing, causing silent failures
-- when creating new conversations and updating unread counts.

-- INSERT: user can insert themselves as a participant
CREATE POLICY IF NOT EXISTS "Users can insert participant records" ON public.conversation_participants
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- UPDATE: user can update their own participant record (unread_count, last_read_at)
CREATE POLICY IF NOT EXISTS "Users can update their own participant records" ON public.conversation_participants
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Vio Messaging — Fix conversations RLS
-- The conversations table was missing INSERT and UPDATE policies,
-- causing "new row violates row-level security policy" errors.

-- INSERT: only allow creation when the auth user is a participant
DROP POLICY IF EXISTS "Participants can create conversations" ON public.conversations;
CREATE POLICY "Participants can create conversations" ON public.conversations
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_a OR auth.uid() = user_b);

-- UPDATE: only participants can update conversation metadata
DROP POLICY IF EXISTS "Participants can update conversations" ON public.conversations;
CREATE POLICY "Participants can update conversations" ON public.conversations
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_a OR auth.uid() = user_b)
  WITH CHECK (auth.uid() = user_a OR auth.uid() = user_b);

-- Complete RLS matrix after this migration:
-- conversations:       INSERT✅ SELECT✅ UPDATE✅
-- conv_participants:   INSERT✅ SELECT✅ UPDATE✅
-- messages:             INSERT✅ SELECT✅ UPDATE✅

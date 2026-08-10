-- Vio Messaging — Delivery/Read tracking + Presence
-- Adds delivery state, read receipts, and online tracking

ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS delivered_at timestamptz;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS read_at timestamptz;
ALTER TABLE public.conversation_participants ADD COLUMN IF NOT EXISTS last_seen_at timestamptz;

-- Allow any conversation participant to update message read status
DROP POLICY IF EXISTS "Participants can update message read status" ON public.messages;
CREATE POLICY "Participants can update message read status" ON public.messages
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM conversations c 
    WHERE c.id = messages.conversation_id 
    AND (c.user_a = auth.uid() OR c.user_b = auth.uid())))
  WITH CHECK (EXISTS (SELECT 1 FROM conversations c 
    WHERE c.id = messages.conversation_id 
    AND (c.user_a = auth.uid() OR c.user_b = auth.uid())));

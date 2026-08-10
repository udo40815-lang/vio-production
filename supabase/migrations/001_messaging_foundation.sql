-- ============================================================================
-- Vio Messaging Foundation — Phase 1
-- 1-to-1 private conversations + messages
-- ============================================================================

-- Conversations: unique 1-to-1 pairs between two users.
-- The CHECK constraint (user_a < user_b) + UNIQUE(user_a, user_b) ensures
-- that A→B and B→A always resolve to the SAME conversation.
-- --------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.conversations (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a      uuid NOT NULL,
  user_b      uuid NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  last_message_at timestamptz,
  last_message_preview text,
  CONSTRAINT chk_user_order CHECK (user_a < user_b),
  CONSTRAINT uq_conversation_users UNIQUE (user_a, user_b),
  CONSTRAINT fk_conversations_user_a FOREIGN KEY (user_a)
    REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  CONSTRAINT fk_conversations_user_b FOREIGN KEY (user_b)
    REFERENCES public.profiles(user_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_conversations_user_a ON public.conversations(user_a);
CREATE INDEX IF NOT EXISTS idx_conversations_user_b ON public.conversations(user_b);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message_at ON public.conversations(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_users ON public.conversations(user_a, user_b);

-- Conversation participants: per-user read/unread state
-- --------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.conversation_participants (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL,
  user_id         uuid NOT NULL,
  joined_at       timestamptz NOT NULL DEFAULT now(),
  last_read_at    timestamptz NOT NULL DEFAULT now(),
  unread_count    integer NOT NULL DEFAULT 0,
  CONSTRAINT uq_participant UNIQUE (conversation_id, user_id),
  CONSTRAINT fk_participants_conversation FOREIGN KEY (conversation_id)
    REFERENCES public.conversations(id) ON DELETE CASCADE,
  CONSTRAINT fk_participants_user FOREIGN KEY (user_id)
    REFERENCES public.profiles(user_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_participants_user ON public.conversation_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_participants_conversation ON public.conversation_participants(conversation_id);

-- Messages: individual messages within a conversation
-- --------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.messages (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL,
  sender_id       uuid NOT NULL,
  content         text NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  deleted_at      timestamptz,
  CONSTRAINT fk_messages_conversation FOREIGN KEY (conversation_id)
    REFERENCES public.conversations(id) ON DELETE CASCADE,
  CONSTRAINT fk_messages_sender FOREIGN KEY (sender_id)
    REFERENCES public.profiles(user_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_time ON public.messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_not_deleted ON public.messages(conversation_id, created_at DESC) WHERE deleted_at IS NULL;

-- Row Level Security
-- --------------------------------------------------------------------------

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Conversations: only participants can view
CREATE POLICY "Participants can view their conversations" ON public.conversations
  FOR SELECT TO authenticated
  USING (auth.uid() = user_a OR auth.uid() = user_b);

-- Participants: only the participant can read their own records
CREATE POLICY "Users can view their own participant records" ON public.conversation_participants
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Messages: only conversation participants can read
CREATE POLICY "Participants can view messages in their conversations" ON public.messages
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = messages.conversation_id
    AND (c.user_a = auth.uid() OR c.user_b = auth.uid())
  ));

-- Messages: only authenticated participants can insert
CREATE POLICY "Senders can insert their own messages" ON public.messages
  FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = messages.conversation_id
      AND (c.user_a = auth.uid() OR c.user_b = auth.uid())
    )
  );

-- Messages: only the sender can soft-delete their own messages
CREATE POLICY "Senders can delete their own messages" ON public.messages
  FOR UPDATE TO authenticated
  USING (sender_id = auth.uid())
  WITH CHECK (sender_id = auth.uid());

-- updated_at trigger
-- --------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_conversations_updated_at
  BEFORE UPDATE ON public.conversations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_messages_updated_at
  BEFORE UPDATE ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

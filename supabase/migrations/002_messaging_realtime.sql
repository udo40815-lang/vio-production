-- Vio Messaging — Realtime Publication
-- Enable Supabase Realtime for messages and conversations tables

ALTER PUBLICATION IF EXISTS supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION IF EXISTS supabase_realtime ADD TABLE public.conversations;

-- REPLICA IDENTITY FULL is needed for realtime to include OLD records  
-- and all column values on UPDATE/DELETE events
ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER TABLE public.conversations REPLICA IDENTITY FULL;

-- Vio Messaging — Voice Notes Support
-- Adds message_type, voice metadata, and storage bucket for voice notes

ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS message_type text NOT NULL DEFAULT 'text';
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS voice_url text;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS voice_duration real;
ALTER TABLE public.messages ALTER COLUMN content DROP NOT NULL;
CREATE INDEX IF NOT EXISTS idx_messages_type ON public.messages(message_type);

-- Voice messages storage bucket (not public — access via signed URLs or RLS)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('voice-messages', 'voice-messages', false, 10485760,
        '{audio/webm,audio/ogg,audio/mp4,audio/wav,audio/mpeg}')
ON CONFLICT (id) DO UPDATE SET
  public = false, file_size_limit = 10485760,
  allowed_mime_types = '{audio/webm,audio/ogg,audio/mp4,audio/wav,audio/mpeg}';

-- RLS for voice-messages bucket: authenticated read access, upload by owner
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies
    WHERE policyname = 'Auth users can upload voice' AND schemaname = 'storage' AND tablename = 'objects') THEN
    CREATE POLICY "Auth users can upload voice" ON storage.objects
      FOR INSERT TO authenticated
      WITH CHECK (bucket_id = 'voice-messages' AND auth.uid()::text = (storage.foldername(name))[2]);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies
    WHERE policyname = 'Auth users can read voice' AND schemaname = 'storage' AND tablename = 'objects') THEN
    CREATE POLICY "Auth users can read voice" ON storage.objects
      FOR SELECT TO authenticated
      USING (bucket_id = 'voice-messages');
  END IF;
END $$;

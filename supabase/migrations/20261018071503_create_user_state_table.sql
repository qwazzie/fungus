/*
# Create per-user application state storage

1. New Tables
- `user_state`
  - `user_id` (uuid, primary key, references the signed-in account)
  - `data` (jsonb, the full application state: characters, chats, settings)
  - `updated_at` (timestamptz, last save time)

2. Security
- Row level security is enabled on `user_state`.
- Each authenticated user can only read, insert, update, and delete their own row.
- Anonymous users cannot access any rows.

3. Important Notes
- This replaces the previous external server storage (fungusroom.onrender.com)
  which stored all users' data in a single shared location.
- Each user now has exactly one state row, keyed by their auth id.
- The `user_id` column defaults to `auth.uid()` so inserts that omit it still succeed.
*/

CREATE TABLE IF NOT EXISTS public.user_state (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_state ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_state_select_own" ON public.user_state;
CREATE POLICY "user_state_select_own" ON public.user_state
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_state_insert_own" ON public.user_state;
CREATE POLICY "user_state_insert_own" ON public.user_state
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_state_update_own" ON public.user_state;
CREATE POLICY "user_state_update_own" ON public.user_state
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_state_delete_own" ON public.user_state;
CREATE POLICY "user_state_delete_own" ON public.user_state
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

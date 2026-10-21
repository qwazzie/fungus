/*
# Create user profiles for account registration

1. New Tables
- `profiles`
- `id` (uuid, primary key, references the signed-in Supabase account)
- `display_name` (text, the name shown in the application)
- `created_at` (timestamptz, profile creation time)
- `updated_at` (timestamptz, last profile update time)

2. Security
- Row level security is enabled on `profiles`.
- Signed-in users can read, create, update, and delete only their own profile.
- Anonymous users cannot access profile records.

3. Important Notes
- Existing application profile editing remains available after sign-in.
- The registration flow creates the profile using the authenticated account id.
*/

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL DEFAULT 'Пользователь',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_delete_own" ON public.profiles;
CREATE POLICY "profiles_delete_own" ON public.profiles
  FOR DELETE TO authenticated USING (auth.uid() = id);

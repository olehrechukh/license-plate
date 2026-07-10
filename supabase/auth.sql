-- Add Google sign-in labels to the existing DB strings.
-- Run this after schema.sql and seed.sql.

insert into public.app_strings (lang, data) values
  ('uk', '{"auth":{"googleSignIn":"Увійти через Google","signOut":"Вийти","signingIn":"Переадресація…","signInFailed":"Не вдалося увійти через Google. Спробуйте ще раз."}}'::jsonb),
  ('en', '{"auth":{"googleSignIn":"Sign in with Google","signOut":"Sign out","signingIn":"Redirecting…","signInFailed":"Could not sign in with Google. Please try again."}}'::jsonb)
on conflict (lang) do update set data = jsonb_set(coalesce(public.app_strings.data, '{}'::jsonb), '{auth}', excluded.data -> 'auth', true);

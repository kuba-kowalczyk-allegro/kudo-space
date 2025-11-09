-- =============================================================================
-- Seed Data for Local Development
-- =============================================================================

begin;

-- -----------------------------------------------------------------------------
-- 1. Clean existing seed users (cascade removes related profiles and kudos)
-- -----------------------------------------------------------------------------

delete from auth.users
where email in (
  'alice@example.com',
  'bob@example.com',
  'carol@example.com'
);

-- -----------------------------------------------------------------------------
-- 2. Insert sample users (profiles created automatically by trigger)
-- -----------------------------------------------------------------------------

insert into auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  invited_at,
  confirmation_sent_at,
  last_sign_in_at,
  raw_app_meta_data,
  raw_user_meta_data,
  aud,
  role,
  created_at,
  updated_at
) values
  (
    '2f2f8f84-70d1-4fae-9b9b-4d1f4f08c5f5',
    '00000000-0000-0000-0000-000000000000',
    'alice@example.com',
    crypt('Password123!', gen_salt('bf')),
    now(),
    now(),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Alice Johnson","avatar_url":"https://i.pravatar.cc/150?img=1","title":"Product Designer"}'::jsonb,
    'authenticated',
    'authenticated',
    now(),
    now()
  ),
  (
    '7b1fda48-d7f8-4f53-a51d-409775888b6d',
    '00000000-0000-0000-0000-000000000000',
    'bob@example.com',
    crypt('Password123!', gen_salt('bf')),
    now(),
    now(),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Bob Smith","avatar_url":"https://i.pravatar.cc/150?img=2","title":"Platform Engineer"}'::jsonb,
    'authenticated',
    'authenticated',
    now(),
    now()
  ),
  (
    'd26f47b1-1d85-4c94-bf45-2140d0bbd10f',
    '00000000-0000-0000-0000-000000000000',
    'carol@example.com',
    crypt('Password123!', gen_salt('bf')),
    now(),
    now(),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Carol Nguyen","avatar_url":"https://i.pravatar.cc/150?img=3","title":"Delivery Lead"}'::jsonb,
    'authenticated',
    'authenticated',
    now(),
    now()
  );

-- -----------------------------------------------------------------------------
-- 3. Ensure corresponding profiles carry the seed metadata
-- -----------------------------------------------------------------------------

update public.profiles
set
  display_name = 'Alice Johnson',
  avatar_url = 'https://i.pravatar.cc/150?img=1',
  email = 'alice@example.com'
where id = '2f2f8f84-70d1-4fae-9b9b-4d1f4f08c5f5';

update public.profiles
set
  display_name = 'Bob Smith',
  avatar_url = 'https://i.pravatar.cc/150?img=2',
  email = 'bob@example.com'
where id = '7b1fda48-d7f8-4f53-a51d-409775888b6d';

update public.profiles
set
  display_name = 'Carol Nguyen',
  avatar_url = 'https://i.pravatar.cc/150?img=3',
  email = 'carol@example.com'
where id = 'd26f47b1-1d85-4c94-bf45-2140d0bbd10f';

-- -----------------------------------------------------------------------------
-- 4. Insert sample kudos
-- -----------------------------------------------------------------------------

insert into public.kudos (sender_id, recipient_id, message, created_at, updated_at) values
  (
    '2f2f8f84-70d1-4fae-9b9b-4d1f4f08c5f5',
    '7b1fda48-d7f8-4f53-a51d-409775888b6d',
    'Thanks for jumping on the infra debug session so quickly—saved the sprint demo.',
    now() - interval '2 days',
    now() - interval '2 days'
  ),
  (
    '7b1fda48-d7f8-4f53-a51d-409775888b6d',
    '2f2f8f84-70d1-4fae-9b9b-4d1f4f08c5f5',
    'Your UX review notes were spot on and made the flow feel effortless.',
    now() - interval '36 hours',
    now() - interval '36 hours'
  ),
  (
    '2f2f8f84-70d1-4fae-9b9b-4d1f4f08c5f5',
    'd26f47b1-1d85-4c94-bf45-2140d0bbd10f',
    'Appreciate you coordinating the roadmap sync and keeping everyone aligned.',
    now() - interval '1 day',
    now() - interval '1 day'
  ),
  (
    'd26f47b1-1d85-4c94-bf45-2140d0bbd10f',
    '7b1fda48-d7f8-4f53-a51d-409775888b6d',
    'Thanks for hardening the deployment pipeline before the release train.',
    now() - interval '18 hours',
    now() - interval '18 hours'
  ),
  (
    '7b1fda48-d7f8-4f53-a51d-409775888b6d',
    'd26f47b1-1d85-4c94-bf45-2140d0bbd10f',
    'Really grateful for the calm leadership during yesterday’s incident call.',
    now() - interval '12 hours',
    now() - interval '12 hours'
  );

commit;

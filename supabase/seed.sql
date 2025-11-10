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
    'Really grateful for the calm leadership during yesterday''s incident call.',
    now() - interval '12 hours',
    now() - interval '12 hours'
  ),
  -- Additional kudos for testing infinite scroll (25 more = 30 total)
  (
    '2f2f8f84-70d1-4fae-9b9b-4d1f4f08c5f5',
    '7b1fda48-d7f8-4f53-a51d-409775888b6d',
    'Your code review feedback was incredibly thorough and helped me learn a lot.',
    now() - interval '10 hours',
    now() - interval '10 hours'
  ),
  (
    'd26f47b1-1d85-4c94-bf45-2140d0bbd10f',
    '2f2f8f84-70d1-4fae-9b9b-4d1f4f08c5f5',
    'The new design prototypes are amazing! Can''t wait to build them.',
    now() - interval '9 hours',
    now() - interval '9 hours'
  ),
  (
    '7b1fda48-d7f8-4f53-a51d-409775888b6d',
    '2f2f8f84-70d1-4fae-9b9b-4d1f4f08c5f5',
    'Thanks for staying late to help with the database migration.',
    now() - interval '8 hours',
    now() - interval '8 hours'
  ),
  (
    '2f2f8f84-70d1-4fae-9b9b-4d1f4f08c5f5',
    'd26f47b1-1d85-4c94-bf45-2140d0bbd10f',
    'Your stakeholder management during the quarterly review was masterful.',
    now() - interval '7 hours',
    now() - interval '7 hours'
  ),
  (
    'd26f47b1-1d85-4c94-bf45-2140d0bbd10f',
    '7b1fda48-d7f8-4f53-a51d-409775888b6d',
    'Great job optimizing the CI/CD pipeline. Build times are so much faster now!',
    now() - interval '6 hours',
    now() - interval '6 hours'
  ),
  (
    '7b1fda48-d7f8-4f53-a51d-409775888b6d',
    'd26f47b1-1d85-4c94-bf45-2140d0bbd10f',
    'Thanks for organizing the team retro. It was really productive.',
    now() - interval '5 hours',
    now() - interval '5 hours'
  ),
  (
    '2f2f8f84-70d1-4fae-9b9b-4d1f4f08c5f5',
    '7b1fda48-d7f8-4f53-a51d-409775888b6d',
    'The API documentation you wrote is crystal clear. Best docs I''ve seen!',
    now() - interval '4 hours',
    now() - interval '4 hours'
  ),
  (
    'd26f47b1-1d85-4c94-bf45-2140d0bbd10f',
    '2f2f8f84-70d1-4fae-9b9b-4d1f4f08c5f5',
    'Love the user research insights you shared. Really eye-opening!',
    now() - interval '3 hours',
    now() - interval '3 hours'
  ),
  (
    '7b1fda48-d7f8-4f53-a51d-409775888b6d',
    '2f2f8f84-70d1-4fae-9b9b-4d1f4f08c5f5',
    'Your attention to accessibility details makes our product so much better.',
    now() - interval '2 hours',
    now() - interval '2 hours'
  ),
  (
    '2f2f8f84-70d1-4fae-9b9b-4d1f4f08c5f5',
    'd26f47b1-1d85-4c94-bf45-2140d0bbd10f',
    'Thanks for unblocking the feature release. Your decisiveness helped a lot.',
    now() - interval '90 minutes',
    now() - interval '90 minutes'
  ),
  (
    'd26f47b1-1d85-4c94-bf45-2140d0bbd10f',
    '7b1fda48-d7f8-4f53-a51d-409775888b6d',
    'The monitoring setup you built caught that bug before it hit production!',
    now() - interval '75 minutes',
    now() - interval '75 minutes'
  ),
  (
    '7b1fda48-d7f8-4f53-a51d-409775888b6d',
    'd26f47b1-1d85-4c94-bf45-2140d0bbd10f',
    'Really appreciate how you handled that difficult stakeholder conversation.',
    now() - interval '60 minutes',
    now() - interval '60 minutes'
  ),
  (
    '2f2f8f84-70d1-4fae-9b9b-4d1f4f08c5f5',
    '7b1fda48-d7f8-4f53-a51d-409775888b6d',
    'Your refactoring made the codebase so much cleaner. Great work!',
    now() - interval '45 minutes',
    now() - interval '45 minutes'
  ),
  (
    'd26f47b1-1d85-4c94-bf45-2140d0bbd10f',
    '2f2f8f84-70d1-4fae-9b9b-4d1f4f08c5f5',
    'The component library improvements are making development so much faster.',
    now() - interval '30 minutes',
    now() - interval '30 minutes'
  ),
  (
    '7b1fda48-d7f8-4f53-a51d-409775888b6d',
    '2f2f8f84-70d1-4fae-9b9b-4d1f4f08c5f5',
    'Thanks for the quick turnaround on the design mockups. They look fantastic!',
    now() - interval '25 minutes',
    now() - interval '25 minutes'
  ),
  (
    '2f2f8f84-70d1-4fae-9b9b-4d1f4f08c5f5',
    'd26f47b1-1d85-4c94-bf45-2140d0bbd10f',
    'Your sprint planning was efficient and kept us focused on the right priorities.',
    now() - interval '20 minutes',
    now() - interval '20 minutes'
  ),
  (
    'd26f47b1-1d85-4c94-bf45-2140d0bbd10f',
    '7b1fda48-d7f8-4f53-a51d-409775888b6d',
    'The performance optimizations you made are incredible. 50% faster load times!',
    now() - interval '15 minutes',
    now() - interval '15 minutes'
  ),
  (
    '7b1fda48-d7f8-4f53-a51d-409775888b6d',
    'd26f47b1-1d85-4c94-bf45-2140d0bbd10f',
    'Thanks for stepping up to lead the new initiative. Exciting times ahead!',
    now() - interval '10 minutes',
    now() - interval '10 minutes'
  ),
  (
    '2f2f8f84-70d1-4fae-9b9b-4d1f4f08c5f5',
    '7b1fda48-d7f8-4f53-a51d-409775888b6d',
    'Your mentoring has helped me grow so much as a developer. Thank you!',
    now() - interval '8 minutes',
    now() - interval '8 minutes'
  ),
  (
    'd26f47b1-1d85-4c94-bf45-2140d0bbd10f',
    '2f2f8f84-70d1-4fae-9b9b-4d1f4f08c5f5',
    'The user testing session you ran was so insightful. Great facilitation!',
    now() - interval '6 minutes',
    now() - interval '6 minutes'
  ),
  (
    '7b1fda48-d7f8-4f53-a51d-409775888b6d',
    '2f2f8f84-70d1-4fae-9b9b-4d1f4f08c5f5',
    'Love the new design system documentation. It''s so well organized!',
    now() - interval '4 minutes',
    now() - interval '4 minutes'
  ),
  (
    '2f2f8f84-70d1-4fae-9b9b-4d1f4f08c5f5',
    'd26f47b1-1d85-4c94-bf45-2140d0bbd10f',
    'Your clear communication during the outage kept everyone calm and focused.',
    now() - interval '2 minutes',
    now() - interval '2 minutes'
  ),
  (
    'd26f47b1-1d85-4c94-bf45-2140d0bbd10f',
    '7b1fda48-d7f8-4f53-a51d-409775888b6d',
    'Thanks for automating that tedious deployment process. Saved hours of work!',
    now() - interval '1 minute',
    now() - interval '1 minute'
  ),
  (
    '7b1fda48-d7f8-4f53-a51d-409775888b6d',
    'd26f47b1-1d85-4c94-bf45-2140d0bbd10f',
    'Really appreciate your positive energy and how you keep the team motivated!',
    now() - interval '30 seconds',
    now() - interval '30 seconds'
  ),
  (
    '2f2f8f84-70d1-4fae-9b9b-4d1f4f08c5f5',
    '7b1fda48-d7f8-4f53-a51d-409775888b6d',
    'Your architecture proposal was brilliant. It solved all our scalability concerns!',
    now() - interval '15 seconds',
    now() - interval '15 seconds'
  ),
  (
    'd26f47b1-1d85-4c94-bf45-2140d0bbd10f',
    '2f2f8f84-70d1-4fae-9b9b-4d1f4f08c5f5',
    'The design handoff was perfect. Everything I needed was right there!',
    now() - interval '5 seconds',
    now() - interval '5 seconds'
  );

commit;

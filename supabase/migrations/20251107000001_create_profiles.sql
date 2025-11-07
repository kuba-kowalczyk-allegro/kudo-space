-- =============================================================================
-- Migration: Create Profiles Table
-- Created: 2025-11-07
-- Description: Creates the public.profiles table to extend auth.users with
--              application-specific user data. Includes RLS policies, indexes,
--              and triggers for automatic profile creation and timestamp updates.
-- 
-- Affected Objects:
--   - Table: public.profiles
--   - Function: public.handle_new_user()
--   - Function: public.handle_updated_at()
--   - Trigger: on_auth_user_created (on auth.users)
--   - Trigger: on_profile_updated (on public.profiles)
--   - Indexes: idx_profiles_created_at, idx_profiles_display_name_lower
--   - RLS Policies: profiles_select_all, profiles_insert_via_trigger,
--                   profiles_update_own, profiles_delete_restricted
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Create Profiles Table
-- -----------------------------------------------------------------------------
-- Extends Supabase's auth.users with application-specific user data.
-- One-to-one relationship with auth.users via cascading foreign key.
-- Email stored for display purposes to differentiate users with similar names.
-- -----------------------------------------------------------------------------

create table public.profiles (
    -- Primary key references auth.users.id
    -- Cascades deletion: when auth user is deleted, profile is automatically deleted
    id uuid primary key references auth.users(id) on delete cascade,
    
    -- User's display name from OAuth provider or email fallback
    display_name text not null,
    
    -- URL to user's avatar image from OAuth provider (nullable)
    avatar_url text,
    
    -- User's email address for display purposes (nullable)
    email text,
    
    -- Timestamp when profile was created (UTC)
    created_at timestamptz not null default now(),
    
    -- Timestamp when profile was last updated (UTC)
    -- Automatically updated by trigger
    updated_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- 2. Create Indexes for Profiles Table
-- -----------------------------------------------------------------------------

-- Index on created_at for sorting users by join date
create index idx_profiles_created_at on public.profiles (created_at);

-- Case-insensitive index on display_name for autocomplete/search functionality
-- Enables efficient recipient selector filtering
create index idx_profiles_display_name_lower on public.profiles (lower(display_name));

-- -----------------------------------------------------------------------------
-- 3. Enable Row Level Security (RLS)
-- -----------------------------------------------------------------------------
-- All database access requires authentication via Supabase Auth.
-- No anonymous access to profile data.
-- -----------------------------------------------------------------------------

alter table public.profiles enable row level security;

-- -----------------------------------------------------------------------------
-- 4. Create RLS Policies for Profiles Table
-- -----------------------------------------------------------------------------

-- Policy: SELECT - All authenticated users can read all profiles
-- Rationale: Profiles are visible across the application for kudos functionality
-- (e.g., selecting recipients, viewing sender/recipient details)
create policy profiles_select_all on public.profiles
    for select
    to authenticated
    using (true);

-- Policy: INSERT - Only service_role can insert profiles
-- Rationale: Profiles are created automatically via trigger on auth.users insert.
-- Direct insertion by users is prohibited to maintain data integrity.
create policy profiles_insert_via_trigger on public.profiles
    for insert
    to service_role
    with check (true);

-- Policy: UPDATE - Users can update only their own profile
-- Rationale: Users should be able to modify their display name, avatar, etc.
-- but cannot modify other users' profiles.
create policy profiles_update_own on public.profiles
    for update
    to authenticated
    using (auth.uid() = id)
    with check (auth.uid() = id);

-- Policy: DELETE - Only service_role can delete profiles
-- Rationale: Profile deletion should only occur via CASCADE when auth.users
-- record is deleted. Direct deletion by users is prohibited.
create policy profiles_delete_restricted on public.profiles
    for delete
    to service_role
    using (true);

-- -----------------------------------------------------------------------------
-- 5. Create Trigger Function: Auto-create Profile on User Signup
-- -----------------------------------------------------------------------------
-- Purpose: Automatically create a profile record when a new user signs up
--          via Supabase Auth (e.g., OAuth, email signup).
-- 
-- Behavior:
--   - Extracts display_name from OAuth metadata (full_name > name > email)
--   - Extracts avatar_url and email from user metadata
--   - Runs with SECURITY DEFINER to bypass RLS policies
-- 
-- Trigger: Executes AFTER INSERT on auth.users
-- -----------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
security definer
set search_path = ''
language plpgsql
as $$
begin
    insert into public.profiles (id, display_name, avatar_url, email)
    values (
        new.id,
        -- Priority: full_name > name > email
        coalesce(
            new.raw_user_meta_data->>'full_name',
            new.raw_user_meta_data->>'name',
            new.email
        ),
        new.raw_user_meta_data->>'avatar_url',
        new.email
    );
    return new;
end;
$$;

-- Create trigger on auth.users to invoke handle_new_user() after insert
create trigger on_auth_user_created
    after insert on auth.users
    for each row
    execute function public.handle_new_user();

-- -----------------------------------------------------------------------------
-- 6. Create Trigger Function: Auto-update Profile Updated_at Timestamp
-- -----------------------------------------------------------------------------
-- Purpose: Automatically update the updated_at field when a profile is modified.
-- 
-- Behavior:
--   - Sets updated_at to current timestamp before each update
--   - Ensures updated_at is always accurate
-- 
-- Trigger: Executes BEFORE UPDATE on public.profiles
-- -----------------------------------------------------------------------------

create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

-- Create trigger on profiles to invoke handle_updated_at() before update
create trigger on_profile_updated
    before update on public.profiles
    for each row
    execute function public.handle_updated_at();

-- =============================================================================
-- End of Migration: Create Profiles Table
-- =============================================================================

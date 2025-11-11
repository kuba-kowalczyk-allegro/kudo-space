-- =============================================================================
-- Migration: Re-enable RLS with Proper Policies
-- Created: 2025-11-07
-- Description: Re-enables Row Level Security on profiles, kudos, and 
--              kudos_with_users after temporary disabling in migration 
--              20251107000004. This migration restores production-ready
--              security policies while keeping local developer workflows smooth.
-- 
-- Supersedes: 20251107000004_disable_rls_policies.sql (temporary local-only change)
-- 
-- Affected Objects:
--   - Table: public.profiles (4 policies restored)
--   - Table: public.kudos (4 policies restored)
--   - View: public.kudos_with_users (security configuration)
-- 
-- Security Model:
--   - All data access requires authentication
--   - Users can only insert kudos as themselves (prevents impersonation)
--   - Users can only delete their own kudos
--   - Profile creation automated via trigger (service_role only)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Re-enable RLS on Profiles Table
-- -----------------------------------------------------------------------------

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Force RLS even for table owner (belt-and-suspenders approach)
ALTER TABLE public.profiles FORCE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- 2. Create RLS Policies for Profiles Table
-- -----------------------------------------------------------------------------

-- Policy: SELECT - All authenticated users can read all profiles
-- Rationale: Profiles are visible across the application for kudos functionality
-- (e.g., selecting recipients, viewing sender/recipient details)
CREATE POLICY profiles_select_all ON public.profiles
    FOR SELECT
    TO authenticated
    USING (true);

-- Policy: INSERT - Only service_role can insert profiles
-- Rationale: Profiles are created automatically via trigger on auth.users insert.
-- Direct insertion by users is prohibited to maintain data integrity.
CREATE POLICY profiles_insert_via_trigger ON public.profiles
    FOR INSERT
    TO service_role
    WITH CHECK (true);

-- Policy: UPDATE - Users can update only their own profile
-- Rationale: Users should be able to modify their display name, avatar, etc.
-- but cannot modify other users' profiles.
CREATE POLICY profiles_update_own ON public.profiles
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Policy: DELETE - Only service_role can delete profiles
-- Rationale: Profile deletion should only occur via CASCADE when auth.users
-- record is deleted. Direct deletion by users is prohibited.
CREATE POLICY profiles_delete_restricted ON public.profiles
    FOR DELETE
    TO service_role
    USING (true);

-- -----------------------------------------------------------------------------
-- 3. Re-enable RLS on Kudos Table
-- -----------------------------------------------------------------------------

ALTER TABLE public.kudos ENABLE ROW LEVEL SECURITY;

-- Force RLS even for table owner
ALTER TABLE public.kudos FORCE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- 4. Create RLS Policies for Kudos Table
-- -----------------------------------------------------------------------------

-- Policy: SELECT - All authenticated users can read all kudos
-- Rationale: Public kudos board requirement - all team members can see
-- all gratitude messages. Promotes transparency and team morale.
CREATE POLICY kudos_select_all ON public.kudos
    FOR SELECT
    TO authenticated
    USING (true);

-- Policy: INSERT - Authenticated users can insert kudos only as themselves
-- Rationale: Prevents users from impersonating others when sending kudos.
-- Enforces that sender_id must match the authenticated user's ID.
CREATE POLICY kudos_insert_own ON public.kudos
    FOR INSERT
    TO authenticated
    WITH CHECK (sender_id = auth.uid());

-- Policy: UPDATE - No editing allowed
-- Rationale: Per FR-007, kudos cannot be edited after creation.
-- This policy explicitly denies all UPDATE operations.
CREATE POLICY kudos_update_none ON public.kudos
    FOR UPDATE
    TO authenticated
    USING (false);

-- Policy: DELETE - Users can delete only their own kudos
-- Rationale: Per FR-007, users can delete kudos they created but not others.
-- Enforces that only the sender can delete their kudos.
CREATE POLICY kudos_delete_own ON public.kudos
    FOR DELETE
    TO authenticated
    USING (sender_id = auth.uid());

-- -----------------------------------------------------------------------------
-- 5. Verify View Security Configuration
-- -----------------------------------------------------------------------------
-- The kudos_with_users view was already configured with security_invoker=on
-- in migration 20251107000003. This ensures the view inherits RLS policies
-- from underlying tables (profiles and kudos). No additional action needed.
-- 
-- Verification query (for documentation):
-- SELECT viewname, security_invoker 
-- FROM pg_views 
-- WHERE viewname = 'kudos_with_users';
-- 
-- Expected result: security_invoker = true
-- -----------------------------------------------------------------------------

-- =============================================================================
-- End of Migration: Re-enable RLS with Proper Policies
-- 
-- Post-Migration Notes:
--   - Run `supabase db reset` locally to test seed data with policies
--   - Verify CRUD operations respect authorization rules
--   - Test that authenticated users can:
--     * View all profiles and kudos
--     * Create kudos only with their own sender_id
--     * Delete only their own kudos
--     * NOT edit any kudos
--     * NOT create profiles directly (trigger-only)
-- =============================================================================

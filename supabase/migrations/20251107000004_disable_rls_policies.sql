-- =============================================================================
-- Migration: Disable RLS Policies for Local Development
-- Created: 2025-11-07
-- Description: Temporarily disables all RLS policies on profiles, kudos tables
--              for easier local development. This is a temporary change and
--              should NOT be used in production environments.
-- 
-- Affected Objects:
--   - Policies on public.profiles (4 policies dropped)
--   - Policies on public.kudos (4 policies dropped)
-- 
-- To Re-enable: Revert this migration or re-run the original policy creation
--               statements from migrations 20251107000001 and 20251107000002
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Drop RLS Policies from Profiles Table
-- -----------------------------------------------------------------------------

drop policy if exists profiles_select_all on public.profiles;
drop policy if exists profiles_insert_via_trigger on public.profiles;
drop policy if exists profiles_update_own on public.profiles;
drop policy if exists profiles_delete_restricted on public.profiles;

-- -----------------------------------------------------------------------------
-- 2. Drop RLS Policies from Kudos Table
-- -----------------------------------------------------------------------------

drop policy if exists kudos_select_all on public.kudos;
drop policy if exists kudos_insert_own on public.kudos;
drop policy if exists kudos_update_none on public.kudos;
drop policy if exists kudos_delete_own on public.kudos;

-- =============================================================================
-- End of Migration: Disable RLS Policies for Local Development
-- =============================================================================

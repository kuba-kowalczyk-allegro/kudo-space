-- =============================================================================
-- Migration: Create Kudos Table
-- Created: 2025-11-07
-- Description: Creates the public.kudos table to store gratitude messages
--              between users. Includes CHECK constraints for business rules,
--              RLS policies for security, and indexes for performance.
-- 
-- Affected Objects:
--   - Table: public.kudos
--   - Indexes: idx_kudos_created_at_desc, idx_kudos_sender_id, idx_kudos_recipient_id
--   - RLS Policies: kudos_select_all, kudos_insert_own, kudos_update_none, kudos_delete_own
-- 
-- Business Rules:
--   - Users cannot send kudos to themselves (sender_id != recipient_id)
--   - Message length must be between 1 and 1000 characters
--   - Kudos cannot be edited after creation (RLS policy enforces)
--   - Only the sender can delete their own kudos
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Create Kudos Table
-- -----------------------------------------------------------------------------
-- Stores gratitude messages between users on the public kudos board.
-- Many-to-one relationships with profiles table for both sender and recipient.
-- Cascading deletes: when a profile is deleted, all associated kudos are removed.
-- -----------------------------------------------------------------------------

create table public.kudos (
    -- Primary key: UUID v4 generated automatically
    id uuid primary key default gen_random_uuid(),
    
    -- Foreign key to profiles (sender)
    -- Cascades deletion: when sender profile is deleted, their kudos are deleted
    sender_id uuid not null references public.profiles(id) on delete cascade,
    
    -- Foreign key to profiles (recipient)
    -- Cascades deletion: when recipient profile is deleted, kudos to them are deleted
    recipient_id uuid not null references public.profiles(id) on delete cascade,
    
    -- Kudo message content
    -- Constrained to 1-1000 characters for concise messaging
    message text not null check (length(message) between 1 and 1000),
    
    -- Timestamp when kudo was created (UTC)
    created_at timestamptz not null default now(),
    
    -- Timestamp when kudo was last updated (UTC)
    -- Maintained for consistency but editing is disabled via RLS policy
    updated_at timestamptz not null default now(),
    
    -- CHECK CONSTRAINT: Prevent users from sending kudos to themselves
    -- Enforces business rule at database level regardless of application bugs
    constraint kudos_no_self_send check (sender_id != recipient_id)
);

-- -----------------------------------------------------------------------------
-- 2. Create Indexes for Kudos Table
-- -----------------------------------------------------------------------------

-- Descending index on created_at for reverse chronological ordering
-- PRIMARY USE CASE: Optimizes main kudos board query (newest kudos first)
create index idx_kudos_created_at_desc on public.kudos (created_at desc);

-- Index on sender_id for filtering kudos by sender
-- Use case: "Show all kudos sent by user X"
create index idx_kudos_sender_id on public.kudos (sender_id);

-- Index on recipient_id for filtering kudos by recipient
-- Use case: "Show all kudos received by user Y"
create index idx_kudos_recipient_id on public.kudos (recipient_id);

-- -----------------------------------------------------------------------------
-- 3. Enable Row Level Security (RLS)
-- -----------------------------------------------------------------------------
-- All kudos data requires authentication to access.
-- Public board is visible to all authenticated users, but write operations
-- are restricted based on user identity.
-- -----------------------------------------------------------------------------

alter table public.kudos enable row level security;

-- -----------------------------------------------------------------------------
-- 4. Create RLS Policies for Kudos Table
-- -----------------------------------------------------------------------------

-- Policy: SELECT - All authenticated users can read all kudos
-- Rationale: Public kudos board requirement - all team members can see
-- all gratitude messages. Promotes transparency and team morale.
create policy kudos_select_all on public.kudos
    for select
    to authenticated
    using (true);

-- Policy: INSERT - Authenticated users can insert kudos only as themselves
-- Rationale: Prevents users from impersonating others when sending kudos.
-- Enforces that sender_id must match the authenticated user's ID.
create policy kudos_insert_own on public.kudos
    for insert
    to authenticated
    with check (sender_id = auth.uid());

-- Policy: UPDATE - No one can update kudos
-- Rationale: Per FR-007, editing kudos is out of scope for MVP.
-- This prevents any modifications to kudos after creation, maintaining
-- authenticity and simplifying the application logic.
create policy kudos_update_none on public.kudos
    for update
    to authenticated
    using (false);

-- Policy: DELETE - Users can delete only their own kudos
-- Rationale: Senders can remove kudos they sent (e.g., sent by mistake),
-- but cannot delete kudos sent by others. Recipients cannot delete kudos
-- they received.
create policy kudos_delete_own on public.kudos
    for delete
    to authenticated
    using (sender_id = auth.uid());

-- =============================================================================
-- End of Migration: Create Kudos Table
-- =============================================================================

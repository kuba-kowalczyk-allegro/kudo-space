-- =============================================================================
-- Migration: Create Kudos with Users View
-- Created: 2025-11-07
-- Description: Creates a denormalized view that joins kudos with sender and
--              recipient profile details. Simplifies API queries by pre-joining
--              user information and ensures consistent data fetching patterns.
-- 
-- Affected Objects:
--   - View: public.kudos_with_users
--   - RLS Policy: kudos_with_users_select_all
-- 
-- Benefits:
--   - Reduces query complexity in application layer
--   - Ensures consistent data fetching (always includes user details)
--   - Minimal overhead for small-scale MVP
--   - Protected by RLS policies
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Create Kudos with Users View
-- -----------------------------------------------------------------------------
-- Denormalized view that combines kudos with sender and recipient details.
-- Eliminates need for manual joins in application code.
-- 
-- Columns:
--   - All kudos fields (id, sender_id, recipient_id, message, timestamps)
--   - Sender details (display_name, avatar_url, email with 'sender_' prefix)
--   - Recipient details (display_name, avatar_url, email with 'recipient_' prefix)
-- 
-- Note: This view automatically reflects changes in underlying tables.
-- -----------------------------------------------------------------------------

create view public.kudos_with_users as
select 
    -- Kudos core fields
    k.id,
    k.sender_id,
    k.recipient_id,
    k.message,
    k.created_at,
    k.updated_at,
    
    -- Sender profile details
    sender.display_name as sender_name,
    sender.avatar_url as sender_avatar,
    sender.email as sender_email,
    
    -- Recipient profile details
    recipient.display_name as recipient_name,
    recipient.avatar_url as recipient_avatar,
    recipient.email as recipient_email
from public.kudos k
join public.profiles sender on k.sender_id = sender.id
join public.profiles recipient on k.recipient_id = recipient.id;

-- -----------------------------------------------------------------------------
-- 2. Configure View Security
-- -----------------------------------------------------------------------------
-- Views do not support RLS policies directly. Instead, they inherit security
-- from their underlying tables (kudos and profiles).
-- 
-- By using security_invoker mode, the view will execute with the privileges
-- of the user calling it, ensuring that RLS policies on kudos and profiles
-- tables are properly enforced during query execution.
-- 
-- This means:
--   - Only authenticated users can query this view (via kudos RLS policy)
--   - View automatically respects all underlying table security rules
--   - No additional policy needed on the view itself
-- -----------------------------------------------------------------------------

alter view public.kudos_with_users set (security_invoker = on);

-- =============================================================================
-- End of Migration: Create Kudos with Users View
-- =============================================================================

# Database Planning Summary - KudoSpace MVP

## Decisions

1. Use Supabase's built-in `auth.users` table for authentication data and create a separate `public.profiles` table for application-specific user data
2. Store user identifying information: `id`, `display_name`, `avatar_url`, `created_at`, `updated_at`, and `email`
3. Create `kudos` table with fields: `id`, `sender_id`, `recipient_id`, `message`, `created_at`, `updated_at`, and a CHECK constraint to prevent self-kudos
4. Skip the `is_ai_generated` flag for MVP to keep schema minimal
5. Create indexes for optimal performance:
   - `kudos(created_at DESC)` for reverse chronological display
   - `kudos(sender_id)` for querying kudos by sender
   - `kudos(recipient_id)` for querying kudos by recipient
   - `profiles(created_at)` for listing users
   - `profiles(display_name)` or `profiles(LOWER(display_name))` for user dropdown/autocomplete
6. Implement RLS policies for `profiles`:
   - SELECT: Allow all authenticated users
   - INSERT: Only via database trigger
   - UPDATE: Users can update only their own profile
   - DELETE: Restrict to service role or CASCADE from auth.users
7. Implement RLS policies for `kudos`:
   - SELECT: Allow all authenticated users (public board)
   - INSERT: Users can insert where sender_id matches their auth.uid()
   - UPDATE: Disallow (editing out of scope)
   - DELETE: Users can delete only their own kudos
8. Create PostgreSQL trigger to automatically create `profiles` record when new user signs up, extracting data from `auth.users.raw_user_meta_data`
9. Use hard deletes for kudos (permanent removal)
10. Implement database-level constraints:
    - NOT NULL on critical fields
    - FOREIGN KEY with CASCADE
    - CHECK constraint preventing self-kudos
    - Character length limits on message (1-1000 chars)
    - DEFAULT values for timestamps
11. Implement CASCADE deletion strategy:
    - Profile deletion → CASCADE delete all related kudos
    - auth.users deletion → CASCADE delete profile
12. Add PRIMARY KEY constraint on `profiles(id)` matching `auth.users(id)`
13. Create `kudos_with_users` view to simplify fetching kudos with sender/recipient details
14. Enable RLS on the `kudos_with_users` view with SELECT policy for authenticated users
15. Use `timestamp with time zone` (timestamptz) for all timestamp fields, stored in UTC
16. Add trigger to automatically update `updated_at` field on `profiles` table
17. Use CHECK constraints for simple validations (e.g., preventing self-kudos) rather than database functions
18. Skip database-level rate limiting for MVP; handle at application layer

## Matched Recommendations

### User Management

- Use Supabase's `auth.users` for authentication and separate `public.profiles` for application data
- Store `id` (UUID), `display_name` (text, NOT NULL), `avatar_url` (text, nullable), `email` (text, nullable), `created_at`, `updated_at` in profiles
- Add `email` field for display purposes to help differentiate users with similar names
- Ensure one profile per auth user with PRIMARY KEY constraint

### Kudos Entity

- Structure: `id` (UUID PK), `sender_id` (UUID FK), `recipient_id` (UUID FK), `message` (text, NOT NULL), `created_at`, `updated_at`
- CHECK constraint: `sender_id != recipient_id` to prevent self-kudos
- Character length constraint: 1-1000 characters for message field
- Skip `is_ai_generated` flag for MVP simplicity

### Indexing Strategy

- `kudos(created_at DESC)` - primary use case for board display
- `kudos(sender_id)` - query optimization
- `kudos(recipient_id)` - query optimization
- `profiles(created_at)` - user listing
- `profiles(LOWER(display_name))` - case-insensitive autocomplete (optional but recommended)

### Security (RLS Policies)

**Profiles Table:**

- SELECT: All authenticated users can read all profiles
- INSERT: Only via trigger (new user signup)
- UPDATE: Users can update only their own profile (`auth.uid() = id`)
- DELETE: Service role only or CASCADE from auth.users

**Kudos Table:**

- SELECT: All authenticated users can read all kudos (public board requirement)
- INSERT: Authenticated users where `sender_id = auth.uid()`
- UPDATE: Disabled (not in scope per FR-007)
- DELETE: Users can delete where `sender_id = auth.uid()`

**Kudos_with_users View:**

- SELECT: All authenticated users

### Data Integrity

- FOREIGN KEY constraints with ON DELETE CASCADE
- NOT NULL constraints on critical fields
- CHECK constraints for business rules
- DEFAULT `now()` for timestamps
- Use `timestamptz` for all timestamp fields

### Automation

- Trigger function to auto-create profiles from `auth.users.raw_user_meta_data` on signup
- Trigger to auto-update `updated_at` on profile modifications
- Cascade deletions to maintain referential integrity

### Performance & Simplification

- Create `kudos_with_users` view for simplified queries joining kudos with user details
- Use hard deletes (no soft delete overhead)
- Use declarative CHECK constraints over functions for simple validations
- Handle rate limiting at application layer, not database

## Database Planning Summary

### Overview

The KudoSpace MVP requires a simple PostgreSQL database schema optimized for a single-team kudos board. The design follows Supabase best practices, separating authentication concerns from application data while maintaining strong data integrity and security through Row Level Security (RLS) policies.

### Key Entities and Relationships

**1. Profiles Table (`public.profiles`)**

- Extends Supabase's `auth.users` with application-specific data
- One-to-one relationship with `auth.users` (id as PK/FK)
- Stores display information: display_name, avatar_url, email
- Automatically created via trigger on user signup
- Tracks creation and modification timestamps

**2. Kudos Table (`public.kudos`)**

- Core entity representing gratitude messages
- Many-to-one relationship with profiles (sender)
- Many-to-one relationship with profiles (recipient)
- Prevents self-kudos via CHECK constraint
- Message field constrained to 1-1000 characters
- Tracks creation timestamp (updates not allowed)

**3. Kudos_with_users View (`public.kudos_with_users`)**

- Denormalized view joining kudos with sender and recipient profiles
- Simplifies API queries and ensures consistent data fetching
- Includes all necessary display fields (names, avatars, message, timestamp)

### Relationships Summary

```
auth.users (1) ←→ (1) profiles
profiles (1) ←→ (many) kudos [as sender]
profiles (1) ←→ (many) kudos [as recipient]
```

### Security Considerations

**Authentication:**

- Leverages Supabase Auth with social provider (Google/GitHub)
- User identity managed by `auth.users`, extended by `profiles`

**Row Level Security:**

- All tables have RLS enabled
- Profiles: Public read, restricted write (own profile only)
- Kudos: Public read for authenticated users, write/delete own kudos only
- Policies enforce business rules at database level

**Data Integrity:**

- Foreign key constraints prevent orphaned records
- Cascade deletions maintain referential integrity
- CHECK constraints enforce business rules (no self-kudos, message length)
- NOT NULL constraints on critical fields

### Scalability & Performance

**Indexing Strategy:**

- Optimized for primary use case: reverse chronological kudos display
- Supports efficient filtering by sender/recipient
- Enables fast user lookup in recipient selector
- Case-insensitive search capability for display names

**Query Optimization:**

- View pre-joins common query patterns
- Appropriate indexes on foreign keys and sort columns
- Minimal data model reduces join complexity

**Future Considerations:**

- Current design supports single-team MVP
- Schema can be extended for multi-team support by adding workspace/team entity
- Partitioning not needed for MVP scale
- Rate limiting handled at application layer for flexibility

### Data Types and Constraints

**Standard Types:**

- UUID for all IDs (Supabase default)
- TEXT for strings (display_name, email, message, avatar_url)
- TIMESTAMPTZ for all timestamps (UTC storage)

**Constraints:**

- PRIMARY KEY: profiles(id), kudos(id)
- FOREIGN KEY: profiles(id) → auth.users(id), kudos(sender_id/recipient_id) → profiles(id)
- CHECK: kudos.sender_id != kudos.recipient_id
- CHECK: LENGTH(kudos.message) BETWEEN 1 AND 1000
- NOT NULL: profiles(display_name), kudos(sender_id, recipient_id, message)
- DEFAULT: All created_at and updated_at fields default to now()

### Automation & Triggers

**Profile Creation Trigger:**

- Automatically creates profile when user signs up
- Extracts display_name, email, avatar_url from OAuth provider metadata
- Ensures every authenticated user has a profile

**Profile Update Trigger:**

- Automatically updates updated_at timestamp on profile modifications
- Maintains accurate modification tracking

### MVP Scope Decisions

**Included:**

- Complete CRUD for kudos (Create, Read, Delete)
- User profile management
- Public kudos board for single team
- Strong security via RLS
- Data integrity via constraints

**Excluded (for simplicity):**

- AI generation tracking (no is_ai_generated flag)
- Database-level rate limiting
- Soft deletes
- Kudo editing capability
- Complex audit trails
- Multi-team/workspace support

## Unresolved Issues

None. All database planning decisions have been made and approved. The schema is ready for implementation.

### Next Steps

1. Create Supabase migration files for tables, indexes, and constraints
2. Implement RLS policies
3. Create database triggers for profile automation
4. Create the kudos_with_users view
5. Test all CRUD operations and security policies
6. Implement application-layer integration with database schema

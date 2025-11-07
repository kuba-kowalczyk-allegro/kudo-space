# KudoSpace Database Schema

## 1. Tables

### 1.1 Profiles Table (`public.profiles`)

Extends Supabase's `auth.users` with application-specific user data.

| Column Name | Data Type | Constraints | Description |
|-------------|-----------|-------------|-------------|
| `id` | UUID | PRIMARY KEY, REFERENCES auth.users(id) ON DELETE CASCADE | User identifier, matches auth.users.id |
| `display_name` | TEXT | NOT NULL | User's display name from OAuth provider |
| `avatar_url` | TEXT | NULL | URL to user's avatar image |
| `email` | TEXT | NULL | User's email address for display purposes |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Timestamp when profile was created |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Timestamp when profile was last updated |

**Notes:**
- One-to-one relationship with `auth.users`
- Automatically populated via trigger on user signup
- Email stored for display to differentiate users with similar names

### 1.2 Kudos Table (`public.kudos`)

Stores gratitude messages between users.

| Column Name | Data Type | Constraints | Description |
|-------------|-----------|-------------|-------------|
| `id` | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique kudo identifier |
| `sender_id` | UUID | NOT NULL, REFERENCES profiles(id) ON DELETE CASCADE | ID of user who sent the kudo |
| `recipient_id` | UUID | NOT NULL, REFERENCES profiles(id) ON DELETE CASCADE | ID of user who received the kudo |
| `message` | TEXT | NOT NULL, CHECK (LENGTH(message) BETWEEN 1 AND 1000) | Kudo message content (1-1000 characters) |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Timestamp when kudo was created |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Timestamp when kudo was last updated |

**Table Constraints:**
- `CHECK (sender_id != recipient_id)` - Prevents users from sending kudos to themselves

**Notes:**
- Many-to-one relationship with profiles (sender)
- Many-to-one relationship with profiles (recipient)
- No editing allowed (per FR-007), but updated_at maintained for consistency
- Hard deletes only (no soft delete)

### 1.3 Kudos with Users View (`public.kudos_with_users`)

Denormalized view for simplified querying of kudos with sender and recipient details.

```sql
CREATE VIEW kudos_with_users AS
SELECT 
    k.id,
    k.sender_id,
    k.recipient_id,
    k.message,
    k.created_at,
    k.updated_at,
    sender.display_name AS sender_name,
    sender.avatar_url AS sender_avatar,
    sender.email AS sender_email,
    recipient.display_name AS recipient_name,
    recipient.avatar_url AS recipient_avatar,
    recipient.email AS recipient_email
FROM kudos k
JOIN profiles sender ON k.sender_id = sender.id
JOIN profiles recipient ON k.recipient_id = recipient.id;
```

**Notes:**
- Simplifies API queries by pre-joining user details
- Ensures consistent data fetching pattern
- Protected by RLS policies

## 2. Relationships

### 2.1 Entity Relationship Diagram

```
auth.users (1) ←→ (1) profiles
    │
    └─ ON DELETE CASCADE

profiles (1) ←→ (many) kudos [as sender]
    │
    └─ sender_id REFERENCES profiles(id) ON DELETE CASCADE

profiles (1) ←→ (many) kudos [as recipient]
    │
    └─ recipient_id REFERENCES profiles(id) ON DELETE CASCADE
```

### 2.2 Relationship Details

| Parent Table | Child Table | Relationship Type | Foreign Key | On Delete Action |
|--------------|-------------|-------------------|-------------|------------------|
| `auth.users` | `profiles` | One-to-One | `profiles.id` | CASCADE |
| `profiles` | `kudos` | One-to-Many | `kudos.sender_id` | CASCADE |
| `profiles` | `kudos` | One-to-Many | `kudos.recipient_id` | CASCADE |

**Cascade Behavior:**
- Deleting a user from `auth.users` → deletes their `profile` → deletes all kudos they sent or received
- Deleting a profile → deletes all kudos sent or received by that user

## 3. Indexes

### 3.1 Primary Use Case Optimization

| Index Name | Table | Columns | Type | Purpose |
|------------|-------|---------|------|---------|
| `idx_kudos_created_at_desc` | `kudos` | `created_at DESC` | B-tree | Optimize reverse chronological board display (primary use case) |
| `idx_kudos_sender_id` | `kudos` | `sender_id` | B-tree | Optimize queries filtering by sender |
| `idx_kudos_recipient_id` | `kudos` | `recipient_id` | B-tree | Optimize queries filtering by recipient |
| `idx_profiles_created_at` | `profiles` | `created_at` | B-tree | Optimize user listing by join date |
| `idx_profiles_display_name_lower` | `profiles` | `LOWER(display_name)` | B-tree | Enable case-insensitive autocomplete/search |

**Index Definitions:**

```sql
-- Kudos indexes
CREATE INDEX idx_kudos_created_at_desc ON kudos (created_at DESC);
CREATE INDEX idx_kudos_sender_id ON kudos (sender_id);
CREATE INDEX idx_kudos_recipient_id ON kudos (recipient_id);

-- Profiles indexes
CREATE INDEX idx_profiles_created_at ON profiles (created_at);
CREATE INDEX idx_profiles_display_name_lower ON profiles (LOWER(display_name));
```

**Notes:**
- Foreign key columns are automatically indexed in PostgreSQL when referenced
- Descending index on `created_at` optimizes the most common query pattern
- Case-insensitive index on `display_name` supports recipient selector autocomplete

## 4. Row Level Security (RLS) Policies

### 4.1 Profiles Table Policies

**Enable RLS:**
```sql
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
```

**Policy Definitions:**

| Policy Name | Operation | Target Roles | Policy Rule | Description |
|-------------|-----------|--------------|-------------|-------------|
| `profiles_select_all` | SELECT | authenticated | `true` | All authenticated users can view all profiles |
| `profiles_insert_via_trigger` | INSERT | service_role | `true` | Only service role (trigger) can insert profiles |
| `profiles_update_own` | UPDATE | authenticated | `auth.uid() = id` | Users can update only their own profile |
| `profiles_delete_restricted` | DELETE | service_role | `true` | Only service role can delete profiles |

**Policy SQL:**

```sql
-- SELECT: All authenticated users can read all profiles
CREATE POLICY profiles_select_all ON profiles
    FOR SELECT
    TO authenticated
    USING (true);

-- INSERT: Only via trigger (service_role)
CREATE POLICY profiles_insert_via_trigger ON profiles
    FOR INSERT
    TO service_role
    WITH CHECK (true);

-- UPDATE: Users can update only their own profile
CREATE POLICY profiles_update_own ON profiles
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- DELETE: Service role only (or CASCADE from auth.users)
CREATE POLICY profiles_delete_restricted ON profiles
    FOR DELETE
    TO service_role
    USING (true);
```

### 4.2 Kudos Table Policies

**Enable RLS:**
```sql
ALTER TABLE kudos ENABLE ROW LEVEL SECURITY;
```

**Policy Definitions:**

| Policy Name | Operation | Target Roles | Policy Rule | Description |
|-------------|-----------|--------------|-------------|-------------|
| `kudos_select_all` | SELECT | authenticated | `true` | All authenticated users can view all kudos (public board) |
| `kudos_insert_own` | INSERT | authenticated | `sender_id = auth.uid()` | Users can insert kudos only as themselves |
| `kudos_update_none` | UPDATE | authenticated | `false` | No editing allowed (per FR-007) |
| `kudos_delete_own` | DELETE | authenticated | `sender_id = auth.uid()` | Users can delete only their own kudos |

**Policy SQL:**

```sql
-- SELECT: All authenticated users can read all kudos (public board requirement)
CREATE POLICY kudos_select_all ON kudos
    FOR SELECT
    TO authenticated
    USING (true);

-- INSERT: Authenticated users where sender_id matches their auth.uid()
CREATE POLICY kudos_insert_own ON kudos
    FOR INSERT
    TO authenticated
    WITH CHECK (sender_id = auth.uid());

-- UPDATE: Disabled (editing not in scope per FR-007)
CREATE POLICY kudos_update_none ON kudos
    FOR UPDATE
    TO authenticated
    USING (false);

-- DELETE: Users can delete only their own kudos
CREATE POLICY kudos_delete_own ON kudos
    FOR DELETE
    TO authenticated
    USING (sender_id = auth.uid());
```

### 4.3 Kudos with Users View Policies

**Enable RLS:**
```sql
ALTER TABLE kudos_with_users ENABLE ROW LEVEL SECURITY;
```

**Policy Definitions:**

| Policy Name | Operation | Target Roles | Policy Rule | Description |
|-------------|-----------|--------------|-------------|-------------|
| `kudos_with_users_select_all` | SELECT | authenticated | `true` | All authenticated users can view the joined data |

**Policy SQL:**

```sql
-- SELECT: All authenticated users can read the view
CREATE POLICY kudos_with_users_select_all ON kudos_with_users
    FOR SELECT
    TO authenticated
    USING (true);
```

## 5. Database Triggers

### 5.1 Auto-create Profile on User Signup

**Purpose:** Automatically create a profile record when a new user signs up via Supabase Auth.

**Trigger Function:**

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, display_name, avatar_url, email)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', NEW.email),
        NEW.raw_user_meta_data->>'avatar_url',
        NEW.email
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Trigger Definition:**

```sql
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();
```

**Notes:**
- Extracts display_name from OAuth metadata (full_name, name, or falls back to email)
- Extracts avatar_url and email from user metadata
- Runs with SECURITY DEFINER to bypass RLS

### 5.2 Auto-update Profile Updated_at Timestamp

**Purpose:** Automatically update the `updated_at` field when a profile is modified.

**Trigger Function:**

```sql
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

**Trigger Definition:**

```sql
CREATE TRIGGER on_profile_updated
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();
```

**Notes:**
- Ensures `updated_at` is always current
- Runs before update to modify the NEW record

## 6. Design Decisions and Rationale

### 6.1 Separation of Auth and Application Data
- **Decision:** Use Supabase's `auth.users` for authentication and separate `public.profiles` for application data
- **Rationale:** Follows Supabase best practices, maintains clean separation of concerns, allows extending user data without modifying auth schema

### 6.2 Single Team Scope
- **Decision:** No workspace/team entity in MVP
- **Rationale:** PRD specifies single-team use case; schema can be extended later with minimal refactoring

### 6.3 Hard Deletes
- **Decision:** Use permanent deletion (no soft delete flags)
- **Rationale:** Simplifies MVP; no audit requirements specified; reduces query complexity and storage overhead

### 6.4 Self-Kudo Prevention
- **Decision:** CHECK constraint `sender_id != recipient_id`
- **Rationale:** Enforces business rule at database level; prevents invalid data regardless of application bugs

### 6.5 Message Length Constraint
- **Decision:** 1-1000 character limit on kudos messages
- **Rationale:** Ensures concise messages (aligned with AI generation of 2-3 sentences); prevents abuse; improves UI consistency

### 6.6 Denormalized View
- **Decision:** Create `kudos_with_users` view
- **Rationale:** Simplifies API queries; ensures consistent data fetching; minimal overhead for small-scale MVP

### 6.7 Indexing Strategy
- **Decision:** Index on `created_at DESC`, foreign keys, and case-insensitive display_name
- **Rationale:** Optimized for primary use case (reverse chronological display); supports efficient filtering and autocomplete

### 6.8 Cascade Deletions
- **Decision:** ON DELETE CASCADE for all foreign keys
- **Rationale:** Maintains referential integrity automatically; prevents orphaned records; simplifies deletion logic

### 6.9 Timestamp Storage
- **Decision:** Use `TIMESTAMPTZ` (timestamp with time zone) for all timestamps
- **Rationale:** Best practice for international applications; stores in UTC; handles timezone conversions automatically

### 6.10 Rate Limiting
- **Decision:** No database-level rate limiting
- **Rationale:** Application layer is more flexible; allows easier adjustment of limits; reduces database complexity for MVP

### 6.11 AI Generation Tracking
- **Decision:** No `is_ai_generated` flag in MVP
- **Rationale:** Keeps schema minimal; feature is optional and doesn't require differentiation in data model for MVP

### 6.12 No Kudo Editing
- **Decision:** UPDATE policy prevents editing kudos
- **Rationale:** Per FR-007, editing is out of scope; simplifies application logic and audit trail

## 7. Migration Sequence

When implementing this schema, follow this order:

1. **Create profiles table** with all constraints
2. **Create kudos table** with all constraints and CHECK rules
3. **Create indexes** on both tables
4. **Enable RLS** on both tables
5. **Create RLS policies** for profiles and kudos
6. **Create trigger functions** (handle_new_user, handle_updated_at)
7. **Create triggers** on auth.users and profiles
8. **Create kudos_with_users view**
9. **Enable RLS and create policy** on the view
10. **Test** all CRUD operations and security policies

## 8. Security Considerations

### 8.1 Authentication
- All database access requires authentication via Supabase Auth
- No anonymous access to any data

### 8.2 Authorization
- RLS policies enforce business rules at database level
- Users can only create kudos as themselves (sender_id validation)
- Users can only delete their own kudos
- Profile updates restricted to own profile

### 8.3 Data Integrity
- Foreign key constraints with CASCADE prevent orphaned records
- CHECK constraints enforce business rules (no self-kudos, message length)
- NOT NULL constraints on critical fields
- Triggers ensure data consistency (profile creation, timestamp updates)

### 8.4 SQL Injection Prevention
- Use parameterized queries in application layer
- RLS policies use built-in auth.uid() function
- Avoid dynamic SQL in application code
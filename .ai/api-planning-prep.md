<db-plan>
# KudoSpace Database Schema

## 1. Tables

### 1.1 Profiles Table (`public.profiles`)

Extends Supabase's `auth.users` with application-specific user data.

| Column Name    | Data Type   | Constraints                                              | Description                               |
| -------------- | ----------- | -------------------------------------------------------- | ----------------------------------------- |
| `id`           | UUID        | PRIMARY KEY, REFERENCES auth.users(id) ON DELETE CASCADE | User identifier, matches auth.users.id    |
| `display_name` | TEXT        | NOT NULL                                                 | User's display name from OAuth provider   |
| `avatar_url`   | TEXT        | NULL                                                     | URL to user's avatar image                |
| `email`        | TEXT        | NULL                                                     | User's email address for display purposes |
| `created_at`   | TIMESTAMPTZ | NOT NULL, DEFAULT now()                                  | Timestamp when profile was created        |
| `updated_at`   | TIMESTAMPTZ | NOT NULL, DEFAULT now()                                  | Timestamp when profile was last updated   |

**Notes:**

- One-to-one relationship with `auth.users`
- Automatically populated via trigger on user signup
- Email stored for display to differentiate users with similar names

### 1.2 Kudos Table (`public.kudos`)

Stores gratitude messages between users.

| Column Name    | Data Type   | Constraints                                          | Description                              |
| -------------- | ----------- | ---------------------------------------------------- | ---------------------------------------- |
| `id`           | UUID        | PRIMARY KEY, DEFAULT gen_random_uuid()               | Unique kudo identifier                   |
| `sender_id`    | UUID        | NOT NULL, REFERENCES profiles(id) ON DELETE CASCADE  | ID of user who sent the kudo             |
| `recipient_id` | UUID        | NOT NULL, REFERENCES profiles(id) ON DELETE CASCADE  | ID of user who received the kudo         |
| `message`      | TEXT        | NOT NULL, CHECK (LENGTH(message) BETWEEN 1 AND 1000) | Kudo message content (1-1000 characters) |
| `created_at`   | TIMESTAMPTZ | NOT NULL, DEFAULT now()                              | Timestamp when kudo was created          |
| `updated_at`   | TIMESTAMPTZ | NOT NULL, DEFAULT now()                              | Timestamp when kudo was last updated     |

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

| Parent Table | Child Table | Relationship Type | Foreign Key          | On Delete Action |
| ------------ | ----------- | ----------------- | -------------------- | ---------------- |
| `auth.users` | `profiles`  | One-to-One        | `profiles.id`        | CASCADE          |
| `profiles`   | `kudos`     | One-to-Many       | `kudos.sender_id`    | CASCADE          |
| `profiles`   | `kudos`     | One-to-Many       | `kudos.recipient_id` | CASCADE          |

**Cascade Behavior:**

- Deleting a user from `auth.users` → deletes their `profile` → deletes all kudos they sent or received
- Deleting a profile → deletes all kudos sent or received by that user

## 3. Indexes

### 3.1 Primary Use Case Optimization

| Index Name                        | Table      | Columns               | Type   | Purpose                                                         |
| --------------------------------- | ---------- | --------------------- | ------ | --------------------------------------------------------------- |
| `idx_kudos_created_at_desc`       | `kudos`    | `created_at DESC`     | B-tree | Optimize reverse chronological board display (primary use case) |
| `idx_kudos_sender_id`             | `kudos`    | `sender_id`           | B-tree | Optimize queries filtering by sender                            |
| `idx_kudos_recipient_id`          | `kudos`    | `recipient_id`        | B-tree | Optimize queries filtering by recipient                         |
| `idx_profiles_created_at`         | `profiles` | `created_at`          | B-tree | Optimize user listing by join date                              |
| `idx_profiles_display_name_lower` | `profiles` | `LOWER(display_name)` | B-tree | Enable case-insensitive autocomplete/search                     |

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

| Policy Name                   | Operation | Target Roles  | Policy Rule       | Description                                     |
| ----------------------------- | --------- | ------------- | ----------------- | ----------------------------------------------- |
| `profiles_select_all`         | SELECT    | authenticated | `true`            | All authenticated users can view all profiles   |
| `profiles_insert_via_trigger` | INSERT    | service_role  | `true`            | Only service role (trigger) can insert profiles |
| `profiles_update_own`         | UPDATE    | authenticated | `auth.uid() = id` | Users can update only their own profile         |
| `profiles_delete_restricted`  | DELETE    | service_role  | `true`            | Only service role can delete profiles           |

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

| Policy Name         | Operation | Target Roles  | Policy Rule              | Description                                               |
| ------------------- | --------- | ------------- | ------------------------ | --------------------------------------------------------- |
| `kudos_select_all`  | SELECT    | authenticated | `true`                   | All authenticated users can view all kudos (public board) |
| `kudos_insert_own`  | INSERT    | authenticated | `sender_id = auth.uid()` | Users can insert kudos only as themselves                 |
| `kudos_update_none` | UPDATE    | authenticated | `false`                  | No editing allowed (per FR-007)                           |
| `kudos_delete_own`  | DELETE    | authenticated | `sender_id = auth.uid()` | Users can delete only their own kudos                     |

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

| Policy Name                   | Operation | Target Roles  | Policy Rule | Description                                      |
| ----------------------------- | --------- | ------------- | ----------- | ------------------------------------------------ |
| `kudos_with_users_select_all` | SELECT    | authenticated | `true`      | All authenticated users can view the joined data |

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
  </db-plan>

<prd>
# Product Requirements Document (PRD) - KudoSpace

## 1. Product Overview

KudoSpace is a Minimum Viable Product (MVP) web application designed to provide a simple, visible way for team members to show appreciation for each other, especially in remote work settings. It features a single, public kudos board where users can post messages of gratitude for their colleagues. The core functionality includes user authentication via a social provider, creating and deleting kudos, and an optional AI-powered feature to help generate message content. The MVP is scoped for a single team/company and prioritizes simplicity and ease of use, built with a modern tech stack (Astro, React, Supabase) for rapid development.

## 2. User Problem

In many teams, particularly those working remotely, there is a lack of informal but visible channels for expressing appreciation for a colleague's work or assistance. These small but significant gestures of gratitude often go unnoticed, which can negatively impact team morale, motivation, and the overall company culture. KudoSpace aims to solve this by creating a centralized and visible platform for sharing praise.

## 3. Functional Requirements

- FR-001: User Authentication: Users must be able to register and log in to the application using a single social provider (e.g., Google or GitHub) managed by Supabase.
- FR-002: Shared Workspace: All authenticated users will belong to a single, shared workspace.
- FR-003: Kudos Board: The application will feature a single, public board that displays all kudos for all users.
- FR-004: Board Sorting: Kudos on the board must be displayed in reverse chronological order, with the newest entries appearing at the top.
- FR-005: Create Kudos: Authenticated users must be able to create a kudo for another registered user.
- FR-006: Kudo Creation Form: The creation form must include a recipient selector (dropdown/autocomplete), a message text area, and a submission button.
- FR-007: Delete Kudos: Users must be able to delete kudos they have created. They cannot delete kudos created by other users.
- FR-008: AI Content Generation: The application will provide an optional feature to generate a kudo message using an AI service (OpenRouter.ai).
- FR-009: AI Prompt Input: The AI generation feature will accept a short prompt (10-200 characters) describing what the user wants to thank someone for, and will generate a concise (2-3 sentences), positive, and informal message based on that prompt.
- FR-010: AI Error Handling: If the AI service is unavailable, the user will be shown a non-blocking error message and can proceed to write the kudo manually.

## 4. Product Boundaries

### In Scope

- User authentication via a single social provider.
- A single, shared kudos board visible to all users.
- Full CRUD (Create, Read, Delete) functionality for kudos, with the limitation that users can only delete their own.
- An optional AI-powered message generation feature based on a user prompt.
- A clean, minimalist user interface.
- The application operates as a single instance for one team.

### Out of Scope

- Multiple or private boards for different teams or topics.
- Systems for points, rankings, or rewards.
- Real-time notifications or integrations with chat platforms (e.g., Slack, Teams).
- Editing existing kudos.
- Advanced user profiles, user statistics, or activity dashboards.
- Formal user feedback mechanisms for the AI feature's quality.

## 5. User Stories

### US-001: User Authentication and Session Management

- Title: User Signup and Login
- Description: As a new user, I want to sign up and log in quickly using my existing social account (e.g., Google or GitHub) so that I can access the application without creating a new set of credentials.
- Acceptance Criteria:
  - A "Login" button is visible to unauthenticated users.
  - Clicking the login button redirects the user to the Supabase authentication page for a single social provider.
  - Upon successful authentication, the user is redirected back to the main kudos board.
  - The user's session is established, and they are recognized as a logged-in user.
  - If authentication fails, an appropriate error message is displayed.

### US-002: View the Kudos Board

- Title: View Kudos Board
- Description: As a user, I want to see all the kudos given within my team on a single board so that I can stay updated on the positive recognition happening.
- Acceptance Criteria:
  - The main page of the application is the kudos board.
  - All submitted kudos are visible on the board.
  - Kudos are displayed in reverse chronological order (newest first).
  - Each kudo on the board displays the recipient's name, the sender's name, and the message.

### US-003: Create a Kudo

- Title: Create and Send a Kudo
- Description: As a user, I want to give a kudo to a specific team member to show my appreciation for their work or help.
- Acceptance Criteria:
  - An authenticated user can see a "Create Kudo" or similar call-to-action button.
  - Clicking the button opens a form with fields for "To" (recipient) and "Message".
  - The "To" field is a dropdown or autocomplete that lists all registered users in the workspace.
  - The "Message" field is a text area that allows for multi-line input.
  - Upon submitting the form, the new kudo appears at the top of the kudos board.
  - The form is cleared and hidden after successful submission.

### US-004: Delete a Kudo

- Title: Delete My Own Kudo
- Description: As a user, I want to be able to delete a kudo that I have previously created in case I made a mistake or no longer want it to be visible.
- Acceptance Criteria:
  - When viewing the kudos board, a "Delete" button or icon is visible only on the kudos that I have created.
  - No delete option is visible for kudos created by other users.
  - Clicking the "Delete" button prompts for confirmation (e.g., "Are you sure?").
  - Upon confirmation, the kudo is permanently removed from the board and the database.

### US-005: AI-Powered Message Generation

- Title: Use AI to Generate a Kudo Message
- Description: As a user, I want an optional AI assistant to help me write a kudo message based on a short description, so I can express my gratitude more easily and creatively.
- Acceptance Criteria:
  - In the kudo creation form, there is a "Generate with AI" button next to the message field.
  - The user can input a short prompt (e.g., "John helped me with debugging and documentation") describing what they want to thank someone for.
  - Clicking the button sends the prompt to the OpenRouter.ai service.
  - The AI-generated message (2-3 sentences, positive, informal) populates the "Message" text area.
  - The user can then edit the generated message before submitting the kudo.

### US-006: AI Service Unavailability

- Title: Handle AI Generation Failure
- Description: As a user, if the AI generation feature fails or is unavailable, I want to be notified gracefully so that I can proceed to write my kudo message manually.
- Acceptance Criteria:
  - If the call to OpenRouter.ai fails, a non-blocking error message is displayed to the user (e.g., a toast notification).
  - The error message clearly states that the AI service is unavailable and encourages the user to write the message manually.
  - The kudo creation form remains fully functional, allowing the user to type and submit their kudo without the AI.

### US-007: User Logout

- Title: User Logout
- Description: As a logged-in user, I want to be able to log out of the application to securely end my session.
- Acceptance Criteria:
  - A "Logout" button is visible to authenticated users.
  - Clicking the "Logout" button terminates the user's session.
  - The user is redirected to a public page (like the login page or a logged-out view of the board).
  - The user can no longer perform authenticated actions like creating or deleting kudos.

## 6. Success Metrics

- Metric-001: Core Functionality: The application successfully allows users to log in, create kudos for other users, view all kudos on the board, and delete their own kudos.
- Metric-002: AI Feature Utility: The AI content generation feature is functional and provides sensible, context-appropriate suggestions based on user-provided prompts. For the MVP, the "usefulness" will be judged subjectively by the development team, without a formal user feedback mechanism.
- Metric-003: User Adoption: The application is successfully deployed and used by a small team, with kudos being actively created and viewed.
- Metric-004: Stability: The application runs without critical errors, and core features like authentication and kudo creation are consistently available.
  </prd>

<tech-stack>
Frontend - Astro with React for interactive components:

- Astro 5 enables building fast, efficient sites and applications with minimal JavaScript
- React 19 provides interactivity where needed
- TypeScript 5 for static typing and improved IDE support
- Tailwind 4 for convenient styling of the application
- shadcn/ui provides a library of accessible React components that we'll base the UI on

Backend - Supabase as an all-in-one backend solution:

- Provides a PostgreSQL database
- Offers SDKs in multiple languages to serve as a Backend-as-a-Service
- Open-source and can be self-hosted or run on your own infrastructure
- Includes built-in user authentication

AI - Model access via OpenRouter.ai:

- Access to a wide range of models (OpenAI, Anthropic, Google and others), allowing us to choose efficient and cost-effective options
- Supports setting spending limits on API keys

CI/CD and Hosting:

- GitHub Actions for building CI/CD pipelines
- DigitalOcean for hosting the application using a Docker image
  </tech-stack>

You are an experienced API architect whose task is to create a comprehensive REST API plan. Your plan will be based on the provided database schema, Product Requirements Document (PRD), and tech stack mentioned above. Carefully review the inputs and perform the following steps:

1. Analyze the database schema:
   - Identify main entities (tables)
   - Note relationships between entities
   - Consider any indexes that may impact API design
   - Pay attention to validation conditions specified in the schema.

2. Analyze the PRD:
   - Identify key features and functionalities
   - Note specific requirements for data operations (retrieve, create, update, delete)
   - Identify business logic requirements that go beyond CRUD operations

3. Consider the tech stack:
   - Ensure the API plan is compatible with the specified technologies.
   - Consider how these technologies may influence API design

4. Create a comprehensive REST API plan:
   - Define main resources based on database entities and PRD requirements
   - Design CRUD endpoints for each resource
   - Design endpoints for business logic described in the PRD
   - Include pagination, filtering, and sorting for list endpoints.
   - Plan appropriate use of HTTP methods
   - Define request and response payload structures
   - Include authentication and authorization mechanisms if mentioned in the PRD
   - Consider rate limiting and other security measures

Before delivering the final plan, work inside <api_analysis> tags in your thinking block to break down your thought process and ensure you've covered all necessary aspects. In this section:

1. List main entities from the database schema. Number each entity and quote the relevant part of the schema.
2. List key business logic features from the PRD. Number each feature and quote the relevant part of the PRD.
3. Map features from the PRD to potential API endpoints. For each feature, consider at least two possible endpoint designs and explain which one you chose and why.
4. Consider and list any security and performance requirements. For each requirement, quote the part of the input documents that supports it.
5. Explicitly map business logic from the PRD to API endpoints.
6. Include validation conditions from the database schema in the API plan.

This section may be quite long.

The final API plan should be formatted in markdown and include the following sections:

```markdown
# REST API Plan

## 1. Resources

- List each main resource and its corresponding database table

## 2. Endpoints

For each resource provide:

- HTTP Method
- URL Path
- Brief description
- Query parameters (if applicable)
- JSON request payload structure (if applicable)
- JSON response payload structure
- Success codes and messages
- Error codes and messages

## 3. Authentication and Authorization

- Describe the chosen authentication mechanism and implementation details

## 4. Validation and Business Logic

- List validation conditions for each resource
- Describe how business logic is implemented in the API
```

Ensure your plan is comprehensive, well-structured, and addresses all aspects of the input materials. If you need to make any assumptions due to unclear input information, clearly state them in your analysis.

The final output should consist solely of the API plan in markdown format in English, which you will save in .ai/api-plan.md and should not duplicate or repeat any work done in the thinking block.

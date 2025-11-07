# REST API Plan for KudoSpace

## 1. Resources

The API provides access to the following main resources:

| Resource | Database Entity | Description |
|----------|----------------|-------------|
| **Kudos** | `kudos` table, `kudos_with_users` view | Gratitude messages between users |
| **Users** | `profiles` table | User profiles extended from Supabase auth |
| **AI Message Generator** | N/A (external service) | AI-powered message generation utility |

## 2. Endpoints

### 2.1 Kudos Resource

#### 2.1.1 List All Kudos

Retrieves all kudos from the board in reverse chronological order.

- **HTTP Method:** `GET`
- **URL Path:** `/api/kudos`
- **Authentication:** Required
- **Description:** Returns paginated list of all kudos with sender and recipient information

**Query Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `limit` | integer | No | 50 | Number of kudos to return (1-100) |
| `offset` | integer | No | 0 | Number of kudos to skip for pagination |

**Request Payload:** None

**Success Response (200 OK):**

```json
{
  "data": [
    {
      "id": "uuid-string",
      "sender_id": "uuid-string",
      "recipient_id": "uuid-string",
      "message": "Thank you for helping me debug that nasty issue!",
      "created_at": "2025-11-07T10:30:00Z",
      "updated_at": "2025-11-07T10:30:00Z",
      "sender": {
        "id": "uuid-string",
        "display_name": "John Doe",
        "avatar_url": "https://example.com/avatar.jpg",
        "email": "john.doe@example.com"
      },
      "recipient": {
        "id": "uuid-string",
        "display_name": "Jane Smith",
        "avatar_url": "https://example.com/avatar2.jpg",
        "email": "jane.smith@example.com"
      }
    }
  ],
  "pagination": {
    "limit": 50,
    "offset": 0,
    "total": 150
  }
}
```

**Error Responses:**

| Status Code | Error Code | Description |
|-------------|------------|-------------|
| 401 | `UNAUTHORIZED` | User is not authenticated |
| 400 | `INVALID_PARAMETERS` | Invalid limit or offset values |
| 500 | `INTERNAL_ERROR` | Server error |

---

#### 2.1.2 Get Single Kudo

Retrieves details of a specific kudo.

- **HTTP Method:** `GET`
- **URL Path:** `/api/kudos/{id}`
- **Authentication:** Required
- **Description:** Returns a single kudo with full sender and recipient information

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | UUID | The kudo's unique identifier |

**Request Payload:** None

**Success Response (200 OK):**

```json
{
  "id": "uuid-string",
  "sender_id": "uuid-string",
  "recipient_id": "uuid-string",
  "message": "Thank you for helping me debug that nasty issue!",
  "created_at": "2025-11-07T10:30:00Z",
  "updated_at": "2025-11-07T10:30:00Z",
  "sender": {
    "id": "uuid-string",
    "display_name": "John Doe",
    "avatar_url": "https://example.com/avatar.jpg",
    "email": "john.doe@example.com"
  },
  "recipient": {
    "id": "uuid-string",
    "display_name": "Jane Smith",
    "avatar_url": "https://example.com/avatar2.jpg",
    "email": "jane.smith@example.com"
  }
}
```

**Error Responses:**

| Status Code | Error Code | Description |
|-------------|------------|-------------|
| 401 | `UNAUTHORIZED` | User is not authenticated |
| 404 | `KUDO_NOT_FOUND` | Kudo with the specified ID does not exist |
| 400 | `INVALID_UUID` | The provided ID is not a valid UUID |
| 500 | `INTERNAL_ERROR` | Server error |

---

#### 2.1.3 Create Kudo

Creates a new kudo for another user.

- **HTTP Method:** `POST`
- **URL Path:** `/api/kudos`
- **Authentication:** Required
- **Description:** Creates a new kudo. The sender is automatically set to the authenticated user.

**Query Parameters:** None

**Request Payload:**

```json
{
  "recipient_id": "uuid-string",
  "message": "Thank you for the amazing code review! Your insights helped me learn so much."
}
```

**Request Body Schema:**

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `recipient_id` | UUID string | Yes | Valid UUID, must exist in profiles, cannot equal sender | ID of the user receiving the kudo |
| `message` | string | Yes | 1-1000 characters | The gratitude message |

**Success Response (201 Created):**

```json
{
  "id": "uuid-string",
  "sender_id": "uuid-string",
  "recipient_id": "uuid-string",
  "message": "Thank you for the amazing code review! Your insights helped me learn so much.",
  "created_at": "2025-11-07T10:30:00Z",
  "updated_at": "2025-11-07T10:30:00Z",
  "sender": {
    "id": "uuid-string",
    "display_name": "John Doe",
    "avatar_url": "https://example.com/avatar.jpg",
    "email": "john.doe@example.com"
  },
  "recipient": {
    "id": "uuid-string",
    "display_name": "Jane Smith",
    "avatar_url": "https://example.com/avatar2.jpg",
    "email": "jane.smith@example.com"
  }
}
```

**Error Responses:**

| Status Code | Error Code | Description |
|-------------|------------|-------------|
| 401 | `UNAUTHORIZED` | User is not authenticated |
| 400 | `INVALID_RECIPIENT` | recipient_id is missing, invalid UUID, or does not exist |
| 400 | `SELF_KUDO_NOT_ALLOWED` | Cannot send kudo to yourself (recipient_id equals sender_id) |
| 400 | `INVALID_MESSAGE` | Message is missing or empty |
| 400 | `MESSAGE_TOO_SHORT` | Message is less than 1 character |
| 400 | `MESSAGE_TOO_LONG` | Message exceeds 1000 characters |
| 500 | `INTERNAL_ERROR` | Server error |

---

#### 2.1.4 Delete Kudo

Deletes a kudo. Only the sender can delete their own kudos.

- **HTTP Method:** `DELETE`
- **URL Path:** `/api/kudos/{id}`
- **Authentication:** Required
- **Description:** Permanently deletes a kudo. Authorization check ensures only the sender can delete.

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | UUID | The kudo's unique identifier |

**Request Payload:** None

**Success Response (200 OK):**

```json
{
  "message": "Kudo deleted successfully",
  "id": "uuid-string"
}
```

**Error Responses:**

| Status Code | Error Code | Description |
|-------------|------------|-------------|
| 401 | `UNAUTHORIZED` | User is not authenticated |
| 403 | `FORBIDDEN` | User is not the sender of this kudo |
| 404 | `KUDO_NOT_FOUND` | Kudo with the specified ID does not exist |
| 400 | `INVALID_UUID` | The provided ID is not a valid UUID |
| 500 | `INTERNAL_ERROR` | Server error |

---

### 2.2 Users Resource

#### 2.2.1 List All Users

Retrieves all user profiles for recipient selection.

- **HTTP Method:** `GET`
- **URL Path:** `/api/users`
- **Authentication:** Required
- **Description:** Returns a list of all users in the workspace, optionally filtered by search query. Excludes the authenticated user from results.

**Query Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `search` | string | No | - | Case-insensitive search string to filter by display name or email |
| `exclude_me` | boolean | No | true | Whether to exclude the authenticated user from results |

**Request Payload:** None

**Success Response (200 OK):**

```json
{
  "data": [
    {
      "id": "uuid-string",
      "display_name": "Jane Smith",
      "avatar_url": "https://example.com/avatar2.jpg",
      "email": "jane.smith@example.com"
    },
    {
      "id": "uuid-string",
      "display_name": "Bob Johnson",
      "avatar_url": "https://example.com/avatar3.jpg",
      "email": "bob.johnson@example.com"
    }
  ]
}
```

**Error Responses:**

| Status Code | Error Code | Description |
|-------------|------------|-------------|
| 401 | `UNAUTHORIZED` | User is not authenticated |
| 500 | `INTERNAL_ERROR` | Server error |

---

#### 2.2.2 Get Current User Profile

Retrieves the authenticated user's profile information.

- **HTTP Method:** `GET`
- **URL Path:** `/api/users/me`
- **Authentication:** Required
- **Description:** Returns the profile of the currently authenticated user

**Query Parameters:** None

**Request Payload:** None

**Success Response (200 OK):**

```json
{
  "id": "uuid-string",
  "display_name": "John Doe",
  "avatar_url": "https://example.com/avatar.jpg",
  "email": "john.doe@example.com",
  "created_at": "2025-10-01T08:00:00Z",
  "updated_at": "2025-11-01T10:15:00Z"
}
```

**Error Responses:**

| Status Code | Error Code | Description |
|-------------|------------|-------------|
| 401 | `UNAUTHORIZED` | User is not authenticated |
| 404 | `PROFILE_NOT_FOUND` | User's profile does not exist (should not happen in normal flow) |
| 500 | `INTERNAL_ERROR` | Server error |

---

### 2.3 AI Message Generator

#### 2.3.1 Generate Kudo Message

Generates a kudo message using AI based on a user prompt.

- **HTTP Method:** `POST`
- **URL Path:** `/api/ai/generate-message`
- **Authentication:** Required
- **Description:** Uses OpenRouter.ai to generate a concise, positive, informal kudo message (2-3 sentences) based on a user-provided prompt describing what they want to thank someone for

**Query Parameters:** None

**Request Payload:**

```json
{
  "prompt": "John helped me with debugging and documentation"
}
```

**Request Body Schema:**

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `prompt` | string | Yes | 10-200 characters | Short description of what the user wants to thank someone for |

**Success Response (200 OK):**

```json
{
  "message": "I really appreciate your help with debugging that tricky issue and improving our documentation! Your patience and clear explanations made everything so much easier to understand. Thanks for taking the time to guide me through it!"
}
```

**Error Responses:**

| Status Code | Error Code | Description |
|-------------|------------|-------------|
| 401 | `UNAUTHORIZED` | User is not authenticated |
| 400 | `INVALID_PROMPT` | Prompt is missing, empty, or not a string |
| 400 | `PROMPT_TOO_SHORT` | Prompt is less than 10 characters |
| 400 | `PROMPT_TOO_LONG` | Prompt exceeds 200 characters |
| 503 | `AI_SERVICE_UNAVAILABLE` | OpenRouter.ai service is unavailable or returned an error |
| 500 | `INTERNAL_ERROR` | Server error |

**Error Response Example (AI Service Unavailable):**

```json
{
  "error": {
    "message": "AI service is temporarily unavailable. Please write your message manually.",
    "code": "AI_SERVICE_UNAVAILABLE",
    "details": {
      "service": "OpenRouter.ai",
      "retry_after": 60
    }
  }
}
```

---

## 3. Authentication and Authorization

### 3.1 Authentication Mechanism

**Technology:** Supabase Authentication with JWT tokens

**Implementation Details:**

1. **User Registration/Login:**
   - Handled client-side using Supabase JavaScript SDK
   - Users authenticate via social provider (Google or GitHub)
   - Supabase returns a JWT access token upon successful authentication

2. **Token Storage:**
   - JWT token stored in HTTP-only cookies via Supabase SDK
   - Token automatically included in requests to API endpoints

3. **Token Validation:**
   - Astro middleware validates JWT tokens on all API routes
   - Middleware extracts user ID from validated token
   - User ID is attached to request context (e.g., `context.locals.user`)

4. **Session Management:**
   - Supabase handles session refresh automatically
   - Tokens expire based on Supabase configuration
   - Middleware returns 401 for expired or invalid tokens

### 3.2 Authorization Rules

**Resource-Level Authorization:**

| Endpoint | Authorization Rule |
|----------|-------------------|
| `GET /api/kudos` | Any authenticated user |
| `GET /api/kudos/{id}` | Any authenticated user |
| `POST /api/kudos` | Any authenticated user (sender_id set automatically) |
| `DELETE /api/kudos/{id}` | Only the sender of the kudo |
| `GET /api/users` | Any authenticated user |
| `GET /api/users/me` | Any authenticated user |
| `POST /api/ai/generate-message` | Any authenticated user |

**Business Logic Constraints:**

1. **Self-Kudo Prevention:**
   - `POST /api/kudos` validates that `recipient_id ≠ sender_id`
   - Enforced at both application and database levels (CHECK constraint)

2. **Deletion Authorization:**
   - `DELETE /api/kudos/{id}` queries the kudo to verify `sender_id = authenticated_user_id`
   - Returns 403 Forbidden if user is not the sender
   - Returns 404 Not Found if kudo doesn't exist

### 3.3 Middleware Implementation

**Authentication Middleware:**

```typescript
// Pseudocode for Astro middleware
export async function onRequest(context, next) {
  const supabase = createSupabaseClient(context);
  
  // Check if route requires authentication
  if (context.url.pathname.startsWith('/api/')) {
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      return new Response(JSON.stringify({
        error: {
          message: "Authentication required",
          code: "UNAUTHORIZED"
        }
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Attach user to context
    context.locals.user = user;
    context.locals.supabase = supabase;
  }
  
  return next();
}
```

### 3.4 Security Headers

All API responses include appropriate security headers:

```
Content-Type: application/json
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000; includeSubDomains
```

---

## 4. Validation and Business Logic

### 4.1 Input Validation Rules

#### 4.1.1 Kudos Resource Validation

**POST /api/kudos:**

| Field | Validation Rules | Error Code |
|-------|-----------------|------------|
| `recipient_id` | Required | `INVALID_RECIPIENT` |
| `recipient_id` | Must be valid UUID format | `INVALID_RECIPIENT` |
| `recipient_id` | Must reference existing profile | `INVALID_RECIPIENT` |
| `recipient_id` | Cannot equal authenticated user ID | `SELF_KUDO_NOT_ALLOWED` |
| `message` | Required | `INVALID_MESSAGE` |
| `message` | Minimum length: 1 character | `MESSAGE_TOO_SHORT` |
| `message` | Maximum length: 1000 characters | `MESSAGE_TOO_LONG` |

**DELETE /api/kudos/{id}:**

| Field | Validation Rules | Error Code |
|-------|-----------------|------------|
| `id` (path param) | Must be valid UUID format | `INVALID_UUID` |
| `id` (path param) | Must reference existing kudo | `KUDO_NOT_FOUND` |
| Authorization | Authenticated user must be the sender | `FORBIDDEN` |

#### 4.1.2 Users Resource Validation

**GET /api/users:**

| Field | Validation Rules | Error Code |
|-------|-----------------|------------|
| `search` (query param) | Optional, string | - |
| `exclude_me` (query param) | Optional, boolean | - |

**GET /api/users/me:**

No input validation required (no parameters).

#### 4.1.3 AI Message Generator Validation

**POST /api/ai/generate-message:**

| Field | Validation Rules | Error Code |
|-------|-----------------|------------|
| `prompt` | Required | `INVALID_PROMPT` |
| `prompt` | Must be a string | `INVALID_PROMPT` |
| `prompt` | Minimum length: 10 characters | `PROMPT_TOO_SHORT` |
| `prompt` | Maximum length: 200 characters | `PROMPT_TOO_LONG` |

### 4.2 Database Constraints

The following database constraints are enforced at the schema level and should be reflected in API validation:

1. **Profiles Table:**
   - `display_name`: NOT NULL
   - `id`: Must match auth.users.id (enforced via foreign key)

2. **Kudos Table:**
   - `sender_id`: NOT NULL, must reference profiles.id
   - `recipient_id`: NOT NULL, must reference profiles.id
   - `message`: NOT NULL, CHECK (LENGTH(message) BETWEEN 1 AND 1000)
   - CHECK (sender_id != recipient_id)

3. **Row Level Security (RLS):**
   - Kudos SELECT: All authenticated users can read
   - Kudos INSERT: Only where sender_id = auth.uid()
   - Kudos UPDATE: Disabled (no editing)
   - Kudos DELETE: Only where sender_id = auth.uid()

### 4.3 Business Logic Implementation

#### 4.3.1 Kudo Creation Flow

1. **Validate Input:** Check recipient_id format, message length
2. **Authenticate:** Verify user is logged in (middleware)
3. **Authorization Check:** Ensure recipient_id ≠ sender_id
4. **Existence Check:** Verify recipient profile exists
5. **Database Insert:** Insert kudo with sender_id from auth context
6. **Response:** Return created kudo with joined user data from kudos_with_users view

#### 4.3.2 Kudo Deletion Flow

1. **Validate Input:** Check id format
2. **Authenticate:** Verify user is logged in (middleware)
3. **Fetch Kudo:** Retrieve kudo from database
4. **Existence Check:** Return 404 if kudo not found
5. **Authorization Check:** Verify sender_id = authenticated user ID
6. **Database Delete:** Permanently delete kudo
7. **Response:** Return success message

#### 4.3.3 AI Message Generation Flow

1. **Validate Input:** Check prompt string (10-200 characters, non-empty)
2. **Authenticate:** Verify user is logged in (middleware)
3. **Call OpenRouter.ai:** Send prompt to generate kudo message
4. **Error Handling:** If API fails, return 503 with user-friendly message
5. **Response:** Return generated message for user to edit

#### 4.3.4 User Listing Flow

1. **Authenticate:** Verify user is logged in (middleware)
2. **Query Profiles:** SELECT from profiles table
3. **Apply Filters:**
   - If `search` provided: Filter by LOWER(display_name) LIKE or email LIKE
   - If `exclude_me` is true: Filter out authenticated user
4. **Response:** Return list of user profiles

### 4.4 Error Response Format

All error responses follow a consistent structure:

```json
{
  "error": {
    "message": "Human-readable error message",
    "code": "ERROR_CODE",
    "details": {
      "field": "field_name",
      "constraint": "constraint_type"
    }
  }
}
```

**Example Validation Error:**

```json
{
  "error": {
    "message": "Message must be between 1 and 1000 characters",
    "code": "MESSAGE_TOO_LONG",
    "details": {
      "field": "message",
      "current_length": 1250,
      "max_length": 1000
    }
  }
}
```
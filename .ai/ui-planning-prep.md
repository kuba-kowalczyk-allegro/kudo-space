# UI Architecture Planning Summary - KudoSpace MVP

## Decisions

1. **Rendering Strategy**: Use Astro's View Transitions API with server-rendered pages and React components for interactive elements (hybrid approach)
2. **User Information Display**: Show display_name prominently with avatar, hide email by default, show on hover/click
3. **Optimistic Updates**: Implement optimistic UI for delete operations using React's useOptimistic hook, wait for server confirmation on create operations
4. **Pagination Strategy**: Implement infinite scroll with Intersection Observer API, default limit of 20 kudos per load, display total count
5. **Kudo Creation Form**: Use modal dialog (shadcn/ui Dialog) triggered by "Give Kudos" button in navigation
6. **AI Integration**: Non-blocking inline approach with "✨ Generate with AI" button, show prompt input conditionally, toast notifications for errors
7. **Error Handling**: Three-tier strategy - toast notifications for non-blocking errors, inline form validation, full-page error states for authentication failures
8. **Recipient Selector**: Use shadcn/ui Combobox with client-side filtering initially, server-side search if users exceed 50, use exclude_me=true parameter
9. **Real-time Updates**: No real-time updates for MVP, manual refresh button, auto-refresh after user creates kudo
10. **Authentication Management**: React Context (AuthContext) for auth state, Astro middleware for route protection, redirect on session expiration
11. **Empty State**: Centered component with illustration, "No kudos yet" heading, "Give First Kudo" call-to-action button
12. **Loading States**: Skeleton screens for initial load, button spinners for actions, inline spinners for AI generation, single skeleton for infinite scroll
13. **Kudo Card Design**: Read-only cards showing sender/recipient avatars, names, message, relative timestamp, delete button only for creator
14. **Header Structure**: Sticky header with logo, "Give Kudos" button when authenticated, user avatar dropdown with logout
15. **Mobile Responsiveness**: Single column on mobile (<768px), 2 columns tablet (768px-1024px), 3 columns desktop (>1024px), full-screen modals on mobile
16. **Form Validation**: Client-side validation with react-hook-form and zod, character counter, error states after first submit or blur
17. **AI Prompt Flow**: Inline conditionally visible form, button transforms to prompt input with Generate/Cancel actions
18. **Accessibility**: Keyboard navigation (Tab, ESC), focus management, color contrast (WCAG 2.1 AA), no screen reader features for MVP
19. **Delete Confirmation**: AlertDialog with "Cancel" (default focus) and "Delete" (destructive styling), ESC to cancel
20. **Timestamp Display**: Relative timestamps with date-fns (e.g., "2 hours ago"), absolute timestamp on hover, abbreviated date after 7 days

## Matched Recommendations

1. **Hybrid Rendering Architecture**: Leverage Astro 5's server-rendering for optimal performance with React 19 components for interactivity. Use View Transitions API for smooth navigation between states.

2. **User Privacy-First Display**: Display user information selectively - show display_name and avatar prominently, hide email by default to protect privacy while maintaining transparency.

3. **Smart Optimistic Updates**: Balance perceived performance with data accuracy by implementing optimistic updates for delete operations while waiting for server confirmation on create operations to ensure correct data from kudos_with_users view.

4. **Infinite Scroll Pagination**: Implement mobile-friendly infinite scroll using Intersection Observer API with 20 kudos per load, displaying total count for context.

5. **Modal-Based Creation Flow**: Use shadcn/ui Dialog component for kudo creation to focus user attention, provide better mobile experience, and keep main board uncluttered.

6. **Non-Blocking AI Integration**: Implement AI message generation as an optional, non-blocking feature with inline prompt input, loading states, and graceful error handling via toast notifications.

7. **Tiered Error Strategy**: Implement comprehensive error handling with toast notifications for non-blocking errors, inline validation for user input, and full-page states for critical failures.

8. **Smart Recipient Selection**: Use shadcn/ui Combobox with client-side filtering for small user sets, automatic server-side search for larger datasets, and API-level self-kudo prevention.

9. **Simplified Real-time Approach**: Skip real-time updates for MVP to reduce complexity, implement manual refresh with automatic refresh after user actions.

10. **Centralized Auth Management**: Use React Context for auth state management with Astro middleware protection and automatic session expiration handling.

11. **Engaging Empty States**: Design empty state with clear call-to-action to encourage first kudo creation and clarify board purpose.

12. **Comprehensive Loading States**: Implement appropriate loading indicators for all async operations using shadcn/ui Skeleton components and button spinners.

13. **Minimal Kudo Cards**: Keep cards simple and read-only with essential information (avatars, names, message, timestamp) and delete button only for creators.

14. **Streamlined Navigation**: Implement sticky header with minimal elements - branding, primary action, and user menu with dropdown.

15. **Mobile-First Responsive Design**: Use Tailwind's breakpoint system with adaptive layouts - single column mobile, multi-column desktop, full-screen modals on mobile.

16. **User-Friendly Validation**: Implement client-side validation using react-hook-form and zod with character counters and non-intrusive error display.

17. **Inline AI Prompt Experience**: Make AI generation feature discoverable but non-intrusive with conditional visibility and easy cancellation.

18. **Core Accessibility Features**: Focus on essential accessibility - keyboard navigation, focus management, and color contrast for WCAG 2.1 AA compliance.

19. **Safe Deletion Flow**: Implement confirmation dialog with clear messaging and keyboard shortcuts to prevent accidental deletions.

20. **Smart Timestamp Display**: Use relative timestamps for recent kudos with absolute timestamps on hover, switch to date format for older entries.

## UI Architecture Planning Summary

### Main UI Architecture Requirements

**Technology Stack Integration:**

- **Astro 5**: Primary framework for server-side rendering and static pages
- **React 19**: Interactive components (forms, modals, dynamic elements)
- **TypeScript 5**: Type safety across components and API integration
- **Tailwind 4**: Utility-first styling with responsive design
- **shadcn/ui**: Component library for consistent, accessible UI elements

**Rendering Strategy:**

- Hybrid architecture combining Astro's server rendering with React interactivity
- Use Astro View Transitions API for smooth page transitions
- Server-render main kudos board page for optimal performance
- Client-side React components for interactive features (modals, forms, dropdowns). Use shadcn components when possible.

**State Management:**

- React Context (AuthContext) for authentication state
- React hooks (useState, useOptimistic, useTransition) for local component state
- No global state management library needed for MVP scope
- Supabase client for API communication and session management

### Key Views, Screens, and User Flows

**1. Login/Authentication View**

- Simple page with social provider login button (Google or GitHub)
- Redirects to Supabase authentication
- Returns to kudos board after successful authentication
- Displays error messages for authentication failures

**2. Main Kudos Board (Primary View)**

- Header: Sticky navigation with logo, "Give Kudos" button, user avatar dropdown
- Board Content: Grid layout of kudo cards
  - Mobile: Single column (<768px)
  - Tablet: 2 columns (768px-1024px)
  - Desktop: 3 columns (>1024px)
- Infinite scroll pagination (20 kudos per load)
- Empty state with call-to-action for first kudo
- Loading state: 3-5 skeleton cards during initial load

**3. Kudo Card Component**

- Sender section: Avatar + display name
- Arrow/direction indicator
- Recipient section: Avatar + display name
- Message content
- Relative timestamp (e.g., "2 hours ago") with absolute timestamp on hover
- Delete button (trash icon) in top-right corner - visible only to creator
- Read-only, no interactive features beyond delete

**4. Create Kudo Modal**

- Triggered by "Give Kudos" button in header
- Modal dialog (centered on desktop, full-screen on mobile)
- Form fields:
  - Recipient selector (Combobox with search)
  - Message textarea with character counter (0/1000)
  - AI generation section (conditionally visible)
- Submit button (disabled during submission with loading spinner)
- Close via ESC key, close button, or outside click

**5. AI Message Generation Flow**

- Initial state: "✨ Generate with AI" button above message textarea
- Clicked state: Transform to inline form with:
  - Prompt input field (10-200 characters)
  - "Generate" and "Cancel" buttons
- Loading state: Spinner with "Generating..." text
- Success: Populate textarea with generated message
- Error: Toast notification with user-friendly message
- Always allow manual message editing

**6. User Navigation Menu**

- Dropdown triggered by user avatar in header
- Contents:
  - Display name
  - Email address
  - "Logout" action button
- Closes on outside click or ESC key

**7. Delete Confirmation Dialog**

- AlertDialog triggered by delete button on kudo card
- Message: "Delete this kudo?" with "This action cannot be undone."
- Buttons: "Cancel" (default focus) and "Delete" (destructive styling)
- ESC to cancel, Tab to navigate, Enter to confirm after tabbing to Delete

### User Flows

**Flow 1: First-Time User Login**

1. User arrives at application → Login page
2. Click "Login" button → Redirect to Supabase social auth
3. Authenticate with social provider → Return to kudos board
4. Empty state displayed → Click "Give First Kudo"
5. Create kudo modal opens → Complete flow

**Flow 2: Creating a Kudo (Manual)**

1. Click "Give Kudos" button in header
2. Modal opens with focus on recipient selector
3. Search/select recipient from dropdown
4. Type or paste message (watch character counter)
5. Click "Submit" → Loading state on button
6. Wait for server confirmation → Modal closes
7. Board refreshes → New kudo appears at top

**Flow 3: Creating a Kudo (with AI)**

1. Click "Give Kudos" button in header
2. Modal opens → Click "✨ Generate with AI"
3. Button transforms to prompt input form
4. Type short prompt (e.g., "helped with debugging")
5. Click "Generate" → Loading spinner
6. AI message populates textarea → Edit if needed
7. Submit kudo → Follow standard creation flow

**Flow 4: Deleting a Kudo**

1. User views their own kudo on board
2. Hover/click delete button (trash icon)
3. AlertDialog appears with confirmation
4. Click "Delete" (or ESC to cancel)
5. Optimistic update: Kudo disappears immediately
6. Server confirms deletion
7. If error: Kudo reappears with error toast

**Flow 5: Browsing Kudos Board**

1. User lands on board → Initial load (20 kudos)
2. Scroll down board → Reach bottom
3. Intersection Observer triggers → Load next 20
4. Loading skeleton appears at bottom
5. New kudos append to board
6. Continue until all kudos loaded

**Flow 6: Session Expiration**

1. User session expires during activity
2. Next API call returns 401
3. AuthContext detects expiration
4. Redirect to login page with return URL
5. User re-authenticates → Return to previous page

### API Integration and State Management Strategy

**API Integration Architecture:**

**1. Supabase Client Setup**

- Configure for server-side (Astro) and client-side (React) contexts

**2. Middleware Authentication**

- Astro middleware in `src/middleware/index.ts`
- Validate JWT tokens on all `/api/*` routes
- Extract user from token and attach to `context.locals.user`
- Pass Supabase client via `context.locals.supabase`

**3. API Endpoints Integration**

**GET /api/kudos (List Kudos)**

- Called on board initial load and refresh
- Parameters: limit=20, offset for pagination
- Returns kudos with joined user data from kudos_with_users view
- Used by: Main board component

**POST /api/kudos (Create Kudo)**

- Called when user submits kudo form
- Payload: { recipient_id, message }
- sender_id automatically set from auth context
- Returns created kudo with full user data
- Used by: Create kudo modal

**DELETE /api/kudos/{id} (Delete Kudo)**

- Called when user confirms deletion
- Path parameter: kudo id (UUID)
- Authorization: Only sender can delete
- Returns success message
- Used by: Delete confirmation dialog

**GET /api/users (List Users)**

- Called when kudo creation modal opens
- Parameters: exclude_me=true, search (optional)
- Returns list of users for recipient selector
- Used by: Recipient combobox component

**GET /api/users/me (Current User)**

- Called on app initialization
- Returns current user profile
- Used by: AuthContext initialization, header user display

**POST /api/ai/generate-message (AI Generation)**

- Called when user clicks "Generate" in AI form
- Payload: { prompt }
- Returns generated message
- Error handling: 503 for service unavailable
- Used by: AI generation component in kudo modal

**4. State Management Strategy**

**Authentication State (Global)**

- React Context: AuthContext
- Provides: { user, isLoading, isAuthenticated, logout }
- Initialized on app mount by calling GET /api/users/me
- Updates on login/logout
- Consumed by: Header, protected components

**Kudos Board State (Component)**

- Local React state in board component
- State shape: { kudos: [], isLoading, hasMore, error }
- Initial load: Fetch first 20 kudos
- Infinite scroll: Append new kudos to array
- After create: Prepend new kudo to top
- After delete: Optimistically remove, revert on error

**Modal State (Component)**

- Local state: { isOpen, selectedRecipient, message, isSubmitting }
- Form state: Managed by react-hook-form
- AI state: { isGenerating, prompt, showPromptInput }
- Reset on modal close or successful submission

**User List State (Component)**

- Loaded once on modal open
- Local state: { users: [], isLoading }
- Client-side filtering for search
- Switch to server-side if users > 50

**5. Data Validation Strategy**

- Zod schemas mirror API validation rules
- Client-side validation in forms (react-hook-form + zod)
- Example schema for kudo creation:
  ```typescript
  const kudoSchema = z.object({
    recipient_id: z.string().uuid(),
    message: z.string().min(1).max(1000),
  });
  ```
- Server-side validation in API routes as backup

**6. Error Handling Integration**

- API errors follow consistent format: `{ error: { message, code, details } }`
- Map error codes to user-friendly messages
- Display strategy based on error type:
  - Validation errors: Inline form errors
  - Auth errors: Redirect to login
  - AI errors: Toast notification
  - Server errors: Toast with retry option

**7. Caching Strategy (MVP)**

- No aggressive caching for MVP
- Rely on browser cache for API responses
- Fresh data on each navigation
- Post-MVP: Consider React Query for caching

### Responsiveness, Accessibility, and Security Considerations

**Responsiveness:**

**Breakpoints (Tailwind 4):**

- Mobile: < 640px
- Tablet: 640px - 1024px
- Desktop: > 1024px

**Component Adaptations:**

1. **Kudos Board Grid:**
   - Mobile (<640px): Single column, full width
   - Tablet (640px-1024px): 2 columns, gap-4
   - Desktop (>1024px): 3 columns, gap-6

2. **Header Navigation:**
   - Mobile: Compact layout, may collapse to hamburger if needed
   - Desktop: Full horizontal layout with spacing

3. **Kudo Cards:**
   - Mobile: Stack elements vertically (avatar → name → message)
   - Desktop: Horizontal layout with flex

4. **Create Kudo Modal:**
   - Mobile: Full-screen overlay with slide-up animation
   - Tablet/Desktop: Centered dialog (max-width 600px)

5. **Typography Scaling:**
   - Use Tailwind responsive text utilities (text-sm sm:text-base)
   - Headings scale down on mobile for readability

6. **Touch Targets:**
   - Minimum 44x44px for all interactive elements (WCAG guideline)
   - Increased padding on mobile for buttons and links

**Accessibility (WCAG 2.1 AA - Core Features):**

**Keyboard Navigation:**

- All interactive elements accessible via Tab key
- Modal focus trap: Tab cycles through modal elements only
- ESC key closes modals and dropdowns
- Enter key submits forms
- Arrow keys navigate combobox options

**Focus Management:**

- Visible focus indicators on all interactive elements
- Focus returns to trigger button when modal closes
- Focus moves to first form field when modal opens
- Focus outline: 2px solid with high contrast color

**Color Contrast:**

- Text: Minimum 4.5:1 contrast ratio with background
- UI components: Minimum 3:1 contrast ratio
- Error states: Red with sufficient contrast
- Success states: Green with sufficient contrast
- Test with contrast checker tools

**ARIA Attributes:**

- `aria-label` for icon-only buttons (delete, close)
- `aria-expanded` for dropdown triggers
- `aria-modal="true"` for dialog components
- `aria-describedby` for form field errors
- `aria-live="polite"` for toast notifications

**Semantic HTML:**

- Use `<button>` for all clickable actions
- Use `<nav>` for header navigation
- Use `<main>` for primary content (kudos board)
- Use `<form>` for kudo creation
- Proper heading hierarchy (h1 → h2 → h3)

**Features Excluded from MVP:**

- Screen reader optimizations beyond basic ARIA
- Reduced motion preferences
- High contrast mode
- Magnification support
- Alternative text for decorative images

**Security Considerations:**

**Authentication & Authorization:**

- JWT tokens stored in HTTP-only cookies via Supabase
- All API routes protected by Astro middleware
- Token validation on every request
- Automatic session refresh by Supabase SDK
- Redirect to login on 401 responses

**API Security:**

- All endpoints require authentication
- Authorization checks:
  - Delete: Verify sender_id matches authenticated user
  - Create: Sender_id automatically set from auth context
  - Self-kudo prevention at API level
- Input validation with Zod on client and server

**XSS Prevention:**

- React automatically escapes output
- No `dangerouslySetInnerHTML` usage
- Sanitize user input if any HTML rendering needed (not in MVP)

**CSRF Protection:**

- Supabase handles CSRF tokens automatically
- Same-origin policy enforced
- No state-changing GET requests

**Content Security Policy:**

- API responses include security headers:
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`
  - `X-XSS-Protection: 1; mode=block`
  - `Strict-Transport-Security: max-age=31536000`

**Rate Limiting:**

- not in MVP

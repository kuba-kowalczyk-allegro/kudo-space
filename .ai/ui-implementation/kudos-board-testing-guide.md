# Kudos Board - Manual Testing

This guide helps you manually test all features of the Kudos Board implementation.

## Prerequisites

1. Start Supabase: `npx supabase start`
2. Reset and seed database: `npx supabase db reset`
3. Start dev server: `npm run dev`
4. Open browser to `http://localhost:4321`

## Test Setup Summary

- **Delay added**: 2 seconds to all API calls (see skeleton loading states)
- **Page size**: 30 items per page (fills screen on all devices)
- **Seed data**: 30 kudos total (loads in single page for testing)

## Test Cases

### ✅ Test 1: Initial Load - Skeleton Cards

**What to test**: Verify skeleton loading state appears during initial data fetch

**Steps**:
1. Open the app or refresh the page
2. **Expected**: See 8 skeleton cards in a grid layout for 2 seconds
3. **Expected**: Skeleton cards show placeholder avatars, lines for names/messages
4. **Expected**: After 2 seconds, real kudos cards appear

**Status**: ✅ Works

---

### ✅ Test 2: Infinite Scroll - Load More

**What to test**: Verify infinite scroll triggers when more data is available

**Setup**: 
- 30 kudos in database
- Page size: 30 kudos per page
- For testing infinite scroll, you can temporarily add more kudos to seed.sql (e.g., 60 total)

**Steps (with 30 kudos in DB)**:
1. Load the page and wait for initial kudos to appear
2. **Expected**: All 30 kudos displayed (fills screen on all device sizes)
3. **Expected**: No loading indicator after initial load (all data loaded)

**Steps (with 60+ kudos in DB for testing infinite scroll)**:
1. Load the page and wait for initial kudos to appear
2. **Expected**: First 30 kudos displayed
3. Scroll down to the bottom of the page
4. **Expected**: When you reach the bottom, 4 skeleton cards appear
5. **Expected**: After 2 seconds, next 30 kudos load and appear
6. **Expected**: If more than 60 kudos exist, continue scrolling to load additional pages

**Status**: ✅ Works - Simple and effective

**Technical Details**: 
- Initial page size of 30 ensures screen is filled on all devices
- No complex viewport detection needed
- Clean infinite scroll for subsequent pages

---

### ✅ Test 3: Manual Refresh - Button & Spinner

**What to test**: Verify refresh button reloads data from the first page

**Steps**:
1. Load the page and wait for kudos to appear
2. Optionally scroll down to load more pages
3. Click the "Refresh" button in the header
4. **Expected**: Button shows spinning icon and text changes to "Refreshing..."
5. **Expected**: Button is disabled (not clickable) during refresh
6. **Expected**: After 2 seconds, kudos reload from page 1
7. **Expected**: Scroll position stays or resets appropriately
8. **Expected**: Button returns to normal "Refresh" state

**Status**: ✅ Works

---

### ✅ Test 4: Empty State - No Kudos

**What to test**: Verify friendly empty state when no kudos exist

**Setup Required**:
1. In `src/components/hooks/useInfiniteKudos.ts`, temporarily change line 2:
   ```typescript
   // Change from:
   import { fetchKudos } from "../../lib/services/kudos.client.ts";
   // To:
   import { fetchKudos } from "../../lib/services/mocks/kudos.client.mock-empty.ts";
   ```
2. Save and let the page reload

**Steps**:
1. Load the page
2. **Expected**: See 8 skeleton cards for 1 second
3. **Expected**: Empty state appears with:
   - Gift icon in a muted circle
   - "No kudos yet!" heading
   - Encouraging message: "Be the first to spread some appreciation! Create a kudo to recognize someone's awesome work."
   - "Refresh" button
4. Click the refresh button
5. **Expected**: Button shows "Refreshing..." for 1 second
6. **Expected**: Empty state persists (since mock always returns empty)

**Cleanup**: Change the import back to `kudos.client.ts` after testing

**Status**: ✅ Works

---

### ✅ Test 5: Error Handling - API Failure

**What to test**: Verify error banner displays when API calls fail

**Setup Required**:
1. In `src/components/hooks/useInfiniteKudos.ts`, temporarily change line 2:
   ```typescript
   // Change from:
   import { fetchKudos } from "../../lib/services/kudos.client.ts";
   // To:
   import { fetchKudos } from "../../lib/services/mocks/kudos.client.mock-error.ts";
   ```
2. Save and let the page reload

**Steps**:
1. Load the page
2. **Expected**: See 8 skeleton cards for 1.5 seconds
3. **Expected**: Error banner appears at the top with:
   - Red/destructive border and background
   - Error icon (circle with exclamation mark)
   - "Error loading kudos" heading
   - Error message: "Failed to connect to the database. Please try again later."
   - Error code: "INTERNAL_ERROR"
4. **Expected**: Empty state appears below error banner (no kudos loaded)
5. Click the "Refresh" button
6. **Expected**: Error persists after refresh (since mock always errors)

**Cleanup**: Change the import back to `kudos.client.ts` after testing

**Status**: ✅ Works

---

### ✅ Test 6: Delete Button - Owner Only

**What to test**: Verify delete button only appears for kudos sent by the current user

**Setup**: 
- Seed data includes kudos from Alice (ID: `2f2f8f84-70d1-4fae-9b9b-4d1f4f08c5f5`)
- For now, `currentUserId` is undefined (no auth), so no delete buttons show

**Current Behavior** (No Authentication):
1. Load the page
2. **Expected**: NO delete buttons visible on any kudo cards
3. **Expected**: All cards display sender → recipient flow, message, timestamp

**Testing with Mock User ID**:
1. In `src/pages/index.astro`, temporarily change line 7:
   ```astro
   <!-- Change from: -->
   <KudosBoard client:load />
   <!-- To: -->
   <KudosBoard client:load currentUserId="2f2f8f84-70d1-4fae-9b9b-4d1f4f08c5f5" />
   ```
2. Save and reload
3. **Expected**: Delete buttons (trash icon) appear on kudos sent by Alice
4. **Expected**: NO delete buttons on kudos sent by Bob or Carol
5. Click a delete button
6. **Expected**: Console logs: "Delete kudo: [kudo-id]"
7. **Expected**: Nothing else happens (actual delete not implemented yet)

**Cleanup**: Remove the `currentUserId` prop after testing

**Status**: ✅ Ready to test (TODO comment in place for future implementation)

---

## Additional Visual Checks

### Responsive Design
- **Mobile** (< 640px): 1 column grid
- **Tablet** (640px - 1024px): 2 columns
- **Desktop** (1024px - 1280px): 3 columns
- **XL screens** (> 1280px): 4 columns

### Accessibility
- Use keyboard Tab to navigate between cards and buttons
- Use Enter/Space to activate buttons
- Screen reader should announce kudo content and actions

### Styling
- Sticky header with backdrop blur
- Cards have consistent padding and shadows
- Avatars show initials when image unavailable
- Relative timestamps ("2 hours ago", "just now", etc.)
- Delete button has destructive (red) styling

---

## Cleanup After Testing

**Remove testing modifications**:

1. Remove 2-second delay in `src/components/hooks/useInfiniteKudos.ts`:
   ```typescript
   // Remove these lines (around line 103-104):
   // TODO: Remove this delay after testing - adds 2s delay to see loading states
   await new Promise((resolve) => setTimeout(resolve, 2000));
   ```

2. Restore page size in `src/components/KudosBoard.tsx` (if changed for testing):
   ```typescript
   // Production default is 30 for good initial load:
   const { items, ... } = useInfiniteKudos(30, currentUserId);
   ```

3. (Optional) Keep the 30 kudos in `seed.sql` or add more for infinite scroll testing

4. Delete mock files if no longer needed:
   - `src/lib/services/kudos.client.mock-empty.ts`
   - `src/lib/services/kudos.client.mock-error.ts`

---

## Test Results Checklist

- [ ] Initial load shows skeleton cards
- [ ] Infinite scroll loads additional pages
- [ ] Manual refresh button works with spinner
- [ ] Empty state displays correctly
- [ ] Error banner shows API failures
- [ ] Delete button visible only for user's own kudos
- [ ] Delete button logs to console (actual delete TODO)
- [ ] Responsive grid layout works
- [ ] All interactions are keyboard accessible
- [ ] Relative timestamps display correctly

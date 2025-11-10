# View Implementation Plan – Kudos Board

## 1. Overview

The Kudos Board view at `/` presents the kudos feed, allowing users to browse kudos in reverse chronological order, trigger manual refreshes, and seamlessly load additional entries as they scroll.

## 2. View Routing

- Path: `/`
- Astro entry point: `src/pages/index.astro` mounting the interactive board via a React island (`<KudosBoard client:load />`).

## 3. Component Structure

- `KudosBoard` (React island root)
  - `AppHeader`
    - `ManualRefreshButton`
  - `main` container
    - conditional `EmptyState`
    - `KudoGrid`
      - repeated `KudoCard`
      - trailing `KudoSkeleton` rows (while loading)
      - sentinel `<div>` for intersection observer

## 4. Component Details

### KudosBoard

- Component description: Root interactive container managing data fetching, state, and orchestration of header, grid, and empty/loading states.
- Main elements: `<div>` wrapper, `<AppHeader />`, `<main>` with grid or empty state, sentinel `<div>`.
- Handled interactions: triggers manual refresh, initializes infinite scroll observer, delegates delete events to API service (future integration).
- Handled validation: ensures fetched kudos sort descending by `created_at`; clamps pagination params within API contract; filters duplicates by `id`.
- Types: `KudoViewModel`, `UseInfiniteKudosState`, `KudoListResponseDTO`.
- Props: none (fetches data internally based on authenticated session).

### AppHeader

- Component description: Sticky header presenting page title, session actions, and refresh control slot.
- Main elements: `<header>` with sticky positioning, heading, optional user avatar, refresh button slot.
- Handled interactions: forwards refresh click to parent callback; optional logout link.
- Handled validation: disables refresh button when `isRefreshing` true.
- Types: `AppHeaderProps` with `onRefresh: () => void`, `isRefreshing: boolean`.
- Props: `onRefresh`, `isRefreshing`, optional `userName`, `userAvatarUrl` (if surfaced).

### ManualRefreshButton

- Component description: Accessible button component indicating refresh state and triggering refetch.
- Main elements: `<button>` styled with Tailwind/shadcn, optional spinner icon.
- Handled interactions: `onClick` fires refresh callback; keyboard activation accessible.
- Handled validation: `disabled` when loading.
- Types: `ManualRefreshButtonProps` (`onClick`, `disabled`).
- Props: `onClick`, `disabled`.

### KudoGrid

- Component description: Responsive grid layout rendering kudos plus loading placeholders and scroll sentinel.
- Main elements: `<section role="feed">`, CSS grid for cards, sentinel `<div ref>` for intersection observer.
- Handled interactions: attaches observer to sentinel to request more data, exposes delete callback; uses keyboard focus management when new data appended.
- Handled validation: ensures `kudos` array sorted; only renders sentinel if `hasMore` true; hides delete disabled state for non-owners via `canDelete` flag.
- Types: `KudoGridProps` with `kudos: KudoViewModel[]`, `hasMore: boolean`, `isLoadingMore: boolean`, `onLoadMore: () => void`, `onDeleteKudo: (id: string) => void`.
- Props: as above.

### KudoCard

- Component description: Card UI showing sender, recipient, message, timestamp, and optional delete control.
- Main elements: `<article role="article">`, header with avatars/names, `<p>` message, `<time>` element, delete `<button>` if `canDelete`.
- Handled interactions: click delete triggers confirm modal/popup or inline confirm; future expansion for AI editing.
- Handled validation: displays fallback avatar initials if missing URL; hides delete for `canDelete === false`.
- Types: `KudoCardProps` derived from `KudoViewModel` plus handlers.
- Props: `kudo: KudoViewModel`, `onDelete: (id: string) => void`.

### KudoSkeleton

- Component description: Placeholder shimmer representing loading card slots.
- Main elements: `<div>` with skeleton classes shaped like card; repeated to fill row.
- Handled interactions: none.
- Handled validation: only rendered when `isLoading` true.
- Types: `KudoSkeletonProps` optional `count`.
- Props: none.

### EmptyState

- Component description: Friendly state when no kudos available.
- Main elements: `<section role="status">` with icon/illustration, message, optional call to action.
- Handled interactions: optional refresh button reuse.
- Handled validation: only shown when `!isLoadingInitial && kudos.length === 0`.
- Types: `EmptyStateProps` (`message`, `onRefresh?`).
- Props: `message`, optional `onRefresh`, `isRefreshing`.

## 5. Types

- `KudoViewModel`:
  - `id: string`
  - `message: string`
  - `createdAtISO: string`
  - `createdAtRelative: string`
  - `sender: KudoPersonViewModel`
  - `recipient: KudoPersonViewModel`
  - `canDelete: boolean`
- `KudoPersonViewModel`:
  - `id: string`
  - `displayName: string`
  - `avatarUrl?: string | null`
  - `email: string`
- `UseInfiniteKudosState`:
  - `items: KudoViewModel[]`
  - `isInitialLoading: boolean`
  - `isLoadingMore: boolean`
  - `isRefreshing: boolean`
  - `error: ErrorState | null`
  - `hasMore: boolean`
  - `pagination: { limit: number; offset: number; total?: number }`
- `ErrorState`:
  - `code: ErrorCode`
  - `message: string`
  - `details?: ErrorDetails`
- `FetchKudosParams`:
  - `limit?: number`
  - `offset?: number`

## 6. State Management

- Introduce custom hook `useInfiniteKudos(limit = 20)` managing fetch lifecycle with `useState` and `useEffect`.
- Hook responsibilities: initial fetch on mount, providing `loadMore`, `refresh`, deduplicating data, updating pagination, exposing loading/error flags.
- Internal state: `items`, `pagination`, `status flags`, `error`, `abortController` for canceling inflight requests when refreshing.
- Hook consumed by `KudosBoard` which passes derived props down to presentation components.

## 7. API Integration

- Request: `GET /api/kudos?limit=<number>&offset=<number>` using `fetch` with `credentials: "same-origin"` for auth cookies.
- Response types: `KudoListResponseDTO` parsed with runtime guard (optional Zod schema mirroring backend) then mapped to `KudoViewModel`.
- Error handling: parse JSON error to `ErrorResponseDTO`; on 401 trigger auth flow (redirect or message); handle network errors via try/catch.
- Pagination: use `pagination.total` to determine `hasMore` (`offset + data.length < total`).

## 8. User Interactions

- Manual refresh button click: calls `refresh`, disables button, shows skeleton, resets scroll sentinel.
- Infinite scroll: intersection observer triggers `loadMore` when sentinel visible and `hasMore && !isLoadingMore`.
- Delete button on cards (future): prompts confirmation; on success remove card, on failure display error toast.
- Keyboard/assistive interactions: header button focusable, sentinel visually hidden.

## 9. Conditions and Validation

- Pagination params: ensure `limit` within [1, 100]; fallback to default on invalid user input.
- Sorting: enforce descending order by `created_at` when mapping response.
- Delete control: render only if `kudo.canDelete` true (sender matches current user ID from session context).
- Empty state: shown when no items after fetch and not loading.
- Loading skeleton: visible when `isInitialLoading || isLoadingMore`.

## 10. Error Handling

- Network/API errors: surface banner/toast in `KudosBoard`, log to console, allow retry via refresh.
- 401 Unauthorized: redirect to login or display message with login CTA.
- 400 Invalid parameters: reset pagination and retry with defaults.
- 500 Internal error: display error message and keep existing data intact; allow manual retry.
- Abort fetch on unmount or refresh to avoid state updates on unmounted components.

## 11. Implementation Steps

1. Scaffold `src/components/KudosBoard.tsx` as React component exported for Astro island usage.
2. Implement supporting components (`AppHeader`, `ManualRefreshButton`, `KudoGrid`, `KudoCard`, `KudoSkeleton`, `EmptyState`) within `src/components` or `src/components/ui` as appropriate.
3. Define new types in `src/types.ts` or dedicated `src/types/kudos.ts` and export for reuse.
4. Build `useInfiniteKudos` hook in `src/components/hooks/useInfiniteKudos.ts` handling fetch logic, pagination, and state exposure.
5. Create API helper in `src/lib/services/kudos.service.ts` (frontend counterpart) to call `/api/kudos` with appropriate typing.
6. Integrate hook into `KudosBoard`, mapping DTOs to view models, wiring refresh and load more.
7. Add intersection observer in `KudoGrid` (using `useEffect` and `useRef`) to call `onLoadMore` when sentinel enters viewport.
8. Style components with Tailwind/shadcn to match design requirements, ensuring responsive grid and accessible focus states.
9. Update `src/pages/index.astro` to import and render `<KudosBoard client:load />`, ensuring header remains sticky.
10. Test scenarios: initial load, manual refresh, infinite scroll with multiple pages, empty state, error states (mock failed fetch), 401 handling.

## 12. Additional info

Right now only the GET /api/kudos endpoint is implemented, so leave the delete button mocked. Same for other endpoints.

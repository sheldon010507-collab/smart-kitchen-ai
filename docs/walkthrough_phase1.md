# Phase 1: Infrastructure Foundations Walkthrough

> **Goal**: Establish the architectural foundation (Context & Router) to support the "Strangler Fig" migration of the legacy `App.tsx`.

## 1. BusinessContext Refactoring

We lifted the business logic and state management out of `App.tsx` and into a self-contained `BusinessProvider`.

- **Decoupling**: `BusinessProvider` no longer relies on props from `App.tsx`. It consumes `AuthContext` directly.
- **State Management**: It now manages `businesses`, `staff`, and `currentBusinessId` internally.
- **Type Safety**: Resolved type conflicts between Supabase `User` and App `User` (`AppUser`).
- **Tests**: Created `tests/lib/BusinessContext.test.tsx` verifying:
  - Data loading for Managers.
  - Proper state initialization.

## 2. React Router Integration

We introduced Client-Side Routing to enable the gradual migration of views.

- **Infrastructure**: Installed `react-router-dom` and wrapped the app in `BrowserRouter`.
- **Legacy Route**: Created `AppRoutes.tsx` with a catch-all route (`/*`) rendering the legacy `App` component.
- **Integration**: Updated `index.tsx` to nest Providers correctly:
  `Auth -> Business -> Inventory -> Router -> App`
- **Tests**: Created `tests/Router.smoke.test.tsx` verifying:
  - Root path renders Legacy App.
  - Unknown routes fallback to Legacy App.

## 3. Verification Results

All tests passed successfully:

- `tests/lib/BusinessContext.test.tsx`: **PASS**
- `tests/Router.smoke.test.tsx`: **PASS**
- `tests/App.smoke.test.tsx`: **PASS** (Ensuring no regression in Legacy App isolated render)

## Next Steps (Phase 2)

We are now ready to start migrating components one by one.

1. **Migrate Public Pages**: Move Login/Register to dedicated routes (`/login`).
2. **Migrate Dashboard**: Create `/dashboard` route and move dashboard logic.
3. **Migrate Inventory**: Create `/inventory` route.

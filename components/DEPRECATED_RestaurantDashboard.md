# DEPRECATED - Use features/operations/OperationsPage.tsx instead

This component has been replaced by a redesigned architecture following first principles:

**New Location:** `features/operations/OperationsPage.tsx`

**Why deprecated:**
- Violated Single Responsibility Principle (4 tabs in one component)
- Props drilling (13+ props)
- Mixed data sources (props + direct Supabase calls)
- Poor testability

**Migration:**
Import `OperationsPage` from `features/operations` instead.

```tsx
// Old (deprecated)
import RestaurantDashboard from './components/RestaurantDashboard';

// New
import { OperationsPage } from './features/operations';
```

---

This file will be removed in a future commit after complete migration verification.

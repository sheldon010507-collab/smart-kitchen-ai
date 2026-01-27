# App.tsx State Audit

> Generated during Phase 0.3 of Codebase Optimization Plan.

## Global State Variables

| State Variable | Type | Initial Value | Usage Analysis | Migration Plan |
|----------------|------|---------------|----------------|----------------|
| `user` | `User \| null` | `null` | Used globally for auth & role. | Move to `AuthContext` or keep in `BusinessContext` if tightly coupled. |
| `businesses` | `Business[]` | `[]` | List of accessible businesses. | Move to `BusinessContext`. |
| `currentBusinessId` | `string \| null` | `null` | Active business ID. | Move to `BusinessContext`. |
| `view` | `ViewState` | `DASHBOARD` | Controls main content rendering. | **REPLACE with React Router routes.** |
| `staff` | `Staff[]` | `[]` | Fetched data. | Move to `BusinessContext` or separate `StaffContext`. |
| `shifts` | `Shift[]` | `[]` | Fetched data. | Move to `BusinessContext` or `ShiftContext`. |
| `menu` | `MenuItem[]` | `[]` | Fetched data. | Move to `BusinessContext` or `MenuContext`. |
| `prepTasks` | `PrepTask[]` | `[]` | Fetched data. | Move to `BusinessContext` or `PrepContext`. |

## UI State (Modals & Toggles)

| State Variable | Replacement Strategy |
|----------------|----------------------|
| `isScannerOpen` | Move to `GlobalModalContext` or URL hash/query. |
| `scannerMode` | URL query param? Or local state in Scanner Modal. |
| `isEditModalOpen` | `GlobalModalContext`. |
| `editingItem` | `GlobalModalContext`. |
| `isBusinessDropdownOpen` | Local state in `DesktopSidebar` / `MobileHeader` (Prop drilled currently). |
| `isMetaManagerOpen` | `GlobalModalContext`. |
| `metaTab` | Local state in Modal. |
| `metaNewValue` | Local state in Modal. |
| `isStoreModalOpen` | `GlobalModalContext`. |
| `editingBusiness` | `GlobalModalContext`. |
| `isJoinStoreModalOpen` | `GlobalModalContext`. |
| `joinStoreCode` | Local state in Modal. |
| `joinStoreNameAlias` | Local state in Modal. |
| `inventorySearchQuery` | URL query param (search params). |
| `wastageItem` | `GlobalModalContext`. |
| `isSetupWizardOpen` | URL route (`/setup`) or Modal. |
| `showTemplateOnboarding` | Local state or User Preference. |

## Refs & Effects

- `modalStatesRef`: Used for `popstate` handling (Back button closes modals).
  - **Plan**: React Router handles this naturally. If using specific routes for modals (e.g. `/inventory/scan`), back button works OOTB.
- `useEffect` (Sanitize Storage): Keep in `App` or move to `AuthProvider`.
- `useEffect` (Load Data): Move to `BusinessContext`.

## Dependencies

- Uses `useInventoryContext`: `inventory`, `setInventory` (deprecated).
- Uses `useBusinessHandlers`: Handles most logic.
- Uses `useShoppingListSummary`.

## Conclusion

`App.tsx` acts as a massive "Controller".
**Phase 1** must establish `BusinessContext` to take over `businesses`, `currentBusinessId`, and data fetching (`staff`, `menu`, etc.).
**Phase 1.2** (Router) will replace `view` state.
**Phase 2** will migrate components to read from `BusinessContext` instead of props.

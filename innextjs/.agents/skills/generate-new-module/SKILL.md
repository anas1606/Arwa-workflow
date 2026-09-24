---
name: generate-new-module
description: >-
  Use this skill whenever the user asks to create, build, or generate a new module, 
  feature, or component (e.g., "create a new product module"). It enforces the strict 
  folder structure, Next.js Pages router setup, Glassmorphism UI design, Common Components 
  (Table, Pagination), and API/Prisma standards that must be followed.
---

# Module Generation Workflow

When the user asks to create a new module, you MUST follow these exact steps and guidelines.

## 1. Folder & File Structure

Every new module requires exactly 3 main components. Do not deviate from this structure:

1. **Pages Wrapper (`src/pages/[module]/index.js`)**: A simple file that imports and returns the main UI component.
2. **Main UI Component (`src/components/[module]/[ModuleName].jsx`)**: The heavy React component containing state, UI layout, and API calls.
3. **Backend API (`src/pages/api/v1/[module]/index.js`)**: The Next.js API route using Prisma to fetch/mutate data.
4. **Modals (`src/components/[module]/modal/`)**: Any Add/Edit/Delete modals for this module must go here (e.g., `Add[Module].jsx`, `Edit[Module].jsx`).

*Note: Use `.jsx` for React components and `.js` for API routes and Pages wrappers.*

## 2. UI Layout & Design Architecture

The UI MUST exactly match the project's standard layout shown in existing modules. The Main UI Component must be structured top-to-bottom as follows:

1. **Page Container**: 
   - Use `<div className="app-page-bg min-h-screen">` (or similar global wrapper) to maintain the animated gradient background.
2. **Header Section**:
   - Title and Subtitle on the left.
   - Primary Action Button (e.g., `+ Add [Item]`) on the right using `@/common/buttons/Button`.
3. **Statistics Cards (Top Row)**:
   - 4 glassmorphism cards (`className="card-panel"`) displaying key metrics horizontally.
4. **Search & Filter Bar**:
   - A row containing the Search Input (`@/common/input/Input` with a search icon) and any dropdown filters (e.g., Region filter).
5. **Keyboard Shortcuts Bar**:
   - Immediately below the search bar, include the `<KeyboardShortcutBar />` component (imported from `@/common/KeyboardShortcut`).
6. **Data Table**:
   - Use the `<CommonTable />` component (imported from `@/common/table/CommonTable`) to display the data.
   - Ensure the table has an Action column (three dots) for Edit/Delete operations.
7. **Pagination**:
   - Implement standard pagination state (`page`, `limit`, `total`, `totalPages`).
   - The UI should have a footer showing "Showing X of Y" and page controls (usually handled by or placed next to `<CommonTable />`).

## 3. Styling & CSS Rules (Glassmorphism)

- **NEVER use standard solid backgrounds** for main panels. Always wrap content areas, cards, and modals in `<div className="card-panel">` to apply the project's glassmorphism theme (`var(--glass-bg)`, `var(--glass-blur)`).
- **Icons**: Always use `lucide-react` for icons (e.g., `Search`, `Plus`, `Pencil`, `Trash2`).
- **Colors & Classes**: Rely on the variables defined in `src/styles/globals.css`.

## 4. State Management, Permissions & Utilities

- **Frontend Route Protection**: You MUST update `ROUTE_PERMISSIONS` in `src/components/layout/Layout.jsx` to map the new page path to its `module_key`. This is what prevents unauthorized users from rendering the page.
- **Action Permissions**: Inside the component, use the custom hook `const { canCreate, canUpdate, canDelete } = usePermission('[module]');` to conditionally render Add/Edit/Delete buttons.
- **Shortcuts Hook**: You MUST use `useKeyboardShortcuts({ onAdd: canCreate ? ... : undefined, onEdit: ... });` to map keyboard commands to modal states.
- **Data Fetching**: Abstract API calls (GET, POST, PUT, DELETE) into `src/lib/fetcher.js` (or similar fetcher pattern). Use `useState` and `useEffect` to load data into the table.
- **Loading State**: ALWAYS use Skeleton UI elements (e.g. `animate-pulse` placeholder blocks) while fetching data, rather than simple "Loading..." text.

## 5. Backend API & Database

- **Prisma**: Use Prisma (`import prisma from '@/lib/prisma'`) inside `src/pages/api/v1/[module]/index.js`.
- **Response Format**: Wrap all database calls in `try/catch` and return standard JSON formats:
  - Success: `res.status(200).json({ success: true, message: "Fetched successfully", data: { data: result, pagination: { total, page, limit, totalPages } } })`
  - Error: `res.status(500).json({ success: false, message: error.message })`
- **Pagination**: Implement `.skip()` and `.take()` in Prisma queries based on `pageNo` and `pageSize` query params.
- **RBAC Middleware Update**: You MUST update `src/middleware.js` by adding the new route to the `moduleMap` object (e.g., `'/api/v1/[module]': '[module_key]'`). This is critical to enforce API security.

## Execution Steps

When generating a module, follow these steps in order:
1. Analyze the requested module's data model.
2. Update `src/middleware.js` to register the new module in the `moduleMap` for API RBAC.
3. Update `src/components/layout/Layout.jsx` to register the new route in `ROUTE_PERMISSIONS` for UI RBAC.
4. Create the Backend API route (`src/pages/api/v1/...`).
5. Create the Main UI Component (`src/components/...`) following the strict top-to-bottom layout (Header -> Stats -> Search -> Shortcuts -> Table -> Pagination).
6. Create the Modals (Add/Edit).
7. Create the Pages wrapper (`src/pages/...`).

# CampusHub Frontend

Vue 3 + Vite frontend for the CampusHub school management system demo. The app uses Pinia, Vue Router, Bootstrap 5, Bootstrap Icons, Chart.js, Axios, and Vitest.

## Implemented modules

| Route            | Module             | Data source                         | Notes                                                                                                           |
| ---------------- | ------------------ | ----------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `/dashboard`     | Dashboard          | Mixed                               | Live API stats/charts/recent registrations where configured; some demo schedule/activity data remains local.    |
| `/students`      | Students           | API-first with local fallback       | Server-backed directory with search/filter/sort/pagination; falls back to local demo data when API unavailable. |
| `/teachers`      | Teachers           | API                                 | Server-backed faculty directory with CRUD, search/filter/sort/pagination.                                       |
| `/departments`   | Departments        | API                                 | Server-backed department directory; delete conflicts surfaced from API.                                         |
| `/courses`       | Courses            | Local browser storage               | Frontend-only catalog stored in `localStorage`; recovery and persistence status handling.                       |
| `/subjects`      | Subjects           | Local browser storage               | Frontend-only curriculum subject definitions.                                                                   |
| `/semesters`     | Semesters          | Local browser storage               | Frontend-only academic calendar/active term management.                                                         |
| `/sections`      | Class Sections     | Local browser storage               | Frontend-only class sections linked to local subject/teacher/semester data.                                     |
| `/enrollment`    | Enrollment         | Local browser storage               | Frontend-only enrollment records with local capacity estimates.                                                 |
| `/attendance`    | Attendance         | Local browser storage               | Frontend-only attendance register based on local enrollment records.                                            |
| `/grades`        | Grades & GPA       | Local browser storage               | Frontend-only weighted grades, letter grades, GPA, grading scale.                                               |
| `/payments`      | Tuition & Payments | Local browser storage               | Frontend-only tuition assessments, payments, balances, receipts/history.                                        |
| `/reports`       | Reports            | Frontend-derived/local + store data | Frontend report summaries, filters, CSV export, print layout.                                                   |
| `/notifications` | Notifications      | Local browser storage               | Frontend-only inbox with read/unread, mark read/all read, persistence.                                          |
| `/users`         | User Management    | Local browser storage               | Frontend-only demo user directory; no real auth/security enforcement.                                           |
| `/settings`      | Settings           | Local browser storage               | Frontend-only interface preferences (sidebar default, table density), reset/defaults.                           |
| `*`              | Not Found          | Static                              | 404 page for unknown routes.                                                                                    |

## Data sources and limitations

- **API-backed modules** use the Axios client in `src/api/client.js`. Base URL comes from `VITE_API_BASE_URL` (see `.env.development`); fallback is `http://localhost:8081`.
- **Local-first modules** persist versioned records in browser `localStorage`, include safe read/write/recovery handling, and are not synced to the CampusHub server.
- **No real authentication/authorization** is implemented. User Management is a demo directory; sign-out is a demo-only message.
- **No backend/database changes** are made by this frontend for local-first modules.
- **Browser behavior is not automatically verified in CI/CLI here**; unit tests, lint, format check, and build are the primary automated checks.

## Development

```bash
npm install
npm run dev
```

Vite dev server runs on `http://localhost:5174` (configured for backend CORS expectations).

## Checks and build

```bash
npm run lint            # ESLint
npm run lint:fix        # ESLint with fixes
npm run format          # Prettier write (all supported files)
npm run format:check    # Prettier check (scoped: tests/**/*.js, *.config.js, package.json)
npm run format:check:all # Prettier check across repository
npm run test:unit       # Vitest unit tests (run once)
npm run test:watch      # Vitest watch mode
npm run build           # Production build
npm run check           # lint + scoped format:check + test:unit + build
```

## Project structure

```text
src/
  api/          Axios client and API services (dashboard, students, teachers, departments, attendance)
  components/   Shared UI and feature components (layout, common, module-specific forms/tables/modals)
  composables/  Reusable composition helpers (e.g., toast)
  constants/    Shared constants
  data/         Demo/navigation data
  layouts/      App shell layout
  router/       Vue Router routes and metadata
  stores/       Pinia stores (API-backed and local-first modules)
  utils/        Validation, normalization, storage, formatting, report helpers
  views/        Route views
tests/
  unit/         Vitest unit tests for stores, utils, views, and components
```

## Key shared components

- `AppLayout`, `AppSidebar`, `AppTopbar` - application shell, navigation, search, notifications, account menu.
- `BaseModal`, `ConfirmDialog`, `ToastStack` - accessible modal/dialog/toast primitives.
- `PageHeader`, `StatCard`, `SearchField`, `FilterSelect`, `PaginationBar`, `EmptyState`, `StatusBadge` - common UI patterns.
- Local-first stores/utilities follow a consistent pattern: versioned storage key, sanitize/normalize, recovery, unavailable/failed persistence states, retry.

## Backend integration notes

- For API-backed modules, run the CampusHub backend and required MySQL schema/migrations as documented by the backend project.
- `.env.development` sets `VITE_API_BASE_URL=http://localhost:8081`.
- Dashboard and directory modules depend on backend availability; local-first modules work without backend.

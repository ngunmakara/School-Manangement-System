# campushub-frontend

Vue 3 + Vite frontend for the CampusHub school management system. The live API
modules cover the dashboard, students, teachers, and departments. Class
sections, courses, subjects, and semesters are frontend-only modules that store
records in browser `localStorage` (no backend API calls or server persistence).
The app uses Pinia for state, Bootstrap 5 for styling, and Chart.js for
dashboard charts.

## Run and checks

```bash
npm install

# Development
npm run dev            # start Vite dev server (http://localhost:5174)

# Production build
npm run build          # production build in dist/

# Checks
npm run lint           # ESLint
npm run format:check   # Prettier check (scoped: tests/**/*.js, *.config.js, package.json)
npm run test:unit      # Vitest unit tests (run once)

# Combined check script (lint + scoped format check + unit tests + build)
npm run check
```

Notes:
- `npm run format:check` is intentionally scoped; the broader `npm run format:check:all` script exists but is not part of the default check flow.
- Run checks from `D:\campushub-frontend` after `npm install`. No dependency installation or upgrade is required for routine checks.

## Backend integration

The student, teacher, and department directories talk to the Spring Boot REST API
in `../campushub-backend` (see the backend setup notes for run commands and the
required database schema).

- The axios client base URL comes from `VITE_API_BASE_URL` (see
  `.env.development`, which uses `http://localhost:8081`; the client fallback is
  also `http://localhost:8081`).
- Vite is configured to run on `http://localhost:5174` because the backend CORS
  configuration allows that origin.
- Dashboard statistics include student totals, teacher totals, and department
  counts from the API. Department distribution, recent student registrations,
  the monthly enrollment trend, and today's attendance summary are also loaded
  from the API. The recent-registrations card requests a newest-first
  `createdAt` sort and falls back to the API's first page if that sort is not
  supported. Schedule and activity remain demo data.
- The enrollment trend is aggregated from `students.enrollment_date` by month for
  the current and previous academic years. The dashboard attendance overview uses
  the attendance summary endpoint, and both charts show loading, error, retry, and
  empty states instead of fabricated numbers.
- The student directory uses server-side pagination, search, department/status
  filtering, and sorting. Its summary cards load totals from
  `/api/students/summary`, and the directory refreshes both the page and summary
  after create, edit, and delete.
- Students fall back to the previous localStorage-based demo directory if the API
  is unreachable. Teachers and departments are API-only and show an error banner
  with a retry button when the server is unavailable.
- Class sections, courses, subjects, and semesters persist to versioned browser
  `localStorage` keys and report unavailable, failed, or recovered storage
  states in the UI. Records are managed in this browser only (not synced to the
  CampusHub server).
- Class sections organize offerings by subject, teacher, semester, room,
  schedule, and capacity in browser storage.
- Courses maintain catalog records (code, title, department, credits, status,
  description) in browser storage. Courses are not linked to semesters in the
  current model.
- The sidebar and dashboard read the active semester from the semesters store.
  The dashboard's Courses statistic is derived from the local browser catalog
  (no API request).
- Create, edit, and delete for API-backed modules go through the API; server
  validation errors (HTTP 400), duplicate conflicts (HTTP 409), and department
  deletion conflicts are shown inline or reported with a toast.
- Run `database/milestone5-schema.sql` and then
  `database/milestone4-attendance.sql` in MySQL before starting the backend, since
  Hibernate is configured with `ddl-auto=validate`.

## Project structure

```
src/
├── api/         axios client + student, teacher, department, attendance, dashboard services
├── components/  UI components (common, layout, students, teachers, departments, sections, courses, subjects, semesters, dashboard)
├── composables/ useToast
├── data/        demo/navigation data
├── layouts/     AppLayout
├── router/      routes
├── stores/      Pinia stores (students, teachers, departments, sections, courses, subjects, semesters)
├── utils/       student, teacher, department, section, course, subject, semester helpers/validation
└── views/       Dashboard, Students, Teachers, Departments, Sections, Courses, Subjects, Semesters, module placeholders
```

Learn more about IDE Support for Vue in the [Vue Docs Scaling up Guide](https://vuejs.org/guide/scaling-up/tooling.html#ide-support).

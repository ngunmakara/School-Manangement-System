# campushub-frontend

Vue 3 + Vite frontend for the CampusHub school management system (dashboard,
student directory, teachers, and departments). Uses Pinia for state, Bootstrap 5
for styling, and Chart.js for dashboard charts.

## Run

```bash
npm install
npm run dev      # http://localhost:5174
npm run build    # production build in dist/
```

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
  from the API. Schedule and activity remain demo data.
- The enrollment trend is aggregated from `students.enrollment_date` by month for
  the current and previous academic years. The dashboard attendance overview uses
  the attendance summary endpoint, and both charts show loading, error, retry, and
  empty states instead of fabricated numbers.
- Students fall back to the previous localStorage-based demo directory if the API
  is unreachable. Teachers and departments are API-only and show an error banner
  with a retry button when the server is unavailable.
- Create, edit, and delete go through the API; server validation errors (HTTP 400),
  duplicate conflicts (HTTP 409), and department deletion conflicts are shown
  inline or reported with a toast.
- Run `database/milestone5-schema.sql` and then
  `database/milestone4-attendance.sql` in MySQL before starting the backend, since
  Hibernate is configured with `ddl-auto=validate`.

## Project structure

```
src/
├── api/         axios client + student, teacher, department, attendance, dashboard services
├── components/  UI components (common, layout, students, teachers, departments, dashboard)
├── composables/ useToast
├── data/        demo/navigation data
├── layouts/     AppLayout
├── router/      routes
├── stores/      Pinia stores (students, teachers, departments)
├── utils/       student, teacher, department helpers/validation
└── views/       Dashboard, Students, Teachers, Departments, module placeholders
```

Learn more about IDE Support for Vue in the [Vue Docs Scaling up Guide](https://vuejs.org/guide/scaling-up/tooling.html#ide-support).

# campushub-frontend

Vue 3 + Vite frontend for the CampusHub school management system (dashboard and
student directory). Uses Pinia for state, Bootstrap 5 for styling, and Chart.js
for dashboard charts.

## Run

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build in dist/
```

## Backend integration

The student directory talks to the Spring Boot REST API in `../campushub-backend`
(see its README for setup and run commands).

- The axios client base URL comes from `VITE_API_BASE_URL` (see
  `.env.development`, defaults to `http://localhost:8080`).
- On load, the store fetches students from the API. If the API is unreachable it
  falls back to the previous localStorage-based demo directory and shows a
  banner with a retry button — nothing is overwritten either way.
- Create, edit, and delete go through the API when connected; server validation
  errors (HTTP 400) and duplicate conflicts (HTTP 409) are shown inline in the
  form using the same messages as the client-side validation.

## Project structure

```
src/
├── api/         axios client + student service
├── components/  UI components (common, layout, students, dashboard)
├── composables/ useToast
├── data/        demo/navigation data
├── layouts/     AppLayout
├── router/      routes
├── stores/      Pinia stores (students)
├── utils/       student helpers/validation
└── views/       Dashboard, Students, module placeholders
```

Learn more about IDE Support for Vue in the [Vue Docs Scaling up Guide](https://vuejs.org/guide/scaling-up/tooling.html#ide-support).

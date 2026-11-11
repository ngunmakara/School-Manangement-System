import { createRouter, createWebHistory } from 'vue-router'
import DashboardView from '../views/DashboardView.vue'

const moduleView = () => import('../views/ModulePlaceholderView.vue')
const StudentsView = () => import('../views/StudentsView.vue')
const NotFoundView = () => import('../views/NotFoundView.vue')

const routes = [
  {
    path: '/',
    component: () => import('../layouts/AppLayout.vue'),
    children: [
      {
        path: '',
        redirect: { name: 'dashboard' },
      },
      {
        path: 'dashboard',
        name: 'dashboard',
        component: DashboardView,
        meta: {
          title: 'Dashboard',
          group: 'Overview',
        },
      },
      {
        path: 'students',
        name: 'students',
        component: StudentsView,
        meta: {
          title: 'Students',
          group: 'Academics',
          icon: 'bi-people',
        },
      },
      {
        path: 'teachers',
        name: 'teachers',
        component: moduleView,
        meta: {
          title: 'Teachers',
          group: 'Academics',
          icon: 'bi-person-video3',
          description:
            'Maintain faculty profiles, department assignments, specializations, and employment status.',
          milestone: 3,
          features: [
            'Faculty directory',
            'Department filtering',
            'Add, edit, and delete',
            'Specialization records',
            'Active / inactive states',
          ],
        },
      },
      {
        path: 'departments',
        name: 'departments',
        component: moduleView,
        meta: {
          title: 'Departments',
          group: 'Academics',
          icon: 'bi-building',
          description:
            'Organize academic departments, department codes, leadership, and descriptions.',
          milestone: 3,
          features: [
            'Department directory',
            'Head of department',
            'Department codes',
            'Add, edit, and delete',
          ],
        },
      },
      {
        path: 'courses',
        name: 'courses',
        component: moduleView,
        meta: {
          title: 'Courses & Subjects',
          group: 'Academics',
          icon: 'bi-journal-bookmark',
          description:
            'Maintain the course catalog, credit values, subject offerings, and course status.',
          milestone: 4,
          features: [
            'Course catalog',
            'Subject list view',
            'Credits and status',
            'Search and department filters',
          ],
        },
      },
      {
        path: 'semesters',
        name: 'semesters',
        component: moduleView,
        meta: {
          title: 'Semesters',
          group: 'Academics',
          icon: 'bi-calendar3',
          description:
            'Plan academic years, semester dates, and the active academic term.',
          milestone: 4,
          features: [
            'Academic year timeline',
            'Semester date ranges',
            'Active term indicator',
          ],
        },
      },
      {
        path: 'sections',
        name: 'sections',
        component: moduleView,
        meta: {
          title: 'Class Sections',
          group: 'Academics',
          icon: 'bi-diagram-3',
          description:
            'Assign subjects to teachers and rooms, build schedules, and track section capacity.',
          milestone: 4,
          features: [
            'Subject and teacher assignment',
            'Room and schedule planning',
            'Capacity tracking',
            'Enrolled student counts',
          ],
        },
      },
      {
        path: 'enrollment',
        name: 'enrollment',
        component: moduleView,
        meta: {
          title: 'Enrollment',
          group: 'Operations',
          icon: 'bi-person-plus',
          description:
            'Connect students to class sections and manage enrollment status across the term.',
          milestone: 4,
          features: [
            'Student enrollment records',
            'Class section assignment',
            'Enrollment status',
            'Search and filters',
          ],
        },
      },
      {
        path: 'attendance',
        name: 'attendance',
        component: moduleView,
        meta: {
          title: 'Attendance',
          group: 'Operations',
          icon: 'bi-clipboard-check',
          description:
            'Record and review daily attendance with present, absent, late, and excused states.',
          milestone: 5,
          features: [
            'Attendance register',
            'Date filters',
            'Present, absent, late, excused',
            'Summary statistics',
          ],
        },
      },
      {
        path: 'grades',
        name: 'grades',
        component: moduleView,
        meta: {
          title: 'Grades & GPA',
          group: 'Operations',
          icon: 'bi-mortarboard',
          description:
            'Review student results, assessment scores, letter grades, and semester GPA.',
          milestone: 5,
          features: [
            'Results table',
            'Assessment scores',
            'Grade and GPA overview',
            'Semester and section filters',
          ],
        },
      },
      {
        path: 'payments',
        name: 'payments',
        component: moduleView,
        meta: {
          title: 'Tuition & Payments',
          group: 'Operations',
          icon: 'bi-credit-card',
          description:
            'Track tuition invoices, due dates, payment status, and student payment history.',
          milestone: 5,
          features: [
            'Invoice list',
            'Amount and due date',
            'Payment status',
            'Payment history',
          ],
        },
      },
      {
        path: 'reports',
        name: 'reports',
        component: moduleView,
        meta: {
          title: 'Reports',
          group: 'Insights',
          icon: 'bi-bar-chart-line',
          description:
            'Generate enrollment and attendance summaries with date-range filters and CSV export.',
          milestone: 6,
          features: [
            'Summary report cards',
            'Enrollment and attendance reports',
            'Date-range filters',
            'CSV export',
          ],
        },
      },
      {
        path: 'notifications',
        name: 'notifications',
        component: moduleView,
        meta: {
          title: 'Notifications',
          group: 'Insights',
          icon: 'bi-bell',
          description:
            'Review campus announcements and administrative alerts with read and unread states.',
          milestone: 6,
          features: [
            'Notification inbox',
            'Read and unread states',
            'Mark as read',
            'Filter by status',
          ],
        },
      },
      {
        path: 'users',
        name: 'users',
        component: moduleView,
        meta: {
          title: 'User Management',
          group: 'Administration',
          icon: 'bi-shield-lock',
          description:
            'Manage demonstration system accounts, access roles, and active account states.',
          milestone: 6,
          features: [
            'Demo user list',
            'Role badges',
            'Active / inactive states',
            'Add and edit users',
          ],
        },
      },
      {
        path: 'settings',
        name: 'settings',
        component: moduleView,
        meta: {
          title: 'Settings',
          group: 'Administration',
          icon: 'bi-gear',
          description:
            'Adjust profile preferences, notification settings, and interface options.',
          milestone: 6,
          features: [
            'Profile preferences',
            'Notification preferences',
            'Interface options',
            'Local demo settings',
          ],
        },
      },
      {
        path: ':pathMatch(.*)*',
        name: 'not-found',
        component: NotFoundView,
        meta: {
          title: 'Page not found',
          group: 'System',
        },
      },
    ],
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior() {
    return { top: 0 }
  },
})

router.afterEach((to) => {
  const pageTitle = to.meta.title ? `${to.meta.title} · CampusHub` : 'CampusHub'
  document.title = pageTitle
})

export default router

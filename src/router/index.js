import { createRouter, createWebHistory } from 'vue-router'
import DashboardView from '../views/DashboardView.vue'

const moduleView = () => import('../views/ModulePlaceholderView.vue')
const StudentsView = () => import('../views/StudentsView.vue')
const TeachersView = () => import('../views/TeachersView.vue')
const DepartmentsView = () => import('../views/DepartmentsView.vue')
const CoursesView = () => import('../views/CoursesView.vue')
const SubjectsView = () => import('../views/SubjectsView.vue')
const SemestersView = () => import('../views/SemestersView.vue')
const SectionsView = () => import('../views/SectionsView.vue')
const EnrollmentView = () => import('../views/EnrollmentView.vue')
const AttendanceView = () => import('../views/AttendanceView.vue')
const GradesView = () => import('../views/GradesView.vue')
const PaymentsView = () => import('../views/PaymentsView.vue')
const ReportsView = () => import('../views/ReportsView.vue')
const NotificationsView = () => import('../views/NotificationsView.vue')
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
        component: TeachersView,
        meta: {
          title: 'Teachers',
          group: 'Academics',
          icon: 'bi-person-video3',
        },
      },
      {
        path: 'departments',
        name: 'departments',
        component: DepartmentsView,
        meta: {
          title: 'Departments',
          group: 'Academics',
          icon: 'bi-building',
        },
      },
      {
        path: 'courses',
        name: 'courses',
        component: CoursesView,
        meta: {
          title: 'Courses',
          group: 'Academics',
          icon: 'bi-journal-bookmark',
          description:
            'Maintain course offerings, credit values, departments, and publication status. Semester linkage is not part of the current course model.',
          milestone: 4,
          features: [
            'Course offerings',
            'Credits and status',
            'Search and department filters',
            'Browser storage',
          ],
        },
      },
      {
        path: 'subjects',
        name: 'subjects',
        component: SubjectsView,
        meta: {
          title: 'Subjects',
          group: 'Academics',
          icon: 'bi-book',
          description:
            'Maintain curriculum subject definitions, including codes, names, departments, credit values, and publication status.',
          milestone: 5,
          features: [
            'Curriculum subject definitions',
            'Credits and status',
            'Search and department filters',
            'Browser storage',
          ],
        },
      },
      {
        path: 'semesters',
        name: 'semesters',
        component: SemestersView,
        meta: {
          title: 'Semesters',
          group: 'Academics',
          icon: 'bi-calendar3',
          description: 'Plan academic years, semester dates, and the active academic term.',
          milestone: 5,
          features: [
            'Semester calendar',
            'Academic year and date ranges',
            'Active term indicator',
            'Browser storage',
          ],
        },
      },
      {
        path: 'sections',
        name: 'sections',
        component: SectionsView,
        meta: {
          title: 'Class Sections',
          group: 'Academics',
          icon: 'bi-diagram-3',
          description:
            'Organize class sections by subject, teacher, semester, room, and schedule. Records are stored in this browser.',
          milestone: 3,
          features: [
            'Class sections',
            'Subject, teacher, and semester assignment',
            'Room, schedule, and capacity',
            'Browser storage',
          ],
        },
      },
      {
        path: 'enrollment',
        name: 'enrollment',
        component: EnrollmentView,
        meta: {
          title: 'Enrollment',
          group: 'Operations',
          icon: 'bi-person-plus',
          description:
            'Connect students to class sections, manage enrollment status, and review locally estimated seat usage. Records are stored in this browser.',
          milestone: 4,
          features: [
            'Student enrollment records',
            'Class section assignment',
            'Enrollment status',
            'Search and filters',
            'Browser storage',
            'Local capacity estimate',
          ],
        },
      },
      {
        path: 'attendance',
        name: 'attendance',
        component: AttendanceView,
        meta: {
          title: 'Attendance',
          group: 'Operations',
          icon: 'bi-clipboard-check',
          description:
            'Record attendance for students actively enrolled in each class section. Attendance records are stored in this browser and are not synced to the CampusHub server.',
          milestone: 5,
          features: [
            'Attendance register',
            'Enrollment-based roster',
            'Date and status filters',
            'Present, absent, late, excused',
            'Browser storage',
          ],
        },
      },
      {
        path: 'grades',
        name: 'grades',
        component: GradesView,
        meta: {
          title: 'Grades & GPA',
          group: 'Operations',
          icon: 'bi-mortarboard',
          description:
            'Review student results, assessment scores, letter grades, and semester GPA.',
          milestone: 7,
          features: [
            'Weighted assessment scores',
            'Letter grades and GPA',
            'Semester, section, and subject filters',
            'Visible grading scale',
            'Browser storage',
          ],
        },
      },
      {
        path: 'payments',
        name: 'payments',
        component: PaymentsView,
        meta: {
          title: 'Tuition & Payments',
          group: 'Operations',
          icon: 'bi-credit-card',
          description:
            'Track tuition assessments, due dates, payment status, and student payment history using frontend-only records stored in this browser.',
          milestone: 9,
          features: [
            'Tuition and payment records',
            'Local balance and status calculations',
            'Payment history and receipts',
            'Search and filters',
            'Browser storage',
          ],
        },
      },
      {
        path: 'reports',
        name: 'reports',
        component: ReportsView,
        meta: {
          title: 'Reports',
          group: 'Insights',
          icon: 'bi-bar-chart-line',
          description:
            'Generate enrollment and attendance summaries with date-range filters and CSV export.',
          milestone: 8,
          features: [
            'Frontend report summaries',
            'Enrollment and attendance reports',
            'Academic coverage and GPA reports',
            'Semester, section, and date-range filters',
            'CSV export and print layout',
          ],
        },
      },
      {
        path: 'notifications',
        name: 'notifications',
        component: NotificationsView,
        meta: {
          title: 'Notifications',
          group: 'Insights',
          icon: 'bi-bell',
          description:
            'Review campus announcements and administrative alerts with read and unread states. Notifications are stored in this browser.',
          milestone: 10,
          features: [
            'Notification inbox',
            'Read and unread states',
            'Mark as read',
            'Filter by status',
            'Search notifications',
            'Browser storage',
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
          description: 'Adjust profile preferences, notification settings, and interface options.',
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

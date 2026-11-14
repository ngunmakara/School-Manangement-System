export const navigationGroups = [
  {
    label: 'Overview',
    items: [{ label: 'Dashboard', to: '/dashboard', icon: 'bi-grid-1x2' }],
  },
  {
    label: 'Academics',
    items: [
      { label: 'Students', to: '/students', icon: 'bi-people' },
      { label: 'Teachers', to: '/teachers', icon: 'bi-person-video3' },
      { label: 'Departments', to: '/departments', icon: 'bi-building' },
      { label: 'Courses & Subjects', to: '/courses', icon: 'bi-journal-bookmark' },
      { label: 'Subjects', to: '/subjects', icon: 'bi-book' },
      { label: 'Semesters', to: '/semesters', icon: 'bi-calendar3' },
      { label: 'Class Sections', to: '/sections', icon: 'bi-diagram-3' },
    ],
  },
  {
    label: 'Operations',
    items: [
      { label: 'Enrollment', to: '/enrollment', icon: 'bi-person-plus' },
      { label: 'Attendance', to: '/attendance', icon: 'bi-clipboard-check' },
      { label: 'Grades & GPA', to: '/grades', icon: 'bi-mortarboard' },
      { label: 'Tuition & Payments', to: '/payments', icon: 'bi-credit-card' },
    ],
  },
  {
    label: 'Insights',
    items: [
      { label: 'Reports', to: '/reports', icon: 'bi-bar-chart-line' },
      { label: 'Notifications', to: '/notifications', icon: 'bi-bell' },
    ],
  },
  {
    label: 'Administration',
    items: [
      { label: 'User Management', to: '/users', icon: 'bi-shield-lock' },
      { label: 'Settings', to: '/settings', icon: 'bi-gear' },
    ],
  },
]

export const searchablePages = navigationGroups.flatMap((group) =>
  group.items.map((item) => ({ ...item, group: group.label })),
)

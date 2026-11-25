import { describe, expect, it } from 'vitest'
import router from '../../src/router'
import { navigationGroups, searchablePages } from '../../src/data/navigation'

function findRoute(name) {
  return router.getRoutes().find((route) => route.name === name)
}

function findNavItem(path) {
  return searchablePages.find((item) => item.to === path)
}

function navGroupFor(path) {
  return navigationGroups.find((group) => group.items.some((item) => item.to === path))?.label
}

describe('Router metadata', () => {
  it('covers every registered application route with core metadata', () => {
    const expected = [
      { name: 'dashboard', path: '/dashboard', group: 'Overview', title: 'Dashboard' },
      {
        name: 'students',
        path: '/students',
        group: 'Academics',
        title: 'Students',
        icon: 'bi-people',
      },
      {
        name: 'teachers',
        path: '/teachers',
        group: 'Academics',
        title: 'Teachers',
        icon: 'bi-person-video3',
      },
      {
        name: 'departments',
        path: '/departments',
        group: 'Academics',
        title: 'Departments',
        icon: 'bi-building',
      },
      {
        name: 'courses',
        path: '/courses',
        group: 'Academics',
        title: 'Courses',
        icon: 'bi-journal-bookmark',
      },
      {
        name: 'subjects',
        path: '/subjects',
        group: 'Academics',
        title: 'Subjects',
        icon: 'bi-book',
      },
      {
        name: 'semesters',
        path: '/semesters',
        group: 'Academics',
        title: 'Semesters',
        icon: 'bi-calendar3',
      },
      {
        name: 'sections',
        path: '/sections',
        group: 'Academics',
        title: 'Class Sections',
        icon: 'bi-diagram-3',
      },
      {
        name: 'enrollment',
        path: '/enrollment',
        group: 'Operations',
        title: 'Enrollment',
        icon: 'bi-person-plus',
      },
      {
        name: 'attendance',
        path: '/attendance',
        group: 'Operations',
        title: 'Attendance',
        icon: 'bi-clipboard-check',
      },
      {
        name: 'grades',
        path: '/grades',
        group: 'Operations',
        title: 'Grades & GPA',
        icon: 'bi-mortarboard',
      },
      {
        name: 'payments',
        path: '/payments',
        group: 'Operations',
        title: 'Tuition & Payments',
        icon: 'bi-credit-card',
      },
      {
        name: 'reports',
        path: '/reports',
        group: 'Insights',
        title: 'Reports',
        icon: 'bi-bar-chart-line',
      },
      {
        name: 'notifications',
        path: '/notifications',
        group: 'Insights',
        title: 'Notifications',
        icon: 'bi-bell',
      },
      {
        name: 'users',
        path: '/users',
        group: 'Administration',
        title: 'User Management',
        icon: 'bi-shield-lock',
      },
      {
        name: 'settings',
        path: '/settings',
        group: 'Administration',
        title: 'Settings',
        icon: 'bi-gear',
      },
      { name: 'not-found', path: '/:pathMatch(.*)*', group: 'System', title: 'Page not found' },
    ]

    const routeNames = router
      .getRoutes()
      .map((route) => route.name)
      .filter((name) => name && name !== undefined)

    expected.forEach((item) => {
      expect(routeNames).toContain(item.name)
      const route = findRoute(item.name)
      expect(route).toBeDefined()
      expect(route.path).toBe(item.path)
      expect(route.meta.title).toBe(item.title)
      expect(route.meta.group).toBe(item.group)
      if (item.icon) {
        expect(route.meta.icon).toBe(item.icon)
      }
    })
  })

  it('keeps navigable routes aligned with sidebar/search navigation metadata', () => {
    const navigable = router.getRoutes().filter((route) => route.name && route.name !== 'not-found')

    navigable.forEach((route) => {
      const item = findNavItem(route.path)
      expect(item, `missing nav item for ${route.path}`).toBeDefined()
      expect(route.meta.title).toBe(item.label)
      expect(route.meta.group).toBe(item.group)
      expect(navGroupFor(route.path)).toBe(route.meta.group)
      if (route.meta.icon !== undefined) {
        expect(route.meta.icon).toBe(item.icon)
      }
    })

    expect(searchablePages).toHaveLength(navigable.length)
  })
})

describe('Route-specific contracts', () => {
  it('keeps Courses metadata aligned with the implemented catalog', () => {
    const route = findRoute('courses')
    const item = findNavItem('/courses')
    expect(route.meta.title).toBe(item.label)
    expect(route.meta.description).toContain('credit values')
    expect(route.meta.description).toContain(
      'Semester linkage is not part of the current course model.',
    )
    expect(route.meta.features).toContain('Browser storage')
  })

  it('keeps Enrollment metadata aligned with the implemented module', () => {
    const route = findRoute('enrollment')
    expect(String(route.components.default)).toContain('EnrollmentView')
    expect(route.meta.description).toContain('stored in this browser')
    expect(route.meta.description).toContain('locally estimated seat usage')
    expect(route.meta.features).toContain('Browser storage')
    expect(route.meta.features).toContain('Local capacity estimate')
  })

  it('keeps Attendance metadata aligned with the implemented module', () => {
    const route = findRoute('attendance')
    expect(String(route.components.default)).toContain('AttendanceView')
    expect(route.meta.description).toContain('stored in this browser')
    expect(route.meta.description).toContain('actively enrolled')
    expect(route.meta.features).toContain('Enrollment-based roster')
    expect(route.meta.features).toContain('Browser storage')
  })

  it('keeps Tuition & Payments metadata aligned with the implemented module', () => {
    const route = findRoute('payments')
    expect(String(route.components.default)).toContain('PaymentsView')
    expect(route.meta.description).toContain('frontend-only records stored in this browser')
    expect(route.meta.features).toContain('Tuition and payment records')
    expect(route.meta.features).toContain('Payment history and receipts')
    expect(route.meta.features).toContain('Browser storage')
  })

  it('keeps Notifications metadata aligned with the implemented module', () => {
    const route = findRoute('notifications')
    expect(String(route.components.default)).toContain('NotificationsView')
    expect(route.meta.description).toContain('stored in this browser')
    expect(route.meta.features).toContain('Notification inbox')
    expect(route.meta.features).toContain('Mark as read')
    expect(route.meta.features).toContain('Browser storage')
  })

  it('keeps Users metadata aligned with the implemented module', () => {
    const route = findRoute('users')
    expect(String(route.components.default)).toContain('UsersView')
    expect(route.meta.description).toContain('frontend-only')
    expect(route.meta.features).toContain('Demo user directory')
    expect(route.meta.features).toContain('Activate and deactivate users')
    expect(route.meta.features).toContain('Browser storage')
  })

  it('keeps Settings metadata aligned with the implemented module', () => {
    const route = findRoute('settings')
    expect(String(route.components.default)).toContain('SettingsView')
    expect(route.meta.description).toContain('local-only')
    expect(route.meta.features).toContain('Interface preferences')
    expect(route.meta.features).toContain('Reset to defaults')
    expect(route.meta.features).toContain('Browser storage')
  })

  it('keeps Grades, Reports, Subjects, Semesters, Sections descriptions/features aligned', () => {
    expect(findRoute('grades').meta.features).toContain('Browser storage')
    expect(findRoute('grades').meta.description).toContain('assessment scores')
    expect(findRoute('reports').meta.features).toContain('CSV export and print layout')
    expect(findRoute('subjects').meta.features).toContain('Browser storage')
    expect(findRoute('semesters').meta.features).toContain('Active term indicator')
    expect(findRoute('sections').meta.features).toContain('Browser storage')
  })
})

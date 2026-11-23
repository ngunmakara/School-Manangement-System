import { describe, expect, it } from 'vitest'
import router from '../../src/router'
import { navigationGroups, searchablePages } from '../../src/data/navigation'

const courseRoute = router.getRoutes().find((route) => route.name === 'courses')
const courseNavItem = searchablePages.find((item) => item.to === '/courses')
const enrollmentRoute = router.getRoutes().find((route) => route.name === 'enrollment')
const enrollmentNavItem = searchablePages.find((item) => item.to === '/enrollment')
const attendanceRoute = router.getRoutes().find((route) => route.name === 'attendance')
const attendanceNavItem = searchablePages.find((item) => item.to === '/attendance')
const paymentsRoute = router.getRoutes().find((route) => route.name === 'payments')
const paymentsNavItem = searchablePages.find((item) => item.to === '/payments')
const notificationsRoute = router.getRoutes().find((route) => route.name === 'notifications')
const notificationsNavItem = searchablePages.find((item) => item.to === '/notifications')
const usersRoute = router.getRoutes().find((route) => route.name === 'users')
const usersNavItem = searchablePages.find((item) => item.to === '/users')

describe('Courses route metadata', () => {
  it('matches the sidebar and topbar navigation metadata', () => {
    expect(courseRoute).toBeDefined()
    expect(courseNavItem).toBeDefined()
    expect(courseRoute.meta.title).toBe(courseNavItem.label)
    expect(courseRoute.meta.group).toBe(courseNavItem.group)
    expect(courseRoute.meta.icon).toBe(courseNavItem.icon)
    expect(
      navigationGroups.find((group) => group.items.some((item) => item.to === '/courses'))?.label,
    ).toBe(courseRoute.meta.group)
  })

  it('keeps the page description aligned with the implemented catalog', () => {
    expect(courseRoute.meta.description).toContain('credit values')
    expect(courseRoute.meta.description).toContain(
      'Semester linkage is not part of the current course model.',
    )
    expect(courseRoute.meta.features).toContain('Browser storage')
  })
})

describe('Enrollment route metadata', () => {
  it('matches the sidebar and topbar navigation metadata', () => {
    expect(enrollmentRoute).toBeDefined()
    expect(enrollmentNavItem).toBeDefined()
    expect(enrollmentRoute.meta.title).toBe(enrollmentNavItem.label)
    expect(enrollmentRoute.meta.group).toBe(enrollmentNavItem.group)
    expect(enrollmentRoute.meta.icon).toBe(enrollmentNavItem.icon)
    expect(
      navigationGroups.find((group) => group.items.some((item) => item.to === '/enrollment'))
        ?.label,
    ).toBe(enrollmentRoute.meta.group)
  })

  it('keeps the page description aligned with the implemented enrollment module', () => {
    expect(enrollmentRoute.meta.description).toContain('stored in this browser')
    expect(enrollmentRoute.meta.description).toContain('locally estimated seat usage')
    expect(enrollmentRoute.meta.features).toContain('Browser storage')
    expect(enrollmentRoute.meta.features).toContain('Local capacity estimate')
  })
})

describe('Attendance route metadata', () => {
  it('matches the sidebar and topbar navigation metadata', () => {
    expect(attendanceRoute).toBeDefined()
    expect(attendanceNavItem).toBeDefined()
    expect(attendanceRoute.meta.title).toBe(attendanceNavItem.label)
    expect(attendanceRoute.meta.group).toBe(attendanceNavItem.group)
    expect(attendanceRoute.meta.icon).toBe(attendanceNavItem.icon)
    expect(
      navigationGroups.find((group) => group.items.some((item) => item.to === '/attendance'))
        ?.label,
    ).toBe(attendanceRoute.meta.group)
  })

  it('points to the implemented attendance view and local-first feature set', () => {
    expect(String(attendanceRoute.components.default)).toContain('AttendanceView')
    expect(attendanceRoute.meta.description).toContain('stored in this browser')
    expect(attendanceRoute.meta.description).toContain('actively enrolled')
    expect(attendanceRoute.meta.features).toContain('Enrollment-based roster')
    expect(attendanceRoute.meta.features).toContain('Browser storage')
  })
})

describe('Tuition & Payments route metadata', () => {
  it('matches the sidebar and topbar navigation metadata', () => {
    expect(paymentsRoute).toBeDefined()
    expect(paymentsNavItem).toBeDefined()
    expect(paymentsRoute.meta.title).toBe(paymentsNavItem.label)
    expect(paymentsRoute.meta.group).toBe(paymentsNavItem.group)
    expect(paymentsRoute.meta.icon).toBe(paymentsNavItem.icon)
    expect(
      navigationGroups.find((group) => group.items.some((item) => item.to === '/payments'))?.label,
    ).toBe(paymentsRoute.meta.group)
  })

  it('points to the implemented payments view and local-first feature set', () => {
    expect(String(paymentsRoute.components.default)).toContain('PaymentsView')
    expect(paymentsRoute.meta.description).toContain('frontend-only records stored in this browser')
    expect(paymentsRoute.meta.features).toContain('Tuition and payment records')
    expect(paymentsRoute.meta.features).toContain('Payment history and receipts')
    expect(paymentsRoute.meta.features).toContain('Browser storage')
  })
})

describe('Notifications route metadata', () => {
  it('matches the sidebar and topbar navigation metadata', () => {
    expect(notificationsRoute).toBeDefined()
    expect(notificationsNavItem).toBeDefined()
    expect(notificationsRoute.meta.title).toBe(notificationsNavItem.label)
    expect(notificationsRoute.meta.group).toBe(notificationsNavItem.group)
    expect(notificationsRoute.meta.icon).toBe(notificationsNavItem.icon)
    expect(
      navigationGroups.find((group) => group.items.some((item) => item.to === '/notifications'))
        ?.label,
    ).toBe(notificationsRoute.meta.group)
  })

  it('points to the implemented notifications view and local-first feature set', () => {
    expect(String(notificationsRoute.components.default)).toContain('NotificationsView')
    expect(notificationsRoute.meta.description).toContain('stored in this browser')
    expect(notificationsRoute.meta.features).toContain('Notification inbox')
    expect(notificationsRoute.meta.features).toContain('Mark as read')
    expect(notificationsRoute.meta.features).toContain('Browser storage')
  })
})

describe('Users route metadata', () => {
  it('matches the sidebar and topbar navigation metadata', () => {
    expect(usersRoute).toBeDefined()
    expect(usersNavItem).toBeDefined()
    expect(usersRoute.meta.title).toBe(usersNavItem.label)
    expect(usersRoute.meta.group).toBe(usersNavItem.group)
    expect(usersRoute.meta.icon).toBe(usersNavItem.icon)
    expect(
      navigationGroups.find((group) => group.items.some((item) => item.to === '/users'))?.label,
    ).toBe(usersRoute.meta.group)
  })

  it('points to the implemented users view and local-first feature set', () => {
    expect(String(usersRoute.components.default)).toContain('UsersView')
    expect(usersRoute.meta.description).toContain('frontend-only')
    expect(usersRoute.meta.features).toContain('Demo user directory')
    expect(usersRoute.meta.features).toContain('Activate and deactivate users')
    expect(usersRoute.meta.features).toContain('Browser storage')
  })
})

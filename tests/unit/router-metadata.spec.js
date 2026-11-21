import { describe, expect, it } from 'vitest'
import router from '../../src/router'
import { navigationGroups, searchablePages } from '../../src/data/navigation'

const courseRoute = router.getRoutes().find((route) => route.name === 'courses')
const courseNavItem = searchablePages.find((item) => item.to === '/courses')
const enrollmentRoute = router.getRoutes().find((route) => route.name === 'enrollment')
const enrollmentNavItem = searchablePages.find((item) => item.to === '/enrollment')

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

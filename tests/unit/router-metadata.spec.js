import { describe, expect, it } from 'vitest'
import router from '../../src/router'
import { navigationGroups, searchablePages } from '../../src/data/navigation'

const courseRoute = router.getRoutes().find((route) => route.name === 'courses')
const courseNavItem = searchablePages.find((item) => item.to === '/courses')

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

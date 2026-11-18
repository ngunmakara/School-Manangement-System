import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import DashboardView from '../../src/views/DashboardView.vue'

vi.mock('../../src/api/dashboardService', async (importOriginal) => {
  const actual = await importOriginal()

  return {
    ...actual,
    getDashboardStatistics: vi.fn().mockResolvedValue({}),
    getEnrollmentTrend: vi.fn().mockResolvedValue({}),
  }
})

vi.mock('../../src/api/attendanceService', async (importOriginal) => {
  const actual = await importOriginal()

  return {
    ...actual,
    getAttendanceSummary: vi.fn().mockResolvedValue({}),
  }
})

vi.mock('../../src/api/studentService', async (importOriginal) => {
  const actual = await importOriginal()

  return {
    ...actual,
    fetchStudents: vi.fn().mockResolvedValue({ content: [], totalElements: 0 }),
  }
})

const componentStubs = {
  PageHeader: true,
  StatCard: true,
  ChartCard: true,
  EnrollmentTrendChart: true,
  AttendanceChart: true,
  DepartmentChart: true,
  EmptyState: true,
  StatusBadge: true,
}

function createTestRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<div />' } },
      { path: '/students', component: { template: '<div />' } },
      { path: '/teachers', component: { template: '<div />' } },
      { path: '/sections', component: { template: '<div />' } },
      { path: '/courses', component: { template: '<div />' } },
      { path: '/departments', component: { template: '<div />' } },
    ],
  })
}

beforeEach(() => {
  window.localStorage.clear()
  setActivePinia(createPinia())
})

describe('DashboardView', () => {
  it('links the upcoming classes card to class sections and courses modules', async () => {
    const router = createTestRouter()
    await router.push('/')
    await router.isReady()

    const wrapper = mount(DashboardView, {
      global: {
        plugins: [createPinia(), router],
        stubs: componentStubs,
      },
    })

    await flushPromises()

    const sectionsLink = wrapper.get('a[href="/sections"]')
    const coursesLink = wrapper.get('a[href="/courses"]')

    expect(sectionsLink.text()).toContain('Class sections')
    expect(coursesLink.text()).toContain('Courses')
    expect(wrapper.text()).not.toContain('Class sections is coming soon')
    expect(wrapper.text()).not.toContain('Courses is coming soon')

    wrapper.unmount()
  })
})

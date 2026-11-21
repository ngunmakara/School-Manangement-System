import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import DashboardView from '../../src/views/DashboardView.vue'
import { useCoursesStore } from '../../src/stores/courses'
import { useToast } from '../../src/composables/useToast'

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

let pinia

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

async function mountDashboard() {
  const router = createTestRouter()
  await router.push('/')
  await router.isReady()

  return mount(DashboardView, {
    global: {
      plugins: [pinia, router],
      stubs: componentStubs,
    },
  })
}

beforeEach(() => {
  window.localStorage.clear()
  pinia = createPinia()
  setActivePinia(pinia)
  useToast().state.toasts.splice(0)
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('DashboardView', () => {
  it('links the upcoming classes card to class sections and courses modules', async () => {
    const wrapper = await mountDashboard()
    await flushPromises()

    const sectionsLink = wrapper.get('a[href="/sections"]')
    const coursesLink = wrapper.get('a[href="/courses"]')

    expect(sectionsLink.text()).toContain('Class sections')
    expect(coursesLink.text()).toContain('Courses')
    expect(wrapper.text()).not.toContain('Class sections is coming soon')
    expect(wrapper.text()).not.toContain('Courses is coming soon')

    wrapper.unmount()
  })

  it('shows an actionable alert when course persistence fails', async () => {
    const store = useCoursesStore()
    vi.spyOn(store, 'loadCourses').mockImplementation(() => true)
    store.persistenceState = 'failed'
    store.persistenceError = 'Browser storage is not accepting course saves.'

    const retryPersist = vi.spyOn(store, 'retryPersist').mockReturnValue({
      ok: true,
      persisted: true,
      state: 'ok',
      error: '',
    })

    const wrapper = await mountDashboard()
    await flushPromises()

    const notice = wrapper.get('[aria-label="Course storage status"]')
    expect(notice.attributes('role')).toBe('alert')
    expect(notice.text()).toContain('Browser storage is not accepting course saves.')
    expect(notice.get('a[href="/courses"]').text()).toContain('Review courses')
    expect(notice.get('button').text()).toContain('Retry save')

    await notice.get('button').trigger('click')
    await flushPromises()

    expect(retryPersist).toHaveBeenCalledTimes(1)
    expect(useToast().state.toasts.some((item) => item.title === 'Course changes saved')).toBe(true)

    wrapper.unmount()
  })

  it('shows a recovered course storage status', async () => {
    const store = useCoursesStore()
    vi.spyOn(store, 'loadCourses').mockImplementation(() => true)
    store.storageState = 'recovered'
    store.recovery = { kind: 'records', discarded: 1, corrected: 0 }

    const wrapper = await mountDashboard()
    await flushPromises()

    const notice = wrapper.get('[aria-label="Course storage status"]')
    expect(notice.attributes('role')).toBe('status')
    expect(notice.text()).toContain('1 invalid record was removed')
    expect(notice.get('a[href="/courses"]').text()).toContain('Review courses')
    expect(notice.find('button').exists()).toBe(false)

    wrapper.unmount()
  })

  it('does not show a course storage notice for a healthy catalog', async () => {
    const wrapper = await mountDashboard()
    await flushPromises()

    expect(wrapper.find('[aria-label="Course storage status"]').exists()).toBe(false)

    wrapper.unmount()
  })
})

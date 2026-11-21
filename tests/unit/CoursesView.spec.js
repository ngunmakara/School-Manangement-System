import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import CoursesView from '../../src/views/CoursesView.vue'
import { useCoursesStore } from '../../src/stores/courses'
import { useDepartmentsStore } from '../../src/stores/departments'
import { useToast } from '../../src/composables/useToast'

const componentStubs = {
  PageHeader: {
    props: ['title', 'description', 'eyebrowIcon'],
    template:
      '<header :data-title="title" :data-description="description" :data-icon="eyebrowIcon" />',
  },
  StatCard: true,
  SearchField: true,
  FilterSelect: true,
  EmptyState: true,
  PaginationBar: true,
  ConfirmDialog: true,
  CourseTable: true,
  CourseFormModal: true,
  CourseDetailsModal: true,
}

let pinia

async function mountView() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<div />' } },
      {
        path: '/courses',
        name: 'courses',
        component: CoursesView,
        meta: {
          title: 'Courses',
          group: 'Academics',
          icon: 'bi-journal-bookmark',
          description: 'Course catalog metadata.',
        },
      },
    ],
  })

  await router.push('/courses')
  await router.isReady()

  return mount(CoursesView, {
    global: {
      plugins: [pinia, router],
      stubs: componentStubs,
    },
  })
}

function prepareFailedStorage(retryResult) {
  const store = useCoursesStore()
  const departmentsStore = useDepartmentsStore()

  vi.spyOn(store, 'loadCourses').mockImplementation(() => true)
  vi.spyOn(departmentsStore, 'loadDepartmentOptions').mockResolvedValue()

  store.persistenceState = 'failed'
  store.persistenceError = 'Browser storage is not accepting course saves.'

  const retryPersist = vi.spyOn(store, 'retryPersist').mockReturnValue(retryResult)

  return retryPersist
}

beforeEach(() => {
  window.localStorage.clear()
  pinia = createPinia()
  setActivePinia(pinia)
  useToast().state.toasts.splice(0)
})

afterEach(() => {
  vi.restoreAllMocks()
  document.body.innerHTML = ''
  window.localStorage.clear()
})

describe('CoursesView', () => {
  it('offers a retry action and confirms success for failed course persistence', async () => {
    const retryPersist = prepareFailedStorage({
      ok: true,
      persisted: true,
      state: 'ok',
      error: '',
    })

    const wrapper = await mountView()
    await flushPromises()

    const header = wrapper.get('header[data-description]')
    expect(header.attributes('data-title')).toBe('Courses')
    expect(header.attributes('data-description')).toBe('Course catalog metadata.')
    expect(header.attributes('data-icon')).toBe('bi-journal-bookmark')

    const alert = wrapper.get('[aria-label="Course storage status"]')
    expect(alert.attributes('role')).toBe('alert')
    expect(alert.text()).toContain('Browser storage is not accepting course saves.')
    expect(alert.text()).toContain('Your changes are kept here until the save succeeds.')

    const retryButton = alert.get('button')
    expect(retryButton.text()).toContain('Retry save')

    await retryButton.trigger('click')
    await flushPromises()

    expect(retryPersist).toHaveBeenCalledTimes(1)
    expect(useToast().state.toasts.some((item) => item.title === 'Course changes saved')).toBe(true)

    wrapper.unmount()
  })

  it('reports a failed persistence retry without hiding the storage notice', async () => {
    prepareFailedStorage({
      ok: false,
      persisted: false,
      state: 'failed',
      error: 'Browser storage is still blocked.',
    })

    const wrapper = await mountView()
    await flushPromises()

    await wrapper.get('[aria-label="Course storage status"] button').trigger('click')
    await flushPromises()

    expect(
      useToast().state.toasts.some((item) => item.title === 'Could not save course changes'),
    ).toBe(true)
    expect(wrapper.get('[aria-label="Course storage status"]').attributes('role')).toBe('alert')

    wrapper.unmount()
  })
})

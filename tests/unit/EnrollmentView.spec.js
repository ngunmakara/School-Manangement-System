import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import EnrollmentView from '../../src/views/EnrollmentView.vue'
import { useEnrollmentsStore } from '../../src/stores/enrollments'
import { useStudentsStore } from '../../src/stores/students'
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
  EnrollmentTable: {
    props: ['enrollments'],
    template:
      '<div class="enrollment-table-stub" :data-count="enrollments.length"><template v-if="enrollments.length">{{ enrollments[0].studentName }} {{ enrollments[0].sectionCode }}</template></div>',
  },
  EnrollmentFormModal: true,
  EnrollmentDetailsModal: true,
}

let pinia

async function mountView() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<div />' } },
      {
        path: '/enrollment',
        name: 'enrollment',
        component: EnrollmentView,
        meta: {
          title: 'Enrollment',
          group: 'Operations',
          icon: 'bi-person-plus',
        },
      },
    ],
  })

  await router.push('/enrollment')
  await router.isReady()

  return mount(EnrollmentView, {
    global: {
      plugins: [pinia, router],
      stubs: componentStubs,
    },
  })
}

function seedRecords() {
  window.localStorage.setItem(
    'campushub:enrollments:v1',
    JSON.stringify([
      {
        uid: 'enrollment_1',
        studentUid: 'student_1',
        sectionUid: 'section_1',
        status: 'enrolled',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ]),
  )
  window.localStorage.setItem(
    'campushub:sections:v1',
    JSON.stringify([
      {
        uid: 'section_1',
        code: 'CS101-A',
        subjectUid: 'subject_1',
        teacherUid: 'teacher_1',
        teacherName: 'Grace Hopper',
        semesterUid: 'semester_1',
        room: 'Room 101',
        schedule: 'Mon 09:00 - 10:00',
        capacity: 30,
        status: 'Active',
        description: '',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ]),
  )
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

describe('EnrollmentView', () => {
  it('resolves enrollment labels and honestly reports a partial API student directory', async () => {
    seedRecords()
    const studentsStore = useStudentsStore()
    studentsStore.source = 'api'
    studentsStore.students = [{ uid: 'student_1', studentId: 'S1001', fullName: 'Ada Lovelace' }]
    studentsStore.filteredTotal = 50

    const wrapper = await mountView()
    await flushPromises()

    const table = wrapper.get('.enrollment-table-stub')
    expect(table.attributes('data-count')).toBe('1')
    expect(table.text()).toContain('Ada Lovelace')
    expect(table.text()).toContain('CS101-A')
    expect(wrapper.text()).toContain('currently loaded API page (1 of 50 shown)')

    wrapper.unmount()
  })

  it('offers a retry action for failed enrollment persistence', async () => {
    seedRecords()
    const store = useEnrollmentsStore()
    store.persistenceState = 'failed'
    store.persistenceError = 'Browser storage is not accepting enrollment saves.'

    const retryPersist = vi.spyOn(store, 'retryPersist').mockReturnValue({
      ok: true,
      persisted: true,
      state: 'ok',
      error: '',
    })

    const wrapper = await mountView()
    await flushPromises()

    const alert = wrapper.get('[aria-label="Enrollment storage status"]')
    expect(alert.text()).toContain('Browser storage is not accepting enrollment saves.')

    await alert.get('button').trigger('click')
    await flushPromises()

    expect(retryPersist).toHaveBeenCalledTimes(1)
    expect(useToast().state.toasts.some((item) => item.title === 'Enrollment changes saved')).toBe(
      true,
    )

    wrapper.unmount()
  })
})

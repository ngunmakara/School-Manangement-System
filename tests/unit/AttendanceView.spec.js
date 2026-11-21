import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import AttendanceView from '../../src/views/AttendanceView.vue'
import { useAttendanceStore } from '../../src/stores/attendance'
import { useStudentsStore } from '../../src/stores/students'
import { useToast } from '../../src/composables/useToast'

const componentStubs = {
  PageHeader: {
    props: ['title', 'description', 'eyebrowIcon'],
    template:
      '<header class="stub-page-header" :data-title="title"><slot name="actions" /></header>',
  },
  StatCard: true,
  SearchField: {
    props: ['modelValue', 'label'],
    template:
      '<input type="search" :aria-label="label" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
  },
  FilterSelect: {
    props: ['modelValue', 'label', 'options'],
    template:
      '<select :aria-label="label" :value="modelValue" @change="$emit(\'update:modelValue\', $event.target.value)"><option v-for="option in options" :key="option.value" :value="option.value">{{ option.label }}</option></select>',
  },
  EmptyState: {
    props: ['icon', 'title', 'message'],
    template:
      '<div class="empty-state-stub"><h3>{{ title }}</h3><p>{{ message }}</p><slot /></div>',
  },
  PaginationBar: true,
  ConfirmDialog: true,
  AttendanceTable: {
    props: ['attendance', 'sortKey', 'sortDir'],
    template:
      '<div class="attendance-table-stub" :data-count="attendance.length" :data-sort-key="sortKey" :data-sort-dir="sortDir"><button type="button" class="sort-date" @click="$emit(\'sort\', \'date\')">Sort by date</button><template v-if="attendance.length"><button type="button" class="edit-row" @click="$emit(\'edit\', attendance[0])">Edit row</button>{{ attendance[0].studentName }} {{ attendance[0].statusLabel }}</template></div>',
  },
  AttendanceFormModal: true,
  AttendanceDetailsModal: true,
}

let pinia

async function mountView({ query = {}, realForm = false } = {}) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<div />' } },
      {
        path: '/attendance',
        name: 'attendance',
        component: AttendanceView,
        meta: {
          title: 'Attendance',
          group: 'Operations',
          icon: 'bi-clipboard-check',
        },
      },
    ],
  })

  await router.push({ name: 'attendance', query })
  await router.isReady()

  const stubs = { ...componentStubs, teleport: true }
  if (realForm) delete stubs.AttendanceFormModal

  return mount(AttendanceView, {
    attachTo: document.body,
    global: {
      plugins: [pinia, router],
      stubs,
    },
  })
}

function seedRecords() {
  window.localStorage.setItem(
    'campushub:attendance:v1',
    JSON.stringify([
      {
        uid: 'attendance_1',
        studentUid: 'student_1',
        sectionUid: 'section_1',
        date: '2026-03-10',
        status: 'present',
        createdAt: '2026-03-10T08:00:00.000Z',
        updatedAt: '2026-03-10T08:00:00.000Z',
      },
      {
        uid: 'attendance_2',
        studentUid: 'student_2',
        sectionUid: 'section_1',
        date: '2026-03-11',
        status: 'absent',
        createdAt: '2026-03-11T08:00:00.000Z',
        updatedAt: '2026-03-11T08:00:00.000Z',
      },
    ]),
  )
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
      {
        uid: 'enrollment_2',
        studentUid: 'student_2',
        sectionUid: 'section_1',
        status: 'enrolled',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
      {
        uid: 'enrollment_3',
        studentUid: 'student_3',
        sectionUid: 'section_1',
        status: 'dropped',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
      {
        uid: 'enrollment_4',
        studentUid: 'student_4',
        sectionUid: 'section_2',
        status: 'enrolled',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
      {
        uid: 'enrollment_5',
        studentUid: 'student_9',
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
      {
        uid: 'section_2',
        code: 'CS102-A',
        subjectUid: 'subject_1',
        teacherUid: 'teacher_1',
        teacherName: 'Grace Hopper',
        semesterUid: 'semester_1',
        room: 'Room 102',
        schedule: 'Tue 09:00 - 10:00',
        capacity: 30,
        status: 'Active',
        description: '',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ]),
  )
  window.localStorage.setItem(
    'campushub:subjects:v1',
    JSON.stringify([
      {
        uid: 'subject_1',
        code: 'CS101',
        name: 'Database Systems',
        status: 'Active',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ]),
  )
  window.localStorage.setItem(
    'campushub:semesters:v1',
    JSON.stringify([
      {
        uid: 'semester_1',
        name: 'Fall 2026',
        academicYear: '2026',
        status: 'Active',
        startDate: '2026-08-01',
        endDate: '2026-12-15',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ]),
  )

  const studentsStore = useStudentsStore()
  studentsStore.source = 'local'
  studentsStore.students = [
    { uid: 'student_1', studentId: 'S1001', fullName: 'Ada Lovelace' },
    { uid: 'student_2', studentId: 'S1002', fullName: 'Grace Hopper' },
  ]
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
  document.body.classList.remove('ch-modal-open')
  window.localStorage.clear()
})

describe('AttendanceView', () => {
  it('uses active enrollments for the roster, warns about unresolved students, and preserves Enrollment storage', async () => {
    seedRecords()
    const enrollmentStorageBefore = window.localStorage.getItem('campushub:enrollments:v1')

    const wrapper = await mountView()
    await wrapper.get('#attendance-date-filter').setValue('2026-03-10')
    await flushPromises()

    expect(wrapper.text()).toContain(
      '1 active enrollment record for this section could not be matched to a student and was excluded from the roster.',
    )
    expect(wrapper.get('.attendance-table-stub').attributes('data-count')).toBe('1')
    expect(wrapper.get('.attendance-table-stub').text()).toContain('Ada Lovelace')
    expect(window.localStorage.getItem('campushub:enrollments:v1')).toBe(enrollmentStorageBefore)

    wrapper.unmount()
  })

  it('filters attendance records by date and status', async () => {
    seedRecords()

    const wrapper = await mountView()
    await wrapper.get('#attendance-date-filter').setValue('2026-03-10')
    await flushPromises()

    expect(wrapper.get('.attendance-table-stub').attributes('data-count')).toBe('1')
    expect(wrapper.text()).toContain('Ada Lovelace')

    await wrapper.get('#attendance-date-filter').setValue('2026-03-11')
    await flushPromises()

    expect(wrapper.get('.attendance-table-stub').attributes('data-count')).toBe('1')
    expect(wrapper.text()).toContain('Grace Hopper')

    await wrapper.get('select[aria-label="Status"]').setValue('present')
    await flushPromises()

    expect(wrapper.text()).toContain('No attendance records for this date')

    wrapper.unmount()
  })

  it('shows filter state for a non-default date sort direction and restores defaults on reset', async () => {
    seedRecords()

    const wrapper = await mountView()
    await wrapper.get('#attendance-date-filter').setValue('2026-03-10')
    await flushPromises()

    expect(wrapper.get('.attendance-table-stub').attributes('data-sort-dir')).toBe('desc')
    expect(wrapper.text()).toContain('1 attendance records for the selected section and date')
    expect(wrapper.find('button.btn-ch-ghost').exists()).toBe(false)

    await wrapper.get('.sort-date').trigger('click')
    await flushPromises()

    expect(wrapper.get('.attendance-table-stub').attributes('data-sort-dir')).toBe('asc')
    expect(wrapper.text()).toContain('1 of 1 records match your filters')
    expect(wrapper.get('button.btn-ch-ghost').text()).toContain('Reset filters')

    await wrapper.get('button.btn-ch-ghost').trigger('click')
    await flushPromises()

    expect(wrapper.get('.attendance-table-stub').attributes('data-sort-dir')).toBe('desc')
    expect(wrapper.text()).toContain('1 attendance records for the selected section and date')
    expect(wrapper.find('button.btn-ch-ghost').exists()).toBe(false)

    wrapper.unmount()
  })

  it('offers a retry action for failed attendance persistence', async () => {
    seedRecords()
    const store = useAttendanceStore()
    store.persistenceState = 'failed'
    store.persistenceError = 'Browser storage is not accepting attendance saves.'

    const retryPersist = vi.spyOn(store, 'retryPersist').mockReturnValue({
      ok: true,
      persisted: true,
      state: 'ok',
      error: '',
    })

    const wrapper = await mountView()
    await flushPromises()

    const alert = wrapper.get('[aria-label="Attendance storage status"]')
    expect(alert.text()).toContain('Browser storage is not accepting attendance saves.')

    await alert.get('button').trigger('click')
    await flushPromises()

    expect(retryPersist).toHaveBeenCalledTimes(1)
    expect(useToast().state.toasts.some((item) => item.title === 'Attendance changes saved')).toBe(
      true,
    )

    wrapper.unmount()
  })

  it('prevents a duplicate student, section, and date record from the form', async () => {
    seedRecords()

    const wrapper = await mountView({ realForm: true })
    await wrapper.get('#attendance-date-filter').setValue('2026-03-10')
    await flushPromises()
    await wrapper.get('.stub-page-header button').trigger('click')
    await flushPromises()

    await wrapper.get('#attendance-field-student').setValue('student_1')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(wrapper.text()).toContain(
      'Attendance for this student, section, and date already exists.',
    )

    wrapper.unmount()
  })

  it('opens an existing historical record for editing', async () => {
    seedRecords()
    const enrollments = JSON.parse(window.localStorage.getItem('campushub:enrollments:v1'))
    window.localStorage.setItem(
      'campushub:enrollments:v1',
      JSON.stringify(enrollments.filter((enrollment) => enrollment.studentUid !== 'student_1')),
    )

    const wrapper = await mountView({ realForm: true })
    await wrapper.get('#attendance-date-filter').setValue('2026-03-10')
    await flushPromises()
    await wrapper.get('.edit-row').trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('Historical record')
    expect(
      wrapper
        .get('#attendance-field-student')
        .findAll('option')
        .map((option) => option.attributes('value')),
    ).toContain('student_1')

    wrapper.unmount()
  })
})

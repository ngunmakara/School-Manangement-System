import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import GradesView from '../../src/views/GradesView.vue'
import { useStudentsStore } from '../../src/stores/students'
import { useToast } from '../../src/composables/useToast'

const componentStubs = {
  PageHeader: {
    props: ['title'],
    template:
      '<header class="stub-page-header" :data-title="title"><slot name="actions" /></header>',
  },
  StatCard: {
    props: ['label', 'value'],
    template: '<div class="stat-card-stub">{{ label }}: {{ value }}</div>',
  },
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
    props: ['title', 'message'],
    template:
      '<div class="empty-state-stub"><h3>{{ title }}</h3><p>{{ message }}</p><slot /></div>',
  },
  PaginationBar: true,
  ConfirmDialog: true,
  GradeTable: {
    props: ['grades', 'sortKey', 'sortDir'],
    template:
      '<div class="grades-table-stub" :data-count="grades.length"><template v-for="grade in grades" :key="grade.uid">{{ grade.studentName }} {{ grade.totalScore }} {{ grade.letterGrade }} {{ grade.status }}</template></div>',
  },
  GradeFormModal: {
    props: ['modelValue'],
    template: '<div class="grade-form-stub" :data-open="String(modelValue)"></div>',
  },
  GradeDetailsModal: true,
}

let pinia

async function mountView({ query = {} } = {}) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<div />' } },
      {
        path: '/grades',
        name: 'grades',
        component: GradesView,
        meta: { title: 'Grades & GPA', group: 'Operations', icon: 'bi-mortarboard' },
      },
    ],
  })

  await router.push({ name: 'grades', query })
  await router.isReady()

  return mount(GradesView, {
    attachTo: document.body,
    global: {
      plugins: [pinia, router],
      stubs: { ...componentStubs, teleport: true },
    },
  })
}

function seedRecords() {
  window.localStorage.setItem(
    'campushub:grades:v1',
    JSON.stringify([
      {
        uid: 'grade_1',
        studentUid: 'student_1',
        sectionUid: 'section_1',
        subjectUid: 'subject_1',
        semesterUid: 'semester_1',
        studentName: 'Ada Lovelace',
        studentId: 'S1001',
        sectionCode: 'CS101-A',
        subjectName: 'Database Systems',
        semesterName: 'Fall 2026 · 2026-2027',
        scores: { assignment: 100, quiz: 90, midterm: 80, final: 70 },
        createdAt: '2026-03-10T08:00:00.000Z',
        updatedAt: '2026-03-10T08:00:00.000Z',
      },
      {
        uid: 'grade_2',
        studentUid: 'student_2',
        sectionUid: 'section_2',
        subjectUid: 'subject_1',
        semesterUid: 'semester_1',
        studentName: 'Grace Hopper',
        studentId: 'S1002',
        sectionCode: 'CS102-A',
        subjectName: 'Database Systems',
        semesterName: 'Fall 2026 · 2026-2027',
        scores: { assignment: 20, quiz: 30, midterm: 40, final: 50 },
        createdAt: '2026-03-11T08:00:00.000Z',
        updatedAt: '2026-03-11T08:00:00.000Z',
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
        description: '',
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
        academicYear: '2026-2027',
        status: 'Active',
        startDate: '2026-08-01',
        endDate: '2026-12-15',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
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
        sectionUid: 'section_2',
        status: 'enrolled',
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

describe('GradesView', () => {
  it('renders calculated grades, summary cards, and the grading scale', async () => {
    seedRecords()

    const wrapper = await mountView()
    await flushPromises()

    expect(wrapper.get('.stub-page-header').attributes('data-title')).toBe('Grades & GPA')
    expect(wrapper.get('.grades-table-stub').attributes('data-count')).toBe('2')
    expect(wrapper.get('.grades-table-stub').text()).toContain('83 B Pass')
    expect(wrapper.get('.grades-table-stub').text()).toContain('37 F Fail')
    expect(wrapper.text()).toContain('Students graded: 2')
    expect(wrapper.text()).toContain('Pass rate: 50.0%')
    expect(wrapper.text()).toContain('Grading scale')

    wrapper.unmount()
  })

  it('filters grade records by section', async () => {
    seedRecords()

    const wrapper = await mountView()
    await flushPromises()
    await wrapper.get('select[aria-label="Section"]').setValue('section_2')
    await flushPromises()

    expect(wrapper.get('.grades-table-stub').attributes('data-count')).toBe('1')
    expect(wrapper.get('.grades-table-stub').text()).toContain('Grace Hopper')

    wrapper.unmount()
  })

  it('opens the grade form from the add query action', async () => {
    seedRecords()

    const wrapper = await mountView({ query: { action: 'add' } })
    await flushPromises()

    expect(wrapper.get('.grade-form-stub').attributes('data-open')).toBe('true')

    wrapper.unmount()
  })
})

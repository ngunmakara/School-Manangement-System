import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import ReportsView from '../../src/views/ReportsView.vue'
import { useGradesStore } from '../../src/stores/grades'
import { useAttendanceStore } from '../../src/stores/attendance'
import { useEnrollmentsStore } from '../../src/stores/enrollments'
import { useSectionsStore } from '../../src/stores/sections'
import { useSubjectsStore } from '../../src/stores/subjects'
import { useSemestersStore } from '../../src/stores/semesters'
import { useCoursesStore } from '../../src/stores/courses'
import { useStudentsStore } from '../../src/stores/students'
import { useTeachersStore } from '../../src/stores/teachers'
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
  FilterSelect: {
    props: ['modelValue', 'label', 'options'],
    template:
      '<select :aria-label="label" :value="modelValue" @change="$emit(\'update:modelValue\', $event.target.value)"><option v-for="option in options" :key="option.value" :value="option.value">{{ option.label }}</option></select>',
  },
  EmptyState: {
    props: ['title', 'message'],
    template: '<div class="empty-state-stub"><h3>{{ title }}</h3><p>{{ message }}</p></div>',
  },
  ChartCard: {
    props: ['title', 'subtitle'],
    template: '<section class="chart-card-stub"><h3>{{ title }}</h3><slot /></section>',
  },
  AttendanceChart: {
    props: ['summary'],
    template: '<div class="attendance-chart-stub" :data-total="summary.total"></div>',
  },
  ReportBarChart: {
    props: ['labels', 'values', 'datasetLabel'],
    template:
      '<div class="report-bar-stub" :data-label="datasetLabel" :data-count="labels.length">{{ values.join(",") }}</div>',
  },
}

let pinia

async function mountView() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<div />' } },
      {
        path: '/reports',
        name: 'reports',
        component: ReportsView,
        meta: { title: 'Reports', group: 'Insights', icon: 'bi-bar-chart-line' },
      },
    ],
  })

  await router.push({ name: 'reports' })
  await router.isReady()

  return mount(ReportsView, {
    attachTo: document.body,
    global: {
      plugins: [pinia, router],
      stubs: { ...componentStubs, teleport: true },
    },
  })
}

function seedStoreData() {
  const gradesStore = useGradesStore()
  const attendanceStore = useAttendanceStore()
  const enrollmentsStore = useEnrollmentsStore()
  const sectionsStore = useSectionsStore()
  const subjectsStore = useSubjectsStore()
  const semestersStore = useSemestersStore()
  const coursesStore = useCoursesStore()
  const studentsStore = useStudentsStore()
  const teachersStore = useTeachersStore()

  studentsStore.source = 'local'
  studentsStore.students = [
    {
      uid: 'student_1',
      studentId: 'S1001',
      fullName: 'Ada Lovelace',
      department: 'Engineering',
      status: 'Active',
      enrollmentDate: '2026-01-10',
    },
    {
      uid: 'student_2',
      studentId: 'S1002',
      fullName: 'Grace Hopper',
      department: 'Engineering',
      status: 'Inactive',
      enrollmentDate: '2026-02-12',
    },
  ]
  teachersStore.teachers = [{ uid: 'teacher_1', fullName: 'Alan Turing', status: 'Active' }]
  coursesStore.courses = [
    { uid: 'course_1', department: 'Engineering', credits: 3, status: 'Active' },
  ]
  subjectsStore.subjects = [
    {
      uid: 'subject_1',
      code: 'CS101',
      name: 'Database Systems',
      department: 'Engineering',
      credits: 3,
    },
  ]
  semestersStore.semesters = [
    { uid: 'semester_1', name: 'Fall 2026', academicYear: '2026-2027', status: 'Active' },
  ]
  sectionsStore.sections = [
    {
      uid: 'section_1',
      code: 'CS101-A',
      subjectUid: 'subject_1',
      semesterUid: 'semester_1',
      capacity: 30,
      status: 'Active',
    },
  ]
  enrollmentsStore.enrollments = [
    { uid: 'enrollment_1', studentUid: 'student_1', sectionUid: 'section_1', status: 'enrolled' },
    { uid: 'enrollment_2', studentUid: 'student_2', sectionUid: 'section_1', status: 'dropped' },
  ]
  attendanceStore.attendance = [
    {
      uid: 'attendance_1',
      studentUid: 'student_1',
      sectionUid: 'section_1',
      date: '2026-03-10',
      status: 'present',
    },
    {
      uid: 'attendance_2',
      studentUid: 'student_2',
      sectionUid: 'section_1',
      date: '2026-03-11',
      status: 'absent',
    },
  ]
  gradesStore.grades = [
    {
      uid: 'grade_1',
      studentUid: 'student_1',
      sectionUid: 'section_1',
      subjectUid: 'subject_1',
      semesterUid: 'semester_1',
      scores: { assignment: 100, quiz: 90, midterm: 80, final: 70 },
      createdAt: '2026-03-12T08:00:00.000Z',
    },
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
  window.localStorage.clear()
})

describe('ReportsView', () => {
  it('renders summary cards, charts, and all report categories from frontend data', async () => {
    const wrapper = await mountView()
    seedStoreData()
    await flushPromises()

    expect(wrapper.get('.stub-page-header').attributes('data-title')).toBe('Reports')
    expect(wrapper.text()).toContain('Total students: 2')
    expect(wrapper.text()).toContain('Total teachers: 1')
    expect(wrapper.text()).toContain('Total enrollments: 2')
    expect(wrapper.text()).toContain('Student enrollment by department')
    expect(wrapper.text()).toContain('Attendance by section')
    expect(wrapper.text()).toContain('Academic coverage by department')
    expect(wrapper.text()).toContain('Grade and GPA records')
    expect(wrapper.findAll('.report-bar-stub')).toHaveLength(3)
    expect(wrapper.get('.attendance-chart-stub').attributes('data-total')).toBe('2')

    wrapper.unmount()
  })

  it('filters visible report sections by report type', async () => {
    const wrapper = await mountView()
    seedStoreData()
    await flushPromises()

    await wrapper.get('select[aria-label="Report type"]').setValue('attendance')
    await flushPromises()

    expect(wrapper.text()).toContain('Attendance by section')
    expect(wrapper.text()).not.toContain('Student enrollment by department')
    expect(wrapper.text()).not.toContain('Grade and GPA records')

    wrapper.unmount()
  })

  it('keeps ISO timestamped grades within an active date range', async () => {
    const wrapper = await mountView()
    seedStoreData()
    await flushPromises()

    await wrapper.get('#report-start-date').setValue('2026-03-12')
    await wrapper.get('#report-end-date').setValue('2026-03-12')
    await flushPromises()

    expect(wrapper.text()).toContain('Grade and GPA records')
    expect(wrapper.text()).toContain('Ada Lovelace')
    expect(wrapper.text()).not.toContain('No grade data')

    wrapper.unmount()
  })

  it('does not show the global empty state when only section enrollment rows exist', async () => {
    const wrapper = await mountView()
    seedStoreData()

    useStudentsStore().students = []
    useAttendanceStore().attendance = []
    useGradesStore().grades = []
    useCoursesStore().courses = []
    useSubjectsStore().subjects = []
    useSectionsStore().sections = []
    useSemestersStore().semesters = []
    await flushPromises()

    expect(wrapper.text()).not.toContain('No report data available')
    expect(wrapper.text()).toContain('Enrollment by section')

    wrapper.unmount()
  })

  it('validates the date range and disables export when invalid', async () => {
    const wrapper = await mountView()
    seedStoreData()
    await flushPromises()

    await wrapper.get('#report-start-date').setValue('2026-04-01')
    await wrapper.get('#report-end-date').setValue('2026-03-01')
    await flushPromises()

    expect(wrapper.text()).toContain('Start date must be on or before end date.')
    expect(wrapper.get('button.btn-ch-primary').attributes('disabled')).toBeDefined()

    wrapper.unmount()
  })

  it('exports the current report as CSV from frontend data', async () => {
    const createObjectURL = vi.fn(() => 'blob:reports')
    const revokeObjectURL = vi.fn()
    Object.defineProperty(URL, 'createObjectURL', { value: createObjectURL, configurable: true })
    Object.defineProperty(URL, 'revokeObjectURL', { value: revokeObjectURL, configurable: true })
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

    const wrapper = await mountView()
    seedStoreData()
    await flushPromises()

    await wrapper.get('button.btn-ch-primary').trigger('click')
    await flushPromises()

    expect(createObjectURL).toHaveBeenCalledOnce()
    expect(clickSpy).toHaveBeenCalledOnce()
    expect(revokeObjectURL).toHaveBeenCalledOnce()

    wrapper.unmount()
  })
})

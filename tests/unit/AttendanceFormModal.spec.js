import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import AttendanceFormModal from '../../src/components/attendance/AttendanceFormModal.vue'
import { useAttendanceStore } from '../../src/stores/attendance'

const students = [
  { uid: 'student_1', studentId: 'S1001', fullName: 'Ada Lovelace' },
  { uid: 'student_2', studentId: 'S1002', fullName: 'Grace Hopper' },
]
const sections = [{ uid: 'section_1', code: 'CS101-A' }]
const enrollments = [
  { studentUid: 'student_1', sectionUid: 'section_1', status: 'enrolled' },
  { studentUid: 'student_2', sectionUid: 'section_1', status: 'enrolled' },
]

let pinia

beforeEach(() => {
  window.localStorage.clear()
  pinia = createPinia()
  setActivePinia(pinia)
})

afterEach(() => {
  vi.restoreAllMocks()
  document.body.innerHTML = ''
  document.body.classList.remove('ch-modal-open')
  window.localStorage.clear()
})

async function openForm(props = {}) {
  const wrapper = mount(AttendanceFormModal, {
    attachTo: document.body,
    props: {
      modelValue: false,
      students,
      sections,
      enrollments,
      defaultDate: '2026-03-10',
      defaultSectionUid: 'section_1',
      ...props,
    },
    global: {
      plugins: [pinia],
      stubs: { teleport: true },
    },
  })

  await wrapper.setProps({ modelValue: true })
  await flushPromises()

  return wrapper
}

describe('AttendanceFormModal', () => {
  it('validates that an enrolled student is selected', async () => {
    const wrapper = await openForm()

    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(wrapper.text()).toContain('Select a student.')
    expect(wrapper.emitted('saved')).toBeUndefined()

    wrapper.unmount()
  })

  it('saves a valid local attendance record and emits it', async () => {
    const wrapper = await openForm()

    await wrapper.get('#attendance-field-student').setValue('student_1')
    await wrapper.get('#attendance-field-status').setValue('late')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(wrapper.emitted('saved')).toHaveLength(1)
    expect(wrapper.emitted('saved')[0][0]).toMatchObject({
      mode: 'add',
      attendance: {
        studentUid: 'student_1',
        sectionUid: 'section_1',
        date: '2026-03-10',
        status: 'late',
      },
    })

    wrapper.unmount()
  })

  it('shows duplicate and unresolved-student guidance', async () => {
    const store = useAttendanceStore()
    store.addAttendance(
      { studentUid: 'student_1', sectionUid: 'section_1', date: '2026-03-10', status: 'present' },
      { sections, roster: students },
    )

    const wrapper = await openForm({
      enrollments: [
        ...enrollments,
        { studentUid: 'student_9', sectionUid: 'section_1', status: 'enrolled' },
      ],
    })

    expect(wrapper.text()).toContain(
      '1 enrollment record for this section could not be matched to a student and was excluded.',
    )

    await wrapper.get('#attendance-field-student').setValue('student_1')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(wrapper.text()).toContain(
      'Attendance for this student, section, and date already exists.',
    )
    expect(wrapper.emitted('saved')).toBeUndefined()

    wrapper.unmount()
  })

  it('warns when browser storage is not accepting saves', async () => {
    const wrapper = await openForm()
    const store = useAttendanceStore()
    store.persistenceState = 'failed'
    await flushPromises()

    expect(wrapper.text()).toContain(
      'Browser storage is not accepting saves. Attendance changes will last for this session only.',
    )

    wrapper.unmount()
  })

  it('shows a historical edit-only option and saves a status edit for an inactive student', async () => {
    const store = useAttendanceStore()
    const added = store.addAttendance(
      { studentUid: 'student_1', sectionUid: 'section_1', date: '2026-03-10', status: 'present' },
      { sections, roster: students },
    )
    expect(added.ok).toBe(true)

    const wrapper = await openForm({
      attendance: {
        ...added.attendance,
        studentName: 'Ada Lovelace',
        studentId: 'S1001',
      },
      enrollments: enrollments.filter((enrollment) => enrollment.studentUid !== 'student_1'),
    })

    expect(wrapper.text()).toContain('Historical record')
    const studentSelect = wrapper.get('#attendance-field-student')
    expect(studentSelect.findAll('option').map((option) => option.attributes('value'))).toContain(
      'student_1',
    )
    expect(studentSelect.findAll('option').map((option) => option.text())).toEqual([
      'Select an enrolled student',
      expect.stringContaining('historical (no longer actively enrolled)'),
      'Grace Hopper · S1002',
    ])

    await wrapper.get('#attendance-field-status').setValue('late')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(wrapper.emitted('saved')).toHaveLength(1)
    expect(wrapper.emitted('saved')[0][0]).toMatchObject({
      mode: 'edit',
      attendance: {
        uid: added.attendance.uid,
        studentUid: 'student_1',
        sectionUid: 'section_1',
        date: '2026-03-10',
        status: 'late',
      },
    })

    wrapper.unmount()
  })

  it('does not expose historical students when creating a new record', async () => {
    const wrapper = await openForm({
      enrollments: enrollments.filter((enrollment) => enrollment.studentUid !== 'student_1'),
    })

    expect(wrapper.text()).not.toContain('Historical record')
    expect(
      wrapper
        .get('#attendance-field-student')
        .findAll('option')
        .map((option) => option.text()),
    ).toEqual(['Select an enrolled student', 'Grace Hopper · S1002'])

    wrapper.unmount()
  })

  it('removes the historical option when the edit identity changes', async () => {
    const store = useAttendanceStore()
    const added = store.addAttendance(
      { studentUid: 'student_1', sectionUid: 'section_1', date: '2026-03-10', status: 'present' },
      { sections, roster: students },
    )
    expect(added.ok).toBe(true)

    const wrapper = await openForm({
      attendance: {
        ...added.attendance,
        studentName: 'Ada Lovelace',
        studentId: 'S1001',
      },
      enrollments: enrollments.filter((enrollment) => enrollment.studentUid !== 'student_1'),
    })

    await wrapper.get('#attendance-field-date').setValue('2026-03-11')
    await flushPromises()

    expect(wrapper.get('#attendance-field-student').element.value).toBe('')
    expect(wrapper.text()).not.toContain('Historical record')

    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(wrapper.text()).toContain('Select a student.')
    expect(wrapper.emitted('saved')).toBeUndefined()

    wrapper.unmount()
  })
})

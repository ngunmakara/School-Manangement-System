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
})

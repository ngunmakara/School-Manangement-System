import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import AttendanceDetailsModal from '../../src/components/attendance/AttendanceDetailsModal.vue'

const attendance = {
  uid: 'attendance_1',
  studentUid: 'student_1',
  sectionUid: 'section_1',
  studentName: 'Ada Lovelace',
  studentId: 'S1001',
  sectionCode: 'CS101-A',
  subjectName: 'Database Systems',
  teacherName: 'Grace Hopper',
  semesterName: 'Fall 2026 · 2026',
  date: '2026-03-10',
  status: 'present',
  createdAt: '2026-03-10T08:00:00.000Z',
  updatedAt: '2026-03-10T08:00:00.000Z',
}

beforeEach(() => {
  window.localStorage.clear()
  setActivePinia(createPinia())
})

afterEach(() => {
  document.body.innerHTML = ''
  document.body.classList.remove('ch-modal-open')
  window.localStorage.clear()
})

describe('AttendanceDetailsModal', () => {
  it('shows attendance details and emits edit', async () => {
    const wrapper = mount(AttendanceDetailsModal, {
      attachTo: document.body,
      props: {
        modelValue: true,
        attendance,
      },
      global: {
        stubs: { teleport: true },
      },
    })
    await flushPromises()

    expect(wrapper.text()).toContain('Ada Lovelace')
    expect(wrapper.text()).toContain('CS101-A')
    expect(wrapper.text()).toContain('2026-03-10')
    expect(wrapper.text()).toContain('Present')

    await wrapper.get('button.btn-ch-primary').trigger('click')
    expect(wrapper.emitted('edit')[0][0]).toEqual(attendance)

    wrapper.unmount()
  })
})

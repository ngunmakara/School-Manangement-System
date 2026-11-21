import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import AttendanceTable from '../../src/components/attendance/AttendanceTable.vue'

const attendance = [
  {
    uid: 'attendance_1',
    studentUid: 'student_1',
    sectionUid: 'section_1',
    studentName: 'Ada Lovelace',
    studentId: 'S1001',
    sectionCode: 'CS101-A',
    subjectName: 'Database Systems',
    teacherName: 'Grace Hopper',
    date: '2026-03-10',
    status: 'present',
    createdAt: '2026-03-10T08:00:00.000Z',
  },
]

describe('AttendanceTable', () => {
  it('provides accessible sort labels and shows resolved attendance information', () => {
    const wrapper = mount(AttendanceTable, {
      props: {
        attendance,
        sortKey: 'date',
        sortDir: 'asc',
      },
    })

    expect(wrapper.get('caption').text()).toBe('Attendance records')
    expect(wrapper.get('th[aria-sort="ascending"] .th-sort').attributes('aria-label')).toBe(
      'Sort by Date, currently ascending. Activate to sort descending.',
    )
    expect(wrapper.get('th[aria-sort="none"] .th-sort').attributes('aria-label')).toBe(
      'Sort by Student',
    )
    expect(wrapper.text()).toContain('Ada Lovelace')
    expect(wrapper.text()).toContain('CS101-A')
    expect(wrapper.text()).toContain('2026-03-10')
    expect(wrapper.text()).toContain('Present')
    expect(wrapper.get('[aria-label="Edit attendance for Ada Lovelace"]').exists()).toBe(true)

    wrapper.unmount()
  })

  it('emits sort and row actions with clear labels', async () => {
    const wrapper = mount(AttendanceTable, { props: { attendance } })

    await wrapper.get('th[aria-sort="none"] .th-sort').trigger('click')
    await wrapper.get('[aria-label="View attendance for Ada Lovelace"]').trigger('click')
    await wrapper.get('[aria-label="Delete attendance for Ada Lovelace"]').trigger('click')

    expect(wrapper.emitted('sort')[0]).toEqual(['studentName'])
    expect(wrapper.emitted('view')[0][0]).toEqual(attendance[0])
    expect(wrapper.emitted('delete')[0][0]).toEqual(attendance[0])

    wrapper.unmount()
  })
})

import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import EnrollmentTable from '../../src/components/enrollments/EnrollmentTable.vue'

const enrollments = [
  {
    uid: 'enrollment_1',
    studentUid: 'student_1',
    sectionUid: 'section_1',
    studentName: 'Ada Lovelace',
    studentId: 'S1001',
    sectionCode: 'CS101-A',
    subjectName: 'Computer Science',
    teacherName: 'Grace Hopper',
    semesterName: 'Fall 2026 · 2026',
    status: 'enrolled',
    statusLabel: 'Enrolled',
    capacity: 30,
    seatsUsed: 1,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
]

describe('EnrollmentTable', () => {
  it('provides accessible sort labels and shows resolved student and seat information', () => {
    const wrapper = mount(EnrollmentTable, {
      props: {
        enrollments,
        sortKey: 'status',
        sortDir: 'asc',
      },
    })

    expect(wrapper.get('caption').text()).toBe('Enrollment records')
    expect(wrapper.get('th[aria-sort="ascending"] .th-sort').attributes('aria-label')).toBe(
      'Sort by Status, currently ascending. Activate to sort descending.',
    )
    expect(wrapper.get('th[aria-sort="none"] .th-sort').attributes('aria-label')).toBe(
      'Sort by Student',
    )
    expect(wrapper.text()).toContain('Ada Lovelace')
    expect(wrapper.text()).toContain('CS101-A')
    expect(wrapper.text()).toContain('1/30 seats')
    expect(wrapper.text()).toContain('Enrolled')

    wrapper.unmount()
  })

  it('renders a placeholder when section capacity is unavailable', () => {
    const wrapper = mount(EnrollmentTable, {
      props: {
        enrollments: [{ ...enrollments[0], capacity: undefined }],
      },
    })

    expect(wrapper.text()).toContain('—')
    expect(wrapper.text()).not.toContain('undefined seats')

    wrapper.unmount()
  })
})

import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import CourseTable from '../../src/components/courses/CourseTable.vue'

const courses = [
  {
    uid: 'course_1',
    code: 'CS101',
    title: 'Introduction to Computer Science',
    department: 'Computer Science',
    credits: 3,
    status: 'Active',
    createdAt: '2026-01-01T00:00:00.000Z',
  },
]

describe('CourseTable', () => {
  it('provides accessible sort labels and shows the course code in the row', () => {
    const wrapper = mount(CourseTable, {
      props: {
        courses,
        sortKey: 'title',
        sortDir: 'asc',
      },
    })

    expect(wrapper.get('th[aria-sort="ascending"] .th-sort').attributes('aria-label')).toBe(
      'Sort by Course, currently ascending. Activate to sort descending.',
    )
    expect(wrapper.get('th[aria-sort="none"] .th-sort').attributes('aria-label')).toBe(
      'Sort by Code',
    )
    expect(wrapper.text()).toContain('CS101')
    expect(wrapper.text()).not.toContain('Record #')

    wrapper.unmount()
  })

  it('renders a placeholder when credits are missing', () => {
    const wrapper = mount(CourseTable, {
      props: {
        courses: [{ ...courses[0], credits: null }],
      },
    })

    expect(wrapper.text()).toContain('—')
    expect(wrapper.text()).not.toContain('null cr')

    wrapper.unmount()
  })
})

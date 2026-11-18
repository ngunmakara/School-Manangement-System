import { describe, expect, it } from 'vitest'
import {
  COURSE_STATUSES,
  createCourseUid,
  normalizeStoredCourse,
  normalizeStoredCourses,
  sanitizeCourseInput,
  validateCourseRecord,
} from '../../src/utils/courses'

function courseInput(overrides = {}) {
  return {
    code: ' cs101 ',
    title: '  Introduction   to Computer Science ',
    department: '  Computer Science ',
    credits: '3',
    status: 'Active',
    description: '  Introductory course. ',
    ...overrides,
  }
}

function storedCourse(overrides = {}) {
  return {
    uid: 'course_1',
    ...sanitizeCourseInput(courseInput()),
    code: 'CS101',
    title: 'Introduction to Computer Science',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('course utilities', () => {
  it('exposes the supported course statuses', () => {
    expect(COURSE_STATUSES).toEqual(['Active', 'Inactive'])
  })

  it('creates unique course identifiers', () => {
    expect(createCourseUid()).toMatch(/^course_/)
    expect(createCourseUid()).not.toBe(createCourseUid())
  })

  it('normalizes course fields consistently', () => {
    expect(sanitizeCourseInput(courseInput())).toEqual({
      code: 'CS101',
      title: 'Introduction to Computer Science',
      department: 'Computer Science',
      credits: 3,
      status: 'Active',
      description: 'Introductory course.',
    })
  })

  it('requires code, title, department, and valid credits', () => {
    expect(validateCourseRecord({})).toMatchObject({
      code: 'Course code is required.',
      title: 'Course title is required.',
      department: 'Department is required.',
      credits: 'Enter a whole number of credits between 1 and 12.',
    })
  })

  it.each([0, -1, 1.5, 13, 'not-a-number'])('rejects invalid credits %s', (credits) => {
    expect(validateCourseRecord(courseInput({ credits }))).toMatchObject({
      credits: 'Enter a whole number of credits between 1 and 12.',
    })
  })

  it('treats course codes as case-insensitive', () => {
    const existing = [storedCourse()]

    expect(validateCourseRecord(courseInput({ code: 'cs101' }), existing)).toMatchObject({
      code: 'This course code already exists.',
    })
  })

  it('does not treat the edited record own code as a duplicate', () => {
    const existing = [storedCourse()]

    expect(validateCourseRecord(courseInput({ code: 'CS101' }), existing, 'course_1')).toEqual({})
  })

  it('normalizes a single stored course without requiring batch recovery metadata', () => {
    expect(normalizeStoredCourse(storedCourse())).toEqual(storedCourse())
    expect(normalizeStoredCourse({ ...storedCourse(), code: '' })).toBeNull()
    expect(normalizeStoredCourse([])).toBeNull()
  })

  it('preserves valid records when another stored record is malformed', () => {
    const result = normalizeStoredCourses([
      storedCourse(),
      { ...storedCourse({ uid: 'course_2' }), title: '' },
      storedCourse({ uid: 'course_3', code: 'CS102' }),
    ])

    expect(result.records.map((record) => record.code)).toEqual(['CS101', 'CS102'])
    expect(result.discarded).toBe(1)
    expect(result.duplicateUids).toBe(0)
  })

  it('repairs malformed stored timestamps and fields without discarding the record', () => {
    const result = normalizeStoredCourses([
      storedCourse({ code: ' cs102 ', createdAt: 'not-a-date', updatedAt: '123' }),
    ])

    expect(result.records).toHaveLength(1)
    expect(result.discarded).toBe(0)
    expect(result.corrected).toBe(1)
    expect(result.records[0].code).toBe('CS102')
    expect(Number.isNaN(new Date(result.records[0].createdAt).getTime())).toBe(false)
    expect(Number.isNaN(new Date(result.records[0].updatedAt).getTime())).toBe(false)
  })

  it('preserves records with invalid stored credits without inventing a value', () => {
    const result = normalizeStoredCourses([storedCourse({ credits: 'abc' })])

    expect(result.records).toHaveLength(1)
    expect(result.discarded).toBe(0)
    expect(result.records[0].credits).toBeNull()
  })

  it('assigns fresh identifiers to stored courses with duplicate uids', () => {
    const result = normalizeStoredCourses([
      storedCourse(),
      storedCourse({ code: 'CS102', title: 'Data Structures' }),
    ])

    expect(result.records).toHaveLength(2)
    expect(result.records[0].uid).toBe('course_1')
    expect(result.records[1].uid).toMatch(/^course_recovered_/)
    expect(result.duplicateUids).toBe(1)
  })
})

import { describe, expect, it } from 'vitest'
import {
  enrollmentStatusLabel,
  getSectionSeatsUsed,
  normalizeEnrollmentStatus,
  normalizeStoredEnrollments,
  sanitizeEnrollmentInput,
  validateEnrollmentRecord,
} from '../../src/utils/enrollments'

function enrollmentInput(overrides = {}) {
  return {
    studentUid: 'student_1',
    sectionUid: 'section_1',
    status: 'enrolled',
    ...overrides,
  }
}

function storedEnrollment(overrides = {}) {
  return {
    uid: 'enrollment_1',
    ...enrollmentInput(),
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('enrollment utilities', () => {
  it('normalizes status values and labels', () => {
    expect(normalizeEnrollmentStatus(' ENROLLED ')).toBe('enrolled')
    expect(normalizeEnrollmentStatus('unknown')).toBe('')
    expect(enrollmentStatusLabel('dropped')).toBe('Dropped')
    expect(sanitizeEnrollmentInput({ studentUid: ' student_1 ', status: 'bad' })).toEqual({
      studentUid: 'student_1',
      sectionUid: '',
      status: 'enrolled',
    })
  })

  it('rejects duplicate active enrollments and sections at local capacity', () => {
    const duplicate = validateEnrollmentRecord(
      enrollmentInput(),
      [storedEnrollment()],
      [{ uid: 'section_1', capacity: 30 }],
    )
    expect(duplicate.form).toBe('This student is already enrolled in this class section.')

    const full = validateEnrollmentRecord(
      enrollmentInput(),
      [storedEnrollment({ uid: 'enrollment_2', studentUid: 'student_2' })],
      [{ uid: 'section_1', capacity: 1 }],
    )
    expect(full.sectionUid).toContain('This section is full (1/1 local enrollments)')
    expect(getSectionSeatsUsed([storedEnrollment()], 'section_1')).toBe(1)
  })

  it('allows editing an enrollment away from a full section', () => {
    const errors = validateEnrollmentRecord(
      enrollmentInput({ status: 'dropped' }),
      [storedEnrollment({ studentUid: 'student_2' })],
      [{ uid: 'section_1', capacity: 1 }],
      'enrollment_2',
    )

    expect(errors).toEqual({})
  })

  it('recovers malformed stored records without losing valid enrollments', () => {
    const result = normalizeStoredEnrollments([
      storedEnrollment(),
      storedEnrollment({
        uid: 'enrollment_2',
        studentUid: 'student_2',
        status: 'unknown',
        createdAt: '',
      }),
      storedEnrollment({ uid: 'enrollment_1', studentUid: 'student_3' }),
      storedEnrollment({ uid: 'enrollment_4', studentUid: '' }),
    ])

    expect(result.records).toHaveLength(3)
    expect(result.records[1]).toMatchObject({
      studentUid: 'student_2',
      status: 'enrolled',
    })
    expect(result.records[2].uid).toContain('enrollment_recovered_')
    expect(result).toMatchObject({
      discarded: 1,
      duplicateUids: 1,
    })
    expect(result.corrected).toBeGreaterThan(0)
  })
})

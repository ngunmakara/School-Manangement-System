import { describe, expect, it } from 'vitest'
import {
  normalizeStoredSections,
  sanitizeSectionInput,
  validateSectionRecord,
} from '../../src/utils/sections'

function sectionInput(overrides = {}) {
  return {
    code: 'cs101-a',
    subjectUid: 'subject_1',
    teacherUid: 'teacher_1',
    teacherName: '  Ada   Lovelace ',
    semesterUid: 'semester_1',
    room: '  Room 101 ',
    schedule: '  Mon 09:00 - 10:00 ',
    capacity: '30',
    status: 'Active',
    description: '  Introductory section. ',
    ...overrides,
  }
}

function storedSection(overrides = {}) {
  return {
    uid: 'section_1',
    ...sanitizeSectionInput(sectionInput()),
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('section utilities', () => {
  it('normalizes section fields consistently', () => {
    expect(sanitizeSectionInput(sectionInput())).toEqual({
      code: 'CS101-A',
      subjectUid: 'subject_1',
      teacherUid: 'teacher_1',
      teacherName: 'Ada Lovelace',
      semesterUid: 'semester_1',
      room: 'Room 101',
      schedule: 'Mon 09:00 - 10:00',
      capacity: 30,
      status: 'Active',
      description: 'Introductory section.',
    })
  })

  it('requires code, subject, teacher, semester, room, schedule, and capacity', () => {
    expect(validateSectionRecord({})).toMatchObject({
      code: 'Section code is required.',
      subjectUid: 'Subject is required.',
      teacherUid: 'Teacher is required.',
      semesterUid: 'Semester is required.',
      room: 'Room is required.',
      schedule: 'Schedule is required.',
      capacity: 'Enter a positive whole number for capacity.',
    })
  })

  it.each([0, -1, 1.5, 'not-a-number'])(
    'rejects non-positive or non-integer capacity %s',
    (capacity) => {
      expect(validateSectionRecord(sectionInput({ capacity }))).toMatchObject({
        capacity: 'Enter a positive whole number for capacity.',
      })
    },
  )

  it('treats section codes as case-insensitive within one semester', () => {
    const existing = [storedSection()]

    expect(validateSectionRecord(sectionInput({ code: 'cs101-a' }), existing)).toMatchObject({
      code: 'This section code already exists for the selected semester.',
    })
  })

  it('allows the same code in a different semester', () => {
    const existing = [storedSection()]

    expect(
      validateSectionRecord(sectionInput({ code: 'CS101-A', semesterUid: 'semester_2' }), existing),
    ).toEqual({})
  })

  it('does not treat the edited record own code as a duplicate', () => {
    const existing = [storedSection()]

    expect(validateSectionRecord(sectionInput({ code: 'CS101-A' }), existing, 'section_1')).toEqual(
      {},
    )
  })

  it('preserves valid records when another stored record is malformed', () => {
    const result = normalizeStoredSections([
      storedSection(),
      { ...storedSection({ uid: 'section_2' }), code: '' },
      storedSection({ uid: 'section_3', code: 'CS102-A' }),
    ])

    expect(result.records).toHaveLength(2)
    expect(result.records.map((record) => record.code)).toEqual(['CS101-A', 'CS102-A'])
    expect(result.discarded).toBe(1)
  })

  it('repairs malformed stored timestamps without discarding the record', () => {
    const result = normalizeStoredSections([
      storedSection({ createdAt: 'not-a-date', updatedAt: '123' }),
    ])

    expect(result.records).toHaveLength(1)
    expect(result.discarded).toBe(0)
    expect(result.corrected).toBe(1)
    expect(Number.isNaN(new Date(result.records[0].createdAt).getTime())).toBe(false)
    expect(Number.isNaN(new Date(result.records[0].updatedAt).getTime())).toBe(false)
  })
})

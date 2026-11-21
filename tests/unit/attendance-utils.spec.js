import { describe, expect, it } from 'vitest'
import {
  attendanceStatusLabel,
  hasDuplicateAttendance,
  normalizeAttendanceStatus,
  normalizeStoredAttendances,
  resolveSectionRoster,
  sanitizeAttendanceInput,
  toLocalDateKey,
  validateAttendanceRecord,
} from '../../src/utils/attendance'

function attendanceInput(overrides = {}) {
  return {
    studentUid: 'student_1',
    sectionUid: 'section_1',
    date: '2026-03-10',
    status: 'present',
    ...overrides,
  }
}

function storedAttendance(overrides = {}) {
  return {
    uid: 'attendance_1',
    ...attendanceInput(),
    createdAt: '2026-03-10T08:00:00.000Z',
    updatedAt: '2026-03-10T08:00:00.000Z',
    ...overrides,
  }
}

describe('attendance utilities', () => {
  it('normalizes attendance statuses and labels', () => {
    expect(normalizeAttendanceStatus(' PRESENT ')).toBe('present')
    expect(normalizeAttendanceStatus('unknown')).toBe('')
    expect(attendanceStatusLabel('late')).toBe('Late')
    expect(attendanceStatusLabel('unknown')).toBe('Unknown status')
    expect(sanitizeAttendanceInput({ studentUid: ' student_1 ', status: 'BAD' })).toEqual({
      studentUid: 'student_1',
      sectionUid: '',
      date: '',
      status: 'present',
    })
  })

  it('builds local calendar date keys without UTC conversion', () => {
    expect(toLocalDateKey(new Date(2026, 0, 5, 23, 30))).toBe('2026-01-05')
    expect(toLocalDateKey('2024-02-29')).toBe('2024-02-29')
    expect(toLocalDateKey('2025-02-29')).toBe('')
    expect(toLocalDateKey('2026-13-01')).toBe('')
    expect(toLocalDateKey('2026-01-00')).toBe('')
    expect(toLocalDateKey('10/03/2026')).toBe('')
    expect(toLocalDateKey(new Date('invalid'))).toBe('')
  })

  it('validates required fields, roster membership, status, date, and duplicates', () => {
    const records = [storedAttendance()]
    const context = {
      sections: [{ uid: 'section_1' }],
      roster: [{ uid: 'student_1' }, { uid: 'student_2' }],
    }

    expect(validateAttendanceRecord(attendanceInput(), [], context)).toEqual({})

    const duplicate = validateAttendanceRecord(attendanceInput(), records, context)
    expect(duplicate.form).toBe('Attendance for this student, section, and date already exists.')

    const editing = validateAttendanceRecord(attendanceInput(), records, {
      ...context,
      editingUid: 'attendance_1',
    })
    expect(editing).toEqual({})

    const invalid = validateAttendanceRecord(
      attendanceInput({ studentUid: 'student_9', sectionUid: '', date: 'bad', status: 'bad' }),
      [],
      context,
    )
    expect(invalid).toEqual({
      studentUid: 'Select a student from the current section roster.',
      sectionUid: 'Select a class section.',
      date: 'Enter a valid calendar date.',
      status: 'Select a valid attendance status.',
    })
  })

  it('detects duplicate identity for the same student, section, and date', () => {
    expect(hasDuplicateAttendance([storedAttendance()], attendanceInput())).toBe(true)
    expect(hasDuplicateAttendance([storedAttendance()], attendanceInput(), 'attendance_1')).toBe(
      false,
    )
    expect(
      hasDuplicateAttendance([storedAttendance()], attendanceInput({ date: '2026-03-11' })),
    ).toBe(false)
  })

  it('resolves only active enrollment records for the selected section', () => {
    const result = resolveSectionRoster(
      [
        { studentUid: 'student_2', sectionUid: 'section_1', status: 'enrolled' },
        { studentUid: 'student_1', sectionUid: 'section_1', status: 'enrolled' },
        { studentUid: 'student_3', sectionUid: 'section_1', status: 'dropped' },
        { studentUid: 'student_4', sectionUid: 'section_2', status: 'enrolled' },
        { studentUid: 'student_5', sectionUid: 'section_1', status: 'enrolled' },
      ],
      [
        { uid: 'student_1', fullName: 'Ada Lovelace' },
        { uid: 'student_2', fullName: 'Grace Hopper' },
      ],
      'section_1',
    )

    expect(result.roster.map((student) => student.uid)).toEqual(['student_1', 'student_2'])
    expect(result.unresolvedCount).toBe(1)
    expect(result.enrollmentCount).toBe(3)
  })

  it('recovers malformed stored attendance without losing valid records', () => {
    const result = normalizeStoredAttendances([
      storedAttendance(),
      storedAttendance({ uid: 'attendance_2', status: 'bad', date: ' 2026-03-11 ' }),
      storedAttendance({ uid: 'attendance_1', studentUid: 'student_3' }),
      storedAttendance({ uid: 'attendance_4' }),
      storedAttendance({ uid: 'attendance_5', studentUid: '' }),
    ])

    expect(result.records).toHaveLength(3)
    expect(result.records[1]).toMatchObject({
      studentUid: 'student_1',
      date: '2026-03-11',
      status: 'present',
    })
    expect(result.records[2].uid).toContain('attendance_recovered_')
    expect(result).toMatchObject({
      discarded: 2,
      duplicateIdentity: 1,
      duplicateUids: 1,
    })
    expect(result.corrected).toBeGreaterThan(0)
  })
})

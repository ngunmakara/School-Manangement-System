import { describe, expect, it } from 'vitest'
import {
  attendanceRows,
  attendanceTotals,
  buildCsv,
  escapeCsvCell,
  gradeBandCounts,
  gradeRows,
  isWithinDateRange,
  performanceRows,
  studentDepartmentRows,
} from '../../src/utils/reports'

describe('report calculations', () => {
  it('applies inclusive date range bounds', () => {
    expect(isWithinDateRange('2026-03-10', '2026-03-10', '2026-03-20')).toBe(true)
    expect(isWithinDateRange('2026-03-20', '2026-03-10', '2026-03-20')).toBe(true)
    expect(isWithinDateRange('2026-03-09', '2026-03-10', '2026-03-20')).toBe(false)
    expect(isWithinDateRange('2026-03-21', '2026-03-10', '2026-03-20')).toBe(false)
    expect(isWithinDateRange('2026-03-12T08:00:00.000Z', '2026-03-10', '2026-03-20')).toBe(true)
    expect(isWithinDateRange('2026-03-12T08:00:00.000Z', '2026-03-13', '2026-03-20')).toBe(false)
    expect(isWithinDateRange('', '', '')).toBe(true)
  })

  it('groups students by department and status', () => {
    expect(
      studentDepartmentRows([
        { department: 'Engineering', status: 'Active' },
        { department: 'Engineering', status: 'Inactive' },
        { status: 'Active' },
      ]),
    ).toEqual([
      { department: 'Engineering', total: 2, active: 1, inactive: 1 },
      { department: 'Unassigned', total: 1, active: 1, inactive: 0 },
    ])
  })

  it('summarizes attendance totals and section rates', () => {
    const records = [
      { sectionUid: 'section_1', status: 'present' },
      { sectionUid: 'section_1', status: 'late' },
      { sectionUid: 'section_1', status: 'absent' },
      { sectionUid: 'section_2', status: 'excused' },
    ]

    expect(attendanceTotals(records)).toEqual({
      present: 1,
      absent: 1,
      late: 1,
      excused: 1,
      total: 4,
      attendanceRate: 50,
    })
    expect(attendanceRows(records, [{ uid: 'section_1', code: 'CS101-A' }])).toEqual([
      {
        sectionUid: 'section_1',
        sectionCode: 'CS101-A',
        semesterUid: '',
        present: 1,
        absent: 1,
        late: 1,
        excused: 0,
        total: 3,
        attendanceRate: 66.7,
      },
      {
        sectionUid: 'section_2',
        sectionCode: 'Unknown section',
        semesterUid: '',
        present: 0,
        absent: 0,
        late: 0,
        excused: 1,
        total: 1,
        attendanceRate: 0,
      },
    ])
  })

  it('builds academic coverage from catalog and section relationships', () => {
    expect(
      performanceRows(
        [
          { department: 'Engineering', credits: 3, status: 'Active' },
          { department: 'Engineering', credits: 2, status: 'Inactive' },
        ],
        [{ uid: 'subject_1', department: 'Engineering', credits: 4 }],
        [{ uid: 'section_1', subjectUid: 'subject_1' }],
      ),
    ).toEqual([
      {
        department: 'Engineering',
        courses: 2,
        activeCourses: 1,
        subjects: 1,
        creditHours: 9,
        sections: 1,
      },
    ])
  })

  it('derives grade bands and enriched grade rows', () => {
    const grades = [
      {
        uid: 'grade_1',
        studentUid: 'student_1',
        sectionUid: 'section_1',
        subjectUid: 'subject_1',
        semesterUid: 'semester_1',
        scores: { assignment: 100, quiz: 100, midterm: 100, final: 100 },
        createdAt: '2026-03-10T08:00:00.000Z',
      },
      {
        uid: 'grade_2',
        studentUid: 'student_2',
        sectionUid: 'section_1',
        subjectUid: 'subject_1',
        semesterUid: 'semester_1',
        scores: { assignment: 20, quiz: 20, midterm: 20, final: 20 },
        createdAt: '2026-03-11T08:00:00.000Z',
      },
    ]

    expect(gradeBandCounts(grades)).toEqual([
      { letter: 'A', count: 1 },
      { letter: 'B', count: 0 },
      { letter: 'C', count: 0 },
      { letter: 'D', count: 0 },
      { letter: 'F', count: 1 },
    ])

    const rows = gradeRows(grades, {
      students: [{ uid: 'student_1', fullName: 'Ada Lovelace', studentId: 'S1001' }],
      sections: [{ uid: 'section_1', code: 'CS101-A' }],
      subjects: [{ uid: 'subject_1', name: 'Database Systems' }],
      semesters: [{ uid: 'semester_1', name: 'Fall 2026', academicYear: '2026-2027' }],
    })

    expect(rows[0]).toMatchObject({
      studentName: 'Ada Lovelace',
      sectionCode: 'CS101-A',
      subjectName: 'Database Systems',
      semesterName: 'Fall 2026 · 2026-2027',
      totalScore: 100,
      letterGrade: 'A',
      gpa: 4,
      status: 'Pass',
    })
    expect(rows[1].studentName).toBe('Unknown student')
  })
})

describe('CSV export helpers', () => {
  it('quotes and escapes CSV cells', () => {
    expect(escapeCsvCell('Engineering')).toBe('Engineering')
    expect(escapeCsvCell('Ada "A" Lovelace')).toBe('"Ada ""A"" Lovelace"')
    expect(escapeCsvCell('One, two')).toBe('"One, two"')
    expect(
      buildCsv([
        ['Report', 'Value'],
        ['Attendance', 4],
      ]),
    ).toBe('Report,Value\r\nAttendance,4')
  })
})

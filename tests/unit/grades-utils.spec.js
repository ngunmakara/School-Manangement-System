import { describe, expect, it } from 'vitest'
import {
  calculateGradeResult,
  gradeSummary,
  normalizeStoredGrades,
  validateGradeRecord,
} from '../../src/utils/grades'

function grade(overrides = {}) {
  return {
    studentUid: 'student_1',
    sectionUid: 'section_1',
    subjectUid: 'subject_1',
    semesterUid: 'semester_1',
    scores: {
      assignment: 100,
      quiz: 90,
      midterm: 80,
      final: 70,
    },
    ...overrides,
  }
}

describe('grading calculations', () => {
  it('applies assessment weights and maps totals to letter grade, GPA, and status', () => {
    expect(calculateGradeResult(grade())).toEqual({
      totalScore: 83,
      letterGrade: 'B',
      gradePoints: 3,
      status: 'Pass',
    })

    expect(
      calculateGradeResult(
        grade({
          scores: { assignment: 100, quiz: 100, midterm: 100, final: 80 },
        }),
      ),
    ).toMatchObject({ totalScore: 94, letterGrade: 'A', gradePoints: 4, status: 'Pass' })

    expect(
      calculateGradeResult(
        grade({
          scores: { assignment: 40, quiz: 50, midterm: 60, final: 55 },
        }),
      ),
    ).toMatchObject({ totalScore: 52.5, letterGrade: 'F', gradePoints: 0, status: 'Fail' })
  })

  it('summarizes distinct students, average score, GPA, and pass rate', () => {
    const passing = grade()
    const failing = grade({
      studentUid: 'student_2',
      scores: { assignment: 20, quiz: 30, midterm: 40, final: 50 },
    })

    expect(gradeSummary([passing, failing])).toEqual({
      studentCount: 2,
      averageScore: 60,
      averageGpa: 1.5,
      passRate: 50,
      passCount: 1,
      totalCount: 2,
    })
  })
})

describe('grade validation', () => {
  const context = {
    students: [{ uid: 'student_1' }, { uid: 'student_2' }],
    sections: [
      {
        uid: 'section_1',
        subjectUid: 'subject_1',
        semesterUid: 'semester_1',
      },
    ],
    subjects: [{ uid: 'subject_1' }],
    semesters: [{ uid: 'semester_1' }],
    rosterUids: new Set(['student_1', 'student_2']),
  }

  it('requires scores between 0 and 100', () => {
    const errors = validateGradeRecord(
      grade({
        scores: { assignment: 101, quiz: '', midterm: -2, final: 'abc' },
      }),
      [],
      context,
    )

    expect(errors.assignment).toBe('Score must be between 0 and 100.')
    expect(errors.quiz).toBe('Enter a score from 0 to 100.')
    expect(errors.midterm).toBe('Score must be between 0 and 100.')
    expect(errors.final).toBe('Enter a score from 0 to 100.')
  })

  it('rejects subject and semester values that do not match the section', () => {
    const errors = validateGradeRecord(
      grade({ subjectUid: 'subject_9', semesterUid: 'semester_9' }),
      [],
      context,
    )

    expect(errors.subjectUid).toBe('Subject must match the selected class section.')
    expect(errors.semesterUid).toBe('Semester must match the selected class section.')
  })
})

describe('stored grade normalization', () => {
  it('discards invalid records, repairs scores, and removes duplicate identities', () => {
    const result = normalizeStoredGrades([
      { uid: 'keep', ...grade() },
      { uid: 'dupe', ...grade() },
      {
        uid: 'repair',
        ...grade({
          studentUid: 'student_2',
          scores: { ...grade().scores, quiz: 140 },
        }),
      },
      { uid: 'invalid', ...grade({ studentUid: '' }) },
    ])

    expect(result.records).toHaveLength(2)
    expect(result.records[0].uid).toBe('keep')
    expect(result.records[1].scores.quiz).toBe(100)
    expect(result.discarded).toBe(2)
    expect(result.duplicateIdentity).toBe(1)
  })
})

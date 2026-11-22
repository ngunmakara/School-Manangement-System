import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useGradesStore } from '../../src/stores/grades'

const STORAGE_KEY = 'campushub:grades:v1'

const students = [{ uid: 'student_1' }, { uid: 'student_2' }]
const sections = [
  {
    uid: 'section_1',
    code: 'CS101-A',
    subjectUid: 'subject_1',
    semesterUid: 'semester_1',
  },
]
const subjects = [{ uid: 'subject_1', code: 'CS101', name: 'Database Systems' }]
const semesters = [{ uid: 'semester_1', name: 'Fall 2026', academicYear: '2026-2027' }]

function gradeInput(overrides = {}) {
  return {
    studentUid: 'student_1',
    sectionUid: 'section_1',
    subjectUid: 'subject_1',
    semesterUid: 'semester_1',
    studentName: 'Ada Lovelace',
    studentId: 'S1001',
    sectionCode: 'CS101-A',
    subjectName: 'Database Systems',
    semesterName: 'Fall 2026 · 2026-2027',
    scores: {
      assignment: 100,
      quiz: 90,
      midterm: 80,
      final: 70,
    },
    ...overrides,
  }
}

function context() {
  return {
    students,
    sections,
    subjects,
    semesters,
    rosterUids: new Set(['student_1', 'student_2']),
  }
}

beforeEach(() => {
  window.localStorage.clear()
  setActivePinia(createPinia())
})

afterEach(() => {
  vi.restoreAllMocks()
  window.localStorage.clear()
})

describe('grades store', () => {
  it('adds, updates, deletes, and persists grade records with calculated results', () => {
    const store = useGradesStore()

    const added = store.addGrade(gradeInput(), context())
    expect(added.ok).toBe(true)
    expect(store.grades).toHaveLength(1)
    expect(JSON.parse(window.localStorage.getItem(STORAGE_KEY))).toHaveLength(1)
    expect(store.resultFor(added.grade)).toMatchObject({
      totalScore: 83,
      letterGrade: 'B',
      gradePoints: 3,
      status: 'Pass',
    })

    const updated = store.updateGrade(
      added.grade.uid,
      gradeInput({
        scores: { assignment: 100, quiz: 100, midterm: 100, final: 100 },
      }),
      context(),
    )
    expect(updated.ok).toBe(true)
    expect(updated.grade.createdAt).toBe(added.grade.createdAt)
    expect(store.resultFor(updated.grade).letterGrade).toBe('A')

    const deleted = store.deleteGrade(updated.grade.uid)
    expect(deleted.ok).toBe(true)
    expect(store.grades).toHaveLength(0)
    expect(JSON.parse(window.localStorage.getItem(STORAGE_KEY))).toEqual([])
  })

  it('prevents duplicate student, section, subject, and semester identities while allowing self-edits', () => {
    const store = useGradesStore()
    const first = store.addGrade(gradeInput(), context())
    expect(first.ok).toBe(true)

    const duplicate = store.addGrade(gradeInput(), context())
    expect(duplicate.ok).toBe(false)
    expect(duplicate.errors.form).toBe(
      'A grade for this student, section, subject, and semester already exists.',
    )

    const selfEdit = store.updateGrade(
      first.grade.uid,
      gradeInput({
        scores: { assignment: 90, quiz: 90, midterm: 90, final: 90 },
      }),
      context(),
    )
    expect(selfEdit.ok).toBe(true)

    const second = store.addGrade(gradeInput({ studentUid: 'student_2' }), context())
    expect(second.ok).toBe(true)

    const collision = store.updateGrade(
      first.grade.uid,
      gradeInput({ studentUid: 'student_2' }),
      context(),
    )
    expect(collision.ok).toBe(false)
    expect(collision.errors.form).toBe(
      'A grade for this student, section, subject, and semester already exists.',
    )
  })

  it('reloads normalized records from browser storage', () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([
        {
          ...gradeInput(),
          uid: 'grade_1',
          createdAt: '2026-03-10T08:00:00.000Z',
          updatedAt: '2026-03-10T08:00:00.000Z',
        },
      ]),
    )

    const store = useGradesStore()
    expect(store.loadGrades()).toBe(true)
    expect(store.totalGrades).toBe(1)
    expect(store.gradedStudentCount).toBe(1)
    expect(store.passRate).toBe(100)
  })

  it('keeps changes in memory when browser storage writes fail', () => {
    const store = useGradesStore()
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota')
    })

    const added = store.addGrade(gradeInput(), context())
    expect(added.ok).toBe(true)
    expect(added.persisted).toBe(false)
    expect(store.persistenceState).toBe('failed')
    expect(store.grades).toHaveLength(1)
  })
})

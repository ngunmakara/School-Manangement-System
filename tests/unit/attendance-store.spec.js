import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useAttendanceStore } from '../../src/stores/attendance'

const STORAGE_KEY = 'campushub:attendance:v1'
const sections = [{ uid: 'section_1', code: 'CS101-A' }]
const roster = [
  { uid: 'student_1', fullName: 'Ada Lovelace' },
  { uid: 'student_2', fullName: 'Grace Hopper' },
]

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

function context(overrides = {}) {
  return { sections, roster, ...overrides }
}

beforeEach(() => {
  window.localStorage.clear()
  setActivePinia(createPinia())
})

afterEach(() => {
  vi.restoreAllMocks()
  window.localStorage.clear()
})

describe('attendance store', () => {
  it('adds, updates, deletes, and persists attendance records', () => {
    const store = useAttendanceStore()

    const added = store.addAttendance(attendanceInput(), context())
    expect(added.ok).toBe(true)
    expect(store.attendance).toHaveLength(1)
    expect(JSON.parse(window.localStorage.getItem(STORAGE_KEY))).toHaveLength(1)

    const updated = store.updateAttendance(
      added.attendance.uid,
      attendanceInput({ status: 'late' }),
      context(),
    )
    expect(updated.ok).toBe(true)
    expect(updated.attendance.createdAt).toBe(added.attendance.createdAt)
    expect(updated.attendance.status).toBe('late')

    const deleted = store.deleteAttendance(added.attendance.uid)
    expect(deleted.ok).toBe(true)
    expect(store.attendance).toHaveLength(0)
    expect(JSON.parse(window.localStorage.getItem(STORAGE_KEY))).toEqual([])
  })

  it('prevents duplicate student, section, and date pairs while allowing self-edits', () => {
    const store = useAttendanceStore()
    const first = store.addAttendance(attendanceInput(), context())
    expect(first.ok).toBe(true)

    const duplicate = store.addAttendance(attendanceInput(), context())
    expect(duplicate.ok).toBe(false)
    expect(duplicate.errors.form).toBe(
      'Attendance for this student, section, and date already exists.',
    )

    const selfEdit = store.updateAttendance(
      first.attendance.uid,
      attendanceInput({ status: 'absent' }),
      context(),
    )
    expect(selfEdit.ok).toBe(true)

    const second = store.addAttendance(attendanceInput({ studentUid: 'student_2' }), context())
    expect(second.ok).toBe(true)

    const collision = store.updateAttendance(
      first.attendance.uid,
      attendanceInput({ studentUid: 'student_2' }),
      context(),
    )
    expect(collision.ok).toBe(false)
    expect(collision.errors.form).toBe(
      'Attendance for this student, section, and date already exists.',
    )
  })

  it('validates records against the selected section roster and date', () => {
    const store = useAttendanceStore()

    const unknownStudent = store.addAttendance(
      attendanceInput({ studentUid: 'student_9' }),
      context(),
    )
    expect(unknownStudent.ok).toBe(false)
    expect(unknownStudent.errors.studentUid).toBe(
      'Select a student from the current section roster.',
    )

    const unknownSection = store.addAttendance(
      attendanceInput({ sectionUid: 'section_9' }),
      context(),
    )
    expect(unknownSection.ok).toBe(false)
    expect(unknownSection.errors.sectionUid).toBe('Select an available class section.')

    const invalidDate = store.addAttendance(attendanceInput({ date: '2025-02-29' }), context())
    expect(invalidDate.ok).toBe(false)
    expect(invalidDate.errors.date).toBe('Enter a valid calendar date.')

    expect(store.attendance).toHaveLength(0)
  })

  it('recovers valid records when stored data is malformed', () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([
        storedAttendance(),
        storedAttendance({ uid: 'attendance_2', studentUid: '' }),
      ]),
    )

    const store = useAttendanceStore()

    expect(store.attendance).toHaveLength(1)
    expect(store.storageState).toBe('recovered')
    expect(store.recovery).toMatchObject({ kind: 'records', discarded: 1 })

    expect(store.loadAttendance()).toBe(true)
    expect(JSON.parse(window.localStorage.getItem(STORAGE_KEY))).toHaveLength(1)
  })

  it('handles invalid stored JSON without losing the ability to save', () => {
    window.localStorage.setItem(STORAGE_KEY, '{not-json')

    const store = useAttendanceStore()

    expect(store.attendance).toEqual([])
    expect(store.storageState).toBe('recovered')
    expect(store.recovery).toMatchObject({ kind: 'invalid-json' })

    expect(store.addAttendance(attendanceInput(), context()).ok).toBe(true)
    expect(JSON.parse(window.localStorage.getItem(STORAGE_KEY))).toHaveLength(1)
  })

  it('keeps session-only changes and retries persistence after a failed write', () => {
    const store = useAttendanceStore()
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota exceeded')
    })

    const added = store.addAttendance(attendanceInput(), context())
    expect(added.ok).toBe(true)
    expect(added.persisted).toBe(false)
    expect(store.attendance).toHaveLength(1)
    expect(store.persistenceState).toBe('failed')
    expect(store.persistenceError).toContain('not accepting attendance saves')

    setItemSpy.mockRestore()

    const retried = store.retryPersist()
    expect(retried.ok).toBe(true)
    expect(retried.persisted).toBe(true)
    expect(store.persistenceState).toBe('ok')
    expect(JSON.parse(window.localStorage.getItem(STORAGE_KEY))).toHaveLength(1)
  })

  it('clears stale unavailable storage state after a successful retry', () => {
    const getItemSpy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('storage blocked')
    })

    const store = useAttendanceStore()
    expect(store.storageState).toBe('unavailable')
    expect(store.persistenceState).toBe('unavailable')

    getItemSpy.mockRestore()
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota exceeded')
    })

    const added = store.addAttendance(attendanceInput(), context())
    expect(added.ok).toBe(true)
    expect(added.persisted).toBe(false)
    expect(store.storageState).toBe('unavailable')
    expect(store.persistenceState).toBe('failed')

    const failedRetry = store.retryPersist()
    expect(failedRetry.ok).toBe(false)
    expect(failedRetry.persisted).toBe(false)
    expect(store.storageState).toBe('unavailable')
    expect(store.persistenceState).toBe('failed')

    setItemSpy.mockRestore()
    const retried = store.retryPersist()
    expect(retried.ok).toBe(true)
    expect(retried.persisted).toBe(true)
    expect(store.storageState).toBe('ok')
    expect(store.persistenceState).toBe('ok')
    expect(store.persistenceError).toBe('')
    expect(JSON.parse(window.localStorage.getItem(STORAGE_KEY))).toEqual([
      expect.objectContaining({
        studentUid: 'student_1',
        sectionUid: 'section_1',
        date: '2026-03-10',
        status: 'present',
      }),
    ])
  })
})

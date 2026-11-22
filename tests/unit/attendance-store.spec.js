import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useAttendanceStore } from '../../src/stores/attendance'

const STORAGE_KEY = 'campushub:attendance:v1'
const RECOVERY_KEY = `${STORAGE_KEY}:recovery`
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

  it('allows a historical edit while the identity is unchanged and validates identity changes', () => {
    const store = useAttendanceStore()
    const added = store.addAttendance(attendanceInput(), context())
    expect(added.ok).toBe(true)

    const historical = store.updateAttendance(
      added.attendance.uid,
      attendanceInput({ status: 'late' }),
      {
        sections,
        roster: [],
      },
    )
    expect(historical.ok).toBe(true)
    expect(historical.attendance).toMatchObject({
      uid: added.attendance.uid,
      studentUid: 'student_1',
      sectionUid: 'section_1',
      date: '2026-03-10',
      status: 'late',
    })
    expect(historical.attendance.createdAt).toBe(added.attendance.createdAt)
    expect(JSON.parse(window.localStorage.getItem(STORAGE_KEY))[0]).toMatchObject({
      studentUid: 'student_1',
      sectionUid: 'section_1',
      date: '2026-03-10',
      status: 'late',
    })

    const changedStudent = store.updateAttendance(
      added.attendance.uid,
      attendanceInput({ studentUid: 'student_9' }),
      { sections, roster: [] },
    )
    expect(changedStudent.ok).toBe(false)
    expect(changedStudent.errors.studentUid).toBe(
      'Select a student from the current section roster.',
    )

    const changedSection = store.updateAttendance(
      added.attendance.uid,
      attendanceInput({ sectionUid: 'section_2' }),
      { sections: [...sections, { uid: 'section_2' }], roster: [] },
    )
    expect(changedSection.ok).toBe(false)
    expect(changedSection.errors.studentUid).toBe(
      'Select a student from the current section roster.',
    )

    const changedDate = store.updateAttendance(
      added.attendance.uid,
      attendanceInput({ date: '2026-03-11' }),
      { sections, roster: [] },
    )
    expect(changedDate.ok).toBe(false)
    expect(changedDate.errors.studentUid).toBe('Select a student from the current section roster.')
  })

  it('does not trust a client-supplied historical override for creates or missing edits', () => {
    const store = useAttendanceStore()

    const overriddenCreate = store.addAttendance(attendanceInput({ studentUid: 'student_9' }), {
      ...context(),
      historicalIdentityPreserved: true,
    })
    expect(overriddenCreate.ok).toBe(false)
    expect(overriddenCreate.errors.studentUid).toBe(
      'Select a student from the current section roster.',
    )

    const missingEdit = store.updateAttendance('missing', attendanceInput(), {
      ...context(),
      historicalIdentityPreserved: true,
    })
    expect(missingEdit.ok).toBe(false)
    expect(missingEdit.errors.form).toBe('This attendance record no longer exists.')
    expect(store.attendance).toHaveLength(0)
  })

  it('keeps duplicate identity checks active when a historical edit changes identity', () => {
    const store = useAttendanceStore()
    const first = store.addAttendance(attendanceInput(), context())
    const second = store.addAttendance(
      attendanceInput({ studentUid: 'student_2', date: '2026-03-11' }),
      context(),
    )
    expect(first.ok).toBe(true)
    expect(second.ok).toBe(true)

    const conflict = store.updateAttendance(second.attendance.uid, attendanceInput(), context())
    expect(conflict.ok).toBe(false)
    expect(conflict.errors.form).toBe(
      'Attendance for this student, section, and date already exists.',
    )

    const selfEdit = store.updateAttendance(
      first.attendance.uid,
      attendanceInput({ status: 'absent' }),
      context(),
    )
    expect(selfEdit.ok).toBe(true)
  })

  it('persists a historical status update across a store reload', () => {
    const store = useAttendanceStore()
    const added = store.addAttendance(attendanceInput(), context())
    const updated = store.updateAttendance(
      added.attendance.uid,
      attendanceInput({ status: 'excused' }),
      { sections, roster: [] },
    )

    expect(updated.persisted).toBe(true)
    expect(JSON.parse(window.localStorage.getItem(STORAGE_KEY))[0]).toMatchObject({
      studentUid: 'student_1',
      sectionUid: 'section_1',
      date: '2026-03-10',
      status: 'excused',
    })

    setActivePinia(createPinia())
    const reloaded = useAttendanceStore()
    expect(reloaded.attendance).toHaveLength(1)
    expect(reloaded.attendance[0]).toMatchObject({
      uid: added.attendance.uid,
      studentUid: 'student_1',
      sectionUid: 'section_1',
      date: '2026-03-10',
      status: 'excused',
    })
  })

  it('does not report success for a failed historical update and can retry the save', () => {
    const store = useAttendanceStore()
    const added = store.addAttendance(attendanceInput(), context())
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota exceeded')
    })

    const updated = store.updateAttendance(
      added.attendance.uid,
      attendanceInput({ status: 'absent' }),
      { sections, roster: [] },
    )
    expect(updated.ok).toBe(true)
    expect(updated.persisted).toBe(false)
    expect(store.persistenceState).toBe('failed')
    expect(store.persistenceError).toContain('not accepting attendance saves')
    expect(JSON.parse(window.localStorage.getItem(STORAGE_KEY))[0].status).toBe('present')

    setItemSpy.mockRestore()
    const retried = store.retryPersist()
    expect(retried.ok).toBe(true)
    expect(retried.persisted).toBe(true)
    expect(JSON.parse(window.localStorage.getItem(STORAGE_KEY))[0].status).toBe('absent')
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
    expect(window.localStorage.getItem(RECOVERY_KEY)).not.toBeNull()

    expect(store.loadAttendance()).toBe(true)
    expect(store.recovery).toMatchObject({ kind: 'records', discarded: 1 })
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

  it('keeps the recovery warning through a reload and clears it after a successful edit', () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([
        storedAttendance(),
        storedAttendance({ uid: 'attendance_2', studentUid: '' }),
      ]),
    )

    const store = useAttendanceStore()
    expect(store.attendance).toHaveLength(1)
    expect(store.recovery).toMatchObject({ kind: 'records', discarded: 1 })
    expect(window.localStorage.getItem(RECOVERY_KEY)).not.toBeNull()

    store.loadAttendance()
    expect(store.recovery).toMatchObject({ kind: 'records', discarded: 1 })
    expect(store.storageState).toBe('recovered')

    setActivePinia(createPinia())
    const reloaded = useAttendanceStore()
    expect(reloaded.attendance).toHaveLength(1)
    expect(reloaded.attendance[0].uid).toBe('attendance_1')
    expect(reloaded.recovery).toMatchObject({ kind: 'records', discarded: 1 })
    expect(reloaded.storageState).toBe('recovered')
    expect(JSON.parse(window.localStorage.getItem(STORAGE_KEY))).toHaveLength(1)

    const edited = reloaded.updateAttendance('attendance_1', attendanceInput({ status: 'late' }), {
      sections,
      roster: [],
    })
    expect(edited.ok).toBe(true)
    expect(edited.persisted).toBe(true)
    expect(reloaded.recovery).toBeNull()
    expect(reloaded.storageState).toBe('ok')
    expect(window.localStorage.getItem(RECOVERY_KEY)).toBeNull()
    expect(JSON.parse(window.localStorage.getItem(STORAGE_KEY))).toEqual([
      expect.objectContaining({ uid: 'attendance_1', status: 'late' }),
    ])
  })

  it('does not warn for valid stored attendance data before or after a reload', () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([storedAttendance()]))

    const store = useAttendanceStore()
    expect(store.recovery).toBeNull()
    expect(store.storageState).toBe('ok')
    expect(window.localStorage.getItem(RECOVERY_KEY)).toBeNull()

    store.loadAttendance()
    expect(store.recovery).toBeNull()

    setActivePinia(createPinia())
    const reloaded = useAttendanceStore()
    expect(reloaded.recovery).toBeNull()
    expect(reloaded.storageState).toBe('ok')
    expect(reloaded.attendance).toHaveLength(1)
  })

  it.each([
    ['{not-json', 'invalid-json'],
    ['{"attendance":[]}', 'invalid-format'],
  ])('persists an unreadable storage warning (%s) across a reload', (raw, kind) => {
    window.localStorage.setItem(STORAGE_KEY, raw)

    const store = useAttendanceStore()
    expect(store.attendance).toEqual([])
    expect(store.recovery).toMatchObject({ kind })
    expect(window.localStorage.getItem(RECOVERY_KEY)).not.toBeNull()

    setActivePinia(createPinia())
    const reloaded = useAttendanceStore()
    expect(reloaded.attendance).toEqual([])
    expect(reloaded.recovery).toMatchObject({ kind })
    expect(reloaded.storageState).toBe('recovered')
    expect(JSON.parse(window.localStorage.getItem(STORAGE_KEY))).toEqual([])

    const added = reloaded.addAttendance(attendanceInput(), context())
    expect(added.ok).toBe(true)
    expect(reloaded.recovery).toBeNull()
    expect(window.localStorage.getItem(RECOVERY_KEY)).toBeNull()
    expect(JSON.parse(window.localStorage.getItem(STORAGE_KEY))).toHaveLength(1)
  })

  it('keeps all recoverable records without duplicates across reloads', () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([
        storedAttendance(),
        storedAttendance({ uid: 'attendance_1', date: '2026-03-11', status: 'late' }),
      ]),
    )

    const store = useAttendanceStore()
    expect(store.attendance).toHaveLength(2)
    expect(store.recovery).toMatchObject({ kind: 'records', duplicateUids: 1 })
    expect(new Set(store.attendance.map((record) => record.uid)).size).toBe(2)

    setActivePinia(createPinia())
    const reloaded = useAttendanceStore()
    expect(reloaded.attendance).toHaveLength(2)
    expect(new Set(reloaded.attendance.map((record) => record.uid)).size).toBe(2)
    expect(JSON.parse(window.localStorage.getItem(STORAGE_KEY))).toHaveLength(2)
  })

  it('keeps the recovery warning after a failed save and clears it after a retry', () => {
    window.localStorage.setItem(STORAGE_KEY, '{not-json')

    const store = useAttendanceStore()
    expect(store.recovery).toMatchObject({ kind: 'invalid-json' })

    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota exceeded')
    })

    const added = store.addAttendance(attendanceInput(), context())
    expect(added.ok).toBe(true)
    expect(added.persisted).toBe(false)
    expect(store.recovery).toMatchObject({ kind: 'invalid-json' })
    expect(window.localStorage.getItem(RECOVERY_KEY)).not.toBeNull()

    setItemSpy.mockRestore()
    expect(store.retryPersist().ok).toBe(true)
    expect(store.recovery).toBeNull()
    expect(window.localStorage.getItem(RECOVERY_KEY)).toBeNull()
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

import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useEnrollmentsStore } from '../../src/stores/enrollments'

const STORAGE_KEY = 'campushub:enrollments:v1'
const sections = [{ uid: 'section_1', code: 'CS101-A', capacity: 30 }]
const students = [{ uid: 'student_1', fullName: 'Ada Lovelace', studentId: 'S1001' }]

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

function context() {
  return { sections, students }
}

beforeEach(() => {
  window.localStorage.clear()
  setActivePinia(createPinia())
})

afterEach(() => {
  vi.restoreAllMocks()
  window.localStorage.clear()
})

describe('enrollments store', () => {
  it('adds, updates, deletes, and persists enrollment records', () => {
    const store = useEnrollmentsStore()

    const added = store.addEnrollment(enrollmentInput(), context())
    expect(added.ok).toBe(true)
    expect(store.enrollments).toHaveLength(1)
    expect(JSON.parse(window.localStorage.getItem(STORAGE_KEY))).toHaveLength(1)

    const updated = store.updateEnrollment(
      added.enrollment.uid,
      enrollmentInput({ status: 'completed' }),
      context(),
    )
    expect(updated.ok).toBe(true)
    expect(updated.enrollment.createdAt).toBe(added.enrollment.createdAt)
    expect(updated.enrollment.status).toBe('completed')

    const deleted = store.deleteEnrollment(added.enrollment.uid)
    expect(deleted.ok).toBe(true)
    expect(store.enrollments).toHaveLength(0)
    expect(JSON.parse(window.localStorage.getItem(STORAGE_KEY))).toEqual([])
  })

  it('rejects duplicate active enrollments and section over-capacity', () => {
    const store = useEnrollmentsStore()

    expect(store.addEnrollment(enrollmentInput(), context()).ok).toBe(true)
    const duplicate = store.addEnrollment(enrollmentInput(), context())
    expect(duplicate.ok).toBe(false)
    expect(duplicate.errors.form).toBe('This student is already enrolled in this class section.')

    const smallSection = [{ uid: 'section_2', code: 'CS102-A', capacity: 0 }]
    const full = store.addEnrollment(
      enrollmentInput({ sectionUid: 'section_2', studentUid: 'student_2' }),
      { sections: smallSection, students: [...students, { uid: 'student_2' }] },
    )
    expect(full.ok).toBe(false)
    expect(full.errors.sectionUid).toContain('This section is full')
  })

  it('frees local seats when an enrollment is dropped', () => {
    const store = useEnrollmentsStore()
    const oneSeat = [{ uid: 'section_1', code: 'CS101-A', capacity: 1 }]

    const added = store.addEnrollment(enrollmentInput(), {
      sections: oneSeat,
      students,
    })
    expect(added.ok).toBe(true)

    const second = store.addEnrollment(enrollmentInput({ studentUid: 'student_2' }), {
      sections: oneSeat,
      students: [...students, { uid: 'student_2' }],
    })
    expect(second.ok).toBe(false)

    expect(
      store.updateEnrollment(
        added.enrollment.uid,
        enrollmentInput({ status: 'dropped' }),
        context(),
      ).ok,
    ).toBe(true)

    expect(
      store.addEnrollment(enrollmentInput({ studentUid: 'student_2' }), {
        sections: oneSeat,
        students: [...students, { uid: 'student_2' }],
      }).ok,
    ).toBe(true)
  })

  it('recovers valid records when stored data is malformed', () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([
        storedEnrollment(),
        storedEnrollment({ uid: 'enrollment_2', studentUid: '' }),
      ]),
    )

    const store = useEnrollmentsStore()

    expect(store.enrollments).toHaveLength(1)
    expect(store.storageState).toBe('recovered')
    expect(store.recovery).toMatchObject({ kind: 'records', discarded: 1 })

    expect(store.loadEnrollments()).toBe(true)
    expect(JSON.parse(window.localStorage.getItem(STORAGE_KEY))).toHaveLength(1)
  })

  it('handles invalid stored JSON without losing the ability to save', () => {
    window.localStorage.setItem(STORAGE_KEY, '{not-json')

    const store = useEnrollmentsStore()

    expect(store.enrollments).toEqual([])
    expect(store.storageState).toBe('recovered')
    expect(store.recovery).toMatchObject({ kind: 'invalid-json' })

    expect(store.addEnrollment(enrollmentInput(), context()).ok).toBe(true)
    expect(JSON.parse(window.localStorage.getItem(STORAGE_KEY))).toHaveLength(1)
  })

  it('keeps session-only changes and retries persistence after a failed write', () => {
    const store = useEnrollmentsStore()
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota exceeded')
    })

    const added = store.addEnrollment(enrollmentInput(), context())
    expect(added.ok).toBe(true)
    expect(added.persisted).toBe(false)
    expect(store.enrollments).toHaveLength(1)
    expect(store.persistenceState).toBe('failed')

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

    const store = useEnrollmentsStore()
    expect(store.storageState).toBe('unavailable')
    expect(store.persistenceState).toBe('unavailable')

    getItemSpy.mockRestore()
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota exceeded')
    })

    const added = store.addEnrollment(enrollmentInput(), context())
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
        status: 'enrolled',
      }),
    ])
  })
})

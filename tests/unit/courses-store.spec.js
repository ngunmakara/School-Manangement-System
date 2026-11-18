import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useCoursesStore } from '../../src/stores/courses'

const STORAGE_KEY = 'campushub:courses:v1'

function courseInput(overrides = {}) {
  return {
    code: 'CS101',
    title: 'Introduction to Computer Science',
    department: 'Computer Science',
    credits: 3,
    status: 'Active',
    description: 'Introductory course.',
    ...overrides,
  }
}

function storedCourse(overrides = {}) {
  return {
    uid: 'course_1',
    ...courseInput(),
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
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

describe('courses store', () => {
  it('adds, updates, deletes, and persists course records', () => {
    const store = useCoursesStore()

    const added = store.addCourse(courseInput())

    expect(added.ok).toBe(true)
    expect(added.persisted).toBe(true)
    expect(store.courses).toHaveLength(1)
    expect(JSON.parse(window.localStorage.getItem(STORAGE_KEY))).toHaveLength(1)

    const updated = store.updateCourse(added.course.uid, {
      ...courseInput({ title: 'Data Structures', credits: 4 }),
    })

    expect(updated.ok).toBe(true)
    expect(updated.course.createdAt).toBe(added.course.createdAt)
    expect(updated.course.title).toBe('Data Structures')
    expect(updated.course.credits).toBe(4)

    const deleted = store.deleteCourse(added.course.uid)

    expect(deleted.ok).toBe(true)
    expect(store.courses).toHaveLength(0)
    expect(JSON.parse(window.localStorage.getItem(STORAGE_KEY))).toEqual([])
  })

  it('rejects invalid and duplicate course records without changing storage', () => {
    const store = useCoursesStore()

    expect(store.addCourse(courseInput({ credits: 0 }))).toMatchObject({
      ok: false,
      errors: { credits: 'Enter a whole number of credits between 1 and 12.' },
    })
    expect(store.courses).toEqual([])

    expect(store.addCourse(courseInput()).ok).toBe(true)

    expect(store.addCourse(courseInput({ code: 'cs101' }))).toMatchObject({
      ok: false,
      errors: { code: 'This course code already exists.' },
    })
    expect(store.courses).toHaveLength(1)
  })

  it('recovers valid records when stored data contains a malformed record', () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([
        storedCourse(),
        { ...storedCourse({ uid: 'course_2' }), title: '' },
        storedCourse({ uid: 'course_3', code: 'CS102' }),
      ]),
    )

    const store = useCoursesStore()

    expect(store.courses.map((course) => course.code)).toEqual(['CS101', 'CS102'])
    expect(store.storageState).toBe('recovered')
    expect(store.recovery).toMatchObject({ kind: 'records', discarded: 1 })

    expect(store.loadCourses()).toBe(true)
    expect(JSON.parse(window.localStorage.getItem(STORAGE_KEY))).toHaveLength(2)
  })

  it('handles invalid stored JSON without losing the ability to save', () => {
    window.localStorage.setItem(STORAGE_KEY, '{not-json')

    const store = useCoursesStore()

    expect(store.courses).toEqual([])
    expect(store.storageState).toBe('recovered')
    expect(store.recovery).toMatchObject({ kind: 'invalid-json' })

    expect(store.addCourse(courseInput()).ok).toBe(true)
    expect(JSON.parse(window.localStorage.getItem(STORAGE_KEY))).toHaveLength(1)
  })

  it('reports an invalid stored format and allows a fresh save', () => {
    window.localStorage.setItem(STORAGE_KEY, '{"courses":[]}')

    const store = useCoursesStore()

    expect(store.storageState).toBe('recovered')
    expect(store.recovery).toMatchObject({ kind: 'invalid-format' })

    expect(store.addCourse(courseInput()).ok).toBe(true)
    expect(JSON.parse(window.localStorage.getItem(STORAGE_KEY))).toHaveLength(1)
  })

  it('keeps and retries session-only changes after a failed write', () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([storedCourse()]))

    const store = useCoursesStore()
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota exceeded')
    })

    const added = store.addCourse(courseInput({ code: 'CS102' }))

    expect(added.ok).toBe(true)
    expect(added.persisted).toBe(false)
    expect(store.courses.map((course) => course.code)).toEqual(['CS102', 'CS101'])
    expect(store.storageState).not.toBe('unavailable')
    expect(store.persistenceState).toBe('failed')
    expect(store.persistenceError).toContain('not accepting course saves')

    setItemSpy.mockRestore()

    expect(store.loadCourses()).toBe(true)
    expect(store.courses.map((course) => course.code)).toEqual(['CS102', 'CS101'])
    expect(store.persistenceState).toBe('ok')
    expect(JSON.parse(window.localStorage.getItem(STORAGE_KEY))).toHaveLength(2)
  })

  it('reports a failed update without claiming it was persisted', () => {
    const store = useCoursesStore()
    const added = store.addCourse(courseInput())

    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota exceeded')
    })

    const updated = store.updateCourse(added.course.uid, courseInput({ title: 'Session title' }))

    expect(updated.ok).toBe(true)
    expect(updated.persisted).toBe(false)
    expect(updated.course.title).toBe('Session title')
    expect(store.persistenceState).toBe('failed')
  })

  it('reloads storage when there are no unpersisted session changes', () => {
    const store = useCoursesStore()

    expect(store.addCourse(courseInput()).ok).toBe(true)
    window.localStorage.removeItem(STORAGE_KEY)

    expect(store.loadCourses()).toBe(true)
    expect(store.courses).toEqual([])
    expect(store.loadState).toBe('ready')
    expect(store.loadError).toBe('')
  })

  it('reports unavailable storage when reading fails', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked')
    })

    const store = useCoursesStore()

    expect(store.courses).toEqual([])
    expect(store.storageState).toBe('unavailable')
    expect(store.persistenceState).toBe('unavailable')
    expect(store.persistenceError).toContain('could not be accessed')
  })

  it('reports a failed save with a clear persistence error', () => {
    const store = useCoursesStore()

    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked')
    })

    const added = store.addCourse(courseInput())

    expect(added.persisted).toBe(false)
    expect(store.persistenceState).toBe('failed')
    expect(store.persistenceError).toContain('not accepting course saves')
  })

  it('preserves recovered records with invalid credits so they can be corrected', () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([storedCourse({ credits: 'abc' })]))

    const store = useCoursesStore()

    expect(store.courses).toHaveLength(1)
    expect(store.courses[0].credits).toBeNull()

    const updated = store.updateCourse('course_1', courseInput({ credits: 4 }))

    expect(updated.ok).toBe(true)
    expect(updated.course.credits).toBe(4)
    expect(store.courses[0].credits).toBe(4)
  })
})

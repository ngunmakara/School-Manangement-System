import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useSectionsStore } from '../../src/stores/sections'

const STORAGE_KEY = 'campushub:sections:v1'

function sectionInput(overrides = {}) {
  return {
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
    ...overrides,
  }
}

function storedSection(overrides = {}) {
  return {
    uid: 'section_1',
    ...sectionInput(),
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

describe('sections store', () => {
  it('adds, updates, deletes, and persists section records', () => {
    const store = useSectionsStore()

    const added = store.addSection(sectionInput())

    expect(added.ok).toBe(true)
    expect(store.sections).toHaveLength(1)
    expect(JSON.parse(window.localStorage.getItem(STORAGE_KEY))).toHaveLength(1)

    const updated = store.updateSection(added.section.uid, {
      ...sectionInput({ room: 'Lab 2', capacity: 24 }),
    })

    expect(updated.ok).toBe(true)
    expect(updated.section.createdAt).toBe(added.section.createdAt)
    expect(updated.section.room).toBe('Lab 2')
    expect(updated.section.capacity).toBe(24)

    const deleted = store.deleteSection(added.section.uid)

    expect(deleted.ok).toBe(true)
    expect(store.sections).toHaveLength(0)
    expect(JSON.parse(window.localStorage.getItem(STORAGE_KEY))).toEqual([])
  })

  it('rejects duplicate codes within the same semester', () => {
    const store = useSectionsStore()

    expect(store.addSection(sectionInput()).ok).toBe(true)

    const duplicate = store.addSection(sectionInput({ code: 'cs101-a' }))

    expect(duplicate.ok).toBe(false)
    expect(duplicate.errors.code).toBe(
      'This section code already exists for the selected semester.',
    )
  })

  it('recovers valid records when stored data contains a malformed record', () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([
        storedSection(),
        { ...storedSection({ uid: 'section_2' }), schedule: '' },
        storedSection({ uid: 'section_3', code: 'CS102-A' }),
      ]),
    )

    const store = useSectionsStore()

    expect(store.sections).toHaveLength(2)
    expect(store.storageState).toBe('recovered')
    expect(store.recovery).toMatchObject({ kind: 'records', discarded: 1 })

    expect(store.loadSections()).toBe(true)
    expect(JSON.parse(window.localStorage.getItem(STORAGE_KEY))).toHaveLength(2)
  })

  it('handles invalid stored JSON without losing the ability to save', () => {
    window.localStorage.setItem(STORAGE_KEY, '{not-json')

    const store = useSectionsStore()

    expect(store.sections).toEqual([])
    expect(store.storageState).toBe('recovered')
    expect(store.recovery).toMatchObject({ kind: 'invalid-json' })

    expect(store.addSection(sectionInput()).ok).toBe(true)
    expect(JSON.parse(window.localStorage.getItem(STORAGE_KEY))).toHaveLength(1)
  })

  it('reports unavailable storage when reading fails', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked')
    })

    const store = useSectionsStore()

    expect(store.sections).toEqual([])
    expect(store.storageState).toBe('unavailable')
    expect(store.persistenceState).toBe('unavailable')
  })

  it('keeps the in-memory change when writing fails', () => {
    const store = useSectionsStore()

    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota exceeded')
    })

    const added = store.addSection(sectionInput())

    expect(added.ok).toBe(true)
    expect(added.persisted).toBe(false)
    expect(store.sections).toHaveLength(1)
    expect(store.persistenceState).toBe('failed')
  })
})

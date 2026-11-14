import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import {
  createUniqueSemesterUid,
  normalizeStoredSemesters,
  sanitizeSemesterInput,
  validateSemesterRecord,
} from '../utils/semesters'

const STORAGE_KEY = 'campushub:semesters:v1'
const LOAD_ERROR = 'Semester records could not be loaded from browser storage.'
const STORAGE_UNAVAILABLE =
  'Browser storage could not be accessed. Changes will last for this session only.'
const STORAGE_WRITE_FAILED =
  'Browser storage is not accepting semester saves. Changes will last for this session only.'

function getStorage() {
  try {
    if (typeof window === 'undefined') return null
    return window.localStorage || null
  } catch {
    return null
  }
}

function readStoredSemesters() {
  const storage = getStorage()
  if (!storage) {
    return {
      records: null,
      storageState: 'unavailable',
      recovery: null,
      storageError: STORAGE_UNAVAILABLE,
    }
  }

  let raw

  try {
    raw = storage.getItem(STORAGE_KEY)
  } catch {
    return {
      records: null,
      storageState: 'unavailable',
      recovery: null,
      storageError: STORAGE_UNAVAILABLE,
    }
  }

  if (raw === null) {
    return { records: null, storageState: 'ok', recovery: null }
  }

  let parsed

  try {
    parsed = JSON.parse(raw)
  } catch {
    return {
      records: null,
      storageState: 'recovered',
      recovery: {
        kind: 'invalid-json',
        discarded: 0,
        corrected: 0,
        duplicateUids: 0,
        duplicateTerms: 0,
      },
    }
  }

  if (!Array.isArray(parsed)) {
    return {
      records: null,
      storageState: 'recovered',
      recovery: {
        kind: 'invalid-format',
        discarded: 0,
        corrected: 0,
        duplicateUids: 0,
        duplicateTerms: 0,
      },
    }
  }

  const normalized = normalizeStoredSemesters(parsed)
  const recovered = normalized.discarded > 0 || normalized.corrected > 0

  return {
    records: normalized.records,
    storageState: recovered ? 'recovered' : 'ok',
    recovery: recovered ? { kind: 'records', ...normalized } : null,
  }
}

export const useSemestersStore = defineStore('semesters', () => {
  const initial = readStoredSemesters()
  const semesters = ref(initial.records ?? [])
  const storageState = ref(initial.storageState)
  const recovery = ref(initial.recovery)
  const persistenceState = ref(
    initial.storageState === 'unavailable' ? 'unavailable' : 'ok',
  )
  const persistenceError = ref(initial.storageError || '')
  const loadState = ref('ready')
  const loadError = ref('')
  const source = ref('local')

  function persist() {
    const storage = getStorage()
    if (!storage) {
      persistenceState.value = 'unavailable'
      persistenceError.value = STORAGE_UNAVAILABLE
      return false
    }

    try {
      storage.setItem(STORAGE_KEY, JSON.stringify(semesters.value))
      persistenceState.value = 'ok'
      persistenceError.value = ''
      return true
    } catch {
      persistenceState.value = 'failed'
      persistenceError.value = STORAGE_WRITE_FAILED
      return false
    }
  }

  const totalSemesters = computed(() => semesters.value.length)
  const activeSemesters = computed(
    () => semesters.value.filter((semester) => semester.status === 'Active').length,
  )
  const upcomingSemesters = computed(
    () => semesters.value.filter((semester) => semester.status === 'Upcoming').length,
  )
  const completedSemesters = computed(
    () => semesters.value.filter((semester) => semester.status === 'Completed').length,
  )
  const archivedSemesters = computed(
    () => semesters.value.filter((semester) => semester.status === 'Archived').length,
  )
  const academicYearCount = computed(
    () =>
      new Set(
        semesters.value.map((semester) => semester.academicYear).filter(Boolean),
      ).size,
  )

  function loadSemesters() {
    loadState.value = 'loading'
    loadError.value = ''

    try {
      const next = readStoredSemesters()

      if (next.records) {
        semesters.value = next.records
      } else if (next.storageState === 'recovered') {
        semesters.value = []
      }

      if (next.recovery) {
        recovery.value = next.recovery
      }

      if (next.storageState === 'unavailable') {
        persistenceState.value = 'unavailable'
        persistenceError.value = next.storageError || STORAGE_UNAVAILABLE
      } else if (persistenceState.value === 'unavailable') {
        persistenceState.value = 'ok'
        persistenceError.value = ''
      }

      storageState.value = next.storageState
      loadState.value = 'ready'

      if (next.storageState === 'recovered') {
        persist()
      }

      return true
    } catch {
      loadState.value = 'error'
      loadError.value = LOAD_ERROR
      return false
    }
  }

  function addSemester(input) {
    const errors = validateSemesterRecord(input, semesters.value)
    if (Object.keys(errors).length) {
      return { ok: false, errors }
    }

    const values = sanitizeSemesterInput(input)
    const now = new Date().toISOString()
    const semester = {
      uid: createUniqueSemesterUid(
        new Set(semesters.value.map((record) => record.uid)),
      ),
      ...values,
      createdAt: now,
      updatedAt: now,
    }

    semesters.value = [semester, ...semesters.value]
    const persisted = persist()
    return { ok: true, semester, persisted }
  }

  function updateSemester(uid, input) {
    const existing = semesters.value.find((semester) => semester.uid === uid)
    if (!existing) {
      return { ok: false, errors: { form: 'This semester no longer exists.' } }
    }

    const values = sanitizeSemesterInput(input)
    const errors = validateSemesterRecord(input, semesters.value, uid)
    if (Object.keys(errors).length) {
      return { ok: false, errors }
    }

    const semester = {
      ...existing,
      ...values,
      updatedAt: new Date().toISOString(),
    }

    semesters.value = semesters.value.map((record) =>
      record.uid === uid ? semester : record,
    )
    const persisted = persist()
    return { ok: true, semester, persisted }
  }

  function deleteSemester(uid) {
    const existing = semesters.value.find((semester) => semester.uid === uid)
    if (!existing) {
      return { ok: false, errors: { form: 'This semester no longer exists.' } }
    }

    semesters.value = semesters.value.filter((semester) => semester.uid !== uid)
    const persisted = persist()
    return { ok: true, semester: existing, persisted }
  }

  return {
    semesters,
    source,
    storageState,
    recovery,
    persistenceState,
    persistenceError,
    loadState,
    loadError,
    totalSemesters,
    activeSemesters,
    upcomingSemesters,
    completedSemesters,
    archivedSemesters,
    academicYearCount,
    loadSemesters,
    addSemester,
    updateSemester,
    deleteSemester,
  }
})

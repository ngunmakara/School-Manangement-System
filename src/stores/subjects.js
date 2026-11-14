import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import {
  createUniqueSubjectUid,
  normalizeStoredSubjects,
  sanitizeSubjectInput,
  validateSubjectRecord,
} from '../utils/subjects'

const STORAGE_KEY = 'campushub:subjects:v1'
const LOAD_ERROR = 'Subject records could not be loaded from browser storage.'
const STORAGE_UNAVAILABLE =
  'Browser storage could not be accessed. Changes will last for this session only.'
const STORAGE_WRITE_FAILED =
  'Browser storage is not accepting subject saves. Changes will last for this session only.'

function getStorage() {
  try {
    if (typeof window === 'undefined') return null
    return window.localStorage || null
  } catch {
    return null
  }
}

function readStoredSubjects() {
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
        duplicateCodes: 0,
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
        duplicateCodes: 0,
      },
    }
  }

  const normalized = normalizeStoredSubjects(parsed)
  const recovered = normalized.discarded > 0 || normalized.corrected > 0

  return {
    records: normalized.records,
    storageState: recovered ? 'recovered' : 'ok',
    recovery: recovered ? { kind: 'records', ...normalized } : null,
  }
}

export const useSubjectsStore = defineStore('subjects', () => {
  const initial = readStoredSubjects()
  const subjects = ref(initial.records ?? [])
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
      storage.setItem(STORAGE_KEY, JSON.stringify(subjects.value))
      persistenceState.value = 'ok'
      persistenceError.value = ''
      return true
    } catch {
      persistenceState.value = 'failed'
      persistenceError.value = STORAGE_WRITE_FAILED
      return false
    }
  }

  const totalSubjects = computed(() => subjects.value.length)
  const activeSubjects = computed(
    () => subjects.value.filter((subject) => subject.status === 'Active').length,
  )
  const inactiveSubjects = computed(
    () => subjects.value.filter((subject) => subject.status === 'Inactive').length,
  )
  const departmentCount = computed(
    () => new Set(subjects.value.map((subject) => subject.department).filter(Boolean)).size,
  )
  const totalCredits = computed(() =>
    subjects.value.reduce((sum, subject) => sum + (Number(subject.credits) || 0), 0),
  )

  function loadSubjects() {
    loadState.value = 'loading'
    loadError.value = ''

    try {
      const next = readStoredSubjects()

      if (next.records) {
        subjects.value = next.records
      } else if (next.storageState === 'recovered') {
        subjects.value = []
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

  function addSubject(input) {
    const errors = validateSubjectRecord(input, subjects.value)
    if (Object.keys(errors).length) {
      return { ok: false, errors }
    }

    const values = sanitizeSubjectInput(input)
    const now = new Date().toISOString()
    const subject = {
      uid: createUniqueSubjectUid(new Set(subjects.value.map((record) => record.uid))),
      ...values,
      createdAt: now,
      updatedAt: now,
    }

    subjects.value = [subject, ...subjects.value]
    const persisted = persist()
    return { ok: true, subject, persisted }
  }

  function updateSubject(uid, input) {
    const existing = subjects.value.find((subject) => subject.uid === uid)
    if (!existing) {
      return { ok: false, errors: { form: 'This subject no longer exists.' } }
    }

    const values = sanitizeSubjectInput(input)
    const errors = validateSubjectRecord(input, subjects.value, uid)
    if (Object.keys(errors).length) {
      return { ok: false, errors }
    }

    const subject = {
      ...existing,
      ...values,
      updatedAt: new Date().toISOString(),
    }

    subjects.value = subjects.value.map((record) => (record.uid === uid ? subject : record))
    const persisted = persist()
    return { ok: true, subject, persisted }
  }

  function deleteSubject(uid) {
    const existing = subjects.value.find((subject) => subject.uid === uid)
    if (!existing) {
      return { ok: false, errors: { form: 'This subject no longer exists.' } }
    }

    subjects.value = subjects.value.filter((subject) => subject.uid !== uid)
    const persisted = persist()
    return { ok: true, subject: existing, persisted }
  }

  return {
    subjects,
    source,
    storageState,
    recovery,
    persistenceState,
    persistenceError,
    loadState,
    loadError,
    totalSubjects,
    activeSubjects,
    inactiveSubjects,
    departmentCount,
    totalCredits,
    loadSubjects,
    addSubject,
    updateSubject,
    deleteSubject,
  }
})

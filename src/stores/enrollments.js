import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import {
  createUniqueEnrollmentUid,
  normalizeStoredEnrollments,
  sanitizeEnrollmentInput,
  validateEnrollmentRecord,
} from '../utils/enrollments'

const STORAGE_KEY = 'campushub:enrollments:v1'
const LOAD_ERROR = 'Enrollment records could not be loaded from browser storage.'
const STORAGE_UNAVAILABLE =
  'Browser storage could not be accessed. Changes will last for this session only.'
const STORAGE_WRITE_FAILED =
  'Browser storage is not accepting enrollment saves. Changes will last for this session only.'

function getStorage() {
  try {
    if (typeof window === 'undefined') return null
    return window.localStorage || null
  } catch {
    return null
  }
}

function readStoredEnrollments() {
  const storage = getStorage()
  if (!storage) {
    return {
      records: null,
      storageState: 'unavailable',
      storageError: STORAGE_UNAVAILABLE,
      recovery: null,
    }
  }

  let raw

  try {
    raw = storage.getItem(STORAGE_KEY)
  } catch {
    return {
      records: null,
      storageState: 'unavailable',
      storageError: STORAGE_UNAVAILABLE,
      recovery: null,
    }
  }

  if (raw === null) {
    return { records: null, storageState: 'ok', storageError: '', recovery: null }
  }

  let parsed

  try {
    parsed = JSON.parse(raw)
  } catch {
    return {
      records: null,
      storageState: 'recovered',
      storageError: '',
      recovery: {
        kind: 'invalid-json',
        discarded: 0,
        corrected: 0,
        duplicateUids: 0,
        duplicateActive: 0,
      },
    }
  }

  if (!Array.isArray(parsed)) {
    return {
      records: null,
      storageState: 'recovered',
      storageError: '',
      recovery: {
        kind: 'invalid-format',
        discarded: 0,
        corrected: 0,
        duplicateUids: 0,
        duplicateActive: 0,
      },
    }
  }

  const normalized = normalizeStoredEnrollments(parsed)
  const recovered =
    normalized.discarded > 0 ||
    normalized.corrected > 0 ||
    normalized.duplicateUids > 0 ||
    normalized.duplicateActive > 0

  return {
    records: normalized.records,
    storageState: recovered ? 'recovered' : 'ok',
    storageError: '',
    recovery: recovered ? { kind: 'records', ...normalized } : null,
  }
}

export const useEnrollmentsStore = defineStore('enrollments', () => {
  const initial = readStoredEnrollments()
  const enrollments = ref(initial.records ?? [])
  const storageState = ref(initial.storageState)
  const recovery = ref(initial.recovery)
  const persistenceState = ref(initial.storageState === 'unavailable' ? 'unavailable' : 'ok')
  const persistenceError = ref(initial.storageError || '')
  const loadState = ref('ready')
  const loadError = ref('')
  const source = ref('local')
  let hasUnpersistedChanges = false

  function persist() {
    const storage = getStorage()
    if (!storage) {
      storageState.value = 'unavailable'
      persistenceState.value = 'unavailable'
      persistenceError.value = STORAGE_UNAVAILABLE
      hasUnpersistedChanges = true
      return false
    }

    try {
      storage.setItem(STORAGE_KEY, JSON.stringify(enrollments.value))
      persistenceState.value = 'ok'
      persistenceError.value = ''
      hasUnpersistedChanges = false
      return true
    } catch {
      persistenceState.value = 'failed'
      persistenceError.value = STORAGE_WRITE_FAILED
      hasUnpersistedChanges = true
      return false
    }
  }

  if (
    initial.storageState !== 'unavailable' &&
    (!initial.records || initial.storageState === 'recovered')
  ) {
    persist()
  }

  const totalEnrollments = computed(() => enrollments.value.length)
  const enrolledCount = computed(
    () => enrollments.value.filter((enrollment) => enrollment.status === 'enrolled').length,
  )
  const droppedCount = computed(
    () => enrollments.value.filter((enrollment) => enrollment.status === 'dropped').length,
  )
  const completedCount = computed(
    () => enrollments.value.filter((enrollment) => enrollment.status === 'completed').length,
  )
  const studentCount = computed(
    () => new Set(enrollments.value.map((enrollment) => enrollment.studentUid)).size,
  )
  const sectionCount = computed(
    () => new Set(enrollments.value.map((enrollment) => enrollment.sectionUid)).size,
  )

  function loadEnrollments() {
    loadState.value = 'loading'
    loadError.value = ''

    try {
      const next = readStoredEnrollments()
      const preserveSessionChanges = hasUnpersistedChanges

      if (!preserveSessionChanges) {
        if (next.storageState !== 'unavailable') {
          enrollments.value = next.records ?? []
        }
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

      if (preserveSessionChanges) {
        if (next.storageState !== 'unavailable') persist()
      } else if (next.storageState === 'recovered') {
        persist()
      }

      return true
    } catch {
      loadState.value = 'error'
      loadError.value = LOAD_ERROR
      return false
    }
  }

  function retryPersist() {
    const persisted = persist()
    return {
      ok: persisted,
      persisted,
      state: persistenceState.value,
      error: persistenceError.value,
    }
  }

  function addEnrollment(input, context = {}) {
    const errors = validateEnrollmentRecord(
      input,
      enrollments.value,
      context.sections ?? [],
      null,
      context.students ?? [],
    )
    if (Object.keys(errors).length) {
      return { ok: false, errors }
    }

    const values = sanitizeEnrollmentInput(input)
    const now = new Date().toISOString()
    const enrollment = {
      uid: createUniqueEnrollmentUid(new Set(enrollments.value.map((record) => record.uid))),
      ...values,
      createdAt: now,
      updatedAt: now,
    }

    enrollments.value = [enrollment, ...enrollments.value]
    const persisted = persist()
    return { ok: true, enrollment, persisted }
  }

  function updateEnrollment(uid, input, context = {}) {
    const existing = enrollments.value.find((enrollment) => enrollment.uid === uid)
    if (!existing) {
      return { ok: false, errors: { form: 'This enrollment record no longer exists.' } }
    }

    const errors = validateEnrollmentRecord(
      input,
      enrollments.value,
      context.sections ?? [],
      uid,
      context.students ?? [],
    )
    if (Object.keys(errors).length) {
      return { ok: false, errors }
    }

    const values = sanitizeEnrollmentInput(input)
    const enrollment = {
      ...existing,
      ...values,
      uid: existing.uid,
      createdAt: existing.createdAt,
      updatedAt: new Date().toISOString(),
    }

    enrollments.value = enrollments.value.map((record) =>
      record.uid === uid ? enrollment : record,
    )
    const persisted = persist()
    return { ok: true, enrollment, persisted }
  }

  function deleteEnrollment(uid) {
    const existing = enrollments.value.find((enrollment) => enrollment.uid === uid)
    if (!existing) {
      return { ok: false, errors: { form: 'This enrollment record no longer exists.' } }
    }

    enrollments.value = enrollments.value.filter((enrollment) => enrollment.uid !== uid)
    const persisted = persist()
    return { ok: true, enrollment: existing, persisted }
  }

  return {
    enrollments,
    source,
    storageState,
    recovery,
    persistenceState,
    persistenceError,
    loadState,
    loadError,
    totalEnrollments,
    enrolledCount,
    droppedCount,
    completedCount,
    studentCount,
    sectionCount,
    loadEnrollments,
    retryPersist,
    addEnrollment,
    updateEnrollment,
    deleteEnrollment,
  }
})

import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import {
  calculateGradeResult,
  createUniqueGradeUid,
  gradeSummary,
  normalizeStoredGrades,
  sanitizeGradeInput,
  validateGradeRecord,
} from '../utils/grades'

const STORAGE_KEY = 'campushub:grades:v1'
const LOAD_ERROR = 'Grade records could not be loaded from browser storage.'
const STORAGE_UNAVAILABLE =
  'Browser storage could not be accessed. Changes will last for this session only.'
const STORAGE_WRITE_FAILED =
  'Browser storage is not accepting grade saves. Changes will last for this session only.'

function getStorage() {
  try {
    if (typeof window === 'undefined') return null
    return window.localStorage || null
  } catch {
    return null
  }
}

function readStoredGrades() {
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
        duplicateIdentity: 0,
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
        duplicateIdentity: 0,
      },
    }
  }

  const normalized = normalizeStoredGrades(parsed)
  const recovered = normalized.discarded > 0 || normalized.corrected > 0

  return {
    records: normalized.records,
    storageState: recovered ? 'recovered' : 'ok',
    recovery: recovered ? { kind: 'records', ...normalized } : null,
  }
}

export const useGradesStore = defineStore('grades', () => {
  const initial = readStoredGrades()
  const grades = ref(initial.records ?? [])
  const source = ref('local')
  const storageState = ref(initial.storageState)
  const recovery = ref(initial.recovery)
  const persistenceState = ref(initial.storageState === 'unavailable' ? 'unavailable' : 'ok')
  const persistenceError = ref(initial.storageError || '')
  const loadState = ref('ready')
  const loadError = ref('')
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
      storage.setItem(STORAGE_KEY, JSON.stringify(grades.value))
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

  const summary = computed(() => gradeSummary(grades.value))
  const totalGrades = computed(() => summary.value.totalCount)
  const gradedStudentCount = computed(() => summary.value.studentCount)
  const averageScore = computed(() => summary.value.averageScore)
  const averageGpa = computed(() => summary.value.averageGpa)
  const passRate = computed(() => summary.value.passRate)

  function loadGrades() {
    loadState.value = 'loading'
    loadError.value = ''

    try {
      const next = readStoredGrades()
      const preserveSessionChanges = hasUnpersistedChanges

      if (!preserveSessionChanges) {
        if (next.storageState !== 'unavailable') grades.value = next.records ?? []
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

  function addGrade(input, context = {}) {
    const errors = validateGradeRecord(input, grades.value, context)
    if (Object.keys(errors).length) return { ok: false, errors }

    const values = sanitizeGradeInput(input)
    const now = new Date().toISOString()
    const grade = {
      uid: createUniqueGradeUid(new Set(grades.value.map((record) => record.uid))),
      ...values,
      createdAt: now,
      updatedAt: now,
    }

    grades.value = [grade, ...grades.value]
    const persisted = persist()
    return { ok: true, grade, persisted }
  }

  function updateGrade(uid, input, context = {}) {
    const existing = grades.value.find((grade) => grade.uid === uid)
    if (!existing) {
      return { ok: false, errors: { form: 'This grade record no longer exists.' } }
    }

    const errors = validateGradeRecord(input, grades.value, context, uid)
    if (Object.keys(errors).length) return { ok: false, errors }

    const values = sanitizeGradeInput(input)
    const grade = {
      ...existing,
      ...values,
      updatedAt: new Date().toISOString(),
    }

    grades.value = grades.value.map((record) => (record.uid === uid ? grade : record))
    const persisted = persist()
    return { ok: true, grade, persisted }
  }

  function deleteGrade(uid) {
    const existing = grades.value.find((grade) => grade.uid === uid)
    if (!existing) {
      return { ok: false, errors: { form: 'This grade record no longer exists.' } }
    }

    grades.value = grades.value.filter((grade) => grade.uid !== uid)
    const persisted = persist()
    return { ok: true, grade: existing, persisted }
  }

  function resultFor(grade) {
    return calculateGradeResult(grade)
  }

  return {
    grades,
    source,
    storageState,
    recovery,
    persistenceState,
    persistenceError,
    loadState,
    loadError,
    summary,
    totalGrades,
    gradedStudentCount,
    averageScore,
    averageGpa,
    passRate,
    loadGrades,
    retryPersist,
    addGrade,
    updateGrade,
    deleteGrade,
    resultFor,
  }
})

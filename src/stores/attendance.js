import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import {
  createUniqueAttendanceUid,
  getAttendanceIdentity,
  normalizeStoredAttendances,
  sanitizeAttendanceInput,
  validateAttendanceRecord,
} from '../utils/attendance'

const STORAGE_KEY = 'campushub:attendance:v1'
const RECOVERY_KEY = 'campushub:attendance:v1:recovery'
const LOAD_ERROR = 'Attendance records could not be loaded from browser storage.'
const STORAGE_UNAVAILABLE =
  'Browser storage could not be accessed. Changes will last for this session only.'
const STORAGE_WRITE_FAILED =
  'Browser storage is not accepting attendance saves. Changes will last for this session only.'

function getStorage() {
  try {
    if (typeof window === 'undefined') return null
    return window.localStorage || null
  } catch {
    return null
  }
}

function readStoredRecoveryWarning() {
  const storage = getStorage()
  if (!storage) return null

  try {
    const raw = storage.getItem(RECOVERY_KEY)
    if (!raw) return null

    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null
    if (!['records', 'invalid-json', 'invalid-format'].includes(parsed.kind)) return null

    return {
      kind: parsed.kind,
      discarded: Number(parsed.discarded) || 0,
      corrected: Number(parsed.corrected) || 0,
      duplicateUids: Number(parsed.duplicateUids) || 0,
      duplicateIdentity: Number(parsed.duplicateIdentity) || 0,
    }
  } catch {
    return null
  }
}

function writeStoredRecoveryWarning(recovery) {
  const storage = getStorage()
  if (!storage) return

  try {
    if (recovery) storage.setItem(RECOVERY_KEY, JSON.stringify(recovery))
    else storage.removeItem(RECOVERY_KEY)
  } catch {
    return
  }
}

function withoutHistoricalOverride(context = {}) {
  const safeContext = { ...context }
  delete safeContext.historicalIdentityPreserved
  return safeContext
}

function readStoredAttendance() {
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
        duplicateIdentity: 0,
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
        duplicateIdentity: 0,
      },
    }
  }

  const normalized = normalizeStoredAttendances(parsed)
  const recovered =
    normalized.discarded > 0 ||
    normalized.corrected > 0 ||
    normalized.duplicateUids > 0 ||
    normalized.duplicateIdentity > 0

  return {
    records: normalized.records,
    storageState: recovered ? 'recovered' : 'ok',
    storageError: '',
    recovery: recovered ? { kind: 'records', ...normalized } : null,
  }
}

export const useAttendanceStore = defineStore('attendance', () => {
  const initial = readStoredAttendance()
  const storedRecoveryWarning = readStoredRecoveryWarning()
  const initialRecovery = initial.recovery ?? storedRecoveryWarning
  const initialStorageState =
    storedRecoveryWarning && !initial.recovery ? 'recovered' : initial.storageState
  const attendance = ref(initial.records ?? [])
  const storageState = ref(initialStorageState)
  const recovery = ref(initialRecovery)
  const persistenceState = ref(initial.storageState === 'unavailable' ? 'unavailable' : 'ok')
  const persistenceError = ref(initial.storageError || '')
  const loadState = ref('ready')
  const loadError = ref('')
  const source = ref('local')
  let hasUnpersistedChanges = false

  function clearRecoveryWarning() {
    recovery.value = null
    writeStoredRecoveryWarning(null)
    if (storageState.value === 'recovered') storageState.value = 'ok'
  }

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
      storage.setItem(STORAGE_KEY, JSON.stringify(attendance.value))
      if (storageState.value === 'unavailable') {
        storageState.value = 'ok'
      }
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
    if (initial.recovery) writeStoredRecoveryWarning(initial.recovery)
    persist()
  }

  const totalRecords = computed(() => attendance.value.length)
  const presentCount = computed(
    () => attendance.value.filter((record) => record.status === 'present').length,
  )
  const absentCount = computed(
    () => attendance.value.filter((record) => record.status === 'absent').length,
  )
  const lateCount = computed(
    () => attendance.value.filter((record) => record.status === 'late').length,
  )
  const excusedCount = computed(
    () => attendance.value.filter((record) => record.status === 'excused').length,
  )
  const studentCount = computed(
    () => new Set(attendance.value.map((record) => record.studentUid)).size,
  )
  const sectionCount = computed(
    () => new Set(attendance.value.map((record) => record.sectionUid)).size,
  )

  function loadAttendance() {
    loadState.value = 'loading'
    loadError.value = ''

    try {
      const next = readStoredAttendance()
      const preserveSessionChanges = hasUnpersistedChanges

      if (!preserveSessionChanges) {
        if (next.storageState !== 'unavailable') {
          attendance.value = next.records ?? []
        }
        if (next.recovery) {
          recovery.value = next.recovery
          writeStoredRecoveryWarning(next.recovery)
        }
      }

      if (next.storageState === 'unavailable') {
        persistenceState.value = 'unavailable'
        persistenceError.value = next.storageError || STORAGE_UNAVAILABLE
      } else if (persistenceState.value === 'unavailable') {
        persistenceState.value = 'ok'
        persistenceError.value = ''
      }

      storageState.value =
        next.storageState === 'ok' && recovery.value ? 'recovered' : next.storageState
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
    if (persisted && recovery.value) clearRecoveryWarning()
    return {
      ok: persisted,
      persisted,
      state: persistenceState.value,
      error: persistenceError.value,
    }
  }

  function addAttendance(input, context = {}) {
    const errors = validateAttendanceRecord(
      input,
      attendance.value,
      withoutHistoricalOverride(context),
    )
    if (Object.keys(errors).length) {
      return { ok: false, errors }
    }

    const values = sanitizeAttendanceInput(input)
    const now = new Date().toISOString()
    const record = {
      uid: createUniqueAttendanceUid(attendance.value.map((item) => item.uid)),
      ...values,
      createdAt: now,
      updatedAt: now,
    }

    attendance.value = [record, ...attendance.value]
    const persisted = persist()
    if (persisted && recovery.value) clearRecoveryWarning()
    return { ok: true, attendance: record, persisted }
  }

  function updateAttendance(uid, input, context = {}) {
    const existing = attendance.value.find((record) => record.uid === uid)
    if (!existing) {
      return { ok: false, errors: { form: 'This attendance record no longer exists.' } }
    }

    const identityPreserved =
      getAttendanceIdentity(sanitizeAttendanceInput(input)) === getAttendanceIdentity(existing)
    const errors = validateAttendanceRecord(input, attendance.value, {
      ...withoutHistoricalOverride(context),
      editingUid: uid,
      historicalIdentityPreserved: identityPreserved,
    })
    if (Object.keys(errors).length) {
      return { ok: false, errors }
    }

    const values = sanitizeAttendanceInput(input)
    const record = {
      ...existing,
      ...values,
      updatedAt: new Date().toISOString(),
    }

    attendance.value = attendance.value.map((item) => (item.uid === uid ? record : item))
    const persisted = persist()
    if (persisted && recovery.value) clearRecoveryWarning()
    return { ok: true, attendance: record, persisted }
  }

  function deleteAttendance(uid) {
    const existing = attendance.value.find((record) => record.uid === uid)
    if (!existing) {
      return { ok: false, errors: { form: 'This attendance record no longer exists.' } }
    }

    attendance.value = attendance.value.filter((record) => record.uid !== uid)
    const persisted = persist()
    if (persisted && recovery.value) clearRecoveryWarning()
    return { ok: true, attendance: existing, persisted }
  }

  return {
    attendance,
    storageState,
    recovery,
    persistenceState,
    persistenceError,
    loadState,
    loadError,
    source,
    totalRecords,
    presentCount,
    absentCount,
    lateCount,
    excusedCount,
    studentCount,
    sectionCount,
    loadAttendance,
    retryPersist,
    addAttendance,
    updateAttendance,
    deleteAttendance,
  }
})

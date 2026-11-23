import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import {
  createSeedUsers,
  createUniqueUserUid,
  normalizeStoredUsers,
  sanitizeUserInput,
  validateUserRecord,
} from '../utils/users'

const STORAGE_KEY = 'campushub:users:v1'
const LOAD_ERROR = 'User records could not be loaded from browser storage.'
const STORAGE_UNAVAILABLE =
  'Browser storage could not be accessed. Changes will last for this session only.'
const STORAGE_WRITE_FAILED =
  'Browser storage is not accepting user saves. Changes will last for this session only.'

function getStorage() {
  try {
    if (typeof window === 'undefined') return null
    return window.localStorage || null
  } catch {
    return null
  }
}

function readStoredUsers() {
  const storage = getStorage()
  if (!storage) {
    return {
      records: null,
      recovery: null,
      storageState: 'unavailable',
      storageError: STORAGE_UNAVAILABLE,
    }
  }

  let raw
  try {
    raw = storage.getItem(STORAGE_KEY)
  } catch {
    return {
      records: null,
      recovery: null,
      storageState: 'unavailable',
      storageError: STORAGE_UNAVAILABLE,
    }
  }

  if (raw === null) return { records: null, recovery: null, storageState: 'ok', storageError: '' }

  let parsed
  try {
    parsed = JSON.parse(raw)
  } catch {
    return {
      records: null,
      recovery: { kind: 'invalid-json' },
      storageState: 'recovered',
      storageError: '',
    }
  }

  if (!Array.isArray(parsed)) {
    return {
      records: null,
      recovery: { kind: 'invalid-format' },
      storageState: 'recovered',
      storageError: '',
    }
  }

  const normalized = normalizeStoredUsers(parsed)
  const recovered =
    normalized.discarded > 0 ||
    normalized.corrected > 0 ||
    normalized.duplicateUids > 0 ||
    normalized.duplicateIdentity > 0
  return {
    records: normalized.records,
    recovery: recovered ? { kind: 'records', ...normalized } : null,
    storageState: recovered ? 'recovered' : 'ok',
    storageError: '',
  }
}

export const useUsersStore = defineStore('users', () => {
  const initial = readStoredUsers()
  const seed = createSeedUsers()
  const users = ref(initial.records ?? seed)
  const storageState = ref(initial.storageState)
  const recovery = ref(initial.recovery)
  const persistenceState = ref(initial.storageState === 'unavailable' ? 'unavailable' : 'ok')
  const persistenceError = ref(initial.storageError || '')
  const loadState = ref('ready')
  const loadError = ref('')
  const source = ref('local')
  let hasUnpersistedChanges = false

  function setPersistenceFailure() {
    storageState.value = 'unavailable'
    persistenceState.value = 'unavailable'
    persistenceError.value = STORAGE_UNAVAILABLE
    hasUnpersistedChanges = true
  }

  function persist() {
    const storage = getStorage()
    if (!storage) {
      setPersistenceFailure()
      return false
    }

    try {
      storage.setItem(STORAGE_KEY, JSON.stringify(users.value))
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

  if (!initial.records || initial.storageState === 'recovered') {
    persist()
  }

  const totalUsers = computed(() => users.value.length)
  const activeUsers = computed(() => users.value.filter((user) => user.status === 'Active').length)
  const inactiveUsers = computed(
    () => users.value.filter((user) => user.status === 'Inactive').length,
  )
  const roleCount = computed(() => new Set(users.value.map((user) => user.role).filter(Boolean)).size)

  function loadUsers() {
    loadState.value = 'loading'
    loadError.value = ''

    try {
      const next = readStoredUsers()
      if (next.storageState === 'unavailable') {
        storageState.value = 'unavailable'
        persistenceState.value = 'unavailable'
        persistenceError.value = next.storageError || STORAGE_UNAVAILABLE
        loadState.value = 'ready'
        return true
      }

      if (!hasUnpersistedChanges) {
        users.value = next.records ?? createSeedUsers()
        recovery.value = next.recovery
      }

      storageState.value = next.storageState
      if (persistenceState.value === 'unavailable') {
        persistenceState.value = 'ok'
        persistenceError.value = ''
      }
      loadState.value = 'ready'

      if (!hasUnpersistedChanges && (!next.records || next.storageState === 'recovered')) {
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
    return { ok: persisted, persisted, state: persistenceState.value, error: persistenceError.value }
  }

  function addUser(input) {
    const values = sanitizeUserInput(input)
    const errors = validateUserRecord(values, users.value)
    if (Object.keys(errors).length) return { ok: false, errors }

    const now = new Date().toISOString()
    const user = {
      uid: createUniqueUserUid(new Set(users.value.map((record) => record.uid))),
      ...values,
      createdAt: now,
      updatedAt: now,
    }

    users.value = [user, ...users.value]
    return { ok: true, user, persisted: persist() }
  }

  function updateUser(uid, input) {
    const index = users.value.findIndex((record) => record.uid === uid)
    if (index === -1) {
      return { ok: false, errors: { form: 'This user record no longer exists.' } }
    }

    const values = sanitizeUserInput(input)
    const errors = validateUserRecord(values, users.value, uid)
    if (Object.keys(errors).length) return { ok: false, errors }

    const existing = users.value[index]
    const user = {
      ...existing,
      ...values,
      uid: existing.uid,
      createdAt: existing.createdAt,
      updatedAt: new Date().toISOString(),
    }

    users.value.splice(index, 1, user)
    return { ok: true, user, persisted: persist() }
  }

  function setUserStatus(uid, status) {
    const index = users.value.findIndex((record) => record.uid === uid)
    if (index === -1) {
      return { ok: false, errors: { form: 'This user record no longer exists.' } }
    }

    const nextStatus = status === 'Inactive' ? 'Inactive' : 'Active'
    const existing = users.value[index]
    if (existing.status === nextStatus) {
      return { ok: true, user: existing, persisted: persistenceState.value === 'ok', changed: false }
    }

    const user = { ...existing, status: nextStatus, updatedAt: new Date().toISOString() }
    users.value.splice(index, 1, user)
    return { ok: true, user, persisted: persist(), changed: true }
  }

  return {
    users,
    source,
    storageState,
    recovery,
    persistenceState,
    persistenceError,
    loadState,
    loadError,
    totalUsers,
    activeUsers,
    inactiveUsers,
    roleCount,
    loadUsers,
    retryPersist,
    addUser,
    updateUser,
    setUserStatus,
  }
})

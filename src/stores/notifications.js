import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import {
  createSeedNotifications,
  normalizeStoredNotifications,
  sortNotifications,
} from '../utils/notifications'

const STORAGE_KEY = 'campushub:notifications:v1'
const LOAD_ERROR = 'Notification records could not be loaded from browser storage.'
const STORAGE_UNAVAILABLE =
  'Browser storage could not be accessed. Changes will last for this session only.'
const STORAGE_WRITE_FAILED =
  'Browser storage is not accepting notification saves. Changes will last for this session only.'

function getStorage() {
  try {
    if (typeof window === 'undefined') return null
    return window.localStorage || null
  } catch {
    return null
  }
}

function readStoredNotifications() {
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
      recovery: { kind: 'invalid-json', discarded: 0, corrected: 0, duplicateUids: 0 },
    }
  }

  if (!Array.isArray(parsed)) {
    return {
      records: null,
      storageState: 'recovered',
      recovery: { kind: 'invalid-format', discarded: 0, corrected: 0, duplicateUids: 0 },
    }
  }

  const normalized = normalizeStoredNotifications(parsed)
  const recovered =
    normalized.discarded > 0 || normalized.corrected > 0 || normalized.duplicateUids > 0

  return {
    records: normalized.records,
    storageState: recovered ? 'recovered' : 'ok',
    recovery: recovered ? { kind: 'records', ...normalized } : null,
  }
}

export const useNotificationsStore = defineStore('notifications', () => {
  const initial = readStoredNotifications()
  const seed = createSeedNotifications()
  const notifications = ref(initial.records ?? seed)
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
      storage.setItem(STORAGE_KEY, JSON.stringify(notifications.value))
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

  if (initial.storageState !== 'unavailable' && (!initial.records || initial.storageState === 'recovered')) {
    persist()
  }

  const sortedNotifications = computed(() => sortNotifications(notifications.value))
  const totalCount = computed(() => notifications.value.length)
  const unreadCount = computed(() => notifications.value.filter((item) => !item.read).length)
  const readCount = computed(() => notifications.value.filter((item) => item.read).length)
  const recentNotifications = computed(() => sortedNotifications.value.slice(0, 4))

  function loadNotifications() {
    loadState.value = 'loading'
    loadError.value = ''

    try {
      const next = readStoredNotifications()
      const preserveSessionChanges = hasUnpersistedChanges

      if (!preserveSessionChanges) {
        if (next.storageState !== 'unavailable') {
          notifications.value = next.records ?? createSeedNotifications()
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
      } else if (next.storageState === 'recovered' || !next.records) {
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

  function markRead(uid) {
    const target = String(uid ?? '').trim()
    const index = notifications.value.findIndex((item) => item.uid === target)
    if (index === -1) {
      return { ok: false, errors: { form: 'This notification no longer exists.' } }
    }

    const existing = notifications.value[index]
    if (existing.read) {
      return { ok: true, notification: existing, persisted: persistenceState.value !== 'failed' }
    }

    const now = new Date().toISOString()
    const updated = { ...existing, read: true, updatedAt: now }
    notifications.value.splice(index, 1, updated)
    const persisted = persist()
    return { ok: true, notification: updated, persisted }
  }

  function markUnread(uid) {
    const target = String(uid ?? '').trim()
    const index = notifications.value.findIndex((item) => item.uid === target)
    if (index === -1) {
      return { ok: false, errors: { form: 'This notification no longer exists.' } }
    }

    const existing = notifications.value[index]
    if (!existing.read) {
      return { ok: true, notification: existing, persisted: persistenceState.value !== 'failed' }
    }

    const now = new Date().toISOString()
    const updated = { ...existing, read: false, updatedAt: now }
    notifications.value.splice(index, 1, updated)
    const persisted = persist()
    return { ok: true, notification: updated, persisted }
  }

  function markAllRead() {
    if (!notifications.value.some((item) => !item.read)) {
      return { ok: true, changed: 0, persisted: persistenceState.value !== 'failed' }
    }

    const now = new Date().toISOString()
    notifications.value = notifications.value.map((item) =>
      item.read ? item : { ...item, read: true, updatedAt: now },
    )
    const persisted = persist()
    return { ok: true, changed: notifications.value.length, persisted }
  }

  return {
    notifications,
    sortedNotifications,
    recentNotifications,
    source,
    storageState,
    recovery,
    persistenceState,
    persistenceError,
    loadState,
    loadError,
    totalCount,
    unreadCount,
    readCount,
    loadNotifications,
    retryPersist,
    markRead,
    markUnread,
    markAllRead,
  }
})

import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import {
  SETTINGS_DEFAULTS,
  clearStoredSettings,
  readStoredSettings,
  sanitizeSettings,
  writeStoredSettings,
} from '../utils/settings'

export const useSettingsStore = defineStore('settings', () => {
  const initial = readStoredSettings()
  const settings = ref(sanitizeSettings(initial.settings))
  const storageState = ref(initial.storageState)
  const recovery = ref(initial.recovery)
  const persistenceState = ref(initial.storageState === 'unavailable' ? 'unavailable' : 'ok')
  const persistenceError = ref(initial.storageError || '')
  const loadState = ref('ready')
  const loadError = ref('')
  let hasUnpersistedChanges = false

  function applyPersistenceResult(result) {
    if (result.ok) {
      storageState.value = 'ok'
      persistenceState.value = 'ok'
      persistenceError.value = ''
      hasUnpersistedChanges = false
      return true
    }

    if (result.storageState === 'unavailable') {
      storageState.value = 'unavailable'
      persistenceState.value = 'unavailable'
    } else {
      persistenceState.value = 'failed'
    }
    persistenceError.value = result.error || persistenceError.value
    hasUnpersistedChanges = true
    return false
  }

  if (initial.storageState === 'ok' && initial.recovery) {
    applyPersistenceResult(writeStoredSettings(settings.value))
  }

  const sidebarDefaultCollapsed = computed(() => settings.value.sidebarDefaultCollapsed)
  const tableDensity = computed(() => settings.value.tableDensity)

  function loadSettings() {
    loadState.value = 'loading'
    loadError.value = ''

    try {
      const next = readStoredSettings()
      if (next.storageState === 'unavailable') {
        storageState.value = 'unavailable'
        persistenceState.value = 'unavailable'
        persistenceError.value = next.storageError || persistenceError.value
        loadState.value = 'ready'
        return true
      }

      if (!hasUnpersistedChanges) {
        settings.value = sanitizeSettings(next.settings)
        recovery.value = next.recovery
        storageState.value = next.storageState
        if (next.storageState === 'recovered') {
          applyPersistenceResult(writeStoredSettings(settings.value))
        }
      } else {
        storageState.value = next.storageState
      }

      loadState.value = 'ready'
      return true
    } catch {
      loadState.value = 'error'
      loadError.value = 'Settings could not be loaded from browser storage.'
      return false
    }
  }

  function updateSettings(patch = {}) {
    settings.value = sanitizeSettings({ ...settings.value, ...patch })
    const result = writeStoredSettings(settings.value)
    const persisted = applyPersistenceResult(result)
    return { ok: true, persisted, settings: { ...settings.value } }
  }

  function resetToDefaults() {
    settings.value = { ...SETTINGS_DEFAULTS }
    recovery.value = null
    const cleared = clearStoredSettings()
    if (cleared.ok) {
      const written = writeStoredSettings(settings.value)
      const persisted = applyPersistenceResult(written)
      return { ok: true, persisted, settings: { ...settings.value } }
    }

    const persisted = applyPersistenceResult(cleared)
    return { ok: true, persisted, settings: { ...settings.value } }
  }

  function retryPersist() {
    const persisted = applyPersistenceResult(writeStoredSettings(settings.value))
    return {
      ok: persisted,
      persisted,
      state: persistenceState.value,
      error: persistenceError.value,
    }
  }

  return {
    settings,
    storageState,
    recovery,
    persistenceState,
    persistenceError,
    loadState,
    loadError,
    sidebarDefaultCollapsed,
    tableDensity,
    loadSettings,
    updateSettings,
    resetToDefaults,
    retryPersist,
  }
})

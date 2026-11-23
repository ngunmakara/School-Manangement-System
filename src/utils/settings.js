export const SETTINGS_STORAGE_KEY = 'campushub:settings:v1'
export const LEGACY_SIDEBAR_STORAGE_KEY = 'campushub:sidebar-collapsed'

export const SETTINGS_DEFAULTS = Object.freeze({
  sidebarDefaultCollapsed: false,
  tableDensity: 'comfortable',
})

export const TABLE_DENSITY_OPTIONS = Object.freeze([
  { value: 'comfortable', label: 'Comfortable' },
  { value: 'compact', label: 'Compact' },
])

function getStorage() {
  try {
    if (typeof window === 'undefined') return null
    return window.localStorage || null
  } catch {
    return null
  }
}

function normalizeBoolean(value, fallback) {
  if (typeof value === 'boolean') return value
  if (value === '1' || value === 1 || value === 'true') return true
  if (value === '0' || value === 0 || value === 'false') return false
  return fallback
}

function normalizeTableDensity(value, fallback = SETTINGS_DEFAULTS.tableDensity) {
  return value === 'compact' || value === 'comfortable' ? value : fallback
}

export function sanitizeSettings(input = {}, defaults = SETTINGS_DEFAULTS) {
  return {
    sidebarDefaultCollapsed: normalizeBoolean(
      input.sidebarDefaultCollapsed,
      defaults.sidebarDefaultCollapsed,
    ),
    tableDensity: normalizeTableDensity(input.tableDensity, defaults.tableDensity),
  }
}

function hasSettingsShape(raw) {
  return raw && typeof raw === 'object' && !Array.isArray(raw)
}

export function readStoredSettings() {
  const storage = getStorage()
  if (!storage) {
    return {
      settings: { ...SETTINGS_DEFAULTS },
      storageState: 'unavailable',
      recovery: null,
      storageError: 'Browser storage could not be accessed. Changes will last for this session only.',
    }
  }

  let raw
  try {
    raw = storage.getItem(SETTINGS_STORAGE_KEY)
  } catch {
    return {
      settings: { ...SETTINGS_DEFAULTS },
      storageState: 'unavailable',
      recovery: null,
      storageError: 'Browser storage could not be accessed. Changes will last for this session only.',
    }
  }

  if (raw === null) {
    try {
      const legacy = storage.getItem(LEGACY_SIDEBAR_STORAGE_KEY)
      if (legacy === '1' || legacy === '0') {
        const settings = sanitizeSettings({
          ...SETTINGS_DEFAULTS,
          sidebarDefaultCollapsed: legacy === '1',
        })
        return {
          settings,
          storageState: 'ok',
          recovery: { kind: 'legacy-migration' },
          storageError: '',
        }
      }
    } catch {
      // Ignore legacy key read errors; defaults still apply.
    }
    return { settings: { ...SETTINGS_DEFAULTS }, storageState: 'ok', recovery: null, storageError: '' }
  }

  let parsed
  try {
    parsed = JSON.parse(raw)
  } catch {
    return {
      settings: { ...SETTINGS_DEFAULTS },
      storageState: 'recovered',
      recovery: { kind: 'invalid-json' },
      storageError: '',
    }
  }

  if (!hasSettingsShape(parsed)) {
    return {
      settings: { ...SETTINGS_DEFAULTS },
      storageState: 'recovered',
      recovery: { kind: 'invalid-format' },
      storageError: '',
    }
  }

  const settings = sanitizeSettings(parsed)
  const corrected =
    settings.sidebarDefaultCollapsed !== parsed.sidebarDefaultCollapsed ||
    settings.tableDensity !== parsed.tableDensity ||
    Object.keys(parsed).length !== Object.keys(settings).length

  return {
    settings,
    storageState: corrected ? 'recovered' : 'ok',
    recovery: corrected ? { kind: 'normalized' } : null,
    storageError: '',
  }
}

export function writeStoredSettings(settings) {
  const storage = getStorage()
  if (!storage) {
    return {
      ok: false,
      storageState: 'unavailable',
      error: 'Browser storage could not be accessed. Changes will last for this session only.',
    }
  }

  try {
    storage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(sanitizeSettings(settings)))
    return { ok: true, storageState: 'ok', error: '' }
  } catch {
    return {
      ok: false,
      storageState: 'failed',
      error: 'Browser storage is not accepting settings saves. Changes will last for this session only.',
    }
  }
}

export function clearStoredSettings() {
  const storage = getStorage()
  if (!storage) {
    return {
      ok: false,
      storageState: 'unavailable',
      error: 'Browser storage could not be accessed. Changes will last for this session only.',
    }
  }

  try {
    storage.removeItem(SETTINGS_STORAGE_KEY)
    return { ok: true, storageState: 'ok', error: '' }
  } catch {
    return {
      ok: false,
      storageState: 'failed',
      error: 'Browser storage is not accepting settings saves. Changes will last for this session only.',
    }
  }
}

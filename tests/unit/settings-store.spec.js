import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useSettingsStore } from '../../src/stores/settings'
import { SETTINGS_DEFAULTS, SETTINGS_STORAGE_KEY } from '../../src/utils/settings'

beforeEach(() => {
  window.localStorage.clear()
  setActivePinia(createPinia())
})

afterEach(() => {
  vi.restoreAllMocks()
  window.localStorage.clear()
})

describe('settings store', () => {
  it('loads defaults and persists updates', () => {
    const store = useSettingsStore()
    expect(store.settings).toEqual(SETTINGS_DEFAULTS)

    const result = store.updateSettings({ sidebarDefaultCollapsed: true, tableDensity: 'compact' })
    expect(result).toMatchObject({ ok: true, persisted: true })
    expect(store.sidebarDefaultCollapsed).toBe(true)
    expect(store.tableDensity).toBe('compact')
    expect(JSON.parse(window.localStorage.getItem(SETTINGS_STORAGE_KEY))).toEqual({
      sidebarDefaultCollapsed: true,
      tableDensity: 'compact',
    })
  })

  it('reloads stored settings and resets to defaults', () => {
    window.localStorage.setItem(
      SETTINGS_STORAGE_KEY,
      JSON.stringify({ sidebarDefaultCollapsed: true, tableDensity: 'compact' }),
    )
    const store = useSettingsStore()
    expect(store.loadSettings()).toBe(true)
    expect(store.settings).toEqual({ sidebarDefaultCollapsed: true, tableDensity: 'compact' })

    const reset = store.resetToDefaults()
    expect(reset).toMatchObject({ ok: true, persisted: true })
    expect(store.settings).toEqual(SETTINGS_DEFAULTS)
    expect(JSON.parse(window.localStorage.getItem(SETTINGS_STORAGE_KEY))).toEqual(SETTINGS_DEFAULTS)
  })

  it('recovers invalid stored data and handles persistence failures', () => {
    window.localStorage.setItem(SETTINGS_STORAGE_KEY, '{bad-json')
    let store = useSettingsStore()
    expect(store.storageState).toBe('recovered')
    expect(store.recovery).toMatchObject({ kind: 'invalid-json' })
    expect(store.settings).toEqual(SETTINGS_DEFAULTS)

    window.localStorage.clear()
    setActivePinia(createPinia())
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota')
    })
    store = useSettingsStore()
    const result = store.updateSettings({ tableDensity: 'compact' })
    expect(result.ok).toBe(true)
    expect(result.persisted).toBe(false)
    expect(store.persistenceState).toBe('failed')
    expect(store.tableDensity).toBe('compact')

    setItemSpy.mockRestore()
    expect(store.retryPersist()).toMatchObject({ ok: true, persisted: true })
  })
})

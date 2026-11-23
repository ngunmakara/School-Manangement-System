import { describe, expect, it, beforeEach } from 'vitest'
import {
  LEGACY_SIDEBAR_STORAGE_KEY,
  SETTINGS_DEFAULTS,
  SETTINGS_STORAGE_KEY,
  clearStoredSettings,
  readStoredSettings,
  sanitizeSettings,
  writeStoredSettings,
} from '../../src/utils/settings'

beforeEach(() => {
  window.localStorage.clear()
})

describe('settings utils', () => {
  it('returns defaults when storage is empty', () => {
    const result = readStoredSettings()
    expect(result.storageState).toBe('ok')
    expect(result.settings).toEqual(SETTINGS_DEFAULTS)
  })

  it('sanitizes invalid values and reports recovery', () => {
    window.localStorage.setItem(
      SETTINGS_STORAGE_KEY,
      JSON.stringify({ sidebarDefaultCollapsed: 'yes', tableDensity: 'wide', extra: true }),
    )

    const result = readStoredSettings()
    expect(result.storageState).toBe('recovered')
    expect(result.recovery).toMatchObject({ kind: 'normalized' })
    expect(result.settings).toEqual(SETTINGS_DEFAULTS)
  })

  it('handles invalid JSON and invalid format safely', () => {
    window.localStorage.setItem(SETTINGS_STORAGE_KEY, '{bad')
    let result = readStoredSettings()
    expect(result.storageState).toBe('recovered')
    expect(result.recovery).toMatchObject({ kind: 'invalid-json' })
    expect(result.settings).toEqual(SETTINGS_DEFAULTS)

    window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify([1, 2]))
    result = readStoredSettings()
    expect(result.storageState).toBe('recovered')
    expect(result.recovery).toMatchObject({ kind: 'invalid-format' })
  })

  it('migrates legacy sidebar preference', () => {
    window.localStorage.setItem(LEGACY_SIDEBAR_STORAGE_KEY, '1')
    const result = readStoredSettings()
    expect(result.storageState).toBe('ok')
    expect(result.recovery).toMatchObject({ kind: 'legacy-migration' })
    expect(result.settings.sidebarDefaultCollapsed).toBe(true)
  })

  it('writes, sanitizes, and clears settings', () => {
    const writeResult = writeStoredSettings({
      sidebarDefaultCollapsed: true,
      tableDensity: 'compact',
    })
    expect(writeResult.ok).toBe(true)
    expect(readStoredSettings().settings).toEqual({
      sidebarDefaultCollapsed: true,
      tableDensity: 'compact',
    })

    expect(sanitizeSettings({ sidebarDefaultCollapsed: '1', tableDensity: 'bad' })).toEqual({
      sidebarDefaultCollapsed: true,
      tableDensity: 'comfortable',
    })

    expect(clearStoredSettings().ok).toBe(true)
    expect(window.localStorage.getItem(SETTINGS_STORAGE_KEY)).toBeNull()
  })
})

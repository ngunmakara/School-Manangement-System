import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useUsersStore } from '../../src/stores/users'

const STORAGE_KEY = 'campushub:users:v1'

function user(overrides = {}) {
  return {
    uid: 'user_1',
    userId: 'USR-1',
    fullName: 'Test User',
    email: 'test@campushub.demo',
    role: 'Staff',
    department: 'Operations',
    status: 'Active',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

beforeEach(() => {
  window.localStorage.clear()
  setActivePinia(createPinia())
})

afterEach(() => {
  vi.restoreAllMocks()
  window.localStorage.clear()
})

describe('users store', () => {
  it('seeds demo users when storage is empty and persists them', () => {
    const store = useUsersStore()
    expect(store.totalUsers).toBeGreaterThan(0)
    expect(store.storageState).toBe('ok')
    expect(JSON.parse(window.localStorage.getItem(STORAGE_KEY))).toHaveLength(store.totalUsers)
  })

  it('adds, updates, and toggles status with persistence', () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([user()]))
    const store = useUsersStore()

    const added = store.addUser({
      userId: 'USR-2',
      fullName: 'Another User',
      email: 'another@campushub.demo',
      role: 'Registrar',
      department: 'Registrar Office',
      status: 'Active',
    })
    expect(added.ok).toBe(true)
    expect(added.persisted).toBe(true)

    const updated = store.updateUser('user_1', {
      ...user(),
      fullName: 'Updated User',
      role: 'Administrator',
    })
    expect(updated.ok).toBe(true)
    expect(updated.user.fullName).toBe('Updated User')
    expect(updated.user.role).toBe('Administrator')

    const toggled = store.setUserStatus('user_1', 'Inactive')
    expect(toggled.ok).toBe(true)
    expect(toggled.user.status).toBe('Inactive')
    expect(
      JSON.parse(window.localStorage.getItem(STORAGE_KEY)).find((item) => item.uid === 'user_1')
        .status,
    ).toBe('Inactive')
  })

  it('recovers malformed records and unavailable/failed storage safely', () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([user(), { uid: 'bad' }]))
    let store = useUsersStore()
    expect(store.totalUsers).toBe(1)
    expect(store.storageState).toBe('recovered')
    expect(store.recovery).toMatchObject({ kind: 'records', discarded: 1 })

    window.localStorage.clear()
    setActivePinia(createPinia())
    const getItemSpy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    store = useUsersStore()
    expect(store.storageState).toBe('unavailable')
    expect(store.totalUsers).toBeGreaterThan(0)
    getItemSpy.mockRestore()

    window.localStorage.clear()
    setActivePinia(createPinia())
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([user()]))
    store = useUsersStore()
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota')
    })
    const result = store.setUserStatus('user_1', 'Inactive')
    expect(result.ok).toBe(true)
    expect(result.persisted).toBe(false)
    expect(store.persistenceState).toBe('failed')
    setItemSpy.mockRestore()
    expect(store.retryPersist()).toMatchObject({ ok: true, persisted: true })
  })
})

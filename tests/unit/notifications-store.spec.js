import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useNotificationsStore } from '../../src/stores/notifications'

const STORAGE_KEY = 'campushub:notifications:v1'

function storedNotification(overrides = {}) {
  return {
    uid: 'notification_1',
    title: 'Test notification',
    body: 'Body',
    icon: 'bi-bell',
    tone: 'info',
    category: 'System',
    route: '/dashboard',
    read: false,
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

describe('notifications store', () => {
  it('seeds notifications when storage is empty and persists them', () => {
    const store = useNotificationsStore()

    expect(store.totalCount).toBeGreaterThan(0)
    expect(store.unreadCount).toBeGreaterThan(0)
    expect(store.storageState).toBe('ok')
    expect(JSON.parse(window.localStorage.getItem(STORAGE_KEY))).toHaveLength(store.totalCount)
  })

  it('loads, marks read/unread, and marks all read with persistence', () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([
        storedNotification({ uid: 'n1', read: false }),
        storedNotification({ uid: 'n2', title: 'Second', read: true }),
      ]),
    )

    const store = useNotificationsStore()
    expect(store.loadNotifications()).toBe(true)
    expect(store.unreadCount).toBe(1)

    const marked = store.markRead('n1')
    expect(marked.ok).toBe(true)
    expect(marked.persisted).toBe(true)
    expect(store.unreadCount).toBe(0)

    const unread = store.markUnread('n1')
    expect(unread.ok).toBe(true)
    expect(store.unreadCount).toBe(1)

    const all = store.markAllRead()
    expect(all.ok).toBe(true)
    expect(store.unreadCount).toBe(0)
    expect(JSON.parse(window.localStorage.getItem(STORAGE_KEY)).every((item) => item.read)).toBe(
      true,
    )
  })

  it('recovers malformed stored data and reports recovery', () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([storedNotification({ uid: 'n1' }), { uid: 'bad' }]),
    )

    const store = useNotificationsStore()
    expect(store.totalCount).toBe(1)
    expect(store.storageState).toBe('recovered')
    expect(store.recovery).toMatchObject({ kind: 'records', discarded: 1 })
  })

  it('handles invalid JSON and unavailable storage safely', () => {
    window.localStorage.setItem(STORAGE_KEY, '{bad-json')
    let store = useNotificationsStore()
    expect(store.storageState).toBe('recovered')
    expect(store.recovery).toMatchObject({ kind: 'invalid-json' })
    expect(store.totalCount).toBeGreaterThan(0)

    window.localStorage.clear()
    setActivePinia(createPinia())
    const getItemSpy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    store = useNotificationsStore()
    expect(store.storageState).toBe('unavailable')
    expect(store.persistenceState).toBe('unavailable')
    expect(store.totalCount).toBeGreaterThan(0)
    getItemSpy.mockRestore()
  })

  it('keeps session changes when persistence fails and can retry', () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([storedNotification({ uid: 'n1' })]))
    const store = useNotificationsStore()
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota')
    })

    const result = store.markRead('n1')
    expect(result.ok).toBe(true)
    expect(result.persisted).toBe(false)
    expect(store.persistenceState).toBe('failed')
    expect(store.notifications.find((item) => item.uid === 'n1').read).toBe(true)

    setItemSpy.mockRestore()
    const retry = store.retryPersist()
    expect(retry).toMatchObject({ ok: true, persisted: true })
    expect(JSON.parse(window.localStorage.getItem(STORAGE_KEY))[0].read).toBe(true)
  })
})

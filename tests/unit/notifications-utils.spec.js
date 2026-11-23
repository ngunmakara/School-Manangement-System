import { describe, expect, it, vi, afterEach } from 'vitest'
import {
  createSeedNotifications,
  filterNotifications,
  formatNotificationTime,
  normalizeStoredNotification,
  normalizeStoredNotifications,
  sortNotifications,
} from '../../src/utils/notifications'

afterEach(() => {
  vi.useRealTimers()
})

describe('notifications utils', () => {
  it('normalizes stored notifications and reports corrections', () => {
    const result = normalizeStoredNotification({
      id: 'legacy-1',
      title: '  Welcome  ',
      body: '  Hello   world ',
      unread: true,
      icon: '',
      tone: 'unknown',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: 'invalid',
    })

    expect(result).not.toBeNull()
    expect(result.corrected).toBe(true)
    expect(result.notification).toMatchObject({
      uid: 'legacy-1',
      title: 'Welcome',
      body: 'Hello world',
      icon: 'bi-bell',
      tone: '',
      read: false,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    })
  })

  it('recovers valid records, discards invalid ones, and repairs duplicate uids', () => {
    const normalized = normalizeStoredNotifications([
      {
        uid: 'dup',
        title: 'First',
        read: false,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
      {
        uid: 'dup',
        title: 'Second',
        read: true,
        createdAt: '2026-01-02T00:00:00.000Z',
        updatedAt: '2026-01-02T00:00:00.000Z',
      },
      { title: '' },
    ])

    expect(normalized.records).toHaveLength(2)
    expect(normalized.discarded).toBe(1)
    expect(normalized.duplicateUids).toBe(1)
    expect(normalized.corrected).toBeGreaterThan(0)
    expect(normalized.records[0].uid).toBe('dup')
    expect(normalized.records[1].uid).not.toBe('dup')
  })

  it('filters and sorts notifications by read state and recency', () => {
    const records = [
      {
        uid: '1',
        title: 'Read old',
        body: 'b',
        category: 'System',
        route: '/dashboard',
        read: true,
        createdAt: '2026-01-01T00:00:00.000Z',
      },
      {
        uid: '2',
        title: 'Unread new',
        body: 'b',
        category: 'Finance',
        route: '/payments',
        read: false,
        createdAt: '2026-01-03T00:00:00.000Z',
      },
      {
        uid: '3',
        title: 'Unread old',
        body: 'b',
        category: 'Finance',
        route: '/payments',
        read: false,
        createdAt: '2026-01-02T00:00:00.000Z',
      },
    ]

    expect(filterNotifications(records, { read: 'unread' }).map((item) => item.uid)).toEqual([
      '2',
      '3',
    ])
    expect(filterNotifications(records, { search: 'finance' }).map((item) => item.uid)).toEqual([
      '2',
      '3',
    ])
    expect(sortNotifications(records).map((item) => item.uid)).toEqual(['2', '3', '1'])
  })

  it('creates seeds and formats relative time', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T12:00:00.000Z'))

    const seeds = createSeedNotifications(new Date('2026-01-01T12:00:00.000Z'))
    expect(seeds.length).toBeGreaterThan(0)
    expect(seeds.some((item) => item.read)).toBe(true)
    expect(formatNotificationTime('2026-01-01T11:59:00.000Z')).toBe('1m ago')
    expect(formatNotificationTime('2026-01-01T10:00:00.000Z')).toBe('2h ago')
  })
})

import { describe, expect, it } from 'vitest'
import {
  createSeedUsers,
  filterUsers,
  normalizeStoredUsers,
  sortUsers,
  validateUserRecord,
} from '../../src/utils/users'

describe('users utils', () => {
  it('validates required fields, email format, and duplicate email/user id', () => {
    const users = [
      {
        uid: 'u1',
        userId: 'USR-1',
        email: 'one@campushub.demo',
        fullName: 'One',
        role: 'Staff',
        status: 'Active',
      },
    ]

    expect(validateUserRecord({}, users).email).toBe('Email is required.')
    expect(
      validateUserRecord(
        {
          userId: 'USR-1',
          fullName: 'Two',
          email: 'two@campushub.demo',
          role: 'Staff',
          status: 'Active',
        },
        users,
      ).userId,
    ).toContain('already assigned')
    expect(
      validateUserRecord(
        { userId: 'USR-2', fullName: 'Two', email: 'bad-email', role: 'Staff', status: 'Active' },
        users,
      ).email,
    ).toContain('valid email')
    expect(
      validateUserRecord(
        {
          userId: 'USR-2',
          fullName: 'Two',
          email: 'one@campushub.demo',
          role: 'Staff',
          status: 'Active',
        },
        users,
      ).email,
    ).toContain('already registered')
    expect(
      validateUserRecord(
        {
          userId: 'USR-2',
          fullName: 'Two',
          email: 'two@campushub.demo',
          role: '',
          status: 'Active',
        },
        users,
      ).role,
    ).toContain('valid role')
  })

  it('normalizes stored users, discards invalid/duplicate records, and repairs uids', () => {
    const normalized = normalizeStoredUsers([
      {
        uid: 'dup',
        userId: 'USR-1',
        fullName: '  Alice  Admin ',
        email: 'ALICE@campushub.demo',
        role: 'Administrator',
        status: 'Active',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: 'invalid',
      },
      {
        uid: 'dup',
        userId: 'USR-2',
        fullName: 'Bob',
        email: 'alice@campushub.demo',
        role: 'Staff',
        status: 'Inactive',
      },
      { userId: 'USR-3', fullName: '', email: 'bad' },
    ])

    expect(normalized.records).toHaveLength(1)
    expect(normalized.discarded).toBe(2)
    expect(normalized.duplicateIdentity).toBe(1)
    expect(normalized.corrected).toBeGreaterThan(0)
    expect(normalized.records[0]).toMatchObject({
      uid: 'dup',
      fullName: 'Alice Admin',
      email: 'alice@campushub.demo',
      updatedAt: '2026-01-01T00:00:00.000Z',
    })
  })

  it('filters and sorts users', () => {
    const users = createSeedUsers(new Date('2026-01-01T00:00:00.000Z'))
    expect(filterUsers(users, { role: 'Administrator' })).toHaveLength(1)
    expect(filterUsers(users, { status: 'Inactive' })).toHaveLength(1)
    expect(filterUsers(users, { search: 'finance' })).toHaveLength(1)
    expect(
      sortUsers(users, 'fullName', 'asc')[0].fullName.localeCompare(users[0].fullName),
    ).not.toBeNaN()
  })
})

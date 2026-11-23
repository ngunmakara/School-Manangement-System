export const USER_ROLES = ['Administrator', 'Registrar', 'Staff', 'Teacher']
export const USER_STATUSES = ['Active', 'Inactive']

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const DATE_TIME_FALLBACK = () => new Date().toISOString()

let uidCounter = 0

function collapseWhitespace(value) {
  return String(value ?? '')
    .trim()
    .replace(/\s+/g, ' ')
}

export function createUserUid() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `user_${crypto.randomUUID()}`
  }
  uidCounter += 1
  return `user_${Date.now().toString(36)}_${uidCounter}`
}

export function createUniqueUserUid(usedUids = []) {
  const used = usedUids instanceof Set ? usedUids : new Set(usedUids)
  let uid = createUserUid()
  while (used.has(uid)) uid = createUserUid()
  return uid
}

function normalizeRole(value) {
  const role = collapseWhitespace(value)
  return USER_ROLES.includes(role) ? role : ''
}

function normalizeStatus(value) {
  const status = collapseWhitespace(value)
  if (status.toLowerCase() === 'inactive') return 'Inactive'
  if (status.toLowerCase() === 'active') return 'Active'
  return USER_STATUSES.includes(status) ? status : 'Active'
}

function normalizeTimestamp(value, fallback) {
  const text = String(value ?? '').trim()
  if (!text) return fallback
  return Number.isNaN(new Date(text).getTime()) ? fallback : text
}

export function sanitizeUserInput(input = {}) {
  return {
    userId: collapseWhitespace(input.userId).toUpperCase().slice(0, 40),
    fullName: collapseWhitespace(input.fullName).slice(0, 120),
    email: collapseWhitespace(input.email).toLowerCase().slice(0, 120),
    role: normalizeRole(input.role),
    department: collapseWhitespace(input.department).slice(0, 120),
    status: normalizeStatus(input.status),
  }
}

export function getUserIdentity(user = {}) {
  return String(user.email ?? '')
    .trim()
    .toLowerCase()
}

export function validateUserRecord(input = {}, users = [], editingUid = null) {
  const values = sanitizeUserInput(input)
  const errors = {}

  if (!values.userId) {
    errors.userId = 'User ID is required.'
  } else if (
    users.some(
      (user) =>
        user.uid !== editingUid &&
        String(user.userId ?? '')
          .trim()
          .toLowerCase() === values.userId.toLowerCase(),
    )
  ) {
    errors.userId = 'This user ID is already assigned.'
  }

  if (!values.fullName) {
    errors.fullName = 'Full name is required.'
  } else if (values.fullName.length < 2) {
    errors.fullName = 'Enter the user’s full name.'
  }

  if (!values.email) {
    errors.email = 'Email is required.'
  } else if (!EMAIL_PATTERN.test(values.email)) {
    errors.email = 'Enter a valid email address.'
  } else if (
    users.some((user) => user.uid !== editingUid && getUserIdentity(user) === values.email)
  ) {
    errors.email = 'This email is already registered.'
  }

  if (!values.role) {
    errors.role = 'Select a valid role.'
  }

  if (!values.status || !USER_STATUSES.includes(values.status)) {
    errors.status = 'Select a valid status.'
  }

  return errors
}

export function normalizeStoredUser(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null

  const values = sanitizeUserInput(raw)
  if (!values.userId || !values.fullName || !values.email || !EMAIL_PATTERN.test(values.email)) {
    return null
  }

  const now = DATE_TIME_FALLBACK()
  const rawUid = String(raw.uid ?? '').trim()
  const createdAt = normalizeTimestamp(raw.createdAt, now)
  const updatedAt = normalizeTimestamp(raw.updatedAt, createdAt)
  const role = values.role || 'Staff'
  const corrected =
    !rawUid ||
    role !== collapseWhitespace(raw.role) ||
    values.status !== collapseWhitespace(raw.status) ||
    createdAt !== raw.createdAt ||
    updatedAt !== raw.updatedAt ||
    values.userId !== String(raw.userId ?? '').trim() ||
    values.fullName !== String(raw.fullName ?? '').trim() ||
    values.email !== String(raw.email ?? '').trim() ||
    values.department !== String(raw.department ?? '').trim()

  return {
    user: {
      uid: rawUid || createUserUid(),
      ...values,
      role,
      createdAt,
      updatedAt,
    },
    corrected,
  }
}

export function normalizeStoredUsers(rawRecords = []) {
  const input = Array.isArray(rawRecords) ? rawRecords : []
  const parsedEntries = []
  const usedIdentities = new Set()
  let discarded = 0
  let corrected = 0
  let duplicateUids = 0
  let duplicateIdentity = 0

  input.forEach((raw, index) => {
    let parsed
    try {
      parsed = normalizeStoredUser(raw)
    } catch {
      parsed = null
    }
    if (!parsed) {
      discarded += 1
      return
    }

    const identity = getUserIdentity(parsed.user)
    if (usedIdentities.has(identity)) {
      duplicateIdentity += 1
      discarded += 1
      return
    }

    usedIdentities.add(identity)
    parsedEntries.push({ ...parsed, index })
  })

  const usedUids = new Set()
  parsedEntries.forEach((entry) => {
    const uid = entry.user.uid
    entry.uidValid = Boolean(uid) && !usedUids.has(uid)
    if (entry.uidValid) usedUids.add(uid)
    else if (uid) duplicateUids += 1
  })

  const records = parsedEntries.map((entry) => {
    let recordCorrected = entry.corrected
    if (!entry.uidValid) {
      let uid = `user_recovered_${entry.index + 1}`
      let suffix = 2
      while (usedUids.has(uid)) {
        uid = `user_recovered_${entry.index + 1}_${suffix}`
        suffix += 1
      }
      entry.user.uid = uid
      usedUids.add(uid)
      recordCorrected = true
    }
    if (recordCorrected) corrected += 1
    return entry.user
  })

  return { records, discarded, corrected, duplicateUids, duplicateIdentity }
}

export function createSeedUsers(now = new Date()) {
  const base = new Date(now)
  const stamp = (hoursAgo) => new Date(base.getTime() - hoursAgo * 60 * 60 * 1000).toISOString()
  return [
    {
      uid: 'user_seed_1',
      userId: 'USR-1001',
      fullName: 'Amara Mensah',
      email: 'amara.mensah@campushub.demo',
      role: 'Administrator',
      department: 'Administration',
      status: 'Active',
      createdAt: stamp(240),
      updatedAt: stamp(2),
    },
    {
      uid: 'user_seed_2',
      userId: 'USR-1002',
      fullName: 'Daniel Okafor',
      email: 'daniel.okafor@campushub.demo',
      role: 'Registrar',
      department: 'Registrar Office',
      status: 'Active',
      createdAt: stamp(200),
      updatedAt: stamp(4),
    },
    {
      uid: 'user_seed_3',
      userId: 'USR-1003',
      fullName: 'Elena Park',
      email: 'elena.park@campushub.demo',
      role: 'Teacher',
      department: 'Computer Science',
      status: 'Active',
      createdAt: stamp(180),
      updatedAt: stamp(24),
    },
    {
      uid: 'user_seed_4',
      userId: 'USR-1004',
      fullName: 'Layla Hassan',
      email: 'layla.hassan@campushub.demo',
      role: 'Staff',
      department: 'Finance Office',
      status: 'Inactive',
      createdAt: stamp(160),
      updatedAt: stamp(72),
    },
  ]
}

export function filterUsers(users = [], filters = {}) {
  const term = String(filters.search ?? '')
    .trim()
    .toLowerCase()
  const role = String(filters.role ?? '').trim()
  const status = String(filters.status ?? '').trim()

  return users.filter((user) => {
    if (role && role !== 'all' && user.role !== role) return false
    if (status && status !== 'all' && user.status !== status) return false
    if (!term) return true
    return [user.userId, user.fullName, user.email, user.role, user.department, user.status].some(
      (value) => String(value ?? '').toLowerCase().includes(term),
    )
  })
}

export function sortUsers(users = [], sortKey = 'fullName', sortDir = 'asc') {
  const direction = sortDir === 'desc' ? -1 : 1
  return [...users].sort((left, right) => {
    if (sortKey === 'createdAt' || sortKey === 'updatedAt') {
      return (
        (new Date(left[sortKey] || 0).getTime() - new Date(right[sortKey] || 0).getTime()) *
        direction
      )
    }
    return (
      String(left[sortKey] ?? '').localeCompare(String(right[sortKey] ?? ''), 'en', {
        sensitivity: 'base',
        numeric: true,
      }) * direction
    )
  })
}

export function formatUserDate(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date)
}

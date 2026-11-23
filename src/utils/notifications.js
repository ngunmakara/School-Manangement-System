export const NOTIFICATION_READ_FILTERS = Object.freeze(['all', 'unread', 'read'])

const STORED_TIMESTAMP_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
const ALLOWED_TONES = new Set(['', 'info', 'success', 'warning', 'danger'])

let uidCounter = 0

export function createNotificationUid() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `notification_${crypto.randomUUID()}`
  }

  uidCounter += 1
  return `notification_${Date.now().toString(36)}_${uidCounter}`
}

function collapseWhitespace(value) {
  return String(value ?? '')
    .trim()
    .replace(/\s+/g, ' ')
}

function normalizeTimestamp(value, fallback) {
  const text = typeof value === 'string' ? value.trim() : ''
  if (!text || !STORED_TIMESTAMP_PATTERN.test(text)) return fallback
  return !Number.isNaN(new Date(text).getTime()) ? text : fallback
}

function normalizeTone(value) {
  const tone = String(value ?? '')
    .trim()
    .toLowerCase()
  return ALLOWED_TONES.has(tone) ? tone : ''
}

function normalizeRead(value) {
  if (typeof value === 'boolean') return value
  if (value === 'true') return true
  if (value === 'false') return false
  return false
}

export function sanitizeNotificationInput(input = {}) {
  const hasUnread = input?.unread !== undefined && input?.unread !== null
  const read = hasUnread ? !normalizeRead(input.unread) : normalizeRead(input.read)

  return {
    title: collapseWhitespace(input.title).slice(0, 120),
    body: collapseWhitespace(input.body ?? input.message).slice(0, 240),
    icon: collapseWhitespace(input.icon) || 'bi-bell',
    tone: normalizeTone(input.tone),
    category: collapseWhitespace(input.category).slice(0, 60),
    route: collapseWhitespace(input.route ?? input.to),
    read,
  }
}

export function normalizeStoredNotification(raw, fallbackNow = new Date().toISOString()) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null

  const rawUid = typeof raw.uid === 'string' ? raw.uid.trim() : String(raw.id ?? '').trim()
  const values = sanitizeNotificationInput(raw)
  if (!values.title) return null

  const createdAt = normalizeTimestamp(raw.createdAt, fallbackNow)
  const updatedAt = normalizeTimestamp(raw.updatedAt, createdAt)
  const uid = rawUid || createNotificationUid()

  const corrected =
    uid !== rawUid ||
    values.title !== collapseWhitespace(raw.title) ||
    values.body !== collapseWhitespace(raw.body ?? raw.message) ||
    values.icon !== (collapseWhitespace(raw.icon) || 'bi-bell') ||
    values.tone !== normalizeTone(raw.tone) ||
    values.category !== collapseWhitespace(raw.category) ||
    values.route !== collapseWhitespace(raw.route ?? raw.to) ||
    createdAt !== (typeof raw.createdAt === 'string' ? raw.createdAt.trim() : raw.createdAt) ||
    updatedAt !== (typeof raw.updatedAt === 'string' ? raw.updatedAt.trim() : raw.updatedAt) ||
    typeof raw.read !== 'boolean'

  return {
    notification: {
      uid,
      ...values,
      createdAt,
      updatedAt,
    },
    corrected,
  }
}

function createRecoveredUid(index, usedUids) {
  const base = `notification_recovered_${index + 1}`
  let uid = base
  let suffix = 2
  while (usedUids.has(uid)) {
    uid = `${base}_${suffix}`
    suffix += 1
  }
  return uid
}

export function normalizeStoredNotifications(rawRecords = [], fallbackNow = new Date().toISOString()) {
  const input = Array.isArray(rawRecords) ? rawRecords : []
  const parsedEntries = []
  let discarded = 0
  let corrected = 0
  let duplicateUids = 0

  input.forEach((raw, index) => {
    let parsed
    try {
      parsed = normalizeStoredNotification(raw, fallbackNow)
    } catch {
      parsed = null
    }

    if (!parsed) {
      discarded += 1
      return
    }

    parsedEntries.push({ ...parsed, index })
  })

  const usedUids = new Set()
  parsedEntries.forEach((entry) => {
    const uid = entry.notification.uid
    entry.uidValid = Boolean(uid) && !usedUids.has(uid)
    if (entry.uidValid) usedUids.add(uid)
    else if (uid) duplicateUids += 1
  })

  const records = parsedEntries.map((entry) => {
    let recordCorrected = entry.corrected
    if (!entry.uidValid) {
      entry.notification.uid = createRecoveredUid(entry.index, usedUids)
      usedUids.add(entry.notification.uid)
      recordCorrected = true
    }
    if (recordCorrected) corrected += 1
    return entry.notification
  })

  return { records, discarded, corrected, duplicateUids }
}

export function createSeedNotifications(now = new Date()) {
  const base = now instanceof Date && !Number.isNaN(now.getTime()) ? now.getTime() : Date.now()
  const iso = (minutesAgo) => new Date(base - minutesAgo * 60 * 1000).toISOString()

  return [
    {
      uid: 'notification_seed_1',
      title: '12 enrollment applications await review',
      body: 'Undergraduate admissions queue has new applications ready for review.',
      icon: 'bi-person-plus',
      tone: 'info',
      category: 'Admissions',
      route: '/enrollment',
      read: false,
      createdAt: iso(10),
      updatedAt: iso(10),
    },
    {
      uid: 'notification_seed_2',
      title: 'Fall semester grade submission closes Friday',
      body: 'Academic Affairs reminder for faculty grade submission deadlines.',
      icon: 'bi-journal-check',
      tone: 'warning',
      category: 'Academics',
      route: '/grades',
      read: false,
      createdAt: iso(60),
      updatedAt: iso(60),
    },
    {
      uid: 'notification_seed_3',
      title: 'Tuition payment received from Daniel Okafor',
      body: 'Finance Office recorded a tuition payment in the local demo records.',
      icon: 'bi-cash-coin',
      tone: 'success',
      category: 'Finance',
      route: '/payments',
      read: false,
      createdAt: iso(120),
      updatedAt: iso(120),
    },
    {
      uid: 'notification_seed_4',
      title: 'Room change: Human Anatomy Lab moved to C-012',
      body: "Health Sciences schedule update for today's lab session.",
      icon: 'bi-geo-alt',
      tone: 'info',
      category: 'Schedule',
      route: '/sections',
      read: false,
      createdAt: iso(24 * 60),
      updatedAt: iso(24 * 60),
    },
    {
      uid: 'notification_seed_5',
      title: 'New teacher profile added for Engineering',
      body: 'Human Resources added a new faculty profile to the directory.',
      icon: 'bi-person-video3',
      tone: 'success',
      category: 'Directory',
      route: '/teachers',
      read: true,
      createdAt: iso(2 * 24 * 60),
      updatedAt: iso(2 * 24 * 60),
    },
  ]
}

export function formatNotificationTime(value) {
  const date = new Date(String(value ?? ''))
  if (Number.isNaN(date.getTime())) return 'Unknown time'

  const diffMs = Date.now() - date.getTime()
  const diffMinutes = Math.round(diffMs / 60000)
  if (diffMinutes < 1) return 'Just now'
  if (diffMinutes < 60) return `${diffMinutes}m ago`
  const diffHours = Math.round(diffMinutes / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  const diffDays = Math.round(diffHours / 24)
  if (diffDays < 7) return `${diffDays}d ago`

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() === new Date().getFullYear() ? undefined : 'numeric',
  }).format(date)
}

export function filterNotifications(records = [], filters = {}) {
  const term = String(filters.search ?? '')
    .trim()
    .toLowerCase()
  const readFilter = String(filters.read ?? 'all').trim().toLowerCase()

  return records.filter((notification) => {
    if (readFilter === 'unread' && notification.read) return false
    if (readFilter === 'read' && !notification.read) return false
    if (!term) return true

    return [notification.title, notification.body, notification.category, notification.route]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(term))
  })
}

export function sortNotifications(records = []) {
  return [...records].sort((left, right) => {
    if (left.read !== right.read) return left.read ? 1 : -1
    const leftTime = new Date(left.createdAt || 0).getTime()
    const rightTime = new Date(right.createdAt || 0).getTime()
    if (leftTime !== rightTime) return rightTime - leftTime
    return String(left.title ?? '').localeCompare(String(right.title ?? ''), 'en', {
      sensitivity: 'base',
    })
  })
}

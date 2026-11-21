export const ATTENDANCE_STATUSES = ['present', 'absent', 'late', 'excused']

const STATUS_LABELS = {
  present: 'Present',
  absent: 'Absent',
  late: 'Late',
  excused: 'Excused',
}

const STORED_TIMESTAMP_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/

let uidCounter = 0

export function createAttendanceUid() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `attendance_${crypto.randomUUID()}`
  }

  uidCounter += 1
  return `attendance_${Date.now().toString(36)}_${uidCounter}`
}

export function createUniqueAttendanceUid(usedUids = []) {
  const used = usedUids instanceof Set ? usedUids : new Set(usedUids)
  let uid = createAttendanceUid()

  while (used.has(uid)) {
    uid = createAttendanceUid()
  }

  return uid
}

export function normalizeAttendanceStatus(value) {
  const normalized = String(value ?? '')
    .trim()
    .toLowerCase()

  if (ATTENDANCE_STATUSES.includes(normalized)) return normalized
  return ''
}

export function attendanceStatusLabel(status) {
  const normalized = normalizeAttendanceStatus(status)
  return STATUS_LABELS[normalized] || 'Unknown status'
}

function pad2(value) {
  return String(value).padStart(2, '0')
}

function isValidCalendarDate(year, month, day) {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return false
  if (year < 1 || month < 1 || month > 12 || day < 1 || day > 31) return false

  const date = new Date(year, month - 1, day)
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
}

export function toLocalDateKey(value = new Date()) {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return ''
    return `${value.getFullYear()}-${pad2(value.getMonth() + 1)}-${pad2(value.getDate())}`
  }

  const text = String(value ?? '').trim()
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text)
  if (!match) return ''

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  if (!isValidCalendarDate(year, month, day)) return ''

  return `${match[1]}-${match[2]}-${match[3]}`
}

export function sanitizeAttendanceInput(input = {}) {
  return {
    studentUid: String(input.studentUid ?? '').trim(),
    sectionUid: String(input.sectionUid ?? '').trim(),
    date: toLocalDateKey(input.date ?? ''),
    status: normalizeAttendanceStatus(input.status) || 'present',
  }
}

export function getAttendanceIdentity(record = {}) {
  return `${String(record.studentUid ?? '').trim()}::${String(record.sectionUid ?? '').trim()}::${String(
    record.date ?? '',
  ).trim()}`
}

export function hasDuplicateAttendance(records = [], input = {}, editingUid = null) {
  const identity = getAttendanceIdentity(sanitizeAttendanceInput(input))
  const list = Array.isArray(records) ? records : []

  return list.some(
    (record) => record?.uid !== editingUid && getAttendanceIdentity(record) === identity,
  )
}

function getUidSet(values = []) {
  const set = new Set()

  values.forEach((value) => {
    const uid = typeof value === 'string' ? value.trim() : String(value?.uid ?? '').trim()
    if (uid) set.add(uid)
  })

  return set
}

export function resolveSectionRoster(enrollments = [], students = [], sectionUid = '') {
  const targetUid = String(sectionUid ?? '').trim()
  if (!targetUid) return { roster: [], unresolvedCount: 0, enrollmentCount: 0 }

  const studentsByUid = new Map()
  const studentList = Array.isArray(students) ? students : []

  studentList.forEach((student) => {
    const uid = String(student?.uid ?? '').trim()
    if (uid && !studentsByUid.has(uid)) studentsByUid.set(uid, student)
  })

  const usedStudentUids = new Set()
  const roster = []
  let unresolvedCount = 0
  let enrollmentCount = 0

  const enrollmentList = Array.isArray(enrollments) ? enrollments : []
  enrollmentList.forEach((enrollment) => {
    if (enrollment?.sectionUid !== targetUid || enrollment?.status !== 'enrolled') return

    enrollmentCount += 1
    const studentUid = String(enrollment.studentUid ?? '').trim()
    if (!studentUid || usedStudentUids.has(studentUid)) return

    usedStudentUids.add(studentUid)
    const student = studentsByUid.get(studentUid)
    if (student) roster.push(student)
    else unresolvedCount += 1
  })

  roster.sort((first, second) =>
    String(first.fullName ?? first.studentId ?? '')
      .localeCompare(String(second.fullName ?? second.studentId ?? '')),
  )

  return { roster, unresolvedCount, enrollmentCount }
}

export function validateAttendanceRecord(input, records = [], context = {}) {
  const values = sanitizeAttendanceInput(input)
  const errors = {}
  const rawStatus = String(input?.status ?? '').trim()
  const rawDate = String(input?.date ?? '').trim()
  const sections = Array.isArray(context.sections) ? context.sections : []
  const rosterProvided = Array.isArray(context.roster)
  const rosterUids = getUidSet(context.roster ?? [])
  const editingUid = context.editingUid ?? null

  if (!values.studentUid) {
    errors.studentUid = 'Select a student.'
  } else if (rosterProvided && !rosterUids.has(values.studentUid)) {
    errors.studentUid = 'Select a student from the current section roster.'
  }

  if (!values.sectionUid) {
    errors.sectionUid = 'Select a class section.'
  } else if (sections.length && !sections.some((section) => section?.uid === values.sectionUid)) {
    errors.sectionUid = 'Select an available class section.'
  }

  if (!values.date) {
    errors.date = rawDate ? 'Enter a valid calendar date.' : 'Select a date.'
  }

  if (rawStatus && !normalizeAttendanceStatus(rawStatus)) {
    errors.status = 'Select a valid attendance status.'
  }

  if (hasDuplicateAttendance(records, values, editingUid)) {
    errors.form = 'Attendance for this student, section, and date already exists.'
  }

  return errors
}

function normalizeStoredTimestamp(value, fallback) {
  const text = typeof value === 'string' ? value.trim() : ''
  if (!text || !STORED_TIMESTAMP_PATTERN.test(text)) return fallback

  return !Number.isNaN(new Date(text).getTime()) ? text : fallback
}

export function normalizeStoredAttendance(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null

  const studentUid = String(raw.studentUid ?? '').trim()
  const sectionUid = String(raw.sectionUid ?? '').trim()
  const date = toLocalDateKey(raw.date)
  if (!studentUid || !sectionUid || !date) return null

  const rawStatus = String(raw.status ?? '').trim()
  const status = normalizeAttendanceStatus(rawStatus) || 'present'
  const rawUid = typeof raw.uid === 'string' ? raw.uid.trim() : ''
  const uid = rawUid || createAttendanceUid()
  const rawCreatedAt = typeof raw.createdAt === 'string' ? raw.createdAt.trim() : ''
  const rawUpdatedAt = typeof raw.updatedAt === 'string' ? raw.updatedAt.trim() : ''
  const createdAt = normalizeStoredTimestamp(rawCreatedAt, new Date().toISOString())
  const updatedAt = normalizeStoredTimestamp(rawUpdatedAt, createdAt)

  return {
    attendance: {
      uid,
      studentUid,
      sectionUid,
      date,
      status,
      createdAt,
      updatedAt,
    },
    corrected:
      uid !== rawUid ||
      studentUid !== String(raw.studentUid ?? '') ||
      sectionUid !== String(raw.sectionUid ?? '') ||
      date !== String(raw.date ?? '') ||
      Boolean(rawStatus && status !== rawStatus) ||
      createdAt !== rawCreatedAt ||
      updatedAt !== rawUpdatedAt,
  }
}

function createRecoveredUid(index, usedUids) {
  const base = `attendance_recovered_${index + 1}`
  let uid = base
  let suffix = 2

  while (usedUids.has(uid)) {
    uid = `${base}_${suffix}`
    suffix += 1
  }

  return uid
}

export function normalizeStoredAttendances(rawRecords = []) {
  const input = Array.isArray(rawRecords) ? rawRecords : []
  const parsedEntries = []
  const usedUids = new Set()
  const usedIdentities = new Set()
  let discarded = 0
  let corrected = 0
  let duplicateUids = 0
  let duplicateIdentity = 0

  input.forEach((raw, index) => {
    let parsed

    try {
      parsed = normalizeStoredAttendance(raw)
    } catch {
      parsed = null
    }

    if (!parsed) {
      discarded += 1
      return
    }

    const identity = getAttendanceIdentity(parsed.attendance)
    if (usedIdentities.has(identity)) {
      duplicateIdentity += 1
      discarded += 1
      return
    }

    usedIdentities.add(identity)
    parsedEntries.push({ ...parsed, index })
  })

  const records = parsedEntries.map((entry) => {
    let recordCorrected = entry.corrected
    const uid = entry.attendance.uid

    if (!uid || usedUids.has(uid)) {
      if (uid) duplicateUids += 1
      entry.attendance.uid = createRecoveredUid(entry.index, usedUids)
      recordCorrected = true
    }

    usedUids.add(entry.attendance.uid)
    if (recordCorrected) corrected += 1
    return entry.attendance
  })

  return { records, discarded, corrected, duplicateUids, duplicateIdentity }
}

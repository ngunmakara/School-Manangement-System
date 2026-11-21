export const ENROLLMENT_STATUSES = ['enrolled', 'dropped', 'completed']

const STATUS_LABELS = {
  enrolled: 'Enrolled',
  dropped: 'Dropped',
  completed: 'Completed',
}

const STORED_TIMESTAMP_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/

let uidCounter = 0

export function createEnrollmentUid() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `enrollment_${crypto.randomUUID()}`
  }

  uidCounter += 1
  return `enrollment_${Date.now().toString(36)}_${uidCounter}`
}

export function createUniqueEnrollmentUid(usedUids = []) {
  const used = usedUids instanceof Set ? usedUids : new Set(usedUids)
  let uid = createEnrollmentUid()

  while (used.has(uid)) {
    uid = createEnrollmentUid()
  }

  return uid
}

export function normalizeEnrollmentStatus(value) {
  const normalized = String(value ?? '')
    .trim()
    .toLowerCase()

  if (ENROLLMENT_STATUSES.includes(normalized)) return normalized
  return ''
}

export function enrollmentStatusLabel(status) {
  const normalized = normalizeEnrollmentStatus(status)
  return STATUS_LABELS[normalized] || 'Unknown status'
}

export function sanitizeEnrollmentInput(input = {}) {
  return {
    studentUid: String(input.studentUid ?? '').trim(),
    sectionUid: String(input.sectionUid ?? '').trim(),
    status: normalizeEnrollmentStatus(input.status) || 'enrolled',
  }
}

export function getSectionSeatsUsed(enrollments = [], sectionUid = '', excludeUid = null) {
  const targetUid = String(sectionUid ?? '').trim()
  if (!targetUid) return 0

  return enrollments.filter(
    (enrollment) =>
      enrollment.sectionUid === targetUid &&
      enrollment.status === 'enrolled' &&
      enrollment.uid !== excludeUid,
  ).length
}

export function validateEnrollmentRecord(
  input,
  enrollments = [],
  sections = [],
  editingUid = null,
  students = [],
) {
  const values = sanitizeEnrollmentInput(input)
  const errors = {}
  const rawStatus = String(input?.status ?? '').trim()
  const existing = editingUid
    ? enrollments.find((enrollment) => enrollment.uid === editingUid)
    : null

  if (!values.studentUid) {
    errors.studentUid = 'Select a student.'
  } else if (
    students.length &&
    !students.some((student) => student.uid === values.studentUid) &&
    existing?.studentUid !== values.studentUid
  ) {
    errors.studentUid = 'Select a student from the current directory.'
  }

  if (!values.sectionUid) {
    errors.sectionUid = 'Select a class section.'
  } else if (
    sections.length &&
    !sections.some((section) => section.uid === values.sectionUid) &&
    existing?.sectionUid !== values.sectionUid
  ) {
    errors.sectionUid = 'Select an available class section.'
  }

  if (rawStatus && !normalizeEnrollmentStatus(rawStatus)) {
    errors.status = 'Select a valid enrollment status.'
  }

  if (
    values.status === 'enrolled' &&
    enrollments.some(
      (enrollment) =>
        enrollment.uid !== editingUid &&
        enrollment.studentUid === values.studentUid &&
        enrollment.sectionUid === values.sectionUid &&
        enrollment.status === 'enrolled',
    )
  ) {
    errors.form = 'This student is already enrolled in this class section.'
  }

  if (values.status === 'enrolled') {
    const section = sections.find((record) => record.uid === values.sectionUid)
    const capacity = Number(section?.capacity)

    if (section && Number.isFinite(capacity)) {
      const seatsUsed = getSectionSeatsUsed(enrollments, values.sectionUid, editingUid)
      if (seatsUsed >= capacity) {
        errors.sectionUid = `This section is full (${seatsUsed}/${capacity} local enrollments). Choose another section or change the status.`
      }
    }
  }

  return errors
}

function normalizeStoredTimestamp(value, fallback) {
  const text = typeof value === 'string' ? value.trim() : ''
  if (!text || !STORED_TIMESTAMP_PATTERN.test(text)) return fallback

  return !Number.isNaN(new Date(text).getTime()) ? text : fallback
}

export function normalizeStoredEnrollment(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null

  const studentUid = String(raw.studentUid ?? '').trim()
  const sectionUid = String(raw.sectionUid ?? '').trim()
  if (!studentUid || !sectionUid) return null

  const rawStatus = String(raw.status ?? '').trim()
  const status = normalizeEnrollmentStatus(rawStatus) || 'enrolled'
  const rawUid = typeof raw.uid === 'string' ? raw.uid.trim() : ''
  const uid = rawUid || createEnrollmentUid()
  const rawCreatedAt = typeof raw.createdAt === 'string' ? raw.createdAt.trim() : ''
  const rawUpdatedAt = typeof raw.updatedAt === 'string' ? raw.updatedAt.trim() : ''
  const createdAt = normalizeStoredTimestamp(rawCreatedAt, new Date().toISOString())
  const updatedAt = normalizeStoredTimestamp(rawUpdatedAt, createdAt)

  return {
    enrollment: {
      uid,
      studentUid,
      sectionUid,
      status,
      createdAt,
      updatedAt,
    },
    corrected:
      uid !== rawUid ||
      studentUid !== String(raw.studentUid ?? '') ||
      sectionUid !== String(raw.sectionUid ?? '') ||
      Boolean(rawStatus && status !== rawStatus) ||
      createdAt !== rawCreatedAt ||
      updatedAt !== rawUpdatedAt,
  }
}

function createRecoveredUid(index, usedUids) {
  const base = `enrollment_recovered_${index + 1}`
  let uid = base
  let suffix = 2

  while (usedUids.has(uid)) {
    uid = `${base}_${suffix}`
    suffix += 1
  }

  return uid
}

export function normalizeStoredEnrollments(rawRecords = []) {
  const input = Array.isArray(rawRecords) ? rawRecords : []
  const parsedEntries = []
  const usedUids = new Set()
  const usedActiveKeys = new Set()
  let discarded = 0
  let corrected = 0
  let duplicateUids = 0
  let duplicateActive = 0

  input.forEach((raw, index) => {
    let parsed

    try {
      parsed = normalizeStoredEnrollment(raw)
    } catch {
      parsed = null
    }

    if (!parsed) {
      discarded += 1
      return
    }

    const activeKey = `${parsed.enrollment.studentUid}::${parsed.enrollment.sectionUid}::enrolled`
    if (parsed.enrollment.status === 'enrolled' && usedActiveKeys.has(activeKey)) {
      duplicateActive += 1
      discarded += 1
      return
    }

    if (parsed.enrollment.status === 'enrolled') {
      usedActiveKeys.add(activeKey)
    }

    parsedEntries.push({ ...parsed, index })
  })

  const records = parsedEntries.map((entry) => {
    let recordCorrected = entry.corrected
    const uid = entry.enrollment.uid

    if (!uid || usedUids.has(uid)) {
      if (uid) duplicateUids += 1
      entry.enrollment.uid = createRecoveredUid(entry.index, usedUids)
      recordCorrected = true
    }

    usedUids.add(entry.enrollment.uid)
    if (recordCorrected) corrected += 1
    return entry.enrollment
  })

  return { records, discarded, corrected, duplicateUids, duplicateActive }
}

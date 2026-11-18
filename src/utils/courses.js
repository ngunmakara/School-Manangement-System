export const COURSE_STATUSES = ['Active', 'Inactive']

const STORED_TIMESTAMP_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/

let uidCounter = 0

export function createCourseUid() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `course_${crypto.randomUUID()}`
  }

  uidCounter += 1
  return `course_${Date.now().toString(36)}_${uidCounter}`
}

export function sanitizeCourseInput(input = {}) {
  const credits = Number(input.credits)

  return {
    code: String(input.code ?? '')
      .trim()
      .toUpperCase()
      .replace(/\s+/g, ' '),
    title: String(input.title ?? '')
      .trim()
      .replace(/\s+/g, ' '),
    department: String(input.department ?? '').trim(),
    credits: Number.isFinite(credits) ? credits : 0,
    status: input.status === 'Inactive' ? 'Inactive' : 'Active',
    description: String(input.description ?? '').trim(),
  }
}

export function validateCourseRecord(input, courses = [], editingUid = null) {
  const values = sanitizeCourseInput(input)
  const errors = {}

  if (!values.code) {
    errors.code = 'Course code is required.'
  } else if (values.code.length > 20) {
    errors.code = 'Course code must be 20 characters or fewer.'
  } else if (
    courses.some(
      (course) =>
        course.uid !== editingUid &&
        String(course.code ?? '')
          .trim()
          .toLowerCase() === values.code.toLowerCase(),
    )
  ) {
    errors.code = 'This course code already exists.'
  }

  if (!values.title) {
    errors.title = 'Course title is required.'
  } else if (values.title.length > 120) {
    errors.title = 'Title must be 120 characters or fewer.'
  }

  if (!values.department) {
    errors.department = 'Department is required.'
  } else if (values.department.length > 80) {
    errors.department = 'Department must be 80 characters or fewer.'
  }

  if (!Number.isInteger(values.credits) || values.credits < 1 || values.credits > 12) {
    errors.credits = 'Enter a whole number of credits between 1 and 12.'
  }

  if (!COURSE_STATUSES.includes(values.status)) {
    errors.status = 'Select a valid status.'
  }

  if (values.description.length > 500) {
    errors.description = 'Description must be 500 characters or fewer.'
  }

  return errors
}

function normalizeStoredTimestamp(value, fallback) {
  const text = typeof value === 'string' ? value.trim() : ''
  if (!text || !STORED_TIMESTAMP_PATTERN.test(text)) return fallback

  return !Number.isNaN(new Date(text).getTime()) ? text : fallback
}

export function normalizeStoredCourse(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null

  const code = String(raw.code ?? '')
    .trim()
    .toUpperCase()
  const title = String(raw.title ?? '')
    .trim()
    .replace(/\s+/g, ' ')

  if (!code || !title) return null

  const credits = Number(raw.credits)
  const now = new Date().toISOString()
  const uid = typeof raw.uid === 'string' ? raw.uid.trim() : ''

  return {
    uid: uid || createCourseUid(),
    code,
    title,
    department: String(raw.department ?? '').trim() || 'Undeclared',
    credits: Number.isFinite(credits) ? credits : null,
    status: raw.status === 'Inactive' ? 'Inactive' : 'Active',
    description: String(raw.description ?? '').trim(),
    createdAt: normalizeStoredTimestamp(raw.createdAt, now),
    updatedAt: normalizeStoredTimestamp(raw.updatedAt, now),
  }
}

function parseStoredCourse(raw) {
  const course = normalizeStoredCourse(raw)
  if (!course) return null

  const rawUid = typeof raw.uid === 'string' ? raw.uid.trim() : ''
  const rawCreatedAt = typeof raw.createdAt === 'string' ? raw.createdAt.trim() : ''
  const rawUpdatedAt = typeof raw.updatedAt === 'string' ? raw.updatedAt.trim() : ''
  const rawCredits = Number(raw.credits)

  return {
    course,
    corrected:
      course.uid !== rawUid ||
      course.code !== String(raw.code ?? '') ||
      course.title !== String(raw.title ?? '') ||
      course.department !== String(raw.department ?? '').trim() ||
      course.status !== String(raw.status ?? '').trim() ||
      course.description !== String(raw.description ?? '').trim() ||
      course.credits !== (Number.isFinite(rawCredits) ? rawCredits : null) ||
      course.createdAt !== rawCreatedAt ||
      course.updatedAt !== rawUpdatedAt,
  }
}

function createRecoveredUid(index, usedUids) {
  const base = `course_recovered_${index + 1}`
  let uid = base
  let suffix = 2

  while (usedUids.has(uid)) {
    uid = `${base}_${suffix}`
    suffix += 1
  }

  return uid
}

export function normalizeStoredCourses(rawRecords = []) {
  const input = Array.isArray(rawRecords) ? rawRecords : []
  const records = []
  const usedUids = new Set()
  let discarded = 0
  let corrected = 0
  let duplicateUids = 0

  input.forEach((raw, index) => {
    let parsed

    try {
      parsed = parseStoredCourse(raw)
    } catch {
      parsed = null
    }

    if (!parsed) {
      discarded += 1
      return
    }

    const { course } = parsed
    let recordCorrected = parsed.corrected
    const uid = course.uid

    if (!uid || usedUids.has(uid)) {
      if (uid) duplicateUids += 1
      course.uid = createRecoveredUid(index, usedUids)
      recordCorrected = true
    }

    usedUids.add(course.uid)
    if (recordCorrected) corrected += 1
    records.push(course)
  })

  return { records, discarded, corrected, duplicateUids }
}

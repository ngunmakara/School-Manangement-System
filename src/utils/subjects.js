export const SUBJECT_STATUSES = ['Active', 'Inactive']

export const SUBJECT_LIMITS = Object.freeze({
  codeMaxLength: 20,
  nameMinLength: 2,
  nameMaxLength: 120,
  departmentMaxLength: 80,
  minCredits: 1,
  maxCredits: 12,
  descriptionMaxLength: 500,
})

let uidCounter = 0

export function createSubjectUid() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `subject_${crypto.randomUUID()}`
  }

  uidCounter += 1
  return `subject_${Date.now().toString(36)}_${uidCounter}`
}

export function createUniqueSubjectUid(usedUids = []) {
  const used = usedUids instanceof Set ? usedUids : new Set(usedUids)
  let uid = createSubjectUid()

  while (used.has(uid)) {
    uid = createSubjectUid()
  }

  return uid
}

export function normalizeSubjectStatus(value) {
  const normalized = String(value ?? '').trim().toLowerCase()

  if (normalized === 'active') return 'Active'
  if (normalized === 'inactive') return 'Inactive'
  return ''
}

function collapseWhitespace(value) {
  return String(value ?? '').trim().replace(/\s+/g, ' ')
}

function normalizeSubjectCode(value) {
  return collapseWhitespace(value).toUpperCase()
}

export function sanitizeSubjectInput(input = {}) {
  const credits = Number(input.credits)
  const rawStatus = String(input.status ?? '').trim()

  return {
    code: normalizeSubjectCode(input.code),
    name: collapseWhitespace(input.name),
    department: collapseWhitespace(input.department),
    credits: Number.isFinite(credits) ? credits : 0,
    status: normalizeSubjectStatus(rawStatus) || 'Active',
    description: String(input.description ?? '').trim(),
  }
}

export function validateSubjectRecord(input, subjects = [], editingUid = null) {
  const values = sanitizeSubjectInput(input)
  const rawStatus = String(input.status ?? '').trim()
  const errors = {}

  if (!values.code) {
    errors.code = 'Subject code is required.'
  } else if (values.code.length > SUBJECT_LIMITS.codeMaxLength) {
    errors.code = `Subject code must be ${SUBJECT_LIMITS.codeMaxLength} characters or fewer.`
  } else if (
    subjects.some(
      (subject) =>
        subject.uid !== editingUid &&
        normalizeSubjectCode(subject.code).toLowerCase() === values.code.toLowerCase(),
    )
  ) {
    errors.code = 'This subject code already exists.'
  }

  if (!values.name) {
    errors.name = 'Subject name is required.'
  } else if (values.name.length < SUBJECT_LIMITS.nameMinLength) {
    errors.name = `Subject name must be at least ${SUBJECT_LIMITS.nameMinLength} characters.`
  } else if (values.name.length > SUBJECT_LIMITS.nameMaxLength) {
    errors.name = `Subject name must be ${SUBJECT_LIMITS.nameMaxLength} characters or fewer.`
  }

  if (!values.department) {
    errors.department = 'Department is required.'
  } else if (values.department.length > SUBJECT_LIMITS.departmentMaxLength) {
    errors.department = `Department must be ${SUBJECT_LIMITS.departmentMaxLength} characters or fewer.`
  }

  if (
    !Number.isInteger(values.credits) ||
    values.credits < SUBJECT_LIMITS.minCredits ||
    values.credits > SUBJECT_LIMITS.maxCredits
  ) {
    errors.credits = `Enter a whole number of credits between ${SUBJECT_LIMITS.minCredits} and ${SUBJECT_LIMITS.maxCredits}.`
  }

  if (rawStatus && !normalizeSubjectStatus(rawStatus)) {
    errors.status = 'Select a valid status.'
  }

  if (values.description.length > SUBJECT_LIMITS.descriptionMaxLength) {
    errors.description = `Description must be ${SUBJECT_LIMITS.descriptionMaxLength} characters or fewer.`
  }

  return errors
}

function parseStoredSubject(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null

  const code = normalizeSubjectCode(raw.code)
  if (!code || code.length > SUBJECT_LIMITS.codeMaxLength) return null

  const name = collapseWhitespace(raw.name ?? raw.title)
  if (
    name.length < SUBJECT_LIMITS.nameMinLength ||
    name.length > SUBJECT_LIMITS.nameMaxLength
  ) {
    return null
  }

  const department = collapseWhitespace(raw.department) || 'Undeclared'
  if (department.length > SUBJECT_LIMITS.departmentMaxLength) return null

  const credits = Number(raw.credits)
  if (
    !Number.isInteger(credits) ||
    credits < SUBJECT_LIMITS.minCredits ||
    credits > SUBJECT_LIMITS.maxCredits
  ) {
    return null
  }

  const rawStatus = String(raw.status ?? '').trim()
  const status = normalizeSubjectStatus(rawStatus) || 'Active'
  const rawDescription = String(raw.description ?? '').trim()
  const description = rawDescription.slice(0, SUBJECT_LIMITS.descriptionMaxLength)
  const now = new Date().toISOString()
  const rawCreatedAt = typeof raw.createdAt === 'string' ? raw.createdAt.trim() : ''
  const rawUpdatedAt = typeof raw.updatedAt === 'string' ? raw.updatedAt.trim() : ''
  const createdAt = rawCreatedAt || now
  const updatedAt = rawUpdatedAt || now
  const uid = typeof raw.uid === 'string' ? raw.uid.trim() : ''

  const corrected =
    code !== String(raw.code ?? '') ||
    name !== String(raw.name ?? raw.title ?? '') ||
    department !== collapseWhitespace(raw.department) ||
    Boolean(rawStatus && status !== rawStatus) ||
    description !== rawDescription ||
    createdAt !== rawCreatedAt ||
    updatedAt !== rawUpdatedAt

  return {
    subject: {
      uid,
      code,
      name,
      department,
      credits,
      status,
      description,
      createdAt,
      updatedAt,
    },
    corrected,
  }
}

function createRecoveredUid(index, usedUids) {
  const base = `subject_recovered_${index + 1}`
  let uid = base
  let suffix = 2

  while (usedUids.has(uid)) {
    uid = `${base}_${suffix}`
    suffix += 1
  }

  return uid
}

export function normalizeStoredSubjects(rawRecords = []) {
  const input = Array.isArray(rawRecords) ? rawRecords : []
  const parsedEntries = []
  const usedCodes = new Set()
  let discarded = 0
  let corrected = 0
  let duplicateUids = 0
  let duplicateCodes = 0

  input.forEach((raw, index) => {
    let parsed

    try {
      parsed = parseStoredSubject(raw)
    } catch {
      parsed = null
    }

    if (!parsed) {
      discarded += 1
      return
    }

    const codeKey = parsed.subject.code.toLowerCase()
    if (usedCodes.has(codeKey)) {
      duplicateCodes += 1
      discarded += 1
      return
    }

    usedCodes.add(codeKey)
    parsedEntries.push({ ...parsed, index })
  })

  const usedUids = new Set()
  parsedEntries.forEach((entry) => {
    const uid = entry.subject.uid
    entry.uidValid = Boolean(uid) && !usedUids.has(uid)
    if (entry.uidValid) usedUids.add(uid)
    else if (uid) duplicateUids += 1
  })

  const records = parsedEntries.map((entry) => {
    let recordCorrected = entry.corrected

    if (!entry.uidValid) {
      entry.subject.uid = createRecoveredUid(entry.index, usedUids)
      usedUids.add(entry.subject.uid)
      recordCorrected = true
    }

    if (recordCorrected) corrected += 1
    return entry.subject
  })

  return {
    records,
    discarded,
    corrected,
    duplicateUids,
    duplicateCodes,
  }
}

export function normalizeStoredSubject(raw) {
  return normalizeStoredSubjects([raw]).records[0] || null
}

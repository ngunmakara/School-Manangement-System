export const SECTION_STATUSES = ['Active', 'Inactive']

export const SECTION_LIMITS = Object.freeze({
  codeMaxLength: 30,
  teacherNameMaxLength: 120,
  roomMaxLength: 40,
  scheduleMaxLength: 100,
  descriptionMaxLength: 500,
})

let uidCounter = 0

export function createSectionUid() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `section_${crypto.randomUUID()}`
  }

  uidCounter += 1
  return `section_${Date.now().toString(36)}_${uidCounter}`
}

export function createUniqueSectionUid(usedUids = []) {
  const used = usedUids instanceof Set ? usedUids : new Set(usedUids)
  let uid = createSectionUid()

  while (used.has(uid)) {
    uid = createSectionUid()
  }

  return uid
}

export function normalizeSectionStatus(value) {
  const normalized = String(value ?? '')
    .trim()
    .toLowerCase()

  if (normalized === 'active') return 'Active'
  if (normalized === 'inactive') return 'Inactive'
  return ''
}

function collapseWhitespace(value) {
  return String(value ?? '')
    .trim()
    .replace(/\s+/g, ' ')
}

function normalizeSectionCode(value) {
  return collapseWhitespace(value).toUpperCase()
}

export function sanitizeSectionInput(input = {}) {
  const capacity = Number(input.capacity)
  const rawStatus = String(input.status ?? '').trim()

  return {
    code: normalizeSectionCode(input.code),
    subjectUid: String(input.subjectUid ?? '').trim(),
    teacherUid: String(input.teacherUid ?? '').trim(),
    teacherName: collapseWhitespace(input.teacherName),
    semesterUid: String(input.semesterUid ?? '').trim(),
    room: collapseWhitespace(input.room),
    schedule: collapseWhitespace(input.schedule),
    capacity: Number.isFinite(capacity) ? capacity : 0,
    status: normalizeSectionStatus(rawStatus) || 'Active',
    description: String(input.description ?? '').trim(),
  }
}

function getSectionKey(code, semesterUid) {
  return `${String(semesterUid ?? '')
    .trim()
    .toLowerCase()}::${normalizeSectionCode(code).toLowerCase()}`
}

export function validateSectionRecord(input, sections = [], editingUid = null) {
  const values = sanitizeSectionInput(input)
  const rawStatus = String(input.status ?? '').trim()
  const errors = {}

  if (!values.code) {
    errors.code = 'Section code is required.'
  } else if (values.code.length > SECTION_LIMITS.codeMaxLength) {
    errors.code = `Section code must be ${SECTION_LIMITS.codeMaxLength} characters or fewer.`
  } else if (
    values.semesterUid &&
    sections.some(
      (section) =>
        section.uid !== editingUid &&
        String(section.semesterUid ?? '').trim() === values.semesterUid &&
        normalizeSectionCode(section.code).toLowerCase() === values.code.toLowerCase(),
    )
  ) {
    errors.code = 'This section code already exists for the selected semester.'
  }

  if (!values.subjectUid) {
    errors.subjectUid = 'Subject is required.'
  }

  if (!values.teacherUid) {
    errors.teacherUid = 'Teacher is required.'
  }

  if (!values.semesterUid) {
    errors.semesterUid = 'Semester is required.'
  }

  if (!values.room) {
    errors.room = 'Room is required.'
  } else if (values.room.length > SECTION_LIMITS.roomMaxLength) {
    errors.room = `Room must be ${SECTION_LIMITS.roomMaxLength} characters or fewer.`
  }

  if (!values.schedule) {
    errors.schedule = 'Schedule is required.'
  } else if (values.schedule.length > SECTION_LIMITS.scheduleMaxLength) {
    errors.schedule = `Schedule must be ${SECTION_LIMITS.scheduleMaxLength} characters or fewer.`
  }

  if (!Number.isInteger(values.capacity) || values.capacity < 1) {
    errors.capacity = 'Enter a positive whole number for capacity.'
  }

  if (rawStatus && !normalizeSectionStatus(rawStatus)) {
    errors.status = 'Select a valid status.'
  }

  if (values.teacherName.length > SECTION_LIMITS.teacherNameMaxLength) {
    errors.teacherName = `Teacher name must be ${SECTION_LIMITS.teacherNameMaxLength} characters or fewer.`
  }

  if (values.description.length > SECTION_LIMITS.descriptionMaxLength) {
    errors.description = `Description must be ${SECTION_LIMITS.descriptionMaxLength} characters or fewer.`
  }

  return errors
}

function parseStoredSection(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null

  const values = sanitizeSectionInput(raw)
  if (!values.code || values.code.length > SECTION_LIMITS.codeMaxLength) return null
  if (!values.subjectUid || !values.teacherUid || !values.semesterUid) return null
  if (!values.room || values.room.length > SECTION_LIMITS.roomMaxLength) return null
  if (!values.schedule || values.schedule.length > SECTION_LIMITS.scheduleMaxLength) {
    return null
  }
  if (!Number.isInteger(values.capacity) || values.capacity < 1) return null

  const rawStatus = String(raw.status ?? '').trim()
  const status = normalizeSectionStatus(rawStatus) || 'Active'
  const rawDescription = String(raw.description ?? '').trim()
  const description = rawDescription.slice(0, SECTION_LIMITS.descriptionMaxLength)
  const teacherName = values.teacherName.slice(0, SECTION_LIMITS.teacherNameMaxLength)
  const now = new Date().toISOString()
  const rawCreatedAt = typeof raw.createdAt === 'string' ? raw.createdAt.trim() : ''
  const rawUpdatedAt = typeof raw.updatedAt === 'string' ? raw.updatedAt.trim() : ''
  const createdAt = rawCreatedAt || now
  const updatedAt = rawUpdatedAt || now
  const uid = typeof raw.uid === 'string' ? raw.uid.trim() : ''

  const corrected =
    values.code !== String(raw.code ?? '') ||
    values.subjectUid !== String(raw.subjectUid ?? '') ||
    values.teacherUid !== String(raw.teacherUid ?? '') ||
    values.semesterUid !== String(raw.semesterUid ?? '') ||
    values.room !== String(raw.room ?? '') ||
    values.schedule !== String(raw.schedule ?? '') ||
    teacherName !== String(raw.teacherName ?? '').trim() ||
    Boolean(rawStatus && status !== rawStatus) ||
    description !== rawDescription ||
    createdAt !== rawCreatedAt ||
    updatedAt !== rawUpdatedAt

  return {
    section: {
      uid,
      ...values,
      teacherName,
      status,
      description,
      createdAt,
      updatedAt,
    },
    corrected,
  }
}

function createRecoveredUid(index, usedUids) {
  const base = `section_recovered_${index + 1}`
  let uid = base
  let suffix = 2

  while (usedUids.has(uid)) {
    uid = `${base}_${suffix}`
    suffix += 1
  }

  return uid
}

export function normalizeStoredSections(rawRecords = []) {
  const input = Array.isArray(rawRecords) ? rawRecords : []
  const parsedEntries = []
  const usedSectionKeys = new Set()
  let discarded = 0
  let corrected = 0
  let duplicateUids = 0
  let duplicateCodes = 0

  input.forEach((raw, index) => {
    let parsed

    try {
      parsed = parseStoredSection(raw)
    } catch {
      parsed = null
    }

    if (!parsed) {
      discarded += 1
      return
    }

    const sectionKey = getSectionKey(parsed.section.code, parsed.section.semesterUid)
    if (usedSectionKeys.has(sectionKey)) {
      duplicateCodes += 1
      discarded += 1
      return
    }

    usedSectionKeys.add(sectionKey)
    parsedEntries.push({ ...parsed, index })
  })

  const usedUids = new Set()
  parsedEntries.forEach((entry) => {
    const uid = entry.section.uid
    entry.uidValid = Boolean(uid) && !usedUids.has(uid)
    if (entry.uidValid) usedUids.add(uid)
    else if (uid) duplicateUids += 1
  })

  const records = parsedEntries.map((entry) => {
    let recordCorrected = entry.corrected

    if (!entry.uidValid) {
      entry.section.uid = createRecoveredUid(entry.index, usedUids)
      usedUids.add(entry.section.uid)
      recordCorrected = true
    }

    if (recordCorrected) corrected += 1
    return entry.section
  })

  return {
    records,
    discarded,
    corrected,
    duplicateUids,
    duplicateCodes,
  }
}

export function normalizeStoredSection(raw) {
  return normalizeStoredSections([raw]).records[0] || null
}

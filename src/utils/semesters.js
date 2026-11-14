export const SEMESTER_STATUSES = ['Upcoming', 'Active', 'Completed', 'Archived']

export const SEMESTER_LIMITS = Object.freeze({
  nameMinLength: 2,
  nameMaxLength: 80,
  academicYearMaxLength: 20,
  descriptionMaxLength: 500,
})

const ACADEMIC_YEAR_PATTERN = /^(\d{4})-(\d{4})$/
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

let uidCounter = 0

export function createSemesterUid() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `semester_${crypto.randomUUID()}`
  }

  uidCounter += 1
  return `semester_${Date.now().toString(36)}_${uidCounter}`
}

export function createUniqueSemesterUid(usedUids = []) {
  const used = usedUids instanceof Set ? usedUids : new Set(usedUids)
  let uid = createSemesterUid()

  while (used.has(uid)) {
    uid = createSemesterUid()
  }

  return uid
}

export function normalizeSemesterStatus(value) {
  const normalized = String(value ?? '').trim().toLowerCase()

  return (
    SEMESTER_STATUSES.find((status) => status.toLowerCase() === normalized) || ''
  )
}

function collapseWhitespace(value) {
  return String(value ?? '').trim().replace(/\s+/g, ' ')
}

export function normalizeAcademicYear(value) {
  return collapseWhitespace(value).replace(/\s*[-–—/]\s*/g, '-')
}

function normalizeDateInput(value) {
  return String(value ?? '').trim()
}

function isValidIsoDate(value) {
  if (!ISO_DATE_PATTERN.test(value)) return false

  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(year, month - 1, day)

  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  )
}

function getAcademicYearParts(value) {
  const match = value.match(ACADEMIC_YEAR_PATTERN)
  if (!match) return null

  return {
    startYear: Number(match[1]),
    endYear: Number(match[2]),
  }
}

function getSemesterKey(name, academicYear) {
  return `${collapseWhitespace(name).toLowerCase()}::${normalizeAcademicYear(
    academicYear,
  ).toLowerCase()}`
}

export function sanitizeSemesterInput(input = {}) {
  const rawStatus = String(input.status ?? '').trim()

  return {
    name: collapseWhitespace(input.name),
    academicYear: normalizeAcademicYear(input.academicYear),
    startDate: normalizeDateInput(input.startDate),
    endDate: normalizeDateInput(input.endDate),
    status: normalizeSemesterStatus(rawStatus) || 'Upcoming',
    description: String(input.description ?? '').trim(),
  }
}

export function validateSemesterRecord(input, semesters = [], editingUid = null) {
  const values = sanitizeSemesterInput(input)
  const rawStatus = String(input.status ?? '').trim()
  const errors = {}

  if (!values.name) {
    errors.name = 'Term name is required.'
  } else if (values.name.length < SEMESTER_LIMITS.nameMinLength) {
    errors.name = `Term name must be at least ${SEMESTER_LIMITS.nameMinLength} characters.`
  } else if (values.name.length > SEMESTER_LIMITS.nameMaxLength) {
    errors.name = `Term name must be ${SEMESTER_LIMITS.nameMaxLength} characters or fewer.`
  }

  if (!values.academicYear) {
    errors.academicYear = 'Academic year is required.'
  } else if (values.academicYear.length > SEMESTER_LIMITS.academicYearMaxLength) {
    errors.academicYear = `Academic year must be ${SEMESTER_LIMITS.academicYearMaxLength} characters or fewer.`
  } else {
    const parts = getAcademicYearParts(values.academicYear)

    if (!parts || parts.endYear <= parts.startYear) {
      errors.academicYear = 'Use a valid academic year such as 2025-2026.'
    }
  }

  if (!values.startDate) {
    errors.startDate = 'Start date is required.'
  } else if (!isValidIsoDate(values.startDate)) {
    errors.startDate = 'Enter a valid start date.'
  }

  if (!values.endDate) {
    errors.endDate = 'End date is required.'
  } else if (!isValidIsoDate(values.endDate)) {
    errors.endDate = 'Enter a valid end date.'
  } else if (
    isValidIsoDate(values.startDate) &&
    values.endDate <= values.startDate
  ) {
    errors.endDate = 'End date must be after the start date.'
  }

  if (rawStatus && !normalizeSemesterStatus(rawStatus)) {
    errors.status = 'Select a valid status.'
  }

  if (values.description.length > SEMESTER_LIMITS.descriptionMaxLength) {
    errors.description = `Description must be ${SEMESTER_LIMITS.descriptionMaxLength} characters or fewer.`
  }

  if (
    !errors.name &&
    !errors.academicYear &&
    semesters.some(
      (semester) =>
        semester.uid !== editingUid &&
        getSemesterKey(semester.name, semester.academicYear) ===
          getSemesterKey(values.name, values.academicYear),
    )
  ) {
    errors.name = 'This term already exists for the selected academic year.'
  }

  return errors
}

function normalizeStoredDate(value) {
  const text = String(value ?? '').trim()
  return isValidIsoDate(text) ? text : ''
}

function parseStoredSemester(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null

  const name = collapseWhitespace(raw.name ?? raw.term)
  if (
    name.length < SEMESTER_LIMITS.nameMinLength ||
    name.length > SEMESTER_LIMITS.nameMaxLength
  ) {
    return null
  }

  const academicYear = normalizeAcademicYear(raw.academicYear ?? raw.year)
  const yearParts = getAcademicYearParts(academicYear)
  if (
    !yearParts ||
    yearParts.endYear <= yearParts.startYear ||
    academicYear.length > SEMESTER_LIMITS.academicYearMaxLength
  ) {
    return null
  }

  const startDate = normalizeStoredDate(raw.startDate)
  const endDate = normalizeStoredDate(raw.endDate)
  if (!startDate || !endDate || endDate <= startDate) return null

  const rawStatus = String(raw.status ?? '').trim()
  const status = normalizeSemesterStatus(rawStatus) || 'Upcoming'
  const rawDescription = String(raw.description ?? '').trim()
  const description = rawDescription.slice(0, SEMESTER_LIMITS.descriptionMaxLength)
  const now = new Date().toISOString()
  const rawCreatedAt = typeof raw.createdAt === 'string' ? raw.createdAt.trim() : ''
  const rawUpdatedAt = typeof raw.updatedAt === 'string' ? raw.updatedAt.trim() : ''
  const createdAt = rawCreatedAt || now
  const updatedAt = rawUpdatedAt || now
  const uid = typeof raw.uid === 'string' ? raw.uid.trim() : ''

  const corrected =
    name !== String(raw.name ?? raw.term ?? '') ||
    academicYear !== String(raw.academicYear ?? raw.year ?? '') ||
    startDate !== String(raw.startDate ?? '') ||
    endDate !== String(raw.endDate ?? '') ||
    Boolean(rawStatus && status !== rawStatus) ||
    description !== rawDescription ||
    createdAt !== rawCreatedAt ||
    updatedAt !== rawUpdatedAt

  return {
    semester: {
      uid,
      name,
      academicYear,
      startDate,
      endDate,
      status,
      description,
      createdAt,
      updatedAt,
    },
    corrected,
  }
}

function createRecoveredUid(index, usedUids) {
  const base = `semester_recovered_${index + 1}`
  let uid = base
  let suffix = 2

  while (usedUids.has(uid)) {
    uid = `${base}_${suffix}`
    suffix += 1
  }

  return uid
}

export function normalizeStoredSemesters(rawRecords = []) {
  const input = Array.isArray(rawRecords) ? rawRecords : []
  const parsedEntries = []
  const usedTerms = new Set()
  let discarded = 0
  let corrected = 0
  let duplicateUids = 0
  let duplicateTerms = 0

  input.forEach((raw, index) => {
    let parsed

    try {
      parsed = parseStoredSemester(raw)
    } catch {
      parsed = null
    }

    if (!parsed) {
      discarded += 1
      return
    }

    const termKey = getSemesterKey(parsed.semester.name, parsed.semester.academicYear)
    if (usedTerms.has(termKey)) {
      duplicateTerms += 1
      discarded += 1
      return
    }

    usedTerms.add(termKey)
    parsedEntries.push({ ...parsed, index })
  })

  const usedUids = new Set()
  parsedEntries.forEach((entry) => {
    const uid = entry.semester.uid
    entry.uidValid = Boolean(uid) && !usedUids.has(uid)
    if (entry.uidValid) usedUids.add(uid)
    else if (uid) duplicateUids += 1
  })

  const records = parsedEntries.map((entry) => {
    let recordCorrected = entry.corrected

    if (!entry.uidValid) {
      entry.semester.uid = createRecoveredUid(entry.index, usedUids)
      usedUids.add(entry.semester.uid)
      recordCorrected = true
    }

    if (recordCorrected) corrected += 1
    return entry.semester
  })

  return {
    records,
    discarded,
    corrected,
    duplicateUids,
    duplicateTerms,
  }
}

export function normalizeStoredSemester(raw) {
  return normalizeStoredSemesters([raw]).records[0] || null
}

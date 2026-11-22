export const ASSESSMENT_FIELDS = Object.freeze([
  { key: 'assignment', label: 'Assignments', shortLabel: 'Asg', weight: 0.2 },
  { key: 'quiz', label: 'Quizzes', shortLabel: 'Quiz', weight: 0.2 },
  { key: 'midterm', label: 'Midterm exam', shortLabel: 'Mid', weight: 0.3 },
  { key: 'final', label: 'Final exam', shortLabel: 'Final', weight: 0.3 },
])

export const GRADE_SCALE = Object.freeze([
  { min: 90, letter: 'A', gradePoints: 4, status: 'Pass' },
  { min: 80, letter: 'B', gradePoints: 3, status: 'Pass' },
  { min: 70, letter: 'C', gradePoints: 2, status: 'Pass' },
  { min: 60, letter: 'D', gradePoints: 1, status: 'Pass' },
  { min: 0, letter: 'F', gradePoints: 0, status: 'Fail' },
])

export const PASSING_SCORE = 60

export const GRADE_SCALE_SUMMARY =
  'Total score = assignments 20% + quizzes 20% + midterm 30% + final exam 30%. A: 90–100 (4.0), B: 80–89 (3.0), C: 70–79 (2.0), D: 60–69 (1.0), F: below 60 (0.0).'

let uidCounter = 0

function collapseWhitespace(value) {
  return String(value ?? '')
    .trim()
    .replace(/\s+/g, ' ')
}

function round(value, digits = 1) {
  const factor = 10 ** digits
  return Math.round((value + Number.EPSILON) * factor) / factor
}

function toFiniteScore(value) {
  if (value === '' || value === null || value === undefined) return null
  const score = Number(value)
  return Number.isFinite(score) ? score : null
}

export function normalizeScore(value) {
  const score = toFiniteScore(value)
  if (score === null) return 0
  return round(Math.min(100, Math.max(0, score)), 1)
}

export function formatScore(value) {
  if (toFiniteScore(value) === null) return '—'
  return normalizeScore(value).toFixed(1)
}

export function formatGpa(value) {
  const number = Number(value)
  if (!Number.isFinite(number)) return '0.00'
  return number.toFixed(2)
}

export function gradeStatusLabel(status) {
  return String(status ?? '').toLowerCase() === 'fail' ? 'Fail' : 'Pass'
}

export function createGradeUid() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `grade_${crypto.randomUUID()}`
  }

  uidCounter += 1
  return `grade_${Date.now().toString(36)}_${uidCounter}`
}

export function createUniqueGradeUid(usedUids = []) {
  const used = usedUids instanceof Set ? usedUids : new Set(usedUids)
  let uid = createGradeUid()

  while (used.has(uid)) {
    uid = createGradeUid()
  }

  return uid
}

export function sanitizeGradeInput(input = {}) {
  const scores = {}
  ASSESSMENT_FIELDS.forEach((field) => {
    scores[field.key] = normalizeScore(input?.scores?.[field.key])
  })

  return {
    studentUid: String(input?.studentUid ?? '').trim(),
    sectionUid: String(input?.sectionUid ?? '').trim(),
    subjectUid: String(input?.subjectUid ?? '').trim(),
    semesterUid: String(input?.semesterUid ?? '').trim(),
    studentName: collapseWhitespace(input?.studentName),
    studentId: collapseWhitespace(input?.studentId),
    sectionCode: collapseWhitespace(input?.sectionCode).toUpperCase(),
    subjectName: collapseWhitespace(input?.subjectName),
    semesterName: collapseWhitespace(input?.semesterName),
    scores,
  }
}

export function getGradeIdentity(record = {}) {
  return [
    record.studentUid,
    record.sectionUid,
    record.subjectUid,
    record.semesterUid,
  ]
    .map((value) =>
      String(value ?? '')
        .trim()
        .toLowerCase(),
    )
    .join('::')
}

export function hasDuplicateGrade(records = [], input = {}, editingUid = null) {
  const identity = getGradeIdentity(input)
  if (!identity.replace(/::/g, '')) return false

  return records.some(
    (record) => record.uid !== editingUid && getGradeIdentity(record) === identity,
  )
}

export function calculateGradeResult(record = {}) {
  const weightedTotal = ASSESSMENT_FIELDS.reduce(
    (sum, field) => sum + normalizeScore(record?.scores?.[field.key]) * field.weight,
    0,
  )
  const totalScore = round(weightedTotal, 1)
  const band = GRADE_SCALE.find((entry) => totalScore >= entry.min) ?? GRADE_SCALE.at(-1)

  return {
    totalScore,
    letterGrade: band.letter,
    gradePoints: band.gradePoints,
    status: band.status,
  }
}

export function gradeSummary(records = []) {
  const list = Array.isArray(records) ? records : []
  const results = list.map(calculateGradeResult)
  const studentCount = new Set(
    list
      .map((record) => String(record?.studentUid ?? '').trim())
      .filter(Boolean),
  ).size
  const passCount = results.filter((result) => result.status === 'Pass').length
  const averageScore = results.length
    ? round(results.reduce((sum, result) => sum + result.totalScore, 0) / results.length, 1)
    : 0
  const averageGpa = results.length
    ? round(results.reduce((sum, result) => sum + result.gradePoints, 0) / results.length, 2)
    : 0
  const passRate = results.length ? round((passCount / results.length) * 100, 1) : 0

  return {
    studentCount,
    averageScore,
    averageGpa,
    passRate,
    passCount,
    totalCount: results.length,
  }
}

function hasUid(list = [], uid = '') {
  if (!uid || !Array.isArray(list) || !list.length) return true
  return list.some((item) => String(item?.uid ?? '').trim() === uid)
}

function normalizeStoredTimestamp(value, fallback) {
  const text = typeof value === 'string' ? value.trim() : ''
  if (!text) return fallback
  return !Number.isNaN(new Date(text).getTime()) ? text : fallback
}

export function validateGradeRecord(input = {}, records = [], context = {}, editingUid = null) {
  const values = sanitizeGradeInput(input)
  const errors = {}
  const existing = records.find((record) => record.uid === editingUid)
  const identityPreserved =
    existing && getGradeIdentity(existing) === getGradeIdentity(values)
  const section = Array.isArray(context.sections)
    ? context.sections.find((item) => String(item?.uid ?? '').trim() === values.sectionUid)
    : null
  const students = Array.isArray(context.students) ? context.students : []
  const subjects = Array.isArray(context.subjects) ? context.subjects : []
  const semesters = Array.isArray(context.semesters) ? context.semesters : []

  if (!values.studentUid) {
    errors.studentUid = 'Student is required.'
  } else if (!hasUid(students, values.studentUid)) {
    errors.studentUid = 'Select a student from the available directory.'
  }

  if (context.rosterUids instanceof Set && context.rosterUids.size && !identityPreserved) {
    if (!context.rosterUids.has(values.studentUid)) {
      errors.studentUid = 'Select a student enrolled in the selected section.'
    }
  }

  if (!values.sectionUid) {
    errors.sectionUid = 'Class section is required.'
  } else if (!hasUid(context.sections, values.sectionUid)) {
    errors.sectionUid = 'Select an available class section.'
  }

  if (!values.subjectUid) {
    errors.subjectUid = 'Subject is required.'
  } else if (
    section?.subjectUid &&
    section.subjectUid !== values.subjectUid
  ) {
    errors.subjectUid = 'Subject must match the selected class section.'
  } else if (!hasUid(subjects, values.subjectUid) && section?.subjectUid !== values.subjectUid) {
    errors.subjectUid = 'Select an available subject.'
  }

  if (!values.semesterUid) {
    errors.semesterUid = 'Semester is required.'
  } else if (
    section?.semesterUid &&
    section.semesterUid !== values.semesterUid
  ) {
    errors.semesterUid = 'Semester must match the selected class section.'
  } else if (
    !hasUid(semesters, values.semesterUid) &&
    section?.semesterUid !== values.semesterUid
  ) {
    errors.semesterUid = 'Select an available semester.'
  }

  ASSESSMENT_FIELDS.forEach((field) => {
    const raw = input?.scores?.[field.key]
    const score = toFiniteScore(raw)
    if (raw === '' || raw === null || raw === undefined || score === null) {
      errors[field.key] = 'Enter a score from 0 to 100.'
    } else if (score < 0 || score > 100) {
      errors[field.key] = 'Score must be between 0 and 100.'
    }
  })

  if (hasDuplicateGrade(records, values, editingUid)) {
    errors.form = 'A grade for this student, section, subject, and semester already exists.'
  }

  return errors
}

export function normalizeStoredGrade(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null

  const values = sanitizeGradeInput(raw)
  if (
    !values.studentUid ||
    !values.sectionUid ||
    !values.subjectUid ||
    !values.semesterUid
  ) {
    return null
  }

  const now = new Date().toISOString()
  const rawCreatedAt = typeof raw.createdAt === 'string' ? raw.createdAt.trim() : ''
  const rawUpdatedAt = typeof raw.updatedAt === 'string' ? raw.updatedAt.trim() : ''
  const createdAt = normalizeStoredTimestamp(rawCreatedAt, now)
  const updatedAt = normalizeStoredTimestamp(rawUpdatedAt, now)
  const rawUid = typeof raw.uid === 'string' ? raw.uid.trim() : ''
  const approvedScores = {}
  let corrected = false

  ASSESSMENT_FIELDS.forEach((field) => {
    const original = raw?.scores?.[field.key]
    const score = normalizeScore(original)
    approvedScores[field.key] = score
    if (String(original ?? '') !== String(score)) corrected = true
  })

  corrected =
    corrected ||
    values.studentName !== collapseWhitespace(raw.studentName) ||
    values.studentId !== collapseWhitespace(raw.studentId) ||
    values.sectionCode !== collapseWhitespace(raw.sectionCode).toUpperCase() ||
    values.subjectName !== collapseWhitespace(raw.subjectName) ||
    values.semesterName !== collapseWhitespace(raw.semesterName) ||
    createdAt !== rawCreatedAt ||
    updatedAt !== rawUpdatedAt

  return {
    grade: {
      uid: rawUid,
      ...values,
      scores: approvedScores,
      createdAt,
      updatedAt,
    },
    corrected,
  }
}

export function normalizeStoredGrades(rawRecords = []) {
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
      parsed = normalizeStoredGrade(raw)
    } catch {
      parsed = null
    }

    if (!parsed) {
      discarded += 1
      return
    }

    const identity = getGradeIdentity(parsed.grade)
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
    const uid = entry.grade.uid
    entry.uidValid = Boolean(uid) && !usedUids.has(uid)
    if (entry.uidValid) usedUids.add(uid)
    else if (uid) duplicateUids += 1
  })

  const records = parsedEntries.map((entry) => {
    let recordCorrected = entry.corrected

    if (!entry.uidValid) {
      let uid = `grade_recovered_${entry.index + 1}`
      let suffix = 2
      while (usedUids.has(uid)) {
        uid = `grade_recovered_${entry.index + 1}_${suffix}`
        suffix += 1
      }
      entry.grade.uid = uid
      usedUids.add(uid)
      recordCorrected = true
    }

    if (recordCorrected) corrected += 1
    return entry.grade
  })

  return {
    records,
    discarded,
    corrected,
    duplicateUids,
    duplicateIdentity,
  }
}

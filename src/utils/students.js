export const STUDENT_STATUSES = ['Active', 'Inactive']

export const STUDENT_DEPARTMENTS = [
  'Computer Science',
  'Business Administration',
  'Engineering',
  'Health Sciences',
  'Education',
  'Arts & Humanities',
]

export const PROGRAMS_BY_DEPARTMENT = {
  'Computer Science': ['BSc Computer Science', 'BSc Software Engineering', 'MSc Data Science'],
  'Business Administration': ['BBA Finance', 'BBA Marketing', 'MBA Business Administration'],
  Engineering: ['BEng Mechanical', 'BEng Civil', 'BEng Electrical'],
  'Health Sciences': ['BSc Nursing', 'BSc Public Health', 'BSc Biomedical Science'],
  Education: ['BEd Primary Education', 'BEd Secondary Education', 'MEd Educational Leadership'],
  'Arts & Humanities': ['BA English Literature', 'BA History', 'BA Visual Arts'],
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const PHONE_PATTERN = /^[+]?[\d\s().-]{7,20}$/

let uidCounter = 0

export function createUid(prefix = 'student') {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}_${crypto.randomUUID()}`
  }

  uidCounter += 1
  return `${prefix}_${Date.now().toString(36)}_${uidCounter}`
}

export function normalizeStudentId(value) {
  return String(value ?? '').trim().toLowerCase()
}

export function normalizeEmail(value) {
  return String(value ?? '').trim().toLowerCase()
}

export function getProgramOptions(department) {
  return PROGRAMS_BY_DEPARTMENT[department] || []
}

export function sanitizeStudentInput(input = {}) {
  return {
    studentId: String(input.studentId ?? '').trim().toUpperCase(),
    fullName: String(input.fullName ?? '').trim().replace(/\s+/g, ' '),
    email: String(input.email ?? '').trim().toLowerCase(),
    phone: String(input.phone ?? '').trim(),
    department: String(input.department ?? '').trim(),
    program: String(input.program ?? '').trim(),
    enrollmentDate: String(input.enrollmentDate ?? '').trim(),
    status: input.status === 'Inactive' ? 'Inactive' : 'Active',
  }
}

export function validateStudentRecord(input, students = [], editingUid = null) {
  const values = sanitizeStudentInput(input)
  const errors = {}

  if (!values.studentId) {
    errors.studentId = 'Student ID is required.'
  } else if (
    students.some(
      (student) =>
        student.uid !== editingUid &&
        normalizeStudentId(student.studentId) === normalizeStudentId(values.studentId),
    )
  ) {
    errors.studentId = 'This student ID is already assigned.'
  }

  if (!values.fullName) {
    errors.fullName = 'Full name is required.'
  } else if (values.fullName.length < 2) {
    errors.fullName = 'Enter the student’s full name.'
  }

  if (!values.email) {
    errors.email = 'Email is required.'
  } else if (!EMAIL_PATTERN.test(values.email)) {
    errors.email = 'Enter a valid email address.'
  } else if (
    students.some(
      (student) =>
        student.uid !== editingUid &&
        normalizeEmail(student.email) === normalizeEmail(values.email),
    )
  ) {
    errors.email = 'This email is already registered.'
  }

  if (values.phone) {
    const digits = values.phone.replace(/\D/g, '')
    if (!PHONE_PATTERN.test(values.phone) || digits.length < 7 || digits.length > 15) {
      errors.phone = 'Enter a valid phone number with 7–15 digits.'
    }
  }

  if (!values.department) {
    errors.department = 'Department is required.'
  }

  if (!values.program) {
    errors.program = 'Program is required.'
  }

  if (!values.enrollmentDate) {
    errors.enrollmentDate = 'Enrollment date is required.'
  } else if (Number.isNaN(new Date(`${values.enrollmentDate}T00:00:00`).getTime())) {
    errors.enrollmentDate = 'Enter a valid enrollment date.'
  }

  if (!STUDENT_STATUSES.includes(values.status)) {
    errors.status = 'Select a valid status.'
  }

  return errors
}

export function normalizeStoredStudent(raw) {
  if (!raw || typeof raw !== 'object') return null

  const studentId = String(raw.studentId ?? raw.id ?? '').trim()
  const fullName = String(raw.fullName ?? raw.name ?? '').trim().replace(/\s+/g, ' ')
  const email = String(raw.email ?? '').trim()

  if (!studentId || !fullName || !email) return null

  const now = new Date().toISOString()

  return {
    uid: typeof raw.uid === 'string' && raw.uid ? raw.uid : createUid(),
    studentId: studentId.toUpperCase(),
    fullName,
    email: email.toLowerCase(),
    phone: String(raw.phone ?? '').trim(),
    department: String(raw.department ?? '').trim() || 'Undeclared',
    program: String(raw.program ?? '').trim() || 'Undeclared',
    enrollmentDate: normalizeStoredDate(raw.enrollmentDate ?? raw.date),
    status: raw.status === 'Inactive' ? 'Inactive' : 'Active',
    createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : now,
    updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : now,
  }
}

function normalizeStoredDate(value) {
  const text = String(value ?? '').trim()
  if (!text) return new Date().toISOString().slice(0, 10)
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text

  const parsed = new Date(text)
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10)

  return new Date().toISOString().slice(0, 10)
}

export function formatStudentDate(value) {
  if (!value) return '—'

  const date = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? new Date(`${value}T00:00:00`)
    : new Date(value)

  if (Number.isNaN(date.getTime())) return value

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date)
}

export function getInitials(name) {
  const parts = String(name ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)

  if (!parts.length) return 'ST'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
}

export function getAvatarTone(seed) {
  const text = String(seed ?? '')
  let hash = 0
  for (let index = 0; index < text.length; index += 1) {
    hash = (hash * 31 + text.charCodeAt(index)) % 997
  }
  return (hash % 5) + 1
}

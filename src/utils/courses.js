export const COURSE_STATUSES = ['Active', 'Inactive']

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
    code: String(input.code ?? '').trim().toUpperCase().replace(/\s+/g, ' '),
    title: String(input.title ?? '').trim().replace(/\s+/g, ' '),
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
    errors.code = 'Course or subject code is required.'
  } else if (values.code.length > 20) {
    errors.code = 'Course or subject code must be 20 characters or fewer.'
  } else if (
    courses.some(
      (course) =>
        course.uid !== editingUid &&
        String(course.code ?? '').trim().toLowerCase() === values.code.toLowerCase(),
    )
  ) {
    errors.code = 'This course or subject code already exists.'
  }

  if (!values.title) {
    errors.title = 'Course or subject title is required.'
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

export function normalizeStoredCourse(raw) {
  if (!raw || typeof raw !== 'object') return null

  const code = String(raw.code ?? '').trim().toUpperCase()
  const title = String(raw.title ?? '').trim().replace(/\s+/g, ' ')

  if (!code || !title) return null

  const credits = Number(raw.credits)
  const now = new Date().toISOString()

  return {
    uid: typeof raw.uid === 'string' && raw.uid ? raw.uid : createCourseUid(),
    code,
    title,
    department: String(raw.department ?? '').trim() || 'Undeclared',
    credits: Number.isFinite(credits) ? credits : 0,
    status: raw.status === 'Inactive' ? 'Inactive' : 'Active',
    description: String(raw.description ?? '').trim(),
    createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : now,
    updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : now,
  }
}

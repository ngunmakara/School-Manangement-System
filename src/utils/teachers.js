export const TEACHER_STATUSES = ['Active', 'Inactive']

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const PHONE_PATTERN = /^[+]?[\d\s().-]{7,20}$/

export function sanitizeTeacherInput(input = {}) {
  return {
    teacherId: String(input.teacherId ?? '').trim().toUpperCase(),
    fullName: String(input.fullName ?? '').trim().replace(/\s+/g, ' '),
    email: String(input.email ?? '').trim().toLowerCase(),
    phone: String(input.phone ?? '').trim(),
    department: String(input.department ?? '').trim(),
    specialization: String(input.specialization ?? '').trim(),
    hireDate: String(input.hireDate ?? '').trim(),
    status: input.status === 'Inactive' ? 'Inactive' : 'Active',
  }
}

export function validateTeacherRecord(input, teachers = [], editingUid = null) {
  const values = sanitizeTeacherInput(input)
  const errors = {}

  if (!values.teacherId) {
    errors.teacherId = 'Teacher ID is required.'
  } else if (
    teachers.some(
      (teacher) =>
        teacher.uid !== editingUid &&
        teacher.teacherId.trim().toLowerCase() === values.teacherId.toLowerCase(),
    )
  ) {
    errors.teacherId = 'This teacher ID is already assigned.'
  }

  if (!values.fullName) {
    errors.fullName = 'Full name is required.'
  } else if (values.fullName.length < 2) {
    errors.fullName = 'Enter the teacher’s full name.'
  }

  if (!values.email) {
    errors.email = 'Email is required.'
  } else if (!EMAIL_PATTERN.test(values.email)) {
    errors.email = 'Enter a valid email address.'
  } else if (
    teachers.some(
      (teacher) =>
        teacher.uid !== editingUid &&
        teacher.email.trim().toLowerCase() === values.email,
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

  if (!values.specialization) {
    errors.specialization = 'Specialization is required.'
  }

  if (!values.hireDate) {
    errors.hireDate = 'Hire date is required.'
  } else if (Number.isNaN(new Date(`${values.hireDate}T00:00:00`).getTime())) {
    errors.hireDate = 'Enter a valid hire date.'
  }

  if (!TEACHER_STATUSES.includes(values.status)) {
    errors.status = 'Select a valid status.'
  }

  return errors
}

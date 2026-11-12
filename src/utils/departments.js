export function sanitizeDepartmentInput(input = {}) {
  return {
    name: String(input.name ?? '').trim().replace(/\s+/g, ' '),
    code: String(input.code ?? '').trim().toUpperCase(),
    headOfDepartment: String(input.headOfDepartment ?? '').trim().replace(/\s+/g, ' '),
    description: String(input.description ?? '').trim(),
  }
}

export function validateDepartmentRecord(input, departments = [], editingUid = null) {
  const values = sanitizeDepartmentInput(input)
  const errors = {}

  if (!values.name) {
    errors.name = 'Department name is required.'
  } else if (values.name.length > 80) {
    errors.name = 'Department name must be 80 characters or fewer.'
  } else if (
    departments.some(
      (department) =>
        department.uid !== editingUid &&
        department.name.trim().toLowerCase() === values.name.toLowerCase(),
    )
  ) {
    errors.name = 'This department name already exists.'
  }

  if (!values.code) {
    errors.code = 'Department code is required.'
  } else if (values.code.length > 20) {
    errors.code = 'Department code must be 20 characters or fewer.'
  } else if (
    departments.some(
      (department) =>
        department.uid !== editingUid &&
        department.code.trim().toLowerCase() === values.code.toLowerCase(),
    )
  ) {
    errors.code = 'This department code already exists.'
  }

  if (values.headOfDepartment.length > 120) {
    errors.headOfDepartment = 'Head of department must be 120 characters or fewer.'
  }

  if (values.description.length > 500) {
    errors.description = 'Description must be 500 characters or fewer.'
  }

  return errors
}

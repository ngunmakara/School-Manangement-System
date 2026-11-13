import client, { extractApiError } from './client'

export async function fetchStudents(params = {}) {
  try {
    const response = await client.get('/api/students', { params })
    return response.data
  } catch (error) {
    throw extractApiError(error)
  }
}

export async function fetchStudentSummary() {
  try {
    const response = await client.get('/api/students/summary')
    return response.data
  } catch (error) {
    throw extractApiError(error)
  }
}

export async function createStudent(payload) {
  try {
    const response = await client.post('/api/students', payload)
    return response.data
  } catch (error) {
    throw extractApiError(error)
  }
}

export async function updateStudent(id, payload) {
  try {
    const response = await client.put(`/api/students/${id}`, payload)
    return response.data
  } catch (error) {
    throw extractApiError(error)
  }
}

export async function deleteStudent(id) {
  try {
    await client.delete(`/api/students/${id}`)
    return true
  } catch (error) {
    throw extractApiError(error)
  }
}

export function mapApiStudent(record) {
  if (!record || typeof record !== 'object') return null

  const status = String(record.status ?? '').trim().toLowerCase()

  return {
    uid: String(record.id),
    studentId: String(record.studentId ?? ''),
    fullName: String(record.fullName ?? ''),
    email: String(record.email ?? ''),
    phone: String(record.phone ?? ''),
    department: String(record.department ?? ''),
    program: String(record.program ?? ''),
    enrollmentDate: String(record.enrollmentDate ?? '').slice(0, 10),
    status: status === 'inactive' ? 'Inactive' : 'Active',
    createdAt: record.createdAt ?? '',
    updatedAt: record.updatedAt ?? '',
  }
}

function toCount(value) {
  const count = Number(value)
  return Number.isFinite(count) && count > 0 ? count : 0
}

export function mapStudentSummary(payload) {
  const record = payload && typeof payload === 'object' ? payload : {}

  return {
    totalStudents: toCount(record.totalStudents),
    activeStudents: toCount(record.activeStudents),
    inactiveStudents: toCount(record.inactiveStudents),
    departmentCount: toCount(record.departmentCount),
  }
}

export function toApiPayload(input) {
  return {
    studentId: input.studentId,
    fullName: input.fullName,
    email: input.email,
    phone: input.phone,
    department: input.department,
    program: input.program,
    enrollmentDate: input.enrollmentDate,
    status: input.status,
  }
}

import client, { extractApiError } from './client'

export async function fetchTeachers(params = {}) {
  try {
    const response = await client.get('/api/teachers', { params })
    return response.data
  } catch (error) {
    throw extractApiError(error)
  }
}

export async function createTeacher(payload) {
  try {
    const response = await client.post('/api/teachers', payload)
    return response.data
  } catch (error) {
    throw extractApiError(error)
  }
}

export async function updateTeacher(id, payload) {
  try {
    const response = await client.put(`/api/teachers/${id}`, payload)
    return response.data
  } catch (error) {
    throw extractApiError(error)
  }
}

export async function deleteTeacher(id) {
  try {
    await client.delete(`/api/teachers/${id}`)
    return true
  } catch (error) {
    throw extractApiError(error)
  }
}

export function mapApiTeacher(record) {
  if (!record || typeof record !== 'object') return null

  const status = String(record.status ?? '').trim().toLowerCase()

  return {
    uid: String(record.id),
    teacherId: String(record.teacherId ?? ''),
    fullName: String(record.fullName ?? ''),
    email: String(record.email ?? ''),
    phone: String(record.phone ?? ''),
    department: String(record.department ?? ''),
    specialization: String(record.specialization ?? ''),
    hireDate: String(record.hireDate ?? '').slice(0, 10),
    status: status === 'inactive' ? 'Inactive' : 'Active',
    createdAt: record.createdAt ?? '',
    updatedAt: record.updatedAt ?? '',
  }
}

export function toTeacherPayload(input) {
  return {
    teacherId: input.teacherId,
    fullName: input.fullName,
    email: input.email,
    phone: input.phone,
    department: input.department,
    specialization: input.specialization,
    hireDate: input.hireDate,
    status: input.status,
  }
}

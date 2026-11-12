import client, { extractApiError } from './client'

const PAGE_SIZE = 100

export async function fetchDepartments(params = {}) {
  try {
    const response = await client.get('/api/departments', {
      params: { page: 0, size: PAGE_SIZE, ...params },
    })
    return response.data
  } catch (error) {
    throw extractApiError(error)
  }
}

export async function createDepartment(payload) {
  try {
    const response = await client.post('/api/departments', payload)
    return response.data
  } catch (error) {
    throw extractApiError(error)
  }
}

export async function updateDepartment(id, payload) {
  try {
    const response = await client.put(`/api/departments/${id}`, payload)
    return response.data
  } catch (error) {
    throw extractApiError(error)
  }
}

export async function deleteDepartment(id) {
  try {
    await client.delete(`/api/departments/${id}`)
    return true
  } catch (error) {
    throw extractApiError(error)
  }
}

export function mapApiDepartment(record) {
  if (!record || typeof record !== 'object') return null

  return {
    uid: String(record.id),
    name: String(record.name ?? ''),
    code: String(record.code ?? ''),
    headOfDepartment: String(record.headOfDepartment ?? ''),
    description: String(record.description ?? ''),
    createdAt: record.createdAt ?? '',
    updatedAt: record.updatedAt ?? '',
  }
}

export function toDepartmentPayload(input) {
  return {
    name: input.name,
    code: input.code,
    headOfDepartment: input.headOfDepartment || null,
    description: input.description || null,
  }
}

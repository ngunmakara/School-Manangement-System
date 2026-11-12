import client, { extractApiError } from './client'

export async function getDashboardStatistics() {
  try {
    const response = await client.get('/api/dashboard/statistics')
    return response.data
  } catch (error) {
    throw extractApiError(error)
  }
}

function toCount(value) {
  const count = Number(value)
  return Number.isFinite(count) && count > 0 ? count : 0
}

export function mapDashboardStatistics(payload) {
  const record = payload && typeof payload === 'object' ? payload : {}
  const departments = Array.isArray(record.studentsByDepartment)
    ? record.studentsByDepartment
    : []

  return {
    totalStudents: toCount(record.totalStudents),
    activeStudents: toCount(record.activeStudents),
    inactiveStudents: toCount(record.inactiveStudents),
    studentsByDepartment: departments
      .map((item) => ({
        department: String(item?.department ?? '').trim(),
        count: toCount(item?.count),
      }))
      .filter((item) => item.department.length > 0)
      .sort((left, right) => right.count - left.count),
  }
}

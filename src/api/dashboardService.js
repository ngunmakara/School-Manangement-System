import client, { extractApiError } from './client'

export async function getDashboardStatistics() {
  try {
    const response = await client.get('/api/dashboard/statistics')
    return response.data
  } catch (error) {
    throw extractApiError(error)
  }
}

export async function getEnrollmentTrend() {
  try {
    const response = await client.get('/api/dashboard/enrollment-trend')
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
    totalTeachers: toCount(record.totalTeachers),
    activeTeachers: toCount(record.activeTeachers),
    totalDepartments: toCount(record.totalDepartments),
    studentsByDepartment: departments
      .map((item) => ({
        department: String(item?.department ?? '').trim(),
        count: toCount(item?.count),
      }))
      .filter((item) => item.department.length > 0)
      .sort((left, right) => right.count - left.count),
  }
}

export function mapEnrollmentTrend(payload) {
  const record = payload && typeof payload === 'object' ? payload : {}
  const labels = Array.isArray(record.labels)
    ? record.labels.map((label) => String(label ?? '').trim())
    : []

  const currentValues = Array.isArray(record.current) ? record.current : []
  const previousValues = Array.isArray(record.previous) ? record.previous : []
  const current = labels.map((_, index) => toCount(currentValues[index]))
  const previous = labels.map((_, index) => toCount(previousValues[index]))
  const currentTotal = current.reduce((sum, value) => sum + value, 0)
  const previousTotal = previous.reduce((sum, value) => sum + value, 0)

  return {
    currentAcademicYear: String(record.currentAcademicYear ?? '').trim(),
    previousAcademicYear: String(record.previousAcademicYear ?? '').trim(),
    labels,
    current,
    previous,
    currentTotal,
    previousTotal,
  }
}

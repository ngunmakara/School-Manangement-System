import client, { extractApiError } from './client'

export async function fetchAttendance(params = {}) {
  try {
    const response = await client.get('/api/attendance', { params })
    return response.data
  } catch (error) {
    throw extractApiError(error)
  }
}

export async function getAttendanceSummary(date) {
  try {
    const response = await client.get('/api/attendance/summary', {
      params: date ? { date } : {},
    })
    return response.data
  } catch (error) {
    throw extractApiError(error)
  }
}

function toCount(value) {
  const count = Number(value)
  return Number.isFinite(count) && count > 0 ? Math.trunc(count) : 0
}

export function mapAttendanceSummary(payload) {
  const record = payload && typeof payload === 'object' ? payload : {}
  const present = toCount(record.present)
  const late = toCount(record.late)
  const absent = toCount(record.absent)
  const excused = toCount(record.excused)

  return {
    date: String(record.date ?? '').slice(0, 10),
    total: present + late + absent + excused,
    present,
    late,
    absent,
    excused,
  }
}

import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { demoStudents } from '../data/demoStudents'
import {
  createStudent as createStudentApi,
  deleteStudent as deleteStudentApi,
  fetchStudentSummary,
  fetchStudents,
  mapApiStudent,
  mapStudentSummary,
  toApiPayload,
  updateStudent as updateStudentApi,
} from '../api/studentService'
import {
  createUid,
  normalizeStoredStudent,
  sanitizeStudentInput,
  validateStudentRecord,
} from '../utils/students'

const STORAGE_KEY = 'campushub:students:v1'
const NETWORK_ERROR = 'Could not reach the CampusHub server. Check that the backend is running and try again.'

function createSeedRecords() {
  return demoStudents.map(normalizeStoredStudent).filter(Boolean)
}

function getStorage() {
  try {
    if (typeof window === 'undefined') return null
    return window.localStorage || null
  } catch {
    return null
  }
}

function readStoredStudents() {
  const storage = getStorage()
  if (!storage) {
    return { records: null, storageState: 'unavailable' }
  }

  try {
    const raw = storage.getItem(STORAGE_KEY)
    if (raw === null) {
      return { records: null, storageState: 'ok' }
    }

    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) {
      return { records: null, storageState: 'recovered' }
    }

    const records = parsed.map(normalizeStoredStudent).filter(Boolean)
    if (parsed.length > 0 && records.length === 0) {
      return { records: null, storageState: 'recovered' }
    }

    return {
      records,
      storageState: records.length < parsed.length ? 'recovered' : 'ok',
    }
  } catch {
    return { records: null, storageState: 'recovered' }
  }
}

export const useStudentsStore = defineStore('students', () => {
  const initial = readStoredStudents()
  const students = ref(initial.records ?? createSeedRecords())
  const storageState = ref(initial.storageState)
  const source = ref('local')
  const apiState = ref('idle')
  const loadError = ref('')
  const summaryState = ref('idle')
  const summaryError = ref('')
  const serverSummary = ref(null)
  const filteredTotal = ref(0)
  const pageCount = ref(1)
  let lastQuery = null
  let loadSequence = 0
  let summarySequence = 0

  function persist() {
    const storage = getStorage()
    if (!storage) {
      storageState.value = 'unavailable'
      return false
    }

    try {
      storage.setItem(STORAGE_KEY, JSON.stringify(students.value))
      return true
    } catch {
      storageState.value = 'unavailable'
      return false
    }
  }

  if (!initial.records || initial.storageState === 'recovered') {
    persist()
  }

  const localSummary = computed(() => ({
    totalStudents: students.value.length,
    activeStudents: students.value.filter((student) => student.status === 'Active').length,
    inactiveStudents: students.value.filter((student) => student.status === 'Inactive').length,
    departmentCount: new Set(
      students.value.map((student) => student.department).filter(Boolean),
    ).size,
  }))

  const summary = computed(() => {
    if (source.value !== 'api') {
      return localSummary.value
    }

    return (
      serverSummary.value ?? {
        totalStudents: 0,
        activeStudents: 0,
        inactiveStudents: 0,
        departmentCount: 0,
      }
    )
  })

  const totalStudents = computed(() => summary.value.totalStudents)
  const activeStudents = computed(() => summary.value.activeStudents)
  const inactiveStudents = computed(() => summary.value.inactiveStudents)
  const departmentCount = computed(() => summary.value.departmentCount)
  const isApiMode = computed(() => source.value === 'api')

  function normalizeQuery(query = {}) {
    const page = Number(query.page)
    const size = Number(query.size)
    const status = String(query.status ?? '').trim()
    const department = String(query.department ?? '').trim()

    return {
      page: Number.isFinite(page) && page >= 0 ? Math.floor(page) : 0,
      size:
        Number.isFinite(size) && size > 0
          ? Math.min(100, Math.floor(size))
          : 10,
      search: String(query.search ?? '').trim(),
      status: status && status.toLowerCase() !== 'all' ? status : '',
      department:
        department && department.toLowerCase() !== 'all' ? department : '',
      sortBy: String(query.sortBy ?? '').trim() || 'fullName',
      sortDir: String(query.sortDir ?? '').toLowerCase() === 'desc' ? 'desc' : 'asc',
    }
  }

  function invalidateStudentLoads() {
    loadSequence += 1
  }

  async function loadStudents(query = {}) {
    const requestId = ++loadSequence
    const normalized = normalizeQuery(query)
    lastQuery = normalized

    const params = {
      page: normalized.page,
      size: normalized.size,
      sortBy: normalized.sortBy,
      sortDir: normalized.sortDir,
    }

    if (normalized.search) params.search = normalized.search
    if (normalized.status) params.status = normalized.status
    if (normalized.department) params.department = normalized.department

    apiState.value = 'loading'
    loadError.value = ''

    try {
      const page = await fetchStudents(params)

      if (requestId !== loadSequence) return false

      const records = (page?.content ?? []).map(mapApiStudent).filter(Boolean)
      const totalElements = Number(page?.totalElements)
      const totalPages = Number(page?.totalPages)

      students.value = records
      filteredTotal.value = Number.isFinite(totalElements)
        ? Math.max(0, totalElements)
        : records.length
      pageCount.value =
        Number.isFinite(totalPages) && totalPages > 0 ? Math.floor(totalPages) : 1
      source.value = 'api'
      apiState.value = 'ready'
      storageState.value = 'ok'
      return true
    } catch (error) {
      if (requestId !== loadSequence) return false

      apiState.value = 'error'
      loadError.value = error?.message || NETWORK_ERROR

      if (source.value !== 'api') {
        source.value = 'local'
      }

      return false
    }
  }

  async function loadSummary() {
    const requestId = ++summarySequence
    summaryState.value = 'loading'
    summaryError.value = ''

    try {
      const payload = await fetchStudentSummary()

      if (requestId !== summarySequence) return false

      serverSummary.value = mapStudentSummary(payload)
      summaryState.value = 'ready'
      return true
    } catch (error) {
      if (requestId !== summarySequence) return false

      summaryState.value = 'error'
      summaryError.value =
        error?.message || 'Could not load student summary statistics.'
      return false
    }
  }

  function toActionFailure(error) {
    if (!error || error.status === 0) {
      return { ok: false, errors: { form: NETWORK_ERROR } }
    }

    if (error.status === 404) {
      return { ok: false, errors: { form: 'This student record no longer exists.' } }
    }

    const fieldErrors = error.errors && Object.keys(error.errors).length ? error.errors : null
    return {
      ok: false,
      errors: fieldErrors || { form: error.message || NETWORK_ERROR },
    }
  }

  async function addStudent(input) {
    const values = sanitizeStudentInput(input)
    const errors = validateStudentRecord(values, students.value)
    if (Object.keys(errors).length) {
      return { ok: false, errors }
    }

    if (source.value === 'api') {
      try {
        const created = await createStudentApi(toApiPayload(values))
        return { ok: true, student: mapApiStudent(created) }
      } catch (error) {
        return toActionFailure(error)
      }
    }

    const now = new Date().toISOString()
    const student = {
      uid: createUid(),
      ...values,
      createdAt: now,
      updatedAt: now,
    }

    students.value = [student, ...students.value]
    persist()
    return { ok: true, student }
  }

  async function updateStudent(uid, input) {
    const isApi = source.value === 'api'
    let index = -1

    if (!isApi) {
      index = students.value.findIndex((student) => student.uid === uid)
      if (index === -1) {
        return { ok: false, errors: { form: 'This student record no longer exists.' } }
      }
    }

    const values = sanitizeStudentInput(input)
    const errors = validateStudentRecord(values, students.value, uid)
    if (Object.keys(errors).length) {
      return { ok: false, errors }
    }

    if (isApi) {
      try {
        const updated = await updateStudentApi(uid, toApiPayload(values))
        return { ok: true, student: mapApiStudent(updated) }
      } catch (error) {
        return toActionFailure(error)
      }
    }

    const existing = students.value[index]
    const updated = {
      ...existing,
      ...values,
      uid: existing.uid,
      createdAt: existing.createdAt,
      updatedAt: new Date().toISOString(),
    }

    students.value.splice(index, 1, updated)
    persist()
    return { ok: true, student: updated }
  }

  async function deleteStudent(uid) {
    if (source.value === 'api') {
      try {
        await deleteStudentApi(uid)
        return { ok: true }
      } catch (error) {
        return toActionFailure(error)
      }
    }

    const index = students.value.findIndex((student) => student.uid === uid)
    if (index === -1) {
      return { ok: false, errors: { form: 'This student record no longer exists.' } }
    }

    const [removed] = students.value.splice(index, 1)
    persist()
    return { ok: true, student: removed }
  }

  async function resetDemoData() {
    if (source.value === 'api') {
      return loadStudents(lastQuery ?? {})
    }

    students.value = createSeedRecords()
    persist()
  }

  return {
    students,
    storageState,
    source,
    apiState,
    loadError,
    summaryState,
    summaryError,
    filteredTotal,
    pageCount,
    isApiMode,
    totalStudents,
    activeStudents,
    inactiveStudents,
    departmentCount,
    invalidateStudentLoads,
    loadStudents,
    loadSummary,
    addStudent,
    updateStudent,
    deleteStudent,
    resetDemoData,
  }
})

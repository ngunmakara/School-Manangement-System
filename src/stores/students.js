import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { demoStudents } from '../data/demoStudents'
import {
  createStudent as createStudentApi,
  deleteStudent as deleteStudentApi,
  fetchStudents,
  mapApiStudent,
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

  const totalStudents = computed(() => students.value.length)
  const activeStudents = computed(
    () => students.value.filter((student) => student.status === 'Active').length,
  )
  const inactiveStudents = computed(
    () => students.value.filter((student) => student.status === 'Inactive').length,
  )
  const departmentCount = computed(
    () => new Set(students.value.map((student) => student.department).filter(Boolean)).size,
  )
  const isApiMode = computed(() => source.value === 'api')

  async function loadStudents() {
    apiState.value = 'loading'
    loadError.value = ''

    try {
      const page = await fetchStudents()
      const records = (page?.content ?? []).map(mapApiStudent).filter(Boolean)
      students.value = records
      source.value = 'api'
      apiState.value = 'ready'
      storageState.value = 'ok'
      return true
    } catch (error) {
      apiState.value = 'error'
      loadError.value = error?.message || NETWORK_ERROR

      if (source.value !== 'api') {
        source.value = 'local'
      }

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
        const student = mapApiStudent(created)
        students.value = [student, ...students.value]
        return { ok: true, student }
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
    const index = students.value.findIndex((student) => student.uid === uid)
    if (index === -1) {
      return { ok: false, errors: { form: 'This student record no longer exists.' } }
    }

    const values = sanitizeStudentInput(input)
    const errors = validateStudentRecord(values, students.value, uid)
    if (Object.keys(errors).length) {
      return { ok: false, errors }
    }

    if (source.value === 'api') {
      try {
        const updated = await updateStudentApi(uid, toApiPayload(values))
        const student = mapApiStudent(updated)
        const currentIndex = students.value.findIndex((record) => record.uid === student.uid)
        if (currentIndex === -1) {
          students.value = [student, ...students.value]
        } else {
          students.value.splice(currentIndex, 1, student)
        }
        return { ok: true, student }
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
    const index = students.value.findIndex((student) => student.uid === uid)
    if (index === -1) {
      return { ok: false, errors: { form: 'This student record no longer exists.' } }
    }

    if (source.value === 'api') {
      try {
        await deleteStudentApi(uid)
        const [removed] = students.value.splice(index, 1)
        return { ok: true, student: removed }
      } catch (error) {
        return toActionFailure(error)
      }
    }

    const [removed] = students.value.splice(index, 1)
    persist()
    return { ok: true, student: removed }
  }

  async function resetDemoData() {
    if (source.value === 'api') {
      return loadStudents()
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
    isApiMode,
    totalStudents,
    activeStudents,
    inactiveStudents,
    departmentCount,
    loadStudents,
    addStudent,
    updateStudent,
    deleteStudent,
    resetDemoData,
  }
})

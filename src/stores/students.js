import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { demoStudents } from '../data/demoStudents'
import {
  createUid,
  normalizeStoredStudent,
  sanitizeStudentInput,
  validateStudentRecord,
} from '../utils/students'

const STORAGE_KEY = 'campushub:students:v1'

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

  if (!initial.records) {
    persist()
  } else if (initial.storageState === 'recovered') {
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

  function addStudent(input) {
    const values = sanitizeStudentInput(input)
    const errors = validateStudentRecord(values, students.value)
    if (Object.keys(errors).length) {
      return { ok: false, errors }
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

  function updateStudent(uid, input) {
    const index = students.value.findIndex((student) => student.uid === uid)
    if (index === -1) {
      return { ok: false, errors: { form: 'This student record no longer exists.' } }
    }

    const values = sanitizeStudentInput(input)
    const errors = validateStudentRecord(values, students.value, uid)
    if (Object.keys(errors).length) {
      return { ok: false, errors }
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

  function deleteStudent(uid) {
    const index = students.value.findIndex((student) => student.uid === uid)
    if (index === -1) {
      return { ok: false, errors: { form: 'This student record no longer exists.' } }
    }

    const [removed] = students.value.splice(index, 1)
    persist()
    return { ok: true, student: removed }
  }

  function resetDemoData() {
    students.value = createSeedRecords()
    persist()
  }

  return {
    students,
    storageState,
    totalStudents,
    activeStudents,
    inactiveStudents,
    departmentCount,
    addStudent,
    updateStudent,
    deleteStudent,
    resetDemoData,
  }
})

import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import {
  createCourseUid,
  normalizeStoredCourse,
  sanitizeCourseInput,
  validateCourseRecord,
} from '../utils/courses'

const STORAGE_KEY = 'campushub:courses:v1'

function getStorage() {
  try {
    if (typeof window === 'undefined') return null
    return window.localStorage || null
  } catch {
    return null
  }
}

function readStoredCourses() {
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

    const records = parsed.map(normalizeStoredCourse).filter(Boolean)
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

export const useCoursesStore = defineStore('courses', () => {
  const initial = readStoredCourses()
  const courses = ref(initial.records ?? [])
  const storageState = ref(initial.storageState)
  const source = ref('local')

  function persist() {
    const storage = getStorage()
    if (!storage) {
      storageState.value = 'unavailable'
      return false
    }

    try {
      storage.setItem(STORAGE_KEY, JSON.stringify(courses.value))
      return true
    } catch {
      storageState.value = 'unavailable'
      return false
    }
  }

  if (!initial.records || initial.storageState === 'recovered') {
    persist()
  }

  const totalCourses = computed(() => courses.value.length)
  const activeCourses = computed(
    () => courses.value.filter((course) => course.status === 'Active').length,
  )
  const inactiveCourses = computed(
    () => courses.value.filter((course) => course.status === 'Inactive').length,
  )
  const departmentCount = computed(
    () => new Set(courses.value.map((course) => course.department).filter(Boolean)).size,
  )
  const totalCredits = computed(() =>
    courses.value.reduce((sum, course) => sum + (Number(course.credits) || 0), 0),
  )

  function loadCourses() {
    const next = readStoredCourses()

    if (next.records) {
      courses.value = next.records
      storageState.value = next.storageState
      return true
    }

    storageState.value = next.storageState
    return false
  }

  function addCourse(input) {
    const values = sanitizeCourseInput(input)
    const errors = validateCourseRecord(values, courses.value)
    if (Object.keys(errors).length) {
      return { ok: false, errors }
    }

    const now = new Date().toISOString()
    const course = {
      uid: createCourseUid(),
      ...values,
      createdAt: now,
      updatedAt: now,
    }

    courses.value = [course, ...courses.value]
    persist()
    return { ok: true, course }
  }

  function updateCourse(uid, input) {
    const existing = courses.value.find((course) => course.uid === uid)
    if (!existing) {
      return { ok: false, errors: { form: 'This course or subject no longer exists.' } }
    }

    const values = sanitizeCourseInput(input)
    const errors = validateCourseRecord(values, courses.value, uid)
    if (Object.keys(errors).length) {
      return { ok: false, errors }
    }

    const course = {
      ...existing,
      ...values,
      updatedAt: new Date().toISOString(),
    }

    courses.value = courses.value.map((record) => (record.uid === uid ? course : record))
    persist()
    return { ok: true, course }
  }

  function deleteCourse(uid) {
    const existing = courses.value.find((course) => course.uid === uid)
    if (!existing) {
      return { ok: false, errors: { form: 'This course or subject no longer exists.' } }
    }

    courses.value = courses.value.filter((course) => course.uid !== uid)
    persist()
    return { ok: true, course: existing }
  }

  return {
    courses,
    source,
    storageState,
    totalCourses,
    activeCourses,
    inactiveCourses,
    departmentCount,
    totalCredits,
    loadCourses,
    addCourse,
    updateCourse,
    deleteCourse,
  }
})

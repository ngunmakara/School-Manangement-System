import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import {
  createCourseUid,
  normalizeStoredCourses,
  sanitizeCourseInput,
  validateCourseRecord,
} from '../utils/courses'

const STORAGE_KEY = 'campushub:courses:v1'
const LOAD_ERROR = 'Course records could not be loaded from browser storage.'
const STORAGE_UNAVAILABLE =
  'Browser storage could not be accessed. Changes will last for this session only.'
const STORAGE_WRITE_FAILED =
  'Browser storage is not accepting course saves. Changes will last for this session only.'

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
    return {
      records: null,
      storageState: 'unavailable',
      recovery: null,
      storageError: STORAGE_UNAVAILABLE,
    }
  }

  let raw

  try {
    raw = storage.getItem(STORAGE_KEY)
  } catch {
    return {
      records: null,
      storageState: 'unavailable',
      recovery: null,
      storageError: STORAGE_UNAVAILABLE,
    }
  }

  if (raw === null) {
    return { records: null, storageState: 'ok', recovery: null }
  }

  let parsed

  try {
    parsed = JSON.parse(raw)
  } catch {
    return {
      records: null,
      storageState: 'recovered',
      recovery: {
        kind: 'invalid-json',
        discarded: 0,
        corrected: 0,
        duplicateUids: 0,
      },
    }
  }

  if (!Array.isArray(parsed)) {
    return {
      records: null,
      storageState: 'recovered',
      recovery: {
        kind: 'invalid-format',
        discarded: 0,
        corrected: 0,
        duplicateUids: 0,
      },
    }
  }

  const normalized = normalizeStoredCourses(parsed)
  const recovered = normalized.discarded > 0 || normalized.corrected > 0

  return {
    records: normalized.records,
    storageState: recovered ? 'recovered' : 'ok',
    recovery: recovered ? { kind: 'records', ...normalized } : null,
  }
}

export const useCoursesStore = defineStore('courses', () => {
  const initial = readStoredCourses()
  const courses = ref(initial.records ?? [])
  const storageState = ref(initial.storageState)
  const recovery = ref(initial.recovery)
  const persistenceState = ref(initial.storageState === 'unavailable' ? 'unavailable' : 'ok')
  const persistenceError = ref(initial.storageError || '')
  const loadState = ref('ready')
  const loadError = ref('')
  const source = ref('local')
  let hasUnpersistedChanges = false

  function persist() {
    const storage = getStorage()
    if (!storage) {
      storageState.value = 'unavailable'
      persistenceState.value = 'unavailable'
      persistenceError.value = STORAGE_UNAVAILABLE
      hasUnpersistedChanges = true
      return false
    }

    try {
      storage.setItem(STORAGE_KEY, JSON.stringify(courses.value))
      persistenceState.value = 'ok'
      persistenceError.value = ''
      hasUnpersistedChanges = false
      return true
    } catch {
      persistenceState.value = 'failed'
      persistenceError.value = STORAGE_WRITE_FAILED
      hasUnpersistedChanges = true
      return false
    }
  }

  if (
    initial.storageState !== 'unavailable' &&
    (!initial.records || initial.storageState === 'recovered')
  ) {
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
    loadState.value = 'loading'
    loadError.value = ''

    try {
      const next = readStoredCourses()
      const preserveSessionChanges = hasUnpersistedChanges

      if (!preserveSessionChanges) {
        if (next.storageState !== 'unavailable') {
          courses.value = next.records ?? []
        }
        recovery.value = next.recovery
      }

      if (next.storageState === 'unavailable') {
        persistenceState.value = 'unavailable'
        persistenceError.value = next.storageError || STORAGE_UNAVAILABLE
      } else if (persistenceState.value === 'unavailable') {
        persistenceState.value = 'ok'
        persistenceError.value = ''
      }

      storageState.value = next.storageState
      loadState.value = 'ready'

      if (preserveSessionChanges) {
        if (next.storageState !== 'unavailable') persist()
      } else if (next.storageState === 'recovered') {
        persist()
      }

      return true
    } catch {
      loadState.value = 'error'
      loadError.value = LOAD_ERROR
      return false
    }
  }

  function addCourse(input) {
    const errors = validateCourseRecord(input, courses.value)
    if (Object.keys(errors).length) {
      return { ok: false, errors }
    }

    const values = sanitizeCourseInput(input)
    const now = new Date().toISOString()
    const course = {
      uid: createCourseUid(),
      ...values,
      createdAt: now,
      updatedAt: now,
    }

    courses.value = [course, ...courses.value]
    const persisted = persist()
    return { ok: true, course, persisted }
  }

  function updateCourse(uid, input) {
    const existing = courses.value.find((course) => course.uid === uid)
    if (!existing) {
      return { ok: false, errors: { form: 'This course no longer exists.' } }
    }

    const values = sanitizeCourseInput(input)
    const errors = validateCourseRecord(input, courses.value, uid)
    if (Object.keys(errors).length) {
      return { ok: false, errors }
    }

    const course = {
      ...existing,
      ...values,
      updatedAt: new Date().toISOString(),
    }

    courses.value = courses.value.map((record) => (record.uid === uid ? course : record))
    const persisted = persist()
    return { ok: true, course, persisted }
  }

  function deleteCourse(uid) {
    const existing = courses.value.find((course) => course.uid === uid)
    if (!existing) {
      return { ok: false, errors: { form: 'This course no longer exists.' } }
    }

    courses.value = courses.value.filter((course) => course.uid !== uid)
    const persisted = persist()
    return { ok: true, course: existing, persisted }
  }

  return {
    courses,
    source,
    storageState,
    recovery,
    persistenceState,
    persistenceError,
    loadState,
    loadError,
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

import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import {
  createTeacher as createTeacherApi,
  deleteTeacher as deleteTeacherApi,
  fetchTeachers,
  mapApiTeacher,
  toTeacherPayload,
  updateTeacher as updateTeacherApi,
} from '../api/teacherService'
import {
  sanitizeTeacherInput,
  validateTeacherRecord,
} from '../utils/teachers'

const NETWORK_ERROR =
  'Could not reach the CampusHub server. Check that the backend is running and try again.'
const DEFAULT_PAGE_SIZE = 10
const MAX_PAGE_SIZE = 100

function normalizeQuery(query = {}) {
  const page = Number(query.page)
  const size = Number(query.size)

  return {
    page: Number.isFinite(page) && page >= 0 ? Math.floor(page) : 0,
    size:
      Number.isFinite(size) && size > 0
        ? Math.min(MAX_PAGE_SIZE, Math.floor(size))
        : DEFAULT_PAGE_SIZE,
  }
}

export const useTeachersStore = defineStore('teachers', () => {
  const teachers = ref([])
  const apiState = ref('idle')
  const loadError = ref('')
  const totalTeachers = ref(0)
  const pageSize = ref(DEFAULT_PAGE_SIZE)

  let loadSequence = 0

  const pageCount = computed(() =>
    Math.max(1, Math.ceil(totalTeachers.value / pageSize.value)),
  )
  const pageActiveTeachers = computed(
    () => teachers.value.filter((teacher) => teacher.status === 'Active').length,
  )
  const pageInactiveTeachers = computed(
    () => teachers.value.filter((teacher) => teacher.status === 'Inactive').length,
  )
  const pageDepartmentCount = computed(
    () => new Set(teachers.value.map((teacher) => teacher.department).filter(Boolean)).size,
  )

  function invalidateTeacherLoads() {
    loadSequence += 1
  }

  async function loadTeachers(query = {}) {
    const requestId = ++loadSequence
    const normalized = normalizeQuery(query)
    pageSize.value = normalized.size

    apiState.value = 'loading'
    loadError.value = ''

    try {
      const page = await fetchTeachers({
        page: normalized.page,
        size: normalized.size,
      })

      if (requestId !== loadSequence) return false

      const records = (Array.isArray(page?.content) ? page.content : [])
        .map(mapApiTeacher)
        .filter(Boolean)
      const total = Number(page?.totalElements)

      teachers.value = records
      totalTeachers.value = Number.isFinite(total)
        ? Math.max(0, total)
        : records.length
      apiState.value = 'ready'
      return true
    } catch (error) {
      if (requestId !== loadSequence) return false

      apiState.value = 'error'
      loadError.value = error?.message || NETWORK_ERROR
      return false
    }
  }

  function toActionFailure(error) {
    if (!error || error.status === 0) {
      return { ok: false, errors: { form: NETWORK_ERROR } }
    }

    if (error.status === 404) {
      return { ok: false, errors: { form: 'This teacher record no longer exists.' } }
    }

    const fieldErrors = error.errors && Object.keys(error.errors).length ? error.errors : null
    return {
      ok: false,
      errors: fieldErrors || { form: error.message || NETWORK_ERROR },
    }
  }

  async function addTeacher(input) {
    const values = sanitizeTeacherInput(input)
    const errors = validateTeacherRecord(values, teachers.value)
    if (Object.keys(errors).length) {
      return { ok: false, errors }
    }

    try {
      const created = await createTeacherApi(toTeacherPayload(values))
      const teacher = mapApiTeacher(created)

      if (!teacher) {
        return {
          ok: false,
          errors: { form: 'The server returned an unexpected teacher record.' },
        }
      }

      return { ok: true, teacher }
    } catch (error) {
      return toActionFailure(error)
    }
  }

  async function updateTeacher(uid, input) {
    const existing = teachers.value.find((teacher) => teacher.uid === uid)
    if (!existing) {
      return { ok: false, errors: { form: 'This teacher record no longer exists.' } }
    }

    const values = sanitizeTeacherInput(input)
    const errors = validateTeacherRecord(values, teachers.value, uid)
    if (Object.keys(errors).length) {
      return { ok: false, errors }
    }

    try {
      const updated = await updateTeacherApi(uid, toTeacherPayload(values))
      const teacher = mapApiTeacher(updated)

      if (!teacher) {
        return {
          ok: false,
          errors: { form: 'The server returned an unexpected teacher record.' },
        }
      }

      return { ok: true, teacher }
    } catch (error) {
      return toActionFailure(error)
    }
  }

  async function deleteTeacher(uid) {
    const existing = teachers.value.find((teacher) => teacher.uid === uid)
    if (!existing) {
      return { ok: false, errors: { form: 'This teacher record no longer exists.' } }
    }

    try {
      await deleteTeacherApi(uid)
      return { ok: true, teacher: existing }
    } catch (error) {
      return toActionFailure(error)
    }
  }

  return {
    teachers,
    apiState,
    loadError,
    totalTeachers,
    pageCount,
    pageActiveTeachers,
    pageInactiveTeachers,
    pageDepartmentCount,
    invalidateTeacherLoads,
    loadTeachers,
    addTeacher,
    updateTeacher,
    deleteTeacher,
  }
})

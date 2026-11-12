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

export const useTeachersStore = defineStore('teachers', () => {
  const teachers = ref([])
  const apiState = ref('idle')
  const loadError = ref('')
  const totalTeachers = ref(0)

  const activeTeachers = computed(
    () => teachers.value.filter((teacher) => teacher.status === 'Active').length,
  )
  const inactiveTeachers = computed(
    () => teachers.value.filter((teacher) => teacher.status === 'Inactive').length,
  )
  const departmentCount = computed(
    () => new Set(teachers.value.map((teacher) => teacher.department).filter(Boolean)).size,
  )

  async function loadTeachers() {
    apiState.value = 'loading'
    loadError.value = ''

    try {
      const page = await fetchTeachers()
      const records = (page?.content ?? []).map(mapApiTeacher).filter(Boolean)
      const total = Number(page?.totalElements)

      teachers.value = records
      totalTeachers.value = Number.isFinite(total) ? total : records.length
      apiState.value = 'ready'
      return true
    } catch (error) {
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
      teachers.value = [teacher, ...teachers.value]
      totalTeachers.value += 1
      return { ok: true, teacher }
    } catch (error) {
      return toActionFailure(error)
    }
  }

  async function updateTeacher(uid, input) {
    const index = teachers.value.findIndex((teacher) => teacher.uid === uid)
    if (index === -1) {
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
      const currentIndex = teachers.value.findIndex((record) => record.uid === teacher.uid)

      if (currentIndex === -1) {
        teachers.value = [teacher, ...teachers.value]
      } else {
        teachers.value.splice(currentIndex, 1, teacher)
      }

      return { ok: true, teacher }
    } catch (error) {
      return toActionFailure(error)
    }
  }

  async function deleteTeacher(uid) {
    const index = teachers.value.findIndex((teacher) => teacher.uid === uid)
    if (index === -1) {
      return { ok: false, errors: { form: 'This teacher record no longer exists.' } }
    }

    try {
      await deleteTeacherApi(uid)
      const [removed] = teachers.value.splice(index, 1)
      totalTeachers.value = Math.max(0, totalTeachers.value - 1)
      return { ok: true, teacher: removed }
    } catch (error) {
      return toActionFailure(error)
    }
  }

  return {
    teachers,
    apiState,
    loadError,
    totalTeachers,
    activeTeachers,
    inactiveTeachers,
    departmentCount,
    loadTeachers,
    addTeacher,
    updateTeacher,
    deleteTeacher,
  }
})

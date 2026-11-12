import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import {
  createDepartment as createDepartmentApi,
  deleteDepartment as deleteDepartmentApi,
  fetchDepartments,
  mapApiDepartment,
  toDepartmentPayload,
  updateDepartment as updateDepartmentApi,
} from '../api/departmentService'
import {
  sanitizeDepartmentInput,
  validateDepartmentRecord,
} from '../utils/departments'

const NETWORK_ERROR =
  'Could not reach the CampusHub server. Check that the backend is running and try again.'

function sortByName(records) {
  return [...records].sort((left, right) =>
    String(left.name ?? '').localeCompare(String(right.name ?? ''), 'en', {
      sensitivity: 'base',
      numeric: true,
    }),
  )
}

export const useDepartmentsStore = defineStore('departments', () => {
  const departments = ref([])
  const apiState = ref('idle')
  const loadError = ref('')
  const totalDepartments = ref(0)

  const departmentNames = computed(() =>
    departments.value.map((department) => department.name).filter(Boolean),
  )

  async function loadDepartments() {
    apiState.value = 'loading'
    loadError.value = ''

    try {
      const page = await fetchDepartments()
      const records = (page?.content ?? []).map(mapApiDepartment).filter(Boolean)
      const total = Number(page?.totalElements)

      departments.value = sortByName(records)
      totalDepartments.value = Number.isFinite(total) ? total : records.length
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
      return { ok: false, errors: { form: 'This department no longer exists.' } }
    }

    const fieldErrors = error.errors && Object.keys(error.errors).length ? error.errors : null
    return {
      ok: false,
      errors: fieldErrors || { form: error.message || NETWORK_ERROR },
    }
  }

  async function addDepartment(input) {
    const values = sanitizeDepartmentInput(input)
    const errors = validateDepartmentRecord(values, departments.value)
    if (Object.keys(errors).length) {
      return { ok: false, errors }
    }

    try {
      const created = await createDepartmentApi(toDepartmentPayload(values))
      const department = mapApiDepartment(created)
      departments.value = sortByName([...departments.value, department])
      totalDepartments.value += 1
      return { ok: true, department }
    } catch (error) {
      return toActionFailure(error)
    }
  }

  async function updateDepartment(uid, input) {
    const index = departments.value.findIndex((department) => department.uid === uid)
    if (index === -1) {
      return { ok: false, errors: { form: 'This department no longer exists.' } }
    }

    const values = sanitizeDepartmentInput(input)
    const errors = validateDepartmentRecord(values, departments.value, uid)
    if (Object.keys(errors).length) {
      return { ok: false, errors }
    }

    try {
      const updated = await updateDepartmentApi(uid, toDepartmentPayload(values))
      const department = mapApiDepartment(updated)
      const updatedList = [...departments.value]
      updatedList.splice(index, 1, department)

      departments.value = sortByName(updatedList)
      return { ok: true, department }
    } catch (error) {
      return toActionFailure(error)
    }
  }

  async function deleteDepartment(uid) {
    const index = departments.value.findIndex((department) => department.uid === uid)
    if (index === -1) {
      return { ok: false, errors: { form: 'This department no longer exists.' } }
    }

    try {
      await deleteDepartmentApi(uid)
      const [removed] = departments.value.splice(index, 1)
      totalDepartments.value = Math.max(0, totalDepartments.value - 1)
      return { ok: true, department: removed }
    } catch (error) {
      return toActionFailure(error)
    }
  }

  return {
    departments,
    departmentNames,
    apiState,
    loadError,
    totalDepartments,
    loadDepartments,
    addDepartment,
    updateDepartment,
    deleteDepartment,
  }
})

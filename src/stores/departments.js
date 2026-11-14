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
const DEFAULT_PAGE_SIZE = 10
const MAX_PAGE_SIZE = 100
const OPTIONS_PAGE_SIZE = 100
const MAX_OPTIONS_PAGES = 50

function sortByName(records) {
  return [...records].sort((left, right) =>
    String(left.name ?? '').localeCompare(String(right.name ?? ''), 'en', {
      sensitivity: 'base',
      numeric: true,
    }),
  )
}

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

export const useDepartmentsStore = defineStore('departments', () => {
  const departments = ref([])
  const apiState = ref('idle')
  const loadError = ref('')
  const totalDepartments = ref(0)
  const pageSize = ref(DEFAULT_PAGE_SIZE)
  const departmentOptions = ref([])
  const optionsState = ref('idle')
  const optionsError = ref('')
  const optionsTruncated = ref(false)

  let loadSequence = 0
  let optionsSequence = 0

  const pageCount = computed(() =>
    Math.max(1, Math.ceil(totalDepartments.value / pageSize.value)),
  )
  const departmentNames = computed(() => [...departmentOptions.value])

  function invalidateDepartmentLoads() {
    loadSequence += 1
  }

  async function loadDepartments(query = {}) {
    const requestId = ++loadSequence
    const normalized = normalizeQuery(query)
    pageSize.value = normalized.size

    apiState.value = 'loading'
    loadError.value = ''

    try {
      const page = await fetchDepartments({
        page: normalized.page,
        size: normalized.size,
      })

      if (requestId !== loadSequence) return false

      const records = (Array.isArray(page?.content) ? page.content : [])
        .map(mapApiDepartment)
        .filter(Boolean)
      const total = Number(page?.totalElements)

      departments.value = sortByName(records)
      totalDepartments.value = Number.isFinite(total)
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

  async function loadDepartmentOptions(force = false) {
    if (!force && (optionsState.value === 'loading' || optionsState.value === 'ready')) {
      return optionsState.value === 'ready'
    }

    const requestId = ++optionsSequence
    optionsState.value = 'loading'
    optionsError.value = ''

    try {
      const names = new Set()
      let page = 0
      let effectiveSize = OPTIONS_PAGE_SIZE
      let truncated = false

      while (page < MAX_OPTIONS_PAGES) {
        const payload = await fetchDepartments({
          page,
          size: OPTIONS_PAGE_SIZE,
        })

        if (requestId !== optionsSequence) return false

        const records = (Array.isArray(payload?.content) ? payload.content : [])
          .map(mapApiDepartment)
          .filter(Boolean)
        records.forEach((department) => {
          if (department.name) names.add(department.name)
        })

        if (page === 0) {
          const reportedSize = Number(payload?.size)
          if (Number.isFinite(reportedSize) && reportedSize > 0) {
            effectiveSize = reportedSize
          }
          if (records.length > 0 && records.length < effectiveSize) {
            effectiveSize = records.length
          }
        }

        const total = Number(payload?.totalElements)
        const fetched = page + 1
        const hasMore = Number.isFinite(total)
          ? fetched * effectiveSize < total
          : records.length === effectiveSize

        page = fetched
        if (!hasMore) break
        if (page >= MAX_OPTIONS_PAGES) truncated = true
      }

      departmentOptions.value = [...names].sort((left, right) =>
        left.localeCompare(right, 'en', { sensitivity: 'base' }),
      )
      optionsTruncated.value = truncated
      optionsState.value = 'ready'
      return true
    } catch (error) {
      if (requestId !== optionsSequence) return false

      optionsState.value = 'error'
      optionsError.value = error?.message || NETWORK_ERROR
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

      if (!department) {
        return {
          ok: false,
          errors: { form: 'The server returned an unexpected department record.' },
        }
      }

      loadDepartmentOptions(true)
      return { ok: true, department }
    } catch (error) {
      return toActionFailure(error)
    }
  }

  async function updateDepartment(uid, input) {
    const existing = departments.value.find((department) => department.uid === uid)
    if (!existing) {
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

      if (!department) {
        return {
          ok: false,
          errors: { form: 'The server returned an unexpected department record.' },
        }
      }

      loadDepartmentOptions(true)
      return { ok: true, department }
    } catch (error) {
      return toActionFailure(error)
    }
  }

  async function deleteDepartment(uid) {
    const existing = departments.value.find((department) => department.uid === uid)
    if (!existing) {
      return { ok: false, errors: { form: 'This department no longer exists.' } }
    }

    try {
      await deleteDepartmentApi(uid)
      loadDepartmentOptions(true)
      return { ok: true, department: existing }
    } catch (error) {
      return toActionFailure(error)
    }
  }

  return {
    departments,
    departmentNames,
    departmentOptions,
    optionsState,
    optionsError,
    optionsTruncated,
    apiState,
    loadError,
    totalDepartments,
    pageCount,
    invalidateDepartmentLoads,
    loadDepartments,
    loadDepartmentOptions,
    addDepartment,
    updateDepartment,
    deleteDepartment,
  }
})

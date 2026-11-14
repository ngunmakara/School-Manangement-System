<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import PageHeader from '../components/common/PageHeader.vue'
import StatCard from '../components/common/StatCard.vue'
import SearchField from '../components/common/SearchField.vue'
import FilterSelect from '../components/common/FilterSelect.vue'
import EmptyState from '../components/common/EmptyState.vue'
import PaginationBar from '../components/common/PaginationBar.vue'
import ConfirmDialog from '../components/common/ConfirmDialog.vue'
import CourseTable from '../components/courses/CourseTable.vue'
import CourseFormModal from '../components/courses/CourseFormModal.vue'
import CourseDetailsModal from '../components/courses/CourseDetailsModal.vue'
import { useCoursesStore } from '../stores/courses'
import { useDepartmentsStore } from '../stores/departments'
import { useToast } from '../composables/useToast'
import { STUDENT_DEPARTMENTS } from '../utils/students'
import { COURSE_STATUSES } from '../utils/courses'

const store = useCoursesStore()
const departmentsStore = useDepartmentsStore()
const { push: toast } = useToast()
const route = useRoute()
const router = useRouter()

const searchTerm = ref('')
const departmentFilter = ref('')
const statusFilter = ref('')
const sortKey = ref('title')
const sortDir = ref('asc')
const page = ref(1)
const pageSize = ref(10)

const formOpen = ref(false)
const detailsOpen = ref(false)
const editingCourse = ref(null)
const viewingCourse = ref(null)
const deleteTarget = ref(null)

const hasFilters = computed(
  () =>
    searchTerm.value.trim() !== '' ||
    departmentFilter.value !== '' ||
    statusFilter.value !== '',
)

const departmentFilterOptions = computed(() => {
  const values = new Set([...STUDENT_DEPARTMENTS, ...departmentsStore.departmentOptions])
  store.courses.forEach((course) => {
    if (course.department) values.add(course.department)
  })

  return [
    { value: '', label: 'All departments' },
    ...[...values]
      .sort((left, right) => left.localeCompare(right, 'en', { sensitivity: 'base' }))
      .map((department) => ({ value: department, label: department })),
  ]
})

const statusFilterOptions = computed(() => [
  { value: '', label: 'All statuses' },
  ...COURSE_STATUSES.map((status) => ({ value: status, label: status })),
])

const filteredCourses = computed(() => {
  const term = searchTerm.value.trim().toLowerCase()

  const matches = store.courses.filter((course) => {
    if (departmentFilter.value && course.department !== departmentFilter.value) return false
    if (statusFilter.value && course.status !== statusFilter.value) return false
    if (!term) return true

    return [course.code, course.title, course.department, course.description].some((value) =>
      String(value ?? '').toLowerCase().includes(term),
    )
  })

  const direction = sortDir.value === 'asc' ? 1 : -1
  const key = sortKey.value

  return [...matches].sort((left, right) => {
    if (key === 'createdAt' || key === 'updatedAt') {
      const leftTime = new Date(left[key] || 0).getTime()
      const rightTime = new Date(right[key] || 0).getTime()
      return (leftTime - rightTime) * direction
    }

    if (key === 'credits') {
      return (Number(left.credits) - Number(right.credits)) * direction
    }

    return (
      String(left[key] ?? '').localeCompare(String(right[key] ?? ''), 'en', {
        sensitivity: 'base',
        numeric: true,
      }) * direction
    )
  })
})

const totalPages = computed(() =>
  Math.max(1, Math.ceil(filteredCourses.value.length / pageSize.value)),
)

const pagedCourses = computed(() => {
  const start = (page.value - 1) * pageSize.value
  return filteredCourses.value.slice(start, start + pageSize.value)
})

const summaryCards = computed(() => [
  {
    label: 'Total records',
    value: store.totalCourses.toLocaleString('en-US'),
    icon: 'bi-journal-bookmark',
    tone: 'indigo',
    note: 'Courses and subjects in this browser',
  },
  {
    label: 'Active',
    value: store.activeCourses.toLocaleString('en-US'),
    icon: 'bi-check2-circle',
    tone: 'green',
    note: 'Available in the catalog',
  },
  {
    label: 'Inactive',
    value: store.inactiveCourses.toLocaleString('en-US'),
    icon: 'bi-pause-circle',
    tone: 'amber',
    note: 'Hidden or retired records',
  },
  {
    label: 'Departments',
    value: store.departmentCount.toLocaleString('en-US'),
    icon: 'bi-building',
    tone: 'blue',
    note: 'Represented in the catalog',
  },
])

const directorySubtitle = computed(() => {
  if (!store.totalCourses) return 'No courses or subjects yet'
  if (hasFilters.value) {
    return `${filteredCourses.value.length} of ${store.totalCourses} records match your filters`
  }
  return `${store.totalCourses} records in the browser catalog`
})

const storageWarning = computed(() => {
  if (store.storageState === 'unavailable') {
    return 'Browser storage is unavailable. Changes will last for this session only.'
  }
  if (store.storageState === 'recovered') {
    return 'Some stored course records could not be read and were removed from the catalog.'
  }
  return ''
})

watch([searchTerm, departmentFilter, statusFilter, sortKey, sortDir], () => {
  page.value = 1
})

watch(totalPages, (value) => {
  if (page.value > value) page.value = value
})

function resetFilters() {
  searchTerm.value = ''
  departmentFilter.value = ''
  statusFilter.value = ''
  sortKey.value = 'title'
  sortDir.value = 'asc'
  page.value = 1
}

function toggleSort(key) {
  if (sortKey.value === key) {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortKey.value = key
    sortDir.value = 'asc'
  }
  page.value = 1
}

function openAdd() {
  editingCourse.value = null
  formOpen.value = true
}

function openEdit(course) {
  detailsOpen.value = false
  editingCourse.value = course
  formOpen.value = true
}

function openView(course) {
  viewingCourse.value = course
  detailsOpen.value = true
}

function askDelete(course) {
  deleteTarget.value = course
}

function closeDeleteDialog(open) {
  if (!open) deleteTarget.value = null
}

function confirmDelete() {
  if (!deleteTarget.value) return

  const target = deleteTarget.value
  const result = store.deleteCourse(target.uid)

  if (!result.ok) {
    toast({
      variant: 'danger',
      title: 'Could not delete record',
      message: result.errors.form || 'The course or subject could not be deleted.',
    })
    deleteTarget.value = null
    return
  }

  if (viewingCourse.value?.uid === target.uid) {
    viewingCourse.value = null
    detailsOpen.value = false
  }

  toast({
    variant: 'success',
    title: 'Record deleted',
    message: `${target.title} (${target.code}) was removed from the browser catalog.`,
  })
  deleteTarget.value = null
}

function handleSaved({ mode, course }) {
  formOpen.value = false
  editingCourse.value = null

  if (mode === 'add') page.value = 1

  toast({
    variant: 'success',
    title: mode === 'edit' ? 'Record updated' : 'Record added',
    message: `${course.title} (${course.code}) was saved to browser storage.`,
  })
}

function handleDetailsEdit(course) {
  detailsOpen.value = false
  editingCourse.value = course
  formOpen.value = true
}

function handleQueryAction() {
  if (route.query.action === 'add') {
    openAdd()
    router.replace({ name: 'courses' })
  }
}

onMounted(() => {
  store.loadCourses()
  handleQueryAction()
})

watch(() => route.query.action, handleQueryAction)
</script>

<template>
  <div>
    <PageHeader
      title="Courses & Subjects"
      description="Maintain the course and subject catalog, credit values, departments, and publication status. This milestone stores records in the browser and does not call a course API."
      eyebrow="Academic catalog"
      eyebrow-icon="bi-journal-bookmark"
    >
      <template #actions>
        <span class="demo-flag">
          <i class="bi bi-hdd" aria-hidden="true"></i>
          Browser storage
        </span>
        <button type="button" class="btn-ch btn-ch-primary" @click="openAdd">
          <i class="bi bi-plus-lg" aria-hidden="true"></i>
          Add course or subject
        </button>
      </template>
    </PageHeader>

    <div v-if="storageWarning" class="ch-alert is-warning" role="alert">
      <i class="bi bi-hdd-stack" aria-hidden="true"></i>
      <span>{{ storageWarning }}</span>
    </div>

    <section class="row g-3 g-xl-4 mb-1" aria-label="Course summary statistics">
      <div v-for="card in summaryCards" :key="card.label" class="col-sm-6 col-xl-3">
        <StatCard v-bind="card" />
      </div>
    </section>

    <section class="ch-card mt-3 mt-xl-4">
      <div class="ch-card-header has-border">
        <div>
          <h2 class="ch-card-title">Course & subject catalog</h2>
          <p class="ch-card-subtitle">{{ directorySubtitle }}</p>
        </div>
        <button
          v-if="hasFilters"
          type="button"
          class="btn-ch btn-ch-ghost btn-ch-sm"
          @click="resetFilters"
        >
          <i class="bi bi-arrow-counterclockwise" aria-hidden="true"></i>
          Reset filters
        </button>
      </div>

      <div class="data-toolbar">
        <SearchField
          v-model="searchTerm"
          class="toolbar-search"
          label="Search"
          placeholder="Search by code, title, department, or description…"
        />
        <FilterSelect
          v-model="departmentFilter"
          label="Department"
          :options="departmentFilterOptions"
        />
        <FilterSelect v-model="statusFilter" label="Status" :options="statusFilterOptions" />
      </div>

      <div v-if="pagedCourses.length" class="ch-card-body is-flush">
        <CourseTable
          :courses="pagedCourses"
          :sort-key="sortKey"
          :sort-dir="sortDir"
          @sort="toggleSort"
          @view="openView"
          @edit="openEdit"
          @delete="askDelete"
        />
        <PaginationBar
          :page="page"
          :page-size="pageSize"
          :total="filteredCourses.length"
          item-label="records"
          @update:page="page = $event"
          @update:page-size="pageSize = $event"
        />
      </div>

      <div v-else class="ch-card-body">
        <EmptyState
          v-if="store.totalCourses === 0"
          icon="bi-journal-bookmark"
          title="No courses or subjects yet"
          message="Add your first course or subject record to start building the catalog."
        >
          <button type="button" class="btn-ch btn-ch-primary" @click="openAdd">
            <i class="bi bi-plus-lg" aria-hidden="true"></i>
            Add course or subject
          </button>
        </EmptyState>

        <EmptyState
          v-else-if="filteredCourses.length === 0"
          icon="bi-search"
          title="No records match your filters"
          message="Try another search term or reset the department and status filters."
        >
          <button type="button" class="btn-ch btn-ch-soft" @click="resetFilters">
            <i class="bi bi-arrow-counterclockwise" aria-hidden="true"></i>
            Clear filters
          </button>
        </EmptyState>

        <EmptyState
          v-else
          icon="bi-arrow-left-right"
          title="No records on this page"
          message="Return to the first page to keep browsing the catalog."
        >
          <button type="button" class="btn-ch btn-ch-soft" @click="page = 1">
            <i class="bi bi-arrow-counterclockwise" aria-hidden="true"></i>
            Go to first page
          </button>
        </EmptyState>

        <PaginationBar
          v-if="filteredCourses.length > 0"
          :page="page"
          :page-size="pageSize"
          :total="filteredCourses.length"
          item-label="records"
          @update:page="page = $event"
          @update:page-size="pageSize = $event"
        />
      </div>
    </section>

    <CourseFormModal v-model="formOpen" :course="editingCourse" @saved="handleSaved" />
    <CourseDetailsModal
      v-model="detailsOpen"
      :course="viewingCourse"
      @edit="handleDetailsEdit"
    />

    <ConfirmDialog
      :model-value="Boolean(deleteTarget)"
      title="Delete course or subject?"
      confirm-label="Delete record"
      variant="danger"
      @update:model-value="closeDeleteDialog"
      @confirm="confirmDelete"
      @cancel="closeDeleteDialog(false)"
    >
      <p v-if="deleteTarget">
        You are about to permanently delete
        <strong>{{ deleteTarget.title }}</strong>
        ({{ deleteTarget.code }}) from this browser's catalog.
      </p>
    </ConfirmDialog>
  </div>
</template>

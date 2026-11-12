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
import StudentTable from '../components/students/StudentTable.vue'
import StudentFormModal from '../components/students/StudentFormModal.vue'
import StudentDetailsModal from '../components/students/StudentDetailsModal.vue'
import { useStudentsStore } from '../stores/students'
import { useToast } from '../composables/useToast'
import { STUDENT_DEPARTMENTS, STUDENT_STATUSES } from '../utils/students'

const store = useStudentsStore()
const { push: toast } = useToast()
const route = useRoute()
const router = useRouter()

const searchTerm = ref('')
const departmentFilter = ref('all')
const statusFilter = ref('all')
const sortKey = ref('fullName')
const sortDir = ref('asc')
const page = ref(1)
const pageSize = ref(10)

const formOpen = ref(false)
const detailsOpen = ref(false)
const editingStudent = ref(null)
const viewingStudent = ref(null)
const deleteTarget = ref(null)
const isDeleting = ref(false)

const departmentOptions = [
  { value: 'all', label: 'All departments' },
  ...STUDENT_DEPARTMENTS.map((department) => ({ value: department, label: department })),
]

const statusOptions = [
  { value: 'all', label: 'All statuses' },
  ...STUDENT_STATUSES.map((status) => ({ value: status, label: status })),
]

const hasFilters = computed(
  () =>
    searchTerm.value.trim() !== '' ||
    departmentFilter.value !== 'all' ||
    statusFilter.value !== 'all',
)

const filteredStudents = computed(() => {
  const term = searchTerm.value.trim().toLowerCase()
  const department = departmentFilter.value
  const status = statusFilter.value

  const matches = store.students.filter((student) => {
    const matchesSearch =
      !term ||
      [student.studentId, student.fullName, student.email, student.phone].some((value) =>
        String(value ?? '').toLowerCase().includes(term),
      )

    return (
      matchesSearch &&
      (department === 'all' || student.department === department) &&
      (status === 'all' || student.status === status)
    )
  })

  const direction = sortDir.value === 'asc' ? 1 : -1
  const key = sortKey.value

  return [...matches].sort((left, right) => {
    if (key === 'enrollmentDate') {
      const leftTime = new Date(`${left.enrollmentDate}T00:00:00`).getTime()
      const rightTime = new Date(`${right.enrollmentDate}T00:00:00`).getTime()
      return (leftTime - rightTime) * direction
    }

    return (
      String(left[key] ?? '').localeCompare(String(right[key] ?? ''), 'en', {
        sensitivity: 'base',
        numeric: true,
      }) * direction
    )
  })
})

const totalPages = computed(() => Math.max(1, Math.ceil(filteredStudents.value.length / pageSize.value)))

const pagedStudents = computed(() => {
  const start = (page.value - 1) * pageSize.value
  return filteredStudents.value.slice(start, start + pageSize.value)
})

const activeShare = computed(() =>
  store.totalStudents ? Math.round((store.activeStudents / store.totalStudents) * 100) : 0,
)

const summaryCards = computed(() => [
  {
    label: 'Total students',
    value: store.totalStudents.toLocaleString('en-US'),
    icon: 'bi-people',
    tone: 'indigo',
    note: 'All directory records',
  },
  {
    label: 'Active students',
    value: store.activeStudents.toLocaleString('en-US'),
    icon: 'bi-person-check',
    tone: 'green',
    note: `${activeShare.value}% of directory`,
  },
  {
    label: 'Inactive students',
    value: store.inactiveStudents.toLocaleString('en-US'),
    icon: 'bi-person-dash',
    tone: 'amber',
    note: 'Not currently enrolled',
  },
  {
    label: 'Departments',
    value: store.departmentCount.toString(),
    icon: 'bi-building',
    tone: 'blue',
    note: 'Represented in directory',
  },
])

const directorySubtitle = computed(() => {
  if (!store.totalStudents) return 'No student records yet'
  if (hasFilters.value) {
    return `${filteredStudents.value.length} of ${store.totalStudents} students match the current filters`
  }
  return `${store.totalStudents} students in the ${store.isApiMode ? 'server directory' : 'local directory'}`
})

const dataSourceBadge = computed(() =>
  store.isApiMode
    ? { icon: 'bi-cloud-check', label: 'Server API' }
    : { icon: 'bi-database', label: 'Local demo data' },
)

const apiErrorBanner = computed(() => {
  if (store.apiState !== 'error') return null

  return store.isApiMode
    ? 'The CampusHub API could not be reached. Showing previously loaded server data.'
    : 'The CampusHub API could not be reached. Showing the local demo directory from this browser.'
})

const storageWarning = computed(() => {
  if (store.storageState === 'unavailable') {
    return {
      variant: 'danger',
      icon: 'bi-exclamation-triangle',
      text: 'Browser storage is unavailable. Student changes will not survive a page refresh.',
    }
  }

  if (store.storageState === 'recovered') {
    return {
      variant: 'warning',
      icon: 'bi-shield-exclamation',
      text: 'Some saved student records were invalid or outdated. Valid records were kept and demo data was restored where needed.',
    }
  }

  return null
})

watch([searchTerm, departmentFilter, statusFilter, pageSize], () => {
  page.value = 1
})

watch(totalPages, (value) => {
  if (page.value > value) page.value = value
})

function resetFilters() {
  searchTerm.value = ''
  departmentFilter.value = 'all'
  statusFilter.value = 'all'
  sortKey.value = 'fullName'
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

function setPage(value) {
  page.value = value
}

function setPageSize(value) {
  pageSize.value = value
}

function openAdd() {
  editingStudent.value = null
  formOpen.value = true
}

function openEdit(student) {
  detailsOpen.value = false
  editingStudent.value = student
  formOpen.value = true
}

function openView(student) {
  viewingStudent.value = student
  detailsOpen.value = true
}

function askDelete(student) {
  deleteTarget.value = student
}

function closeDeleteDialog(open) {
  if (!open) deleteTarget.value = null
}

function retryLoad() {
  store.loadStudents()
}

async function confirmDelete() {
  if (!deleteTarget.value) return

  const target = deleteTarget.value
  isDeleting.value = true
  const result = await store.deleteStudent(target.uid)
  isDeleting.value = false

  if (!result.ok) {
    toast({
      variant: 'danger',
      title: 'Could not delete student',
      message: result.errors.form || 'The record could not be found.',
    })
    deleteTarget.value = null
    return
  }

  if (viewingStudent.value?.uid === target.uid) {
    viewingStudent.value = null
    detailsOpen.value = false
  }

  toast({
    variant: 'success',
    title: 'Student deleted',
    message: `${target.fullName} (${target.studentId}) was removed from the directory.`,
  })
  deleteTarget.value = null
}

function handleSaved({ mode, student }) {
  formOpen.value = false
  editingStudent.value = null

  if (mode === 'add') {
    page.value = 1
  }

  toast({
    variant: 'success',
    title: mode === 'edit' ? 'Student updated' : 'Student added',
    message: `${student.fullName} (${student.studentId}) was saved ${
      store.isApiMode ? 'to the CampusHub server.' : 'to local demo storage.'
    }`,
  })
}

function handleDetailsEdit(student) {
  detailsOpen.value = false
  editingStudent.value = student
  formOpen.value = true
}

function handleQueryAction() {
  if (route.query.action === 'add') {
    openAdd()
    router.replace({ name: 'students' })
  }
}

onMounted(() => {
  handleQueryAction()
  store.loadStudents()
})
watch(() => route.query.action, handleQueryAction)
</script>

<template>
  <div>
    <PageHeader
      title="Students"
      :description="`Manage the student directory, admissions, academic status, and contact records. All records on this page are fictional demo data ${
        store.isApiMode ? 'served by the CampusHub API and stored in MySQL.' : 'stored in your browser.'
      }`"
      eyebrow="Academic directory"
      eyebrow-icon="bi-people"
    >
      <template #actions>
        <span class="demo-flag">
          <i class="bi" :class="dataSourceBadge.icon" aria-hidden="true"></i>
          {{ dataSourceBadge.label }}
        </span>
        <button type="button" class="btn-ch btn-ch-primary" @click="openAdd">
          <i class="bi bi-person-plus" aria-hidden="true"></i>
          Add student
        </button>
      </template>
    </PageHeader>

    <div v-if="storageWarning" class="ch-alert" :class="`is-${storageWarning.variant}`" role="status">
      <i class="bi" :class="storageWarning.icon" aria-hidden="true"></i>
      <span>{{ storageWarning.text }}</span>
    </div>

    <div v-if="store.apiState === 'loading'" class="ch-alert is-info" role="status">
      <i class="bi bi-arrow-repeat" aria-hidden="true"></i>
      <span>Loading students from the CampusHub API…</span>
    </div>

    <div v-else-if="apiErrorBanner" class="ch-alert is-warning" role="alert">
      <i class="bi bi-cloud-slash" aria-hidden="true"></i>
      <span>{{ apiErrorBanner }}</span>
      <button type="button" class="btn-ch btn-ch-soft btn-ch-sm api-retry" @click="retryLoad">
        <i class="bi bi-arrow-clockwise" aria-hidden="true"></i>
        Retry
      </button>
    </div>

    <section class="row g-3 g-xl-4 mb-1" aria-label="Student summary statistics">
      <div v-for="card in summaryCards" :key="card.label" class="col-sm-6 col-xl-3">
        <StatCard v-bind="card" />
      </div>
    </section>

    <section class="ch-card mt-3 mt-xl-4">
      <div class="ch-card-header has-border">
        <div>
          <h2 class="ch-card-title">Student directory</h2>
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
          placeholder="Search by student ID, name, or email…"
        />
        <FilterSelect v-model="departmentFilter" label="Department" :options="departmentOptions" />
        <FilterSelect v-model="statusFilter" label="Status" :options="statusOptions" />
      </div>

      <div v-if="filteredStudents.length" class="ch-card-body is-flush">
        <StudentTable
          :students="pagedStudents"
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
          :total="filteredStudents.length"
          item-label="students"
          @update:page="setPage"
          @update:page-size="setPageSize"
        />
      </div>

      <div v-else class="ch-card-body">
        <EmptyState
          v-if="store.students.length === 0"
          icon="bi-person-plus"
          title="No students yet"
          message="Add your first student record to start building the demo directory."
        >
          <button type="button" class="btn-ch btn-ch-primary" @click="openAdd">
            <i class="bi bi-person-plus" aria-hidden="true"></i>
            Add student
          </button>
        </EmptyState>

        <EmptyState
          v-else
          icon="bi-search"
          title="No students match your filters"
          message="Try a different search term, choose another department, or reset all filters."
        >
          <button type="button" class="btn-ch btn-ch-soft" @click="resetFilters">
            <i class="bi bi-arrow-counterclockwise" aria-hidden="true"></i>
            Clear filters
          </button>
        </EmptyState>
      </div>
    </section>

    <StudentFormModal v-model="formOpen" :student="editingStudent" @saved="handleSaved" />
    <StudentDetailsModal
      v-model="detailsOpen"
      :student="viewingStudent"
      @edit="handleDetailsEdit"
    />

    <ConfirmDialog
      :model-value="Boolean(deleteTarget)"
      title="Delete student?"
      confirm-label="Delete student"
      variant="danger"
      :busy="isDeleting"
      @update:model-value="closeDeleteDialog"
      @confirm="confirmDelete"
      @cancel="closeDeleteDialog(false)"
    >
      <p v-if="deleteTarget">
        You are about to permanently delete
        <strong>{{ deleteTarget.fullName }}</strong>
        ({{ deleteTarget.studentId }}) from the local directory. This action cannot be undone.
      </p>
    </ConfirmDialog>
  </div>
</template>

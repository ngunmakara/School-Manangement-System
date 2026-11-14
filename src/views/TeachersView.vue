<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import PageHeader from '../components/common/PageHeader.vue'
import StatCard from '../components/common/StatCard.vue'
import SearchField from '../components/common/SearchField.vue'
import FilterSelect from '../components/common/FilterSelect.vue'
import EmptyState from '../components/common/EmptyState.vue'
import PaginationBar from '../components/common/PaginationBar.vue'
import ConfirmDialog from '../components/common/ConfirmDialog.vue'
import TeacherTable from '../components/teachers/TeacherTable.vue'
import TeacherFormModal from '../components/teachers/TeacherFormModal.vue'
import TeacherDetailsModal from '../components/teachers/TeacherDetailsModal.vue'
import { useTeachersStore } from '../stores/teachers'
import { useDepartmentsStore } from '../stores/departments'
import { useToast } from '../composables/useToast'
import { TEACHER_STATUSES } from '../utils/teachers'

const store = useTeachersStore()
const departmentsStore = useDepartmentsStore()
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
const editingTeacher = ref(null)
const viewingTeacher = ref(null)
const deleteTarget = ref(null)
const isDeleting = ref(false)

const departmentOptions = computed(() => {
  const names = new Set(departmentsStore.departmentOptions)
  store.teachers.forEach((teacher) => {
    if (teacher.department) names.add(teacher.department)
  })
  if (departmentFilter.value !== 'all') names.add(departmentFilter.value)

  return [
    { value: 'all', label: 'All departments' },
    ...[...names]
      .filter(Boolean)
      .sort((left, right) => left.localeCompare(right, 'en', { sensitivity: 'base' }))
      .map((department) => ({ value: department, label: department })),
  ]
})

const statusOptions = [
  { value: 'all', label: 'All statuses' },
  ...TEACHER_STATUSES.map((status) => ({ value: status, label: status })),
]

const hasFilters = computed(
  () =>
    searchTerm.value.trim() !== '' ||
    departmentFilter.value !== 'all' ||
    statusFilter.value !== 'all',
)

const hasPageControls = computed(
  () =>
    hasFilters.value ||
    sortKey.value !== 'fullName' ||
    sortDir.value !== 'asc',
)

const filteredTeachers = computed(() => {
  const term = searchTerm.value.trim().toLowerCase()
  const department = departmentFilter.value
  const status = statusFilter.value

  const matches = store.teachers.filter((teacher) => {
    const matchesSearch =
      !term ||
      [
        teacher.teacherId,
        teacher.fullName,
        teacher.email,
        teacher.phone,
        teacher.department,
        teacher.specialization,
      ].some((value) => String(value ?? '').toLowerCase().includes(term))

    return (
      matchesSearch &&
      (department === 'all' || teacher.department === department) &&
      (status === 'all' || teacher.status === status)
    )
  })

  const direction = sortDir.value === 'asc' ? 1 : -1
  const key = sortKey.value

  return [...matches].sort((left, right) => {
    if (key === 'hireDate' || key === 'createdAt') {
      const leftTime = new Date(left[key] || 0).getTime()
      const rightTime = new Date(right[key] || 0).getTime()
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

const totalPages = computed(() => store.pageCount)

const summaryCards = computed(() => [
  {
    label: 'Total teachers',
    value: store.totalTeachers.toLocaleString('en-US'),
    icon: 'bi-person-video3',
    tone: 'indigo',
    note: 'All faculty records',
  },
  {
    label: 'Active teachers',
    value: store.pageActiveTeachers.toLocaleString('en-US'),
    icon: 'bi-person-check',
    tone: 'green',
    note: 'On this page',
  },
  {
    label: 'Inactive teachers',
    value: store.pageInactiveTeachers.toLocaleString('en-US'),
    icon: 'bi-person-dash',
    tone: 'amber',
    note: 'On this page',
  },
  {
    label: 'Departments',
    value: store.pageDepartmentCount.toString(),
    icon: 'bi-building',
    tone: 'blue',
    note: 'On this page',
  },
])

const directorySubtitle = computed(() => {
  if (!store.totalTeachers) return 'No teacher records yet'
  if (hasFilters.value) {
    return `${filteredTeachers.value.length} of ${store.teachers.length} teachers on this page match the current filters`
  }
  return `${store.totalTeachers} teachers in the server directory`
})

const apiErrorBanner = computed(() => {
  if (store.apiState !== 'error') return null
  return store.loadError || 'The CampusHub API could not be reached. Showing previously loaded teacher data.'
})

let reloadTimer = null

function buildQuery(targetPage = page.value) {
  return {
    page: Math.max(0, targetPage - 1),
    size: pageSize.value,
  }
}

function scheduleReload(delay = 0) {
  if (reloadTimer) clearTimeout(reloadTimer)

  reloadTimer = setTimeout(() => {
    reloadTimer = null
    store.loadTeachers(buildQuery())
  }, delay)
}

watch([searchTerm, departmentFilter, statusFilter, sortKey, sortDir], () => {
  if (page.value !== 1) page.value = 1
})

watch([page, pageSize], () => {
  scheduleReload()
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

function openAdd() {
  editingTeacher.value = null
  formOpen.value = true
}

function openEdit(teacher) {
  detailsOpen.value = false
  editingTeacher.value = teacher
  formOpen.value = true
}

function openView(teacher) {
  viewingTeacher.value = teacher
  detailsOpen.value = true
}

function askDelete(teacher) {
  deleteTarget.value = teacher
}

function closeDeleteDialog(open) {
  if (!open) deleteTarget.value = null
}

async function confirmDelete() {
  if (!deleteTarget.value) return

  const target = deleteTarget.value
  isDeleting.value = true
  const result = await store.deleteTeacher(target.uid)
  isDeleting.value = false

  if (!result.ok) {
    toast({
      variant: 'danger',
      title: 'Could not delete teacher',
      message: result.errors.form || 'The teacher record could not be deleted.',
    })
    deleteTarget.value = null
    return
  }

  if (viewingTeacher.value?.uid === target.uid) {
    viewingTeacher.value = null
    detailsOpen.value = false
  }

  scheduleReload()

  toast({
    variant: 'success',
    title: 'Teacher deleted',
    message: `${target.fullName} (${target.teacherId}) was removed from the directory.`,
  })
  deleteTarget.value = null
}

function handleSaved({ mode, teacher }) {
  formOpen.value = false
  editingTeacher.value = null

  if (mode === 'add') page.value = 1

  scheduleReload()

  toast({
    variant: 'success',
    title: mode === 'edit' ? 'Teacher updated' : 'Teacher added',
    message: `${teacher.fullName} (${teacher.teacherId}) was saved to the CampusHub server.`,
  })
}

function handleDetailsEdit(teacher) {
  detailsOpen.value = false
  editingTeacher.value = teacher
  formOpen.value = true
}

function handleQueryAction() {
  if (route.query.action === 'add') {
    openAdd()
    router.replace({ name: 'teachers' })
  }
}

function retryLoad() {
  if (reloadTimer) {
    clearTimeout(reloadTimer)
    reloadTimer = null
  }

  store.loadTeachers(buildQuery())
  if (departmentsStore.optionsState === 'error') {
    departmentsStore.loadDepartmentOptions(true)
  }
}

onMounted(() => {
  handleQueryAction()
  store.loadTeachers(buildQuery())
  departmentsStore.loadDepartmentOptions()
})

onBeforeUnmount(() => {
  if (reloadTimer) clearTimeout(reloadTimer)
})

watch(() => route.query.action, handleQueryAction)
</script>

<template>
  <div>
    <PageHeader
      title="Teachers"
      :description="`Manage faculty profiles, departments, specializations, and employment status. All records on this page are fictional demo data served by the CampusHub API and stored in MySQL.`"
      eyebrow="Faculty directory"
      eyebrow-icon="bi-person-video3"
    >
      <template #actions>
        <span class="demo-flag">
          <i class="bi bi-cloud-check" aria-hidden="true"></i>
          Server API
        </span>
        <button type="button" class="btn-ch btn-ch-primary" @click="openAdd">
          <i class="bi bi-person-plus" aria-hidden="true"></i>
          Add teacher
        </button>
      </template>
    </PageHeader>

    <div v-if="store.apiState === 'loading'" class="ch-alert is-info" role="status">
      <i class="bi bi-arrow-repeat" aria-hidden="true"></i>
      <span>Loading teachers from the CampusHub API…</span>
    </div>

    <div v-else-if="apiErrorBanner" class="ch-alert is-warning" role="alert">
      <i class="bi bi-cloud-slash" aria-hidden="true"></i>
      <span>{{ apiErrorBanner }}</span>
      <button type="button" class="btn-ch btn-ch-soft btn-ch-sm api-retry" @click="retryLoad">
        <i class="bi bi-arrow-clockwise" aria-hidden="true"></i>
        Retry
      </button>
    </div>

    <section class="row g-3 g-xl-4 mb-1" aria-label="Teacher summary statistics">
      <div v-for="card in summaryCards" :key="card.label" class="col-sm-6 col-xl-3">
        <StatCard v-bind="card" />
      </div>
    </section>

    <section class="ch-card mt-3 mt-xl-4">
      <div class="ch-card-header has-border">
        <div>
          <h2 class="ch-card-title">Faculty directory</h2>
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
          placeholder="Search by teacher ID, name, email, or specialization…"
        />
        <FilterSelect v-model="departmentFilter" label="Department" :options="departmentOptions" />
        <FilterSelect v-model="statusFilter" label="Status" :options="statusOptions" />
      </div>

      <div v-if="hasPageControls" class="ch-alert is-info" role="status">
        <i class="bi bi-info-circle" aria-hidden="true"></i>
        <span>Search, filters, and sorting apply only to the current page. Use pagination to browse the full directory.</span>
      </div>

      <div v-if="filteredTeachers.length" class="ch-card-body is-flush">
        <TeacherTable
          :teachers="filteredTeachers"
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
          :total="store.totalTeachers"
          item-label="teachers"
          @update:page="page = $event"
          @update:page-size="pageSize = $event"
        />
      </div>

      <div v-else class="ch-card-body">
        <EmptyState
          v-if="store.totalTeachers === 0"
          icon="bi-person-plus"
          title="No teachers yet"
          message="Add your first teacher record to start building the faculty directory."
        >
          <button type="button" class="btn-ch btn-ch-primary" @click="openAdd">
            <i class="bi bi-person-plus" aria-hidden="true"></i>
            Add teacher
          </button>
        </EmptyState>

        <EmptyState
          v-else-if="store.teachers.length === 0"
          icon="bi-arrow-left-right"
          title="No teachers on this page"
          message="This page has no records. Return to the first page to keep browsing the directory."
        >
          <button type="button" class="btn-ch btn-ch-soft" @click="page = 1">
            <i class="bi bi-arrow-counterclockwise" aria-hidden="true"></i>
            Go to first page
          </button>
        </EmptyState>

        <EmptyState
          v-else
          icon="bi-search"
          title="No teachers match your filters"
          message="Search and filters only apply to this page. Try another term, clear the filters, or browse other pages."
        >
          <button type="button" class="btn-ch btn-ch-soft" @click="resetFilters">
            <i class="bi bi-arrow-counterclockwise" aria-hidden="true"></i>
            Clear filters
          </button>
        </EmptyState>

        <PaginationBar
          v-if="store.totalTeachers > 0"
          :page="page"
          :page-size="pageSize"
          :total="store.totalTeachers"
          item-label="teachers"
          @update:page="page = $event"
          @update:page-size="pageSize = $event"
        />
      </div>
    </section>

    <TeacherFormModal v-model="formOpen" :teacher="editingTeacher" @saved="handleSaved" />
    <TeacherDetailsModal
      v-model="detailsOpen"
      :teacher="viewingTeacher"
      @edit="handleDetailsEdit"
    />

    <ConfirmDialog
      :model-value="Boolean(deleteTarget)"
      title="Delete teacher?"
      confirm-label="Delete teacher"
      variant="danger"
      :busy="isDeleting"
      @update:model-value="closeDeleteDialog"
      @confirm="confirmDelete"
      @cancel="closeDeleteDialog(false)"
    >
      <p v-if="deleteTarget">
        You are about to permanently delete
        <strong>{{ deleteTarget.fullName }}</strong>
        ({{ deleteTarget.teacherId }}) from the faculty directory. This action cannot be undone.
      </p>
    </ConfirmDialog>
  </div>
</template>

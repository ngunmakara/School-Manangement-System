<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import PageHeader from '../components/common/PageHeader.vue'
import StatCard from '../components/common/StatCard.vue'
import SearchField from '../components/common/SearchField.vue'
import EmptyState from '../components/common/EmptyState.vue'
import PaginationBar from '../components/common/PaginationBar.vue'
import ConfirmDialog from '../components/common/ConfirmDialog.vue'
import DepartmentTable from '../components/departments/DepartmentTable.vue'
import DepartmentFormModal from '../components/departments/DepartmentFormModal.vue'
import DepartmentDetailsModal from '../components/departments/DepartmentDetailsModal.vue'
import { useDepartmentsStore } from '../stores/departments'
import { useToast } from '../composables/useToast'

const store = useDepartmentsStore()
const { push: toast } = useToast()
const route = useRoute()
const router = useRouter()

const searchTerm = ref('')
const sortKey = ref('name')
const sortDir = ref('asc')
const page = ref(1)
const pageSize = ref(10)

const formOpen = ref(false)
const detailsOpen = ref(false)
const editingDepartment = ref(null)
const viewingDepartment = ref(null)
const deleteTarget = ref(null)
const isDeleting = ref(false)

const hasFilters = computed(() => searchTerm.value.trim() !== '')

const hasPageControls = computed(
  () => hasFilters.value || sortKey.value !== 'name' || sortDir.value !== 'asc',
)

const filteredDepartments = computed(() => {
  const term = searchTerm.value.trim().toLowerCase()

  const matches = store.departments.filter((department) => {
    if (!term) return true

    return [
      department.name,
      department.code,
      department.headOfDepartment,
      department.description,
    ].some((value) => String(value ?? '').toLowerCase().includes(term))
  })

  const direction = sortDir.value === 'asc' ? 1 : -1
  const key = sortKey.value

  return [...matches].sort((left, right) => {
    if (key === 'createdAt' || key === 'updatedAt') {
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

const pageWithHead = computed(
  () => store.departments.filter((department) => department.headOfDepartment).length,
)

const pageWithDescription = computed(
  () => store.departments.filter((department) => department.description).length,
)

const summaryCards = computed(() => [
  {
    label: 'Total departments',
    value: store.totalDepartments.toLocaleString('en-US'),
    icon: 'bi-building',
    tone: 'indigo',
    note: 'All academic departments',
  },
  {
    label: 'Heads assigned',
    value: pageWithHead.value.toLocaleString('en-US'),
    icon: 'bi-person-badge',
    tone: 'green',
    note: 'On this page',
  },
  {
    label: 'With description',
    value: pageWithDescription.value.toLocaleString('en-US'),
    icon: 'bi-text-paragraph',
    tone: 'blue',
    note: 'On this page',
  },
])

const directorySubtitle = computed(() => {
  if (!store.totalDepartments) return 'No departments yet'
  if (hasFilters.value) {
    return `${filteredDepartments.value.length} of ${store.departments.length} departments on this page match your search`
  }
  return `${store.totalDepartments} departments in the server directory`
})

const apiErrorBanner = computed(() => {
  if (store.apiState !== 'error') return null
  return (
    store.loadError ||
    'The CampusHub API could not be reached. Showing previously loaded department data.'
  )
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
    store.loadDepartments(buildQuery())
  }, delay)
}

watch([searchTerm, sortKey, sortDir], () => {
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
  sortKey.value = 'name'
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
  editingDepartment.value = null
  formOpen.value = true
}

function openEdit(department) {
  detailsOpen.value = false
  editingDepartment.value = department
  formOpen.value = true
}

function openView(department) {
  viewingDepartment.value = department
  detailsOpen.value = true
}

function askDelete(department) {
  deleteTarget.value = department
}

function closeDeleteDialog(open) {
  if (!open) deleteTarget.value = null
}

async function confirmDelete() {
  if (!deleteTarget.value) return

  const target = deleteTarget.value
  isDeleting.value = true
  const result = await store.deleteDepartment(target.uid)
  isDeleting.value = false

  if (!result.ok) {
    toast({
      variant: 'danger',
      title: 'Could not delete department',
      message:
        result.errors.form ||
        'The department could not be deleted. It may still be assigned to students or teachers.',
    })
    deleteTarget.value = null
    return
  }

  if (viewingDepartment.value?.uid === target.uid) {
    viewingDepartment.value = null
    detailsOpen.value = false
  }

  scheduleReload()

  toast({
    variant: 'success',
    title: 'Department deleted',
    message: `${target.name} (${target.code}) was removed from the directory.`,
  })
  deleteTarget.value = null
}

function handleSaved({ mode, department }) {
  formOpen.value = false
  editingDepartment.value = null

  if (mode === 'add') page.value = 1

  scheduleReload()

  toast({
    variant: 'success',
    title: mode === 'edit' ? 'Department updated' : 'Department added',
    message: `${department.name} (${department.code}) was saved to the CampusHub server.`,
  })
}

function handleDetailsEdit(department) {
  detailsOpen.value = false
  editingDepartment.value = department
  formOpen.value = true
}

function handleQueryAction() {
  if (route.query.action === 'add') {
    openAdd()
    router.replace({ name: 'departments' })
  }
}

function retryLoad() {
  if (reloadTimer) {
    clearTimeout(reloadTimer)
    reloadTimer = null
  }

  store.loadDepartments(buildQuery())
}

onMounted(() => {
  handleQueryAction()
  store.loadDepartments(buildQuery())
})

onBeforeUnmount(() => {
  if (reloadTimer) clearTimeout(reloadTimer)
})

watch(() => route.query.action, handleQueryAction)
</script>

<template>
  <div>
    <PageHeader
      title="Departments"
      :description="`Manage academic departments, department codes, and faculty leadership. Departments are stored in MySQL and are protected from deletion while assigned to students or teachers.`"
      eyebrow="Academic structure"
      eyebrow-icon="bi-building"
    >
      <template #actions>
        <span class="demo-flag">
          <i class="bi bi-cloud-check" aria-hidden="true"></i>
          Server API
        </span>
        <button type="button" class="btn-ch btn-ch-primary" @click="openAdd">
          <i class="bi bi-plus-lg" aria-hidden="true"></i>
          Add department
        </button>
      </template>
    </PageHeader>

    <div v-if="store.apiState === 'loading'" class="ch-alert is-info" role="status">
      <i class="bi bi-arrow-repeat" aria-hidden="true"></i>
      <span>Loading departments from the CampusHub API…</span>
    </div>

    <div v-else-if="apiErrorBanner" class="ch-alert is-warning" role="alert">
      <i class="bi bi-cloud-slash" aria-hidden="true"></i>
      <span>{{ apiErrorBanner }}</span>
      <button type="button" class="btn-ch btn-ch-soft btn-ch-sm api-retry" @click="retryLoad">
        <i class="bi bi-arrow-clockwise" aria-hidden="true"></i>
        Retry
      </button>
    </div>

    <section class="row g-3 g-xl-4 mb-1" aria-label="Department summary statistics">
      <div v-for="card in summaryCards" :key="card.label" class="col-sm-6 col-xl-4">
        <StatCard v-bind="card" />
      </div>
    </section>

    <section class="ch-card mt-3 mt-xl-4">
      <div class="ch-card-header has-border">
        <div>
          <h2 class="ch-card-title">Department directory</h2>
          <p class="ch-card-subtitle">{{ directorySubtitle }}</p>
        </div>
        <button
          v-if="hasFilters"
          type="button"
          class="btn-ch btn-ch-ghost btn-ch-sm"
          @click="resetFilters"
        >
          <i class="bi bi-arrow-counterclockwise" aria-hidden="true"></i>
          Reset search
        </button>
      </div>

      <div class="data-toolbar is-single">
        <SearchField
          v-model="searchTerm"
          class="toolbar-search"
          label="Search"
          placeholder="Search by name, code, head, or description…"
        />
      </div>

      <div v-if="hasPageControls" class="ch-alert is-info" role="status">
        <i class="bi bi-info-circle" aria-hidden="true"></i>
        <span>Search and sorting apply only to the current page. Use pagination to browse the full directory.</span>
      </div>

      <div v-if="filteredDepartments.length" class="ch-card-body is-flush">
        <DepartmentTable
          :departments="filteredDepartments"
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
          :total="store.totalDepartments"
          item-label="departments"
          @update:page="page = $event"
          @update:page-size="pageSize = $event"
        />
      </div>

      <div v-else class="ch-card-body">
        <EmptyState
          v-if="store.totalDepartments === 0"
          icon="bi-building"
          title="No departments yet"
          message="Add your first department to start organizing students and teachers."
        >
          <button type="button" class="btn-ch btn-ch-primary" @click="openAdd">
            <i class="bi bi-plus-lg" aria-hidden="true"></i>
            Add department
          </button>
        </EmptyState>

        <EmptyState
          v-else-if="store.departments.length === 0"
          icon="bi-arrow-left-right"
          title="No departments on this page"
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
          title="No departments match your search"
          message="Search only applies to this page. Try another term, clear the search, or browse other pages."
        >
          <button type="button" class="btn-ch btn-ch-soft" @click="resetFilters">
            <i class="bi bi-arrow-counterclockwise" aria-hidden="true"></i>
            Clear search
          </button>
        </EmptyState>

        <PaginationBar
          v-if="store.totalDepartments > 0"
          :page="page"
          :page-size="pageSize"
          :total="store.totalDepartments"
          item-label="departments"
          @update:page="page = $event"
          @update:page-size="pageSize = $event"
        />
      </div>
    </section>

    <DepartmentFormModal
      v-model="formOpen"
      :department="editingDepartment"
      @saved="handleSaved"
    />
    <DepartmentDetailsModal
      v-model="detailsOpen"
      :department="viewingDepartment"
      @edit="handleDetailsEdit"
    />

    <ConfirmDialog
      :model-value="Boolean(deleteTarget)"
      title="Delete department?"
      confirm-label="Delete department"
      variant="danger"
      :busy="isDeleting"
      @update:model-value="closeDeleteDialog"
      @confirm="confirmDelete"
      @cancel="closeDeleteDialog(false)"
    >
      <p v-if="deleteTarget">
        You are about to permanently delete
        <strong>{{ deleteTarget.name }}</strong>
        ({{ deleteTarget.code }}). Departments assigned to students or teachers cannot be deleted.
      </p>
    </ConfirmDialog>
  </div>
</template>

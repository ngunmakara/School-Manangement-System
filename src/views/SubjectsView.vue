<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import PageHeader from '../components/common/PageHeader.vue'
import StatCard from '../components/common/StatCard.vue'
import SearchField from '../components/common/SearchField.vue'
import FilterSelect from '../components/common/FilterSelect.vue'
import EmptyState from '../components/common/EmptyState.vue'
import PaginationBar from '../components/common/PaginationBar.vue'
import ConfirmDialog from '../components/common/ConfirmDialog.vue'
import SubjectTable from '../components/subjects/SubjectTable.vue'
import SubjectFormModal from '../components/subjects/SubjectFormModal.vue'
import SubjectDetailsModal from '../components/subjects/SubjectDetailsModal.vue'
import { useSubjectsStore } from '../stores/subjects'
import { useDepartmentsStore } from '../stores/departments'
import { useToast } from '../composables/useToast'
import { STUDENT_DEPARTMENTS } from '../utils/students'
import { SUBJECT_STATUSES } from '../utils/subjects'

const store = useSubjectsStore()
const departmentsStore = useDepartmentsStore()
const { push: toast } = useToast()
const route = useRoute()
const router = useRouter()

const searchTerm = ref('')
const departmentFilter = ref('')
const statusFilter = ref('')
const sortKey = ref('name')
const sortDir = ref('asc')
const page = ref(1)
const pageSize = ref(10)

const formOpen = ref(false)
const detailsOpen = ref(false)
const editingSubject = ref(null)
const viewingSubject = ref(null)
const deleteTarget = ref(null)

const hasFilters = computed(
  () =>
    searchTerm.value.trim() !== '' ||
    departmentFilter.value !== '' ||
    statusFilter.value !== '',
)

const departmentFilterOptions = computed(() => {
  const values = new Set([...STUDENT_DEPARTMENTS, ...departmentsStore.departmentOptions])
  store.subjects.forEach((subject) => {
    if (subject.department) values.add(subject.department)
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
  ...SUBJECT_STATUSES.map((status) => ({ value: status, label: status })),
])

const filteredSubjects = computed(() => {
  const term = searchTerm.value.trim().toLowerCase()

  const matches = store.subjects.filter((subject) => {
    if (departmentFilter.value && subject.department !== departmentFilter.value) return false
    if (statusFilter.value && subject.status !== statusFilter.value) return false
    if (!term) return true

    return [subject.code, subject.name, subject.department, subject.description].some((value) =>
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
  Math.max(1, Math.ceil(filteredSubjects.value.length / pageSize.value)),
)

const pagedSubjects = computed(() => {
  const start = (page.value - 1) * pageSize.value
  return filteredSubjects.value.slice(start, start + pageSize.value)
})

const summaryCards = computed(() => [
  {
    label: 'Total subjects',
    value: store.totalSubjects.toLocaleString('en-US'),
    icon: 'bi-book',
    tone: 'indigo',
    note: 'Subjects in this browser',
  },
  {
    label: 'Active',
    value: store.activeSubjects.toLocaleString('en-US'),
    icon: 'bi-check2-circle',
    tone: 'green',
    note: 'Available in the catalog',
  },
  {
    label: 'Inactive',
    value: store.inactiveSubjects.toLocaleString('en-US'),
    icon: 'bi-pause-circle',
    tone: 'amber',
    note: 'Hidden or retired subjects',
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
  if (!store.totalSubjects) return 'No subjects yet'
  if (hasFilters.value) {
    return `${filteredSubjects.value.length} of ${store.totalSubjects} subjects match your filters`
  }
  return `${store.totalSubjects} subjects in the browser catalog`
})

const storageAlerts = computed(() => {
  const alerts = []

  if (store.storageState === 'unavailable' || store.persistenceState === 'unavailable') {
    alerts.push({
      variant: 'danger',
      icon: 'bi-hdd-stack',
      text: 'Browser storage is unavailable. Subject changes will last for this session only.',
    })
  } else if (store.persistenceState === 'failed') {
    alerts.push({
      variant: 'danger',
      icon: 'bi-exclamation-triangle',
      text: 'Browser storage is not accepting subject saves. Recent changes will be lost when you refresh.',
    })
  }

  const recovery = store.recovery
  if (!recovery) return alerts

  if (recovery.kind === 'invalid-json' || recovery.kind === 'invalid-format') {
    alerts.push({
      variant: 'warning',
      icon: 'bi-shield-exclamation',
      text: 'Saved subject data could not be read, so the catalog started empty. New changes can still be saved.',
    })
    return alerts
  }

  const changes = []
  if (recovery.discarded > 0) {
    changes.push(
      `${recovery.discarded} invalid or duplicate ${
        recovery.discarded === 1 ? 'record was' : 'records were'
      } removed`,
    )
  }
  if (recovery.corrected > 0) {
    changes.push(
      `${recovery.corrected} ${
        recovery.corrected === 1 ? 'record was' : 'records were'
      } repaired`,
    )
  }

  if (changes.length) {
    alerts.push({
      variant: 'warning',
      icon: 'bi-shield-exclamation',
      text: `Some saved subject records needed attention: ${changes.join('; ')}. Recoverable records were kept.`,
    })
  }

  return alerts
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
  editingSubject.value = null
  formOpen.value = true
}

function openEdit(subject) {
  detailsOpen.value = false
  editingSubject.value = subject
  formOpen.value = true
}

function openView(subject) {
  viewingSubject.value = subject
  detailsOpen.value = true
}

function askDelete(subject) {
  deleteTarget.value = subject
}

function closeDeleteDialog(open) {
  if (!open) deleteTarget.value = null
}

function confirmDelete() {
  if (!deleteTarget.value) return

  const target = deleteTarget.value
  const result = store.deleteSubject(target.uid)

  if (!result.ok) {
    toast({
      variant: 'danger',
      title: 'Could not delete subject',
      message: result.errors.form || 'The subject could not be deleted.',
    })
    deleteTarget.value = null
    return
  }

  if (viewingSubject.value?.uid === target.uid) {
    viewingSubject.value = null
    detailsOpen.value = false
  }

  const persisted = result.persisted !== false

  toast({
    variant: persisted ? 'success' : 'warning',
    title: persisted ? 'Subject deleted' : 'Subject removed for this session',
    message: persisted
      ? `${target.name} (${target.code}) was removed from the browser catalog.`
      : 'Browser storage could not save this deletion. The subject will return if you refresh.',
  })
  deleteTarget.value = null
}

function handleSaved({ mode, subject, persisted }) {
  formOpen.value = false
  editingSubject.value = null

  if (mode === 'add') page.value = 1

  const saved = persisted !== false
  const action = mode === 'edit' ? 'updated' : 'added'

  toast({
    variant: saved ? 'success' : 'warning',
    title: saved
      ? mode === 'edit'
        ? 'Subject updated'
        : 'Subject added'
      : `Subject ${action} for this session`,
    message: saved
      ? `${subject.name} (${subject.code}) was saved to browser storage.`
      : 'Browser storage could not save this change. It will be lost when you refresh.',
  })
}

async function handleDetailsEdit(subject) {
  detailsOpen.value = false
  await nextTick()
  editingSubject.value = subject
  formOpen.value = true
}

function handleQueryAction() {
  if (route.query.action === 'add') {
    openAdd()
    router.replace({ name: 'subjects' })
  }
}

onMounted(() => {
  store.loadSubjects()
  departmentsStore.loadDepartmentOptions()
  handleQueryAction()
})

watch(() => route.query.action, handleQueryAction)
</script>

<template>
  <div>
    <PageHeader
      title="Subjects"
      description="Maintain subject codes, names, departments, credit values, and publication status. This milestone stores records in the browser and does not call a subject API."
      eyebrow="Academic catalog"
      eyebrow-icon="bi-book"
    >
      <template #actions>
        <span class="demo-flag">
          <i class="bi bi-hdd" aria-hidden="true"></i>
          Browser storage
        </span>
        <button type="button" class="btn-ch btn-ch-primary" @click="openAdd">
          <i class="bi bi-plus-lg" aria-hidden="true"></i>
          Add subject
        </button>
      </template>
    </PageHeader>

    <div v-if="store.loadState === 'loading'" class="ch-alert is-info" role="status">
      <i class="bi bi-arrow-repeat" aria-hidden="true"></i>
      <span>Loading subject records from browser storage…</span>
    </div>

    <div v-if="store.loadState === 'error'" class="ch-alert is-warning" role="alert">
      <i class="bi bi-exclamation-triangle" aria-hidden="true"></i>
      <span>{{ store.loadError }}</span>
      <button
        type="button"
        class="btn-ch btn-ch-soft btn-ch-sm api-retry"
        @click="store.loadSubjects()"
      >
        <i class="bi bi-arrow-clockwise" aria-hidden="true"></i>
        Retry
      </button>
    </div>

    <div
      v-for="alert in storageAlerts"
      :key="alert.text"
      class="ch-alert"
      :class="`is-${alert.variant}`"
      role="alert"
    >
      <i class="bi" :class="alert.icon" aria-hidden="true"></i>
      <span>{{ alert.text }}</span>
    </div>

    <section class="row g-3 g-xl-4 mb-1" aria-label="Subject summary statistics">
      <div v-for="card in summaryCards" :key="card.label" class="col-sm-6 col-xl-3">
        <StatCard v-bind="card" />
      </div>
    </section>

    <section class="ch-card mt-3 mt-xl-4">
      <div class="ch-card-header has-border">
        <div>
          <h2 class="ch-card-title">Subject catalog</h2>
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
          placeholder="Search by code, name, department, or description…"
        />
        <FilterSelect
          v-model="departmentFilter"
          label="Department"
          :options="departmentFilterOptions"
        />
        <FilterSelect v-model="statusFilter" label="Status" :options="statusFilterOptions" />
      </div>

      <div v-if="pagedSubjects.length" class="ch-card-body is-flush">
        <SubjectTable
          :subjects="pagedSubjects"
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
          :total="filteredSubjects.length"
          item-label="subjects"
          @update:page="page = $event"
          @update:page-size="pageSize = $event"
        />
      </div>

      <div v-else class="ch-card-body">
        <EmptyState
          v-if="store.loadState === 'error'"
          icon="bi-exclamation-triangle"
          title="Subject records unavailable"
          message="Browser storage could not be read. Try loading the subject catalog again."
        >
          <button type="button" class="btn-ch btn-ch-primary" @click="store.loadSubjects()">
            <i class="bi bi-arrow-clockwise" aria-hidden="true"></i>
            Retry
          </button>
        </EmptyState>

        <EmptyState
          v-else-if="store.totalSubjects === 0"
          icon="bi-book"
          title="No subjects yet"
          message="Add your first subject record to start building the catalog."
        >
          <button type="button" class="btn-ch btn-ch-primary" @click="openAdd">
            <i class="bi bi-plus-lg" aria-hidden="true"></i>
            Add subject
          </button>
        </EmptyState>

        <EmptyState
          v-else-if="filteredSubjects.length === 0"
          icon="bi-search"
          title="No subjects match your filters"
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
          title="No subjects on this page"
          message="Return to the first page to keep browsing the catalog."
        >
          <button type="button" class="btn-ch btn-ch-soft" @click="page = 1">
            <i class="bi bi-arrow-counterclockwise" aria-hidden="true"></i>
            Go to first page
          </button>
        </EmptyState>

        <PaginationBar
          v-if="filteredSubjects.length > 0"
          :page="page"
          :page-size="pageSize"
          :total="filteredSubjects.length"
          item-label="subjects"
          @update:page="page = $event"
          @update:page-size="pageSize = $event"
        />
      </div>
    </section>

    <SubjectFormModal v-model="formOpen" :subject="editingSubject" @saved="handleSaved" />
    <SubjectDetailsModal
      v-model="detailsOpen"
      :subject="viewingSubject"
      @edit="handleDetailsEdit"
    />

    <ConfirmDialog
      :model-value="Boolean(deleteTarget)"
      title="Delete subject?"
      confirm-label="Delete subject"
      variant="danger"
      @update:model-value="closeDeleteDialog"
      @confirm="confirmDelete"
      @cancel="closeDeleteDialog(false)"
    >
      <p v-if="deleteTarget">
        You are about to permanently delete
        <strong>{{ deleteTarget.name }}</strong>
        ({{ deleteTarget.code }}) from this browser's catalog.
      </p>
    </ConfirmDialog>
  </div>
</template>

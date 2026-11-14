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
import SemesterTable from '../components/semesters/SemesterTable.vue'
import SemesterFormModal from '../components/semesters/SemesterFormModal.vue'
import SemesterDetailsModal from '../components/semesters/SemesterDetailsModal.vue'
import { useSemestersStore } from '../stores/semesters'
import { useToast } from '../composables/useToast'
import { SEMESTER_STATUSES } from '../utils/semesters'
import { formatStudentDate } from '../utils/students'

const store = useSemestersStore()
const { push: toast } = useToast()
const route = useRoute()
const router = useRouter()

const searchTerm = ref('')
const academicYearFilter = ref('')
const statusFilter = ref('')
const sortKey = ref('startDate')
const sortDir = ref('desc')
const page = ref(1)
const pageSize = ref(10)

const formOpen = ref(false)
const detailsOpen = ref(false)
const editingSemester = ref(null)
const viewingSemester = ref(null)
const deleteTarget = ref(null)

const hasFilters = computed(
  () =>
    searchTerm.value.trim() !== '' ||
    academicYearFilter.value !== '' ||
    statusFilter.value !== '',
)

const academicYearFilterOptions = computed(() => {
  const values = new Set(
    store.semesters.map((semester) => semester.academicYear).filter(Boolean),
  )

  return [
    { value: '', label: 'All academic years' },
    ...[...values]
      .sort((left, right) =>
        right.localeCompare(left, 'en', { sensitivity: 'base', numeric: true }),
      )
      .map((academicYear) => ({ value: academicYear, label: academicYear })),
  ]
})

const statusFilterOptions = computed(() => [
  { value: '', label: 'All statuses' },
  ...SEMESTER_STATUSES.map((status) => ({ value: status, label: status })),
])

const filteredSemesters = computed(() => {
  const term = searchTerm.value.trim().toLowerCase()

  const matches = store.semesters.filter((semester) => {
    if (
      academicYearFilter.value &&
      semester.academicYear !== academicYearFilter.value
    ) {
      return false
    }
    if (statusFilter.value && semester.status !== statusFilter.value) return false
    if (!term) return true

    return [
      semester.name,
      semester.academicYear,
      semester.startDate,
      semester.endDate,
      semester.status,
      semester.description,
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

    if (key === 'startDate' || key === 'endDate') {
      return String(left[key] ?? '').localeCompare(String(right[key] ?? '')) * direction
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
  Math.max(1, Math.ceil(filteredSemesters.value.length / pageSize.value)),
)

const pagedSemesters = computed(() => {
  const start = (page.value - 1) * pageSize.value
  return filteredSemesters.value.slice(start, start + pageSize.value)
})

const summaryCards = computed(() => [
  {
    label: 'Total semesters',
    value: store.totalSemesters.toLocaleString('en-US'),
    icon: 'bi-calendar3',
    tone: 'indigo',
    note: 'Terms in this browser',
  },
  {
    label: 'Active',
    value: store.activeSemesters.toLocaleString('en-US'),
    icon: 'bi-check2-circle',
    tone: 'green',
    note:
      store.activeSemesters === 1
        ? 'Current academic term'
        : store.activeSemesters === 0
          ? 'No active term marked'
          : 'Terms marked active',
  },
  {
    label: 'Upcoming',
    value: store.upcomingSemesters.toLocaleString('en-US'),
    icon: 'bi-hourglass-split',
    tone: 'blue',
    note: 'Terms scheduled to begin',
  },
  {
    label: 'Completed',
    value: store.completedSemesters.toLocaleString('en-US'),
    icon: 'bi-calendar-check',
    tone: 'amber',
    note: 'Terms marked complete',
  },
])

const activeTerms = computed(() =>
  [...store.semesters]
    .filter((semester) => semester.status === 'Active')
    .sort((left, right) =>
      String(right.startDate ?? '').localeCompare(String(left.startDate ?? '')),
    ),
)

const activeTerm = computed(() => activeTerms.value[0] || null)

const directorySubtitle = computed(() => {
  if (!store.totalSemesters) return 'No semesters yet'
  if (hasFilters.value) {
    return `${filteredSemesters.value.length} of ${store.totalSemesters} semesters match your filters`
  }
  return `${store.totalSemesters} semesters in the browser calendar`
})

const storageAlerts = computed(() => {
  const alerts = []

  if (store.storageState === 'unavailable' || store.persistenceState === 'unavailable') {
    alerts.push({
      variant: 'danger',
      icon: 'bi-hdd-stack',
      text: 'Browser storage is unavailable. Semester changes will last for this session only.',
    })
  } else if (store.persistenceState === 'failed') {
    alerts.push({
      variant: 'danger',
      icon: 'bi-exclamation-triangle',
      text: 'Browser storage is not accepting semester saves. Recent changes will be lost when you refresh.',
    })
  }

  const recovery = store.recovery
  if (!recovery) return alerts

  if (recovery.kind === 'invalid-json' || recovery.kind === 'invalid-format') {
    alerts.push({
      variant: 'warning',
      icon: 'bi-shield-exclamation',
      text: 'Saved semester data could not be read, so the calendar started empty. New changes can still be saved.',
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
      text: `Some saved semester records needed attention: ${changes.join('; ')}. Recoverable records were kept.`,
    })
  }

  return alerts
})

watch([searchTerm, academicYearFilter, statusFilter, sortKey, sortDir], () => {
  page.value = 1
})

watch(totalPages, (value) => {
  if (page.value > value) page.value = value
})

function resetFilters() {
  searchTerm.value = ''
  academicYearFilter.value = ''
  statusFilter.value = ''
  sortKey.value = 'startDate'
  sortDir.value = 'desc'
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
  editingSemester.value = null
  formOpen.value = true
}

function openEdit(semester) {
  detailsOpen.value = false
  editingSemester.value = semester
  formOpen.value = true
}

function openView(semester) {
  viewingSemester.value = semester
  detailsOpen.value = true
}

function askDelete(semester) {
  deleteTarget.value = semester
}

function closeDeleteDialog(open) {
  if (!open) deleteTarget.value = null
}

function confirmDelete() {
  if (!deleteTarget.value) return

  const target = deleteTarget.value
  const result = store.deleteSemester(target.uid)

  if (!result.ok) {
    toast({
      variant: 'danger',
      title: 'Could not delete semester',
      message: result.errors.form || 'The semester could not be deleted.',
    })
    deleteTarget.value = null
    return
  }

  if (viewingSemester.value?.uid === target.uid) {
    viewingSemester.value = null
    detailsOpen.value = false
  }

  const persisted = result.persisted !== false

  toast({
    variant: persisted ? 'success' : 'warning',
    title: persisted ? 'Semester deleted' : 'Semester removed for this session',
    message: persisted
      ? `${target.name} (${target.academicYear}) was removed from the browser calendar.`
      : 'Browser storage could not save this deletion. The semester will return if you refresh.',
  })
  deleteTarget.value = null
}

function handleSaved({ mode, semester, persisted }) {
  formOpen.value = false
  editingSemester.value = null

  if (mode === 'add') page.value = 1

  const saved = persisted !== false
  const action = mode === 'edit' ? 'updated' : 'added'

  toast({
    variant: saved ? 'success' : 'warning',
    title: saved
      ? mode === 'edit'
        ? 'Semester updated'
        : 'Semester added'
      : `Semester ${action} for this session`,
    message: saved
      ? `${semester.name} (${semester.academicYear}) was saved to browser storage.`
      : 'Browser storage could not save this change. It will be lost when you refresh.',
  })
}

async function handleDetailsEdit(semester) {
  detailsOpen.value = false
  await nextTick()
  editingSemester.value = semester
  formOpen.value = true
}

function handleQueryAction() {
  if (route.query.action === 'add') {
    openAdd()
    router.replace({ name: 'semesters' })
  }
}

onMounted(() => {
  store.loadSemesters()
  handleQueryAction()
})

watch(() => route.query.action, handleQueryAction)
</script>

<template>
  <div>
    <PageHeader
      title="Semesters"
      description="Plan academic years, term dates, and the active academic term. This milestone stores records in the browser and does not call a semester API."
      eyebrow="Academic calendar"
      eyebrow-icon="bi-calendar3"
    >
      <template #actions>
        <span class="demo-flag">
          <i class="bi bi-hdd" aria-hidden="true"></i>
          Browser storage
        </span>
        <button type="button" class="btn-ch btn-ch-primary" @click="openAdd">
          <i class="bi bi-plus-lg" aria-hidden="true"></i>
          Add semester
        </button>
      </template>
    </PageHeader>

    <div v-if="store.loadState === 'loading'" class="ch-alert is-info" role="status">
      <i class="bi bi-arrow-repeat" aria-hidden="true"></i>
      <span>Loading semester records from browser storage…</span>
    </div>

    <div v-if="store.loadState === 'error'" class="ch-alert is-warning" role="alert">
      <i class="bi bi-exclamation-triangle" aria-hidden="true"></i>
      <span>{{ store.loadError }}</span>
      <button
        type="button"
        class="btn-ch btn-ch-soft btn-ch-sm api-retry"
        @click="store.loadSemesters()"
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

    <section class="row g-3 g-xl-4 mb-1" aria-label="Semester summary statistics">
      <div v-for="card in summaryCards" :key="card.label" class="col-sm-6 col-xl-3">
        <StatCard v-bind="card" />
      </div>
    </section>

    <div v-if="activeTerm" class="ch-alert is-info" role="status">
      <i class="bi bi-calendar-check" aria-hidden="true"></i>
      <span>
        <strong>Active term:</strong>
        {{ activeTerm.name }} ({{ activeTerm.academicYear }}) ·
        {{ formatStudentDate(activeTerm.startDate) }} –
        {{ formatStudentDate(activeTerm.endDate) }}
        <template v-if="activeTerms.length > 1">
          · {{ activeTerms.length - 1 }} additional
          {{ activeTerms.length - 1 === 1 ? 'term is' : 'terms are' }} also marked active.
        </template>
      </span>
    </div>

    <section class="ch-card mt-3 mt-xl-4">
      <div class="ch-card-header has-border">
        <div>
          <h2 class="ch-card-title">Semester calendar</h2>
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
          placeholder="Search by term, academic year, status, or description…"
        />
        <FilterSelect
          v-model="academicYearFilter"
          label="Academic year"
          :options="academicYearFilterOptions"
        />
        <FilterSelect v-model="statusFilter" label="Status" :options="statusFilterOptions" />
      </div>

      <div v-if="pagedSemesters.length" class="ch-card-body is-flush">
        <SemesterTable
          :semesters="pagedSemesters"
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
          :total="filteredSemesters.length"
          item-label="semesters"
          @update:page="page = $event"
          @update:page-size="pageSize = $event"
        />
      </div>

      <div v-else class="ch-card-body">
        <EmptyState
          v-if="store.loadState === 'error'"
          icon="bi-exclamation-triangle"
          title="Semester records unavailable"
          message="Browser storage could not be read. Try loading the semester calendar again."
        >
          <button type="button" class="btn-ch btn-ch-primary" @click="store.loadSemesters()">
            <i class="bi bi-arrow-clockwise" aria-hidden="true"></i>
            Retry
          </button>
        </EmptyState>

        <EmptyState
          v-else-if="store.totalSemesters === 0"
          icon="bi-calendar3"
          title="No semesters yet"
          message="Add your first academic term to start planning the semester calendar."
        >
          <button type="button" class="btn-ch btn-ch-primary" @click="openAdd">
            <i class="bi bi-plus-lg" aria-hidden="true"></i>
            Add semester
          </button>
        </EmptyState>

        <EmptyState
          v-else-if="filteredSemesters.length === 0"
          icon="bi-search"
          title="No semesters match your filters"
          message="Try another search term or reset the academic year and status filters."
        >
          <button type="button" class="btn-ch btn-ch-soft" @click="resetFilters">
            <i class="bi bi-arrow-counterclockwise" aria-hidden="true"></i>
            Clear filters
          </button>
        </EmptyState>

        <EmptyState
          v-else
          icon="bi-arrow-left-right"
          title="No semesters on this page"
          message="Return to the first page to keep browsing the calendar."
        >
          <button type="button" class="btn-ch btn-ch-soft" @click="page = 1">
            <i class="bi bi-arrow-counterclockwise" aria-hidden="true"></i>
            Go to first page
          </button>
        </EmptyState>

        <PaginationBar
          v-if="filteredSemesters.length > 0"
          :page="page"
          :page-size="pageSize"
          :total="filteredSemesters.length"
          item-label="semesters"
          @update:page="page = $event"
          @update:page-size="pageSize = $event"
        />
      </div>
    </section>

    <SemesterFormModal
      v-model="formOpen"
      :semester="editingSemester"
      @saved="handleSaved"
    />
    <SemesterDetailsModal
      v-model="detailsOpen"
      :semester="viewingSemester"
      @edit="handleDetailsEdit"
    />

    <ConfirmDialog
      :model-value="Boolean(deleteTarget)"
      title="Delete semester?"
      confirm-label="Delete semester"
      variant="danger"
      @update:model-value="closeDeleteDialog"
      @confirm="confirmDelete"
      @cancel="closeDeleteDialog(false)"
    >
      <p v-if="deleteTarget">
        You are about to permanently delete
        <strong>{{ deleteTarget.name }}</strong>
        ({{ deleteTarget.academicYear }}) from this browser's calendar.
      </p>
    </ConfirmDialog>
  </div>
</template>

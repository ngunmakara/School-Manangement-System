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
import SectionTable from '../components/sections/SectionTable.vue'
import SectionFormModal from '../components/sections/SectionFormModal.vue'
import SectionDetailsModal from '../components/sections/SectionDetailsModal.vue'
import { useSectionsStore } from '../stores/sections'
import { useSubjectsStore } from '../stores/subjects'
import { useSemestersStore } from '../stores/semesters'
import { useTeachersStore } from '../stores/teachers'
import { useToast } from '../composables/useToast'
import { SECTION_STATUSES } from '../utils/sections'

const store = useSectionsStore()
const subjectsStore = useSubjectsStore()
const semestersStore = useSemestersStore()
const teachersStore = useTeachersStore()
const { push: toast } = useToast()
const route = useRoute()
const router = useRouter()

const searchTerm = ref('')
const subjectFilter = ref('')
const semesterFilter = ref('')
const statusFilter = ref('')
const sortKey = ref('code')
const sortDir = ref('asc')
const page = ref(1)
const pageSize = ref(10)

const formOpen = ref(false)
const detailsOpen = ref(false)
const editingSection = ref(null)
const viewingSection = ref(null)
const deleteTarget = ref(null)

const subjectByUid = computed(
  () => new Map(subjectsStore.subjects.map((subject) => [subject.uid, subject])),
)
const semesterByUid = computed(
  () => new Map(semestersStore.semesters.map((semester) => [semester.uid, semester])),
)

const resolvedSections = computed(() =>
  store.sections.map((section) => {
    const subject = subjectByUid.value.get(section.subjectUid)
    const semester = semesterByUid.value.get(section.semesterUid)

    return {
      ...section,
      subjectName: subject?.name || 'Unknown subject',
      subjectCode: subject?.code || '',
      semesterName: semester ? `${semester.name} · ${semester.academicYear}` : 'Unknown semester',
    }
  }),
)

const hasFilters = computed(
  () =>
    searchTerm.value.trim() !== '' ||
    subjectFilter.value !== '' ||
    semesterFilter.value !== '' ||
    statusFilter.value !== '',
)

const subjectFilterOptions = computed(() => {
  const options = new Map()

  resolvedSections.value.forEach((section) => {
    if (!section.subjectUid) return
    options.set(section.subjectUid, {
      value: section.subjectUid,
      label: section.subjectCode
        ? `${section.subjectCode} · ${section.subjectName}`
        : section.subjectName,
    })
  })

  return [
    { value: '', label: 'All subjects' },
    ...[...options.values()].sort((left, right) =>
      left.label.localeCompare(right.label, 'en', {
        sensitivity: 'base',
        numeric: true,
      }),
    ),
  ]
})

const semesterFilterOptions = computed(() => {
  const options = new Map()

  resolvedSections.value.forEach((section) => {
    if (!section.semesterUid) return
    options.set(section.semesterUid, {
      value: section.semesterUid,
      label: section.semesterName,
    })
  })

  return [
    { value: '', label: 'All semesters' },
    ...[...options.values()].sort((left, right) =>
      left.label.localeCompare(right.label, 'en', {
        sensitivity: 'base',
        numeric: true,
      }),
    ),
  ]
})

const statusFilterOptions = computed(() => [
  { value: '', label: 'All statuses' },
  ...SECTION_STATUSES.map((status) => ({ value: status, label: status })),
])

const filteredSections = computed(() => {
  const term = searchTerm.value.trim().toLowerCase()

  const matches = resolvedSections.value.filter((section) => {
    if (subjectFilter.value && section.subjectUid !== subjectFilter.value) return false
    if (semesterFilter.value && section.semesterUid !== semesterFilter.value) return false
    if (statusFilter.value && section.status !== statusFilter.value) return false
    if (!term) return true

    return [
      section.code,
      section.subjectCode,
      section.subjectName,
      section.teacherName,
      section.semesterName,
      section.room,
      section.schedule,
      section.status,
      section.description,
    ].some((value) =>
      String(value ?? '')
        .toLowerCase()
        .includes(term),
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

    if (key === 'capacity') {
      return (Number(left.capacity) - Number(right.capacity)) * direction
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
  Math.max(1, Math.ceil(filteredSections.value.length / pageSize.value)),
)

const pagedSections = computed(() => {
  const start = (page.value - 1) * pageSize.value
  return filteredSections.value.slice(start, start + pageSize.value)
})

const summaryCards = computed(() => [
  {
    label: 'Total sections',
    value: store.totalSections.toLocaleString('en-US'),
    icon: 'bi-diagram-3',
    tone: 'indigo',
    note: 'Class sections in this browser',
  },
  {
    label: 'Active',
    value: store.activeSections.toLocaleString('en-US'),
    icon: 'bi-check2-circle',
    tone: 'green',
    note: 'Open for enrollment planning',
  },
  {
    label: 'Total capacity',
    value: store.totalCapacity.toLocaleString('en-US'),
    icon: 'bi-people',
    tone: 'blue',
    note: 'Seats across all sections',
  },
  {
    label: 'Teachers assigned',
    value: store.teacherCount.toLocaleString('en-US'),
    icon: 'bi-person-video3',
    tone: 'amber',
    note: 'Distinct teachers in sections',
  },
])

const directorySubtitle = computed(() => {
  if (!store.totalSections) return 'No sections yet'
  if (hasFilters.value) {
    return `${filteredSections.value.length} of ${store.totalSections} sections match your filters`
  }
  return `${store.totalSections} sections in the browser schedule`
})

const storageAlerts = computed(() => {
  const alerts = []

  if (store.storageState === 'unavailable' || store.persistenceState === 'unavailable') {
    alerts.push({
      variant: 'danger',
      icon: 'bi-hdd-stack',
      text: 'Browser storage is unavailable. Section changes will last for this session only.',
    })
  } else if (store.persistenceState === 'failed') {
    alerts.push({
      variant: 'danger',
      icon: 'bi-exclamation-triangle',
      text: 'Browser storage is not accepting section saves. Recent changes will be lost when you refresh.',
    })
  }

  const recovery = store.recovery
  if (!recovery) return alerts

  if (recovery.kind === 'invalid-json' || recovery.kind === 'invalid-format') {
    alerts.push({
      variant: 'warning',
      icon: 'bi-shield-exclamation',
      text: 'Saved section data could not be read, so the schedule started empty. New changes can still be saved.',
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
      `${recovery.corrected} ${recovery.corrected === 1 ? 'record was' : 'records were'} repaired`,
    )
  }

  if (changes.length) {
    alerts.push({
      variant: 'warning',
      icon: 'bi-shield-exclamation',
      text: `Some saved section records needed attention: ${changes.join('; ')}. Recoverable records were kept.`,
    })
  }

  return alerts
})

const teacherDirectoryAlert = computed(() => {
  if (teachersStore.optionsState === 'error') {
    return {
      variant: 'warning',
      icon: 'bi-person-x',
      text:
        teachersStore.optionsError ||
        'The teacher directory could not be loaded. Teacher selection may be unavailable.',
      retry: true,
    }
  }

  if (teachersStore.optionsState === 'ready' && !teachersStore.teacherOptions.length) {
    return {
      variant: 'warning',
      icon: 'bi-person-x',
      text: 'No teachers are available from the CampusHub Teachers API. Add a teacher before creating a section.',
      retry: true,
    }
  }

  if (teachersStore.optionsTruncated) {
    return {
      variant: 'info',
      icon: 'bi-info-circle',
      text: 'The teacher directory was truncated. Only the first batch of teachers is available for selection.',
      retry: false,
    }
  }

  return null
})

const missingReferenceAlert = computed(() => {
  const missing = []

  if (!subjectsStore.totalSubjects) missing.push('subject')
  if (!semestersStore.totalSemesters) missing.push('semester')

  if (!missing.length) return ''

  if (missing.length > 1) {
    return 'Subjects and semesters are required before creating a class section. Add at least one of each first.'
  }

  const label = `${missing[0][0].toUpperCase()}${missing[0].slice(1)}s`
  return `${label} are required before creating a class section. Add at least one ${missing[0]} first.`
})

watch([searchTerm, subjectFilter, semesterFilter, statusFilter, sortKey, sortDir], () => {
  page.value = 1
})

watch(totalPages, (value) => {
  if (page.value > value) page.value = value
})

function resetFilters() {
  searchTerm.value = ''
  subjectFilter.value = ''
  semesterFilter.value = ''
  statusFilter.value = ''
  sortKey.value = 'code'
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
  editingSection.value = null
  formOpen.value = true
}

function openEdit(section) {
  detailsOpen.value = false
  editingSection.value = section
  formOpen.value = true
}

function openView(section) {
  viewingSection.value = section
  detailsOpen.value = true
}

function askDelete(section) {
  deleteTarget.value = section
}

function closeDeleteDialog(open) {
  if (!open) deleteTarget.value = null
}

function confirmDelete() {
  if (!deleteTarget.value) return

  const target = deleteTarget.value
  const result = store.deleteSection(target.uid)

  if (!result.ok) {
    toast({
      variant: 'danger',
      title: 'Could not delete section',
      message: result.errors.form || 'The section could not be deleted.',
    })
    deleteTarget.value = null
    return
  }

  if (viewingSection.value?.uid === target.uid) {
    viewingSection.value = null
    detailsOpen.value = false
  }

  const persisted = result.persisted !== false

  toast({
    variant: persisted ? 'success' : 'warning',
    title: persisted ? 'Section deleted' : 'Section removed for this session',
    message: persisted
      ? `${target.code} (${target.subjectName}) was removed from the browser schedule.`
      : 'Browser storage could not save this deletion. The section will return if you refresh.',
  })
  deleteTarget.value = null
}

function handleSaved({ mode, section, persisted }) {
  formOpen.value = false
  editingSection.value = null

  if (mode === 'add') page.value = 1

  const saved = persisted !== false
  const action = mode === 'edit' ? 'updated' : 'added'

  toast({
    variant: saved ? 'success' : 'warning',
    title: saved
      ? mode === 'edit'
        ? 'Section updated'
        : 'Section added'
      : `Section ${action} for this session`,
    message: saved
      ? `${section.code} was saved to browser storage.`
      : 'Browser storage could not save this change. It will be lost when you refresh.',
  })
}

async function handleDetailsEdit(section) {
  detailsOpen.value = false
  await nextTick()
  editingSection.value = section
  formOpen.value = true
}

function refreshTeachers() {
  teachersStore.loadTeacherOptions(true)
}

function handleQueryAction() {
  if (route.query.action === 'add') {
    openAdd()
    router.replace({ name: 'sections' })
  }
}

onMounted(() => {
  store.loadSections()
  subjectsStore.loadSubjects()
  semestersStore.loadSemesters()
  teachersStore.loadTeacherOptions()
  handleQueryAction()
})

watch(() => route.query.action, handleQueryAction)
</script>

<template>
  <div>
    <PageHeader
      title="Class Sections"
      description="Assign subjects to teachers and rooms, plan free-text schedules, and track section capacity. Section records are stored in this browser, while teacher choices come from the CampusHub Teachers API."
      eyebrow="Academic operations"
      eyebrow-icon="bi-diagram-3"
    >
      <template #actions>
        <span class="demo-flag">
          <i class="bi bi-hdd" aria-hidden="true"></i>
          Browser storage
        </span>
        <button type="button" class="btn-ch btn-ch-primary" @click="openAdd">
          <i class="bi bi-plus-lg" aria-hidden="true"></i>
          Add section
        </button>
      </template>
    </PageHeader>

    <div v-if="store.loadState === 'loading'" class="ch-alert is-info" role="status">
      <i class="bi bi-arrow-repeat" aria-hidden="true"></i>
      <span>Loading section records from browser storage…</span>
    </div>

    <div v-if="store.loadState === 'error'" class="ch-alert is-warning" role="alert">
      <i class="bi bi-exclamation-triangle" aria-hidden="true"></i>
      <span>{{ store.loadError }}</span>
      <button
        type="button"
        class="btn-ch btn-ch-soft btn-ch-sm api-retry"
        @click="store.loadSections()"
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

    <div
      v-if="teacherDirectoryAlert"
      class="ch-alert"
      :class="`is-${teacherDirectoryAlert.variant}`"
      role="alert"
    >
      <i class="bi" :class="teacherDirectoryAlert.icon" aria-hidden="true"></i>
      <span>{{ teacherDirectoryAlert.text }}</span>
      <button
        v-if="teacherDirectoryAlert.retry"
        type="button"
        class="btn-ch btn-ch-soft btn-ch-sm api-retry"
        @click="refreshTeachers"
      >
        <i class="bi bi-arrow-clockwise" aria-hidden="true"></i>
        Retry
      </button>
    </div>

    <div v-if="missingReferenceAlert" class="ch-alert is-info" role="status">
      <i class="bi bi-info-circle" aria-hidden="true"></i>
      <span>{{ missingReferenceAlert }}</span>
    </div>

    <section class="row g-3 g-xl-4 mb-1" aria-label="Class section summary statistics">
      <div v-for="card in summaryCards" :key="card.label" class="col-sm-6 col-xl-3">
        <StatCard v-bind="card" />
      </div>
    </section>

    <section class="ch-card mt-3 mt-xl-4">
      <div class="ch-card-header has-border">
        <div>
          <h2 class="ch-card-title">Section schedule</h2>
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
          placeholder="Search by code, subject, teacher, room, or schedule…"
        />
        <FilterSelect v-model="subjectFilter" label="Subject" :options="subjectFilterOptions" />
        <FilterSelect v-model="semesterFilter" label="Semester" :options="semesterFilterOptions" />
        <FilterSelect v-model="statusFilter" label="Status" :options="statusFilterOptions" />
      </div>

      <div v-if="pagedSections.length" class="ch-card-body is-flush">
        <SectionTable
          :sections="pagedSections"
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
          :total="filteredSections.length"
          item-label="sections"
          @update:page="page = $event"
          @update:page-size="pageSize = $event"
        />
      </div>

      <div v-else class="ch-card-body">
        <EmptyState
          v-if="store.loadState === 'error'"
          icon="bi-exclamation-triangle"
          title="Section records unavailable"
          message="Browser storage could not be read. Try loading the section schedule again."
        >
          <button type="button" class="btn-ch btn-ch-primary" @click="store.loadSections()">
            <i class="bi bi-arrow-clockwise" aria-hidden="true"></i>
            Retry
          </button>
        </EmptyState>

        <EmptyState
          v-else-if="store.totalSections === 0"
          icon="bi-diagram-3"
          title="No class sections yet"
          message="Add your first section to assign a subject, teacher, room, and schedule."
        >
          <button type="button" class="btn-ch btn-ch-primary" @click="openAdd">
            <i class="bi bi-plus-lg" aria-hidden="true"></i>
            Add section
          </button>
        </EmptyState>

        <EmptyState
          v-else-if="filteredSections.length === 0"
          icon="bi-search"
          title="No sections match your filters"
          message="Try another search term or reset the subject, semester, and status filters."
        >
          <button type="button" class="btn-ch btn-ch-soft" @click="resetFilters">
            <i class="bi bi-arrow-counterclockwise" aria-hidden="true"></i>
            Clear filters
          </button>
        </EmptyState>

        <EmptyState
          v-else
          icon="bi-arrow-left-right"
          title="No sections on this page"
          message="Return to the first page to keep browsing the section schedule."
        >
          <button type="button" class="btn-ch btn-ch-soft" @click="page = 1">
            <i class="bi bi-arrow-counterclockwise" aria-hidden="true"></i>
            Go to first page
          </button>
        </EmptyState>

        <PaginationBar
          v-if="filteredSections.length > 0"
          :page="page"
          :page-size="pageSize"
          :total="filteredSections.length"
          item-label="sections"
          @update:page="page = $event"
          @update:page-size="pageSize = $event"
        />
      </div>
    </section>

    <SectionFormModal v-model="formOpen" :section="editingSection" @saved="handleSaved" />
    <SectionDetailsModal
      v-model="detailsOpen"
      :section="viewingSection"
      @edit="handleDetailsEdit"
    />

    <ConfirmDialog
      :model-value="Boolean(deleteTarget)"
      title="Delete section?"
      confirm-label="Delete section"
      variant="danger"
      @update:model-value="closeDeleteDialog"
      @confirm="confirmDelete"
      @cancel="closeDeleteDialog(false)"
    >
      <p v-if="deleteTarget">
        You are about to permanently delete
        <strong>{{ deleteTarget.code }}</strong>
        ({{ deleteTarget.subjectName }}) from this browser's section schedule.
      </p>
    </ConfirmDialog>
  </div>
</template>

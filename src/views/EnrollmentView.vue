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
import EnrollmentTable from '../components/enrollments/EnrollmentTable.vue'
import EnrollmentFormModal from '../components/enrollments/EnrollmentFormModal.vue'
import EnrollmentDetailsModal from '../components/enrollments/EnrollmentDetailsModal.vue'
import { useEnrollmentsStore } from '../stores/enrollments'
import { useSectionsStore } from '../stores/sections'
import { useStudentsStore } from '../stores/students'
import { useSubjectsStore } from '../stores/subjects'
import { useSemestersStore } from '../stores/semesters'
import { useToast } from '../composables/useToast'
import { ENROLLMENT_STATUSES, enrollmentStatusLabel } from '../utils/enrollments'

const store = useEnrollmentsStore()
const sectionsStore = useSectionsStore()
const studentsStore = useStudentsStore()
const subjectsStore = useSubjectsStore()
const semestersStore = useSemestersStore()
const { push: toast } = useToast()
const route = useRoute()
const router = useRouter()

const searchTerm = ref('')
const studentFilter = ref('')
const sectionFilter = ref('')
const semesterFilter = ref('')
const statusFilter = ref('')
const sortKey = ref('createdAt')
const sortDir = ref('desc')
const page = ref(1)
const pageSize = ref(10)
const storageRetryError = ref('')

const formOpen = ref(false)
const detailsOpen = ref(false)
const editingEnrollment = ref(null)
const viewingEnrollment = ref(null)
const deleteTarget = ref(null)

const studentByUid = computed(
  () => new Map(studentsStore.students.map((student) => [student.uid, student])),
)
const sectionByUid = computed(
  () => new Map(sectionsStore.sections.map((section) => [section.uid, section])),
)
const subjectByUid = computed(
  () => new Map(subjectsStore.subjects.map((subject) => [subject.uid, subject])),
)
const semesterByUid = computed(
  () => new Map(semestersStore.semesters.map((semester) => [semester.uid, semester])),
)

const seatsBySection = computed(() => {
  const counts = new Map()
  store.enrollments.forEach((enrollment) => {
    if (enrollment.status !== 'enrolled') return
    counts.set(enrollment.sectionUid, (counts.get(enrollment.sectionUid) || 0) + 1)
  })
  return counts
})

const resolvedEnrollments = computed(() =>
  store.enrollments.map((enrollment) => {
    const student = studentByUid.value.get(enrollment.studentUid)
    const section = sectionByUid.value.get(enrollment.sectionUid)
    const subject = section ? subjectByUid.value.get(section.subjectUid) : null
    const semester = section ? semesterByUid.value.get(section.semesterUid) : null
    const capacity = Number(section?.capacity)

    return {
      ...enrollment,
      studentName: student?.fullName || 'Unknown student',
      studentId: student?.studentId || '—',
      sectionUid: enrollment.sectionUid,
      sectionCode: section?.code || 'Unknown section',
      subjectName: subject?.name || 'Unknown subject',
      teacherName: section?.teacherName || 'Unassigned teacher',
      semesterUid: section?.semesterUid || '',
      semesterName: semester ? `${semester.name} · ${semester.academicYear}` : 'Unknown semester',
      room: section?.room || '',
      schedule: section?.schedule || '—',
      statusLabel: enrollmentStatusLabel(enrollment.status),
      capacity: section && Number.isFinite(capacity) ? capacity : undefined,
      seatsUsed: seatsBySection.value.get(enrollment.sectionUid) || 0,
    }
  }),
)

const studentOptions = computed(() =>
  [...studentsStore.students]
    .sort((left, right) =>
      String(left.fullName ?? '').localeCompare(String(right.fullName ?? ''), 'en', {
        sensitivity: 'base',
      }),
    )
    .map((student) => ({
      uid: student.uid,
      label: `${student.fullName} · ${student.studentId}`,
    })),
)

const sectionOptions = computed(() =>
  [...sectionsStore.sections]
    .sort((left, right) =>
      String(left.code ?? '').localeCompare(String(right.code ?? ''), 'en', {
        sensitivity: 'base',
        numeric: true,
      }),
    )
    .map((section) => {
      const subject = subjectByUid.value.get(section.subjectUid)
      const semester = semesterByUid.value.get(section.semesterUid)
      const capacity = Number(section.capacity)
      const seatsUsed = seatsBySection.value.get(section.uid) || 0

      return {
        uid: section.uid,
        label: `${section.code} · ${subject?.name || 'Unknown subject'} · ${
          semester ? semester.name : 'Unknown semester'
        }${section.room ? ` · ${section.room}` : ''}`,
        capacity: Number.isFinite(capacity) ? capacity : undefined,
        seatsUsed,
        full: Number.isFinite(capacity) && seatsUsed >= capacity,
      }
    }),
)

function optionSet(key, labelKey, allLabel) {
  const options = new Map()

  resolvedEnrollments.value.forEach((enrollment) => {
    const value = enrollment[key]
    if (!value) return
    options.set(value, { value, label: enrollment[labelKey] })
  })

  return [
    { value: '', label: allLabel },
    ...[...options.values()].sort((left, right) =>
      left.label.localeCompare(right.label, 'en', { sensitivity: 'base', numeric: true }),
    ),
  ]
}

const studentFilterOptions = computed(() => optionSet('studentUid', 'studentName', 'All students'))
const sectionFilterOptions = computed(() => optionSet('sectionUid', 'sectionCode', 'All sections'))
const semesterFilterOptions = computed(() =>
  optionSet('semesterUid', 'semesterName', 'All semesters'),
)
const statusFilterOptions = computed(() => [
  { value: '', label: 'All statuses' },
  ...ENROLLMENT_STATUSES.map((status) => ({ value: status, label: enrollmentStatusLabel(status) })),
])

const hasFilters = computed(
  () =>
    searchTerm.value.trim() !== '' ||
    studentFilter.value !== '' ||
    sectionFilter.value !== '' ||
    semesterFilter.value !== '' ||
    statusFilter.value !== '',
)

const filteredEnrollments = computed(() => {
  const term = searchTerm.value.trim().toLowerCase()

  const matches = resolvedEnrollments.value.filter((enrollment) => {
    if (studentFilter.value && enrollment.studentUid !== studentFilter.value) return false
    if (sectionFilter.value && enrollment.sectionUid !== sectionFilter.value) return false
    if (semesterFilter.value && enrollment.semesterUid !== semesterFilter.value) return false
    if (statusFilter.value && enrollment.status !== statusFilter.value) return false
    if (!term) return true

    return [
      enrollment.studentName,
      enrollment.studentId,
      enrollment.sectionCode,
      enrollment.subjectName,
      enrollment.teacherName,
      enrollment.semesterName,
      enrollment.schedule,
      enrollment.room,
      enrollment.statusLabel,
    ].some((value) =>
      String(value ?? '')
        .toLowerCase()
        .includes(term),
    )
  })

  const direction = sortDir.value === 'asc' ? 1 : -1
  const key = sortKey.value

  return [...matches].sort((left, right) => {
    if (key === 'createdAt') {
      const leftTime = new Date(left[key] || 0).getTime()
      const rightTime = new Date(right[key] || 0).getTime()
      return (leftTime - rightTime) * direction
    }

    if (key === 'seatsUsed') {
      return (Number(left[key]) - Number(right[key])) * direction
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
  Math.max(1, Math.ceil(filteredEnrollments.value.length / pageSize.value)),
)

const pagedEnrollments = computed(() => {
  const start = (page.value - 1) * pageSize.value
  return filteredEnrollments.value.slice(start, start + pageSize.value)
})

const summaryCards = computed(() => [
  {
    label: 'Total records',
    value: store.totalEnrollments.toLocaleString('en-US'),
    icon: 'bi-person-plus',
    tone: 'indigo',
    note: 'Enrollment links in this browser',
  },
  {
    label: 'Enrolled',
    value: store.enrolledCount.toLocaleString('en-US'),
    icon: 'bi-check2-circle',
    tone: 'green',
    note: 'Active local enrollment records',
  },
  {
    label: 'Completed',
    value: store.completedCount.toLocaleString('en-US'),
    icon: 'bi-mortarboard',
    tone: 'blue',
    note: 'Finished records',
  },
  {
    label: 'Dropped',
    value: store.droppedCount.toLocaleString('en-US'),
    icon: 'bi-arrow-left-right',
    tone: 'amber',
    note: 'Inactive records',
  },
])

const directorySubtitle = computed(() => {
  if (!store.totalEnrollments) return 'No enrollment records yet'
  if (hasFilters.value) {
    return `${filteredEnrollments.value.length} of ${store.totalEnrollments} records match your filters`
  }
  return `${store.totalEnrollments} enrollment records stored in this browser`
})

const storageAlerts = computed(() => {
  const alerts = []

  if (store.storageState === 'unavailable' || store.persistenceState === 'unavailable') {
    alerts.push({
      variant: 'danger',
      icon: 'bi-hdd-stack',
      text:
        storageRetryError.value ||
        'Browser storage is unavailable. Enrollment changes will last for this session only.',
      retry: true,
    })
  } else if (store.persistenceState === 'failed') {
    alerts.push({
      variant: 'danger',
      icon: 'bi-exclamation-triangle',
      text:
        storageRetryError.value ||
        store.persistenceError ||
        'Browser storage is not accepting enrollment saves. Recent changes will be lost when you refresh.',
      retry: true,
    })
  }

  const recovery = store.recovery
  if (!recovery) return alerts

  if (recovery.kind === 'invalid-json' || recovery.kind === 'invalid-format') {
    alerts.push({
      variant: 'warning',
      icon: 'bi-shield-exclamation',
      text: 'Saved enrollment data could not be read, so the list started empty. New changes can still be saved.',
      retry: false,
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
  if (recovery.duplicateActive > 0) {
    changes.push(
      `${recovery.duplicateActive} duplicate active ${
        recovery.duplicateActive === 1 ? 'enrollment was' : 'enrollments were'
      } removed`,
    )
  }

  if (changes.length) {
    alerts.push({
      variant: 'warning',
      icon: 'bi-shield-exclamation',
      text: `Some saved enrollment records needed attention: ${changes.join('; ')}. Recoverable records were kept.`,
      retry: false,
    })
  }

  return alerts
})

const studentDirectoryAlert = computed(() => {
  if (studentsStore.isApiMode) {
    const loaded = studentsStore.students.length
    const total = Number(studentsStore.filteredTotal) || loaded
    return {
      variant: 'info',
      icon: 'bi-info-circle',
      text: `Student choices are limited to the currently loaded API page (${loaded} of ${total} shown). If a student is missing, open the Students page to locate them first.`,
    }
  }

  if (!studentsStore.students.length) {
    return {
      variant: 'warning',
      icon: 'bi-people',
      text: 'No students are available yet. Add a student before creating an enrollment record.',
    }
  }

  return null
})

const sectionDirectoryAlert = computed(() => {
  if (sectionsStore.sections.length) return null

  return {
    variant: 'warning',
    icon: 'bi-diagram-3',
    text: 'No class sections are available yet. Add a class section before creating an enrollment record.',
  }
})

watch(
  [searchTerm, studentFilter, sectionFilter, semesterFilter, statusFilter, sortKey, sortDir],
  () => {
    page.value = 1
  },
)

watch(totalPages, (value) => {
  if (page.value > value) page.value = value
})

function resetFilters() {
  searchTerm.value = ''
  studentFilter.value = ''
  sectionFilter.value = ''
  semesterFilter.value = ''
  statusFilter.value = ''
  sortKey.value = 'createdAt'
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
  editingEnrollment.value = null
  formOpen.value = true
}

function openEdit(enrollment) {
  detailsOpen.value = false
  editingEnrollment.value = enrollment
  formOpen.value = true
}

function openView(enrollment) {
  viewingEnrollment.value = enrollment
  detailsOpen.value = true
}

function askDelete(enrollment) {
  deleteTarget.value = enrollment
}

function closeDeleteDialog(open) {
  if (!open) deleteTarget.value = null
}

function confirmDelete() {
  if (!deleteTarget.value) return

  const target = deleteTarget.value
  const result = store.deleteEnrollment(target.uid)

  if (!result.ok) {
    toast({
      variant: 'danger',
      title: 'Could not delete enrollment',
      message: result.errors.form || 'The enrollment could not be deleted.',
    })
    deleteTarget.value = null
    return
  }

  if (viewingEnrollment.value?.uid === target.uid) {
    viewingEnrollment.value = null
    detailsOpen.value = false
  }

  const persisted = result.persisted !== false

  toast({
    variant: persisted ? 'success' : 'warning',
    title: persisted ? 'Enrollment deleted' : 'Enrollment removed for this session',
    message: persisted
      ? `${target.studentName} was removed from ${target.sectionCode}.`
      : 'Browser storage could not save this deletion. The record will return if you refresh.',
  })
  deleteTarget.value = null
}

function handleSaved({ mode, enrollment, persisted }) {
  formOpen.value = false
  editingEnrollment.value = null

  if (mode === 'add') page.value = 1

  const saved = persisted !== false
  const action = mode === 'edit' ? 'updated' : 'added'

  toast({
    variant: saved ? 'success' : 'warning',
    title: saved ? `Enrollment ${action}` : `Enrollment ${action} for this session`,
    message: saved
      ? `${enrollment.studentUid} was saved to browser storage.`
      : 'Browser storage could not save this change. It will be lost when you refresh.',
  })
}

async function handleDetailsEdit(enrollment) {
  detailsOpen.value = false
  await nextTick()
  editingEnrollment.value = enrollment
  formOpen.value = true
}

function retryStorage() {
  storageRetryError.value = ''

  let result
  try {
    result = store.retryPersist()
  } catch {
    storageRetryError.value = 'Browser storage could not be checked.'
    toast({
      variant: 'danger',
      title: 'Could not save enrollment changes',
      message: storageRetryError.value,
    })
    return
  }

  if (result.ok) {
    toast({
      variant: 'success',
      title: 'Enrollment changes saved',
      message: 'Browser storage accepted the pending enrollment changes.',
    })
    return
  }

  storageRetryError.value = result.error || 'Browser storage is still not accepting saves.'
  toast({
    variant: 'danger',
    title: 'Could not save enrollment changes',
    message: storageRetryError.value,
  })
}

function handleQueryAction() {
  if (route.query.action === 'add') {
    openAdd()
    router.replace({ name: 'enrollment' })
  }
}

onMounted(() => {
  store.loadEnrollments()
  sectionsStore.loadSections()
  subjectsStore.loadSubjects()
  semestersStore.loadSemesters()
  handleQueryAction()
})

watch(() => route.query.action, handleQueryAction)
</script>

<template>
  <div>
    <PageHeader
      title="Enrollment"
      description="Connect students to class sections, track enrollment status, and review locally estimated seat usage. Enrollment records are stored in this browser and are not synced to the CampusHub server."
      eyebrow="Academic operations"
      eyebrow-icon="bi-person-plus"
    >
      <template #actions>
        <span class="demo-flag">
          <i class="bi bi-hdd" aria-hidden="true"></i>
          Browser storage
        </span>
        <button type="button" class="btn-ch btn-ch-primary" @click="openAdd">
          <i class="bi bi-plus-lg" aria-hidden="true"></i>
          Add enrollment
        </button>
      </template>
    </PageHeader>

    <div v-if="store.loadState === 'loading'" class="ch-alert is-info" role="status">
      <i class="bi bi-arrow-repeat" aria-hidden="true"></i>
      <span>Loading enrollment records from browser storage…</span>
    </div>

    <div v-if="store.loadState === 'error'" class="ch-alert is-warning" role="alert">
      <i class="bi bi-exclamation-triangle" aria-hidden="true"></i>
      <span>{{ store.loadError }}</span>
      <button
        type="button"
        class="btn-ch btn-ch-soft btn-ch-sm api-retry"
        @click="store.loadEnrollments()"
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
      aria-label="Enrollment storage status"
    >
      <i class="bi" :class="alert.icon" aria-hidden="true"></i>
      <span>{{ alert.text }}</span>
      <button
        v-if="alert.retry"
        type="button"
        class="btn-ch btn-ch-soft btn-ch-sm api-retry"
        @click="retryStorage"
      >
        <i class="bi bi-arrow-clockwise" aria-hidden="true"></i>
        Retry save
      </button>
    </div>

    <div v-if="studentDirectoryAlert" class="ch-alert is-info" role="status">
      <i class="bi" :class="studentDirectoryAlert.icon" aria-hidden="true"></i>
      <span>{{ studentDirectoryAlert.text }}</span>
    </div>

    <div v-if="sectionDirectoryAlert" class="ch-alert is-warning" role="alert">
      <i class="bi" :class="sectionDirectoryAlert.icon" aria-hidden="true"></i>
      <span>{{ sectionDirectoryAlert.text }}</span>
    </div>

    <section class="row g-3 g-xl-4 mb-1" aria-label="Enrollment summary statistics">
      <div v-for="card in summaryCards" :key="card.label" class="col-sm-6 col-xl-3">
        <StatCard v-bind="card" />
      </div>
    </section>

    <section class="ch-card mt-3 mt-xl-4">
      <div class="ch-card-header has-border">
        <div>
          <h2 class="ch-card-title">Enrollment records</h2>
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

      <div class="data-toolbar section-toolbar">
        <SearchField
          v-model="searchTerm"
          class="toolbar-search"
          label="Search"
          placeholder="Search by student, section, subject, teacher, or semester…"
        />
        <FilterSelect v-model="studentFilter" label="Student" :options="studentFilterOptions" />
        <FilterSelect v-model="sectionFilter" label="Section" :options="sectionFilterOptions" />
        <FilterSelect v-model="semesterFilter" label="Semester" :options="semesterFilterOptions" />
        <FilterSelect v-model="statusFilter" label="Status" :options="statusFilterOptions" />
      </div>

      <div v-if="pagedEnrollments.length" class="ch-card-body is-flush">
        <EnrollmentTable
          :enrollments="pagedEnrollments"
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
          :total="filteredEnrollments.length"
          item-label="enrollment records"
          @update:page="page = $event"
          @update:page-size="pageSize = $event"
        />
      </div>

      <div v-else class="ch-card-body">
        <EmptyState
          v-if="store.loadState === 'error'"
          icon="bi-exclamation-triangle"
          title="Enrollment records unavailable"
          message="Browser storage could not be read. Try loading the enrollment records again."
        >
          <button type="button" class="btn-ch btn-ch-primary" @click="store.loadEnrollments()">
            <i class="bi bi-arrow-clockwise" aria-hidden="true"></i>
            Retry
          </button>
        </EmptyState>

        <EmptyState
          v-else-if="store.totalEnrollments === 0"
          icon="bi-person-plus"
          title="No enrollment records yet"
          message="Add your first enrollment to connect a student with a class section."
        >
          <button type="button" class="btn-ch btn-ch-primary" @click="openAdd">
            <i class="bi bi-plus-lg" aria-hidden="true"></i>
            Add enrollment
          </button>
        </EmptyState>

        <EmptyState
          v-else-if="filteredEnrollments.length === 0"
          icon="bi-search"
          title="No enrollments match your filters"
          message="Try another search term or reset the student, section, semester, and status filters."
        >
          <button type="button" class="btn-ch btn-ch-soft" @click="resetFilters">
            <i class="bi bi-arrow-counterclockwise" aria-hidden="true"></i>
            Clear filters
          </button>
        </EmptyState>

        <EmptyState
          v-else
          icon="bi-arrow-left-right"
          title="No enrollments on this page"
          message="Return to the first page to keep browsing enrollment records."
        >
          <button type="button" class="btn-ch btn-ch-soft" @click="page = 1">
            <i class="bi bi-arrow-counterclockwise" aria-hidden="true"></i>
            Go to first page
          </button>
        </EmptyState>

        <PaginationBar
          v-if="filteredEnrollments.length > 0"
          :page="page"
          :page-size="pageSize"
          :total="filteredEnrollments.length"
          item-label="enrollment records"
          @update:page="page = $event"
          @update:page-size="pageSize = $event"
        />
      </div>
    </section>

    <EnrollmentFormModal
      v-model="formOpen"
      :enrollment="editingEnrollment"
      :students="studentOptions"
      :sections="sectionOptions"
      :student-directory-notice="studentDirectoryAlert?.text || ''"
      @saved="handleSaved"
    />
    <EnrollmentDetailsModal
      v-model="detailsOpen"
      :enrollment="viewingEnrollment"
      @edit="handleDetailsEdit"
    />

    <ConfirmDialog
      :model-value="Boolean(deleteTarget)"
      title="Delete enrollment?"
      confirm-label="Delete enrollment"
      variant="danger"
      @update:model-value="closeDeleteDialog"
      @confirm="confirmDelete"
      @cancel="closeDeleteDialog(false)"
    >
      <p v-if="deleteTarget">
        You are about to remove
        <strong>{{ deleteTarget.studentName }}</strong>
        from {{ deleteTarget.sectionCode }} in this browser's enrollment records.
      </p>
    </ConfirmDialog>
  </div>
</template>

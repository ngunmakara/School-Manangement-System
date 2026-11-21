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
import AttendanceTable from '../components/attendance/AttendanceTable.vue'
import AttendanceFormModal from '../components/attendance/AttendanceFormModal.vue'
import AttendanceDetailsModal from '../components/attendance/AttendanceDetailsModal.vue'
import { useAttendanceStore } from '../stores/attendance'
import { useEnrollmentsStore } from '../stores/enrollments'
import { useSectionsStore } from '../stores/sections'
import { useStudentsStore } from '../stores/students'
import { useSubjectsStore } from '../stores/subjects'
import { useSemestersStore } from '../stores/semesters'
import { useToast } from '../composables/useToast'
import {
  ATTENDANCE_STATUSES,
  attendanceStatusLabel,
  resolveSectionRoster,
  toLocalDateKey,
} from '../utils/attendance'

const store = useAttendanceStore()
const enrollmentsStore = useEnrollmentsStore()
const sectionsStore = useSectionsStore()
const studentsStore = useStudentsStore()
const subjectsStore = useSubjectsStore()
const semestersStore = useSemestersStore()
const { push: toast } = useToast()
const route = useRoute()
const router = useRouter()

const selectedSectionUid = ref('')
const selectedDate = ref(toLocalDateKey(new Date()))
const searchTerm = ref('')
const statusFilter = ref('')
const sortKey = ref('date')
const sortDir = ref('desc')
const page = ref(1)
const pageSize = ref(10)
const storageRetryError = ref('')

const formOpen = ref(false)
const detailsOpen = ref(false)
const editingAttendance = ref(null)
const viewingAttendance = ref(null)
const deleteTarget = ref(null)

const sectionByUid = computed(
  () => new Map(sectionsStore.sections.map((section) => [section.uid, section])),
)
const studentByUid = computed(
  () => new Map(studentsStore.students.map((student) => [student.uid, student])),
)
const subjectByUid = computed(
  () => new Map(subjectsStore.subjects.map((subject) => [subject.uid, subject])),
)
const semesterByUid = computed(
  () => new Map(semestersStore.semesters.map((semester) => [semester.uid, semester])),
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

      return {
        uid: section.uid,
        label: `${section.code} · ${subject?.name || 'Unknown subject'} · ${
          semester ? semester.name : 'Unknown semester'
        }${section.room ? ` · ${section.room}` : ''}`,
      }
    }),
)

const rosterResult = computed(() =>
  resolveSectionRoster(
    enrollmentsStore.enrollments,
    studentsStore.students,
    selectedSectionUid.value,
  ),
)

const resolvedAttendance = computed(() =>
  store.attendance.map((record) => {
    const student = studentByUid.value.get(record.studentUid)
    const section = sectionByUid.value.get(record.sectionUid)
    const subject = section ? subjectByUid.value.get(section.subjectUid) : null
    const semester = section ? semesterByUid.value.get(section.semesterUid) : null

    return {
      ...record,
      studentName: student?.fullName || 'Unknown student',
      studentId: student?.studentId || '—',
      sectionCode: section?.code || 'Unknown section',
      subjectName: subject?.name || 'Unknown subject',
      teacherName: section?.teacherName || 'Unassigned teacher',
      semesterUid: section?.semesterUid || '',
      semesterName: semester ? `${semester.name} · ${semester.academicYear}` : 'Unknown semester',
      statusLabel: attendanceStatusLabel(record.status),
    }
  }),
)

const scopedAttendance = computed(() =>
  resolvedAttendance.value.filter(
    (record) =>
      record.sectionUid === selectedSectionUid.value && record.date === selectedDate.value,
  ),
)

const statusFilterOptions = computed(() => [
  { value: '', label: 'All statuses' },
  ...ATTENDANCE_STATUSES.map((status) => ({ value: status, label: attendanceStatusLabel(status) })),
])

const hasFilters = computed(
  () =>
    searchTerm.value.trim() !== '' ||
    statusFilter.value !== '' ||
    sortKey.value !== 'date' ||
    sortDir.value !== 'desc',
)

const filteredAttendance = computed(() => {
  const term = searchTerm.value.trim().toLowerCase()

  const matches = scopedAttendance.value.filter((record) => {
    if (statusFilter.value && record.status !== statusFilter.value) return false
    if (!term) return true

    return [
      record.studentName,
      record.studentId,
      record.sectionCode,
      record.subjectName,
      record.teacherName,
      record.statusLabel,
      record.date,
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

    return (
      String(left[key] ?? '').localeCompare(String(right[key] ?? ''), 'en', {
        sensitivity: 'base',
        numeric: true,
      }) * direction
    )
  })
})

const totalPages = computed(() =>
  Math.max(1, Math.ceil(filteredAttendance.value.length / pageSize.value)),
)

const pagedAttendance = computed(() => {
  const start = (page.value - 1) * pageSize.value
  return filteredAttendance.value.slice(start, start + pageSize.value)
})

const scopedCounts = computed(() => ({
  roster: rosterResult.value.roster.length,
  present: scopedAttendance.value.filter((record) => record.status === 'present').length,
  absent: scopedAttendance.value.filter((record) => record.status === 'absent').length,
  other: scopedAttendance.value.filter(
    (record) => record.status === 'late' || record.status === 'excused',
  ).length,
  recorded: scopedAttendance.value.length,
}))

const summaryCards = computed(() => [
  {
    label: 'Active roster',
    value: scopedCounts.value.roster.toLocaleString('en-US'),
    icon: 'bi-people',
    tone: 'indigo',
    note: 'Enrolled students in this section',
  },
  {
    label: 'Present',
    value: scopedCounts.value.present.toLocaleString('en-US'),
    icon: 'bi-check2-circle',
    tone: 'green',
    note: 'For the selected date',
  },
  {
    label: 'Absent',
    value: scopedCounts.value.absent.toLocaleString('en-US'),
    icon: 'bi-x-circle',
    tone: 'red',
    note: 'For the selected date',
  },
  {
    label: 'Late / excused',
    value: scopedCounts.value.other.toLocaleString('en-US'),
    icon: 'bi-clock-history',
    tone: 'amber',
    note: `${scopedCounts.value.recorded} records on this date`,
  },
])

const directorySubtitle = computed(() => {
  if (!selectedSectionUid.value) return 'Choose a class section to open its attendance register'
  if (hasFilters.value) {
    return `${filteredAttendance.value.length} of ${scopedAttendance.value.length} records match your filters`
  }
  return `${scopedAttendance.value.length} attendance records for the selected section and date`
})

const storageAlerts = computed(() => {
  const alerts = []

  if (store.storageState === 'unavailable' || store.persistenceState === 'unavailable') {
    alerts.push({
      variant: 'danger',
      icon: 'bi-hdd-stack',
      text:
        storageRetryError.value ||
        'Browser storage is unavailable. Attendance changes will last for this session only.',
      retry: true,
    })
  } else if (store.persistenceState === 'failed') {
    alerts.push({
      variant: 'danger',
      icon: 'bi-exclamation-triangle',
      text:
        storageRetryError.value ||
        store.persistenceError ||
        'Browser storage is not accepting attendance saves. Recent changes will be lost when you refresh.',
      retry: true,
    })
  }

  const recovery = store.recovery
  if (!recovery) return alerts

  if (recovery.kind === 'invalid-json' || recovery.kind === 'invalid-format') {
    alerts.push({
      variant: 'warning',
      icon: 'bi-shield-exclamation',
      text: 'Saved attendance data could not be read, so the list started empty. New changes can still be saved.',
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
  if (recovery.duplicateIdentity > 0) {
    changes.push(
      `${recovery.duplicateIdentity} duplicate student, section, and date ${
        recovery.duplicateIdentity === 1 ? 'record was' : 'records were'
      } removed`,
    )
  }

  if (changes.length) {
    alerts.push({
      variant: 'warning',
      icon: 'bi-shield-exclamation',
      text: `Some saved attendance records needed attention: ${changes.join('; ')}. Recoverable records were kept.`,
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
      text: `Student choices are limited to the currently loaded API page (${loaded} of ${total} shown). Enrollments that cannot be resolved from this page are excluded from the roster.`,
    }
  }

  if (!studentsStore.students.length) {
    return {
      variant: 'warning',
      icon: 'bi-people',
      text: 'No students are available yet. Add a student before recording attendance.',
    }
  }

  return null
})

const sectionDirectoryAlert = computed(() => {
  if (sectionsStore.sections.length) return null

  return {
    variant: 'warning',
    icon: 'bi-diagram-3',
    text: 'No class sections are available yet. Add a class section before recording attendance.',
  }
})

const unresolvedRosterAlert = computed(() => {
  const count = rosterResult.value.unresolvedCount
  if (!selectedSectionUid.value || !count) return null

  return {
    variant: 'warning',
    icon: 'bi-exclamation-triangle',
    text: `${count} active enrollment ${count === 1 ? 'record' : 'records'} for this section could not be matched to a student and ${count === 1 ? 'was' : 'were'} excluded from the roster.`,
  }
})

const emptyRosterAlert = computed(() => {
  if (
    !selectedSectionUid.value ||
    rosterResult.value.roster.length ||
    rosterResult.value.unresolvedCount
  ) {
    return null
  }

  return {
    variant: 'info',
    icon: 'bi-person-slash',
    text: 'No students are actively enrolled in this class section.',
  }
})

watch(
  () => sectionsStore.sections,
  (sections) => {
    if (!selectedSectionUid.value && sections.length) {
      selectedSectionUid.value = sections[0].uid
      return
    }

    if (selectedSectionUid.value && !sections.some((section) => section.uid === selectedSectionUid.value)) {
      selectedSectionUid.value = sections[0]?.uid || ''
    }
  },
  { immediate: true },
)

watch(
  [searchTerm, statusFilter, sortKey, sortDir, selectedSectionUid, selectedDate],
  () => {
    page.value = 1
  },
)

watch(totalPages, (value) => {
  if (page.value > value) page.value = value
})

function resetFilters() {
  searchTerm.value = ''
  statusFilter.value = ''
  sortKey.value = 'date'
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
  editingAttendance.value = null
  formOpen.value = true
}

function openEdit(record) {
  detailsOpen.value = false
  editingAttendance.value = record
  formOpen.value = true
}

function openView(record) {
  viewingAttendance.value = record
  detailsOpen.value = true
}

function askDelete(record) {
  deleteTarget.value = record
}

function closeDeleteDialog(open) {
  if (!open) deleteTarget.value = null
}

function confirmDelete() {
  if (!deleteTarget.value) return

  const target = deleteTarget.value
  const result = store.deleteAttendance(target.uid)

  if (!result.ok) {
    toast({
      variant: 'danger',
      title: 'Could not delete attendance',
      message: result.errors.form || 'The attendance record could not be deleted.',
    })
    deleteTarget.value = null
    return
  }

  if (viewingAttendance.value?.uid === target.uid) {
    viewingAttendance.value = null
    detailsOpen.value = false
  }

  const persisted = result.persisted !== false

  toast({
    variant: persisted ? 'success' : 'warning',
    title: persisted ? 'Attendance deleted' : 'Attendance removed for this session',
    message: persisted
      ? `${target.studentName} was removed from ${target.sectionCode}.`
      : 'Browser storage could not save this deletion. The record will return if you refresh.',
  })
  deleteTarget.value = null
}

function handleSaved({ mode, attendance, persisted }) {
  formOpen.value = false
  editingAttendance.value = null

  if (mode === 'add') page.value = 1

  const saved = persisted !== false
  const action = mode === 'edit' ? 'updated' : 'added'

  toast({
    variant: saved ? 'success' : 'warning',
    title: saved ? `Attendance ${action}` : `Attendance ${action} for this session`,
    message: saved
      ? `${attendance.studentUid} was saved to browser storage.`
      : 'Browser storage could not save this change. It will be lost when you refresh.',
  })
}

async function handleDetailsEdit(record) {
  detailsOpen.value = false
  await nextTick()
  editingAttendance.value = record
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
      title: 'Could not save attendance changes',
      message: storageRetryError.value,
    })
    return
  }

  if (result.ok) {
    toast({
      variant: 'success',
      title: 'Attendance changes saved',
      message: 'Browser storage accepted the pending attendance changes.',
    })
    return
  }

  storageRetryError.value = result.error || 'Browser storage is still not accepting saves.'
  toast({
    variant: 'danger',
    title: 'Could not save attendance changes',
    message: storageRetryError.value,
  })
}

async function handleQueryAction() {
  if (route.query.action !== 'add') return

  formOpen.value = false
  editingAttendance.value = null
  await nextTick()
  openAdd()
  await router.replace({ name: 'attendance' })
}

onMounted(async () => {
  store.loadAttendance()
  enrollmentsStore.loadEnrollments()
  sectionsStore.loadSections()
  subjectsStore.loadSubjects()
  semestersStore.loadSemesters()
  await handleQueryAction()
})

watch(() => route.query.action, handleQueryAction)
</script>

<template>
  <div>
    <PageHeader
      title="Attendance"
      description="Record attendance for actively enrolled students in each class section. Attendance records are stored in this browser and are not synced to the CampusHub server."
      eyebrow="Academic operations"
      eyebrow-icon="bi-clipboard-check"
    >
      <template #actions>
        <span class="demo-flag">
          <i class="bi bi-hdd" aria-hidden="true"></i>
          Browser storage
        </span>
        <button type="button" class="btn-ch btn-ch-primary" @click="openAdd">
          <i class="bi bi-plus-lg" aria-hidden="true"></i>
          Add attendance
        </button>
      </template>
    </PageHeader>

    <div v-if="store.loadState === 'loading'" class="ch-alert is-info" role="status">
      <i class="bi bi-arrow-repeat" aria-hidden="true"></i>
      <span>Loading attendance records from browser storage…</span>
    </div>

    <div v-if="store.loadState === 'error'" class="ch-alert is-warning" role="alert">
      <i class="bi bi-exclamation-triangle" aria-hidden="true"></i>
      <span>{{ store.loadError }}</span>
      <button
        type="button"
        class="btn-ch btn-ch-soft btn-ch-sm api-retry"
        @click="store.loadAttendance()"
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
      aria-label="Attendance storage status"
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

    <div v-if="studentDirectoryAlert" class="ch-alert" :class="`is-${studentDirectoryAlert.variant}`" role="status">
      <i class="bi" :class="studentDirectoryAlert.icon" aria-hidden="true"></i>
      <span>{{ studentDirectoryAlert.text }}</span>
    </div>

    <div v-if="sectionDirectoryAlert" class="ch-alert" :class="`is-${sectionDirectoryAlert.variant}`" role="alert">
      <i class="bi" :class="sectionDirectoryAlert.icon" aria-hidden="true"></i>
      <span>{{ sectionDirectoryAlert.text }}</span>
    </div>

    <div
      v-if="unresolvedRosterAlert"
      class="ch-alert"
      :class="`is-${unresolvedRosterAlert.variant}`"
      role="alert"
      aria-label="Unresolved roster students"
    >
      <i class="bi" :class="unresolvedRosterAlert.icon" aria-hidden="true"></i>
      <span>{{ unresolvedRosterAlert.text }}</span>
    </div>

    <div v-if="emptyRosterAlert" class="ch-alert" :class="`is-${emptyRosterAlert.variant}`" role="status">
      <i class="bi" :class="emptyRosterAlert.icon" aria-hidden="true"></i>
      <span>{{ emptyRosterAlert.text }}</span>
    </div>

    <section class="row g-3 g-xl-4 mb-1" aria-label="Attendance summary statistics">
      <div v-for="card in summaryCards" :key="card.label" class="col-sm-6 col-xl-3">
        <StatCard v-bind="card" />
      </div>
    </section>

    <section class="ch-card mt-3 mt-xl-4">
      <div class="ch-card-header has-border">
        <div>
          <h2 class="ch-card-title">Attendance register</h2>
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
        <div class="ch-field">
          <label class="ch-field-label" for="attendance-section-filter">Class section</label>
          <select
            id="attendance-section-filter"
            v-model="selectedSectionUid"
            class="form-select ch-filter-select"
          >
            <option value="" disabled>Select a class section</option>
            <option v-for="section in sectionOptions" :key="section.uid" :value="section.uid">
              {{ section.label }}
            </option>
          </select>
        </div>
        <div class="ch-field">
          <label class="ch-field-label" for="attendance-date-filter">Attendance date</label>
          <input
            id="attendance-date-filter"
            v-model="selectedDate"
            type="date"
            class="form-control"
          />
        </div>
        <SearchField
          v-model="searchTerm"
          class="toolbar-search"
          label="Search"
          placeholder="Search by student, section, subject, teacher, or status…"
        />
        <FilterSelect v-model="statusFilter" label="Status" :options="statusFilterOptions" />
      </div>

      <div v-if="pagedAttendance.length" class="ch-card-body is-flush">
        <AttendanceTable
          :attendance="pagedAttendance"
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
          :total="filteredAttendance.length"
          item-label="attendance records"
          @update:page="page = $event"
          @update:page-size="pageSize = $event"
        />
      </div>

      <div v-else class="ch-card-body">
        <EmptyState
          v-if="store.loadState === 'error'"
          icon="bi-exclamation-triangle"
          title="Attendance records unavailable"
          message="Browser storage could not be read. Try loading the attendance records again."
        >
          <button type="button" class="btn-ch btn-ch-primary" @click="store.loadAttendance()">
            <i class="bi bi-arrow-clockwise" aria-hidden="true"></i>
            Retry
          </button>
        </EmptyState>

        <EmptyState
          v-else-if="!selectedSectionUid"
          icon="bi-diagram-3"
          title="Select a class section"
          message="Choose a section to open its attendance register."
        />

        <EmptyState
          v-else-if="!rosterResult.roster.length"
          icon="bi-person-slash"
          title="No active roster students"
          message="Only students enrolled in this section can receive attendance records."
        />

        <EmptyState
          v-else-if="filteredAttendance.length === 0"
          icon="bi-clipboard-check"
          title="No attendance records for this date"
          message="Add attendance for a roster student or choose another date."
        >
          <button type="button" class="btn-ch btn-ch-primary" @click="openAdd">
            <i class="bi bi-plus-lg" aria-hidden="true"></i>
            Add attendance
          </button>
        </EmptyState>

        <EmptyState
          v-else
          icon="bi-search"
          title="No attendance records match your filters"
          message="Try another search term, status, or reset the filters."
        >
          <button type="button" class="btn-ch btn-ch-soft" @click="resetFilters">
            <i class="bi bi-arrow-counterclockwise" aria-hidden="true"></i>
            Clear filters
          </button>
        </EmptyState>

        <PaginationBar
          v-if="filteredAttendance.length > 0"
          :page="page"
          :page-size="pageSize"
          :total="filteredAttendance.length"
          item-label="attendance records"
          @update:page="page = $event"
          @update:page-size="pageSize = $event"
        />
      </div>
    </section>

    <AttendanceFormModal
      v-model="formOpen"
      :attendance="editingAttendance"
      :students="studentsStore.students"
      :sections="sectionOptions"
      :enrollments="enrollmentsStore.enrollments"
      :default-date="selectedDate"
      :default-section-uid="selectedSectionUid"
      :student-directory-notice="studentDirectoryAlert?.text || ''"
      @saved="handleSaved"
    />
    <AttendanceDetailsModal
      v-model="detailsOpen"
      :attendance="viewingAttendance"
      @edit="handleDetailsEdit"
    />

    <ConfirmDialog
      :model-value="Boolean(deleteTarget)"
      title="Delete attendance?"
      :message="`Delete attendance for ${deleteTarget?.studentName || 'this student'} on ${deleteTarget?.date || 'this date'}?`"
      confirm-label="Delete attendance"
      @update:model-value="closeDeleteDialog"
      @confirm="confirmDelete"
    />
  </div>
</template>

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
import GradeTable from '../components/grades/GradeTable.vue'
import GradeFormModal from '../components/grades/GradeFormModal.vue'
import GradeDetailsModal from '../components/grades/GradeDetailsModal.vue'
import { useGradesStore } from '../stores/grades'
import { useEnrollmentsStore } from '../stores/enrollments'
import { useSectionsStore } from '../stores/sections'
import { useSubjectsStore } from '../stores/subjects'
import { useSemestersStore } from '../stores/semesters'
import { useStudentsStore } from '../stores/students'
import { useToast } from '../composables/useToast'
import { demoGradeContext } from '../data/demoGrades'
import {
  ASSESSMENT_FIELDS,
  GRADE_SCALE,
  GRADE_SCALE_SUMMARY,
  calculateGradeResult,
  formatGpa,
  gradeSummary,
} from '../utils/grades'

const store = useGradesStore()
const studentsStore = useStudentsStore()
const sectionsStore = useSectionsStore()
const subjectsStore = useSubjectsStore()
const semestersStore = useSemestersStore()
const enrollmentsStore = useEnrollmentsStore()
const { push: toast } = useToast()
const route = useRoute()
const router = useRouter()

const searchTerm = ref('')
const semesterFilter = ref('')
const sectionFilter = ref('')
const subjectFilter = ref('')
const sortKey = ref('studentName')
const sortDir = ref('asc')
const page = ref(1)
const pageSize = ref(10)

const formOpen = ref(false)
const detailsOpen = ref(false)
const editingGrade = ref(null)
const viewingGrade = ref(null)
const deleteTarget = ref(null)

function semesterLabel(semester) {
  if (!semester) return 'Unknown semester'
  return semester.academicYear
    ? `${semester.name} · ${semester.academicYear}`
    : semester.name
}

const formStudents = computed(() =>
  studentsStore.students?.length ? studentsStore.students : demoGradeContext.students,
)
const formSections = computed(() =>
  sectionsStore.sections?.length ? sectionsStore.sections : demoGradeContext.sections,
)
const formSubjects = computed(() =>
  subjectsStore.subjects?.length ? subjectsStore.subjects : demoGradeContext.subjects,
)
const formSemesters = computed(() =>
  semestersStore.semesters?.length ? semestersStore.semesters : demoGradeContext.semesters,
)
const formEnrollments = computed(() =>
  enrollmentsStore.enrollments?.length
    ? enrollmentsStore.enrollments
    : demoGradeContext.enrollments,
)

const demoFallbackAlert = computed(() => {
  const missing = []
  if (!studentsStore.students?.length) missing.push('student directory')
  if (!sectionsStore.sections?.length) missing.push('class sections')
  if (!subjectsStore.subjects?.length) missing.push('subjects')
  if (!semestersStore.semesters?.length) missing.push('semesters')
  if (!enrollmentsStore.enrollments?.length) missing.push('enrollment roster')
  if (!missing.length) return ''

  return `Frontend-only demo relationships are active for: ${missing.join(', ')}. Grade options use these labeled examples until the related browser records are available.`
})

const resolvedGrades = computed(() => {
  const studentByUid = new Map(formStudents.value.map((student) => [student.uid, student]))
  const sectionByUid = new Map(formSections.value.map((section) => [section.uid, section]))
  const subjectByUid = new Map(formSubjects.value.map((subject) => [subject.uid, subject]))
  const semesterByUid = new Map(formSemesters.value.map((semester) => [semester.uid, semester]))

  return store.grades.map((record) => {
    const student = studentByUid.get(record.studentUid)
    const section = sectionByUid.get(record.sectionUid)
    const subject = subjectByUid.get(record.subjectUid)
    const semester = semesterByUid.get(record.semesterUid)
    const result = calculateGradeResult(record)

    return {
      ...record,
      studentName: student?.fullName || record.studentName || 'Unknown student',
      studentId: student?.studentId || record.studentId || '—',
      sectionCode: section?.code || record.sectionCode || 'Unknown section',
      subjectName: subject?.name || record.subjectName || 'Unknown subject',
      subjectCode: subject?.code || record.subjectCode || '',
      semesterUid: record.semesterUid || section?.semesterUid || '',
      semesterName: semester
        ? semesterLabel(semester)
        : record.semesterName || 'Unknown semester',
      totalScore: result.totalScore,
      letterGrade: result.letterGrade,
      gpa: result.gradePoints,
      status: result.status,
    }
  })
})

function optionList(entries) {
  return [
    { value: '', label: entries.allLabel },
    ...[...entries.values.values()].sort((left, right) =>
      left.label.localeCompare(right.label, 'en', { sensitivity: 'base', numeric: true }),
    ),
  ]
}

const semesterFilterOptions = computed(() => {
  const options = new Map()
  formSemesters.value.forEach((semester) => {
    options.set(semester.uid, { value: semester.uid, label: semesterLabel(semester) })
  })
  resolvedGrades.value.forEach((grade) => {
    if (!grade.semesterUid) return
    options.set(grade.semesterUid, {
      value: grade.semesterUid,
      label: grade.semesterName,
    })
  })
  return optionList({ values: options, allLabel: 'All semesters' })
})

const sectionFilterOptions = computed(() => {
  const options = new Map()
  formSections.value.forEach((section) => {
    options.set(section.uid, { value: section.uid, label: section.code || section.uid })
  })
  resolvedGrades.value.forEach((grade) => {
    if (!grade.sectionUid) return
    options.set(grade.sectionUid, {
      value: grade.sectionUid,
      label: grade.sectionCode,
    })
  })
  return optionList({ values: options, allLabel: 'All sections' })
})

const subjectFilterOptions = computed(() => {
  const options = new Map()
  formSubjects.value.forEach((subject) => {
    options.set(subject.uid, {
      value: subject.uid,
      label: subject.code ? `${subject.code} · ${subject.name}` : subject.name,
    })
  })
  resolvedGrades.value.forEach((grade) => {
    if (!grade.subjectUid) return
    options.set(grade.subjectUid, {
      value: grade.subjectUid,
      label: grade.subjectCode
        ? `${grade.subjectCode} · ${grade.subjectName}`
        : grade.subjectName,
    })
  })
  return optionList({ values: options, allLabel: 'All subjects' })
})

const hasFilters = computed(
  () =>
    searchTerm.value.trim() !== '' ||
    semesterFilter.value !== '' ||
    sectionFilter.value !== '' ||
    subjectFilter.value !== '',
)

const filteredGrades = computed(() => {
  const term = searchTerm.value.trim().toLowerCase()

  const matches = resolvedGrades.value.filter((grade) => {
    if (semesterFilter.value && grade.semesterUid !== semesterFilter.value) return false
    if (sectionFilter.value && grade.sectionUid !== sectionFilter.value) return false
    if (subjectFilter.value && grade.subjectUid !== subjectFilter.value) return false
    if (!term) return true

    return [
      grade.studentName,
      grade.studentId,
      grade.sectionCode,
      grade.subjectName,
      grade.subjectCode,
      grade.semesterName,
      grade.letterGrade,
      grade.status,
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

    if (key === 'totalScore' || key === 'gpa') {
      return (Number(left[key] ?? 0) - Number(right[key] ?? 0)) * direction
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
  Math.max(1, Math.ceil(filteredGrades.value.length / pageSize.value)),
)

const pagedGrades = computed(() => {
  const start = (page.value - 1) * pageSize.value
  return filteredGrades.value.slice(start, start + pageSize.value)
})

const currentSummary = computed(() => gradeSummary(filteredGrades.value))

const summaryCards = computed(() => [
  {
    label: 'Students graded',
    value: currentSummary.value.studentCount.toLocaleString('en-US'),
    icon: 'bi-people',
    tone: 'indigo',
    note: 'Distinct students in the current view',
  },
  {
    label: 'Average score',
    value: currentSummary.value.averageScore.toFixed(1),
    icon: 'bi-bar-chart-line',
    tone: 'blue',
    note: 'Weighted score out of 100',
  },
  {
    label: 'Average GPA',
    value: formatGpa(currentSummary.value.averageGpa),
    icon: 'bi-mortarboard',
    tone: 'green',
    note: 'Mean grade points on a 4.0 scale',
  },
  {
    label: 'Pass rate',
    value: `${currentSummary.value.passRate.toFixed(1)}%`,
    icon: 'bi-check2-circle',
    tone: 'amber',
    note: `${currentSummary.value.passCount} of ${currentSummary.value.totalCount} records passed`,
  },
])

const directorySubtitle = computed(() => {
  if (!store.totalGrades) return 'No grade records yet'
  if (hasFilters.value) {
    return `${filteredGrades.value.length} of ${store.totalGrades} grades match your filters`
  }
  return `${store.totalGrades} grade records in this browser`
})

const storageAlerts = computed(() => {
  const alerts = []

  if (store.storageState === 'unavailable' || store.persistenceState === 'unavailable') {
    alerts.push({
      variant: 'danger',
      icon: 'bi-hdd-stack',
      text: 'Browser storage is unavailable. Grade changes will last for this session only.',
      retry: false,
    })
  } else if (store.persistenceState === 'failed') {
    alerts.push({
      variant: 'danger',
      icon: 'bi-exclamation-triangle',
      text: 'Browser storage is not accepting grade saves. Recent changes will be lost when you refresh.',
      retry: true,
    })
  }

  const recovery = store.recovery
  if (!recovery) return alerts

  if (recovery.kind === 'invalid-json' || recovery.kind === 'invalid-format') {
    alerts.push({
      variant: 'warning',
      icon: 'bi-shield-exclamation',
      text: 'Saved grade data could not be read, so the list started empty. New changes can still be saved.',
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

  if (changes.length) {
    alerts.push({
      variant: 'warning',
      icon: 'bi-shield-exclamation',
      text: `Some saved grade records needed attention: ${changes.join('; ')}. Recoverable records were kept.`,
      retry: false,
    })
  }

  return alerts
})

function scaleLabel(entry, index) {
  if (index === 0) return '90–100'
  if (entry.min === 0) return 'Below 60'
  const next = GRADE_SCALE[index - 1]
  return `${entry.min}–${Number(next.min) - 1}`
}

watch([searchTerm, semesterFilter, sectionFilter, subjectFilter], () => {
  page.value = 1
})

watch(totalPages, (value) => {
  if (page.value > value) page.value = value
})

function resetFilters() {
  searchTerm.value = ''
  semesterFilter.value = ''
  sectionFilter.value = ''
  subjectFilter.value = ''
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
  editingGrade.value = null
  formOpen.value = true
}

function openEdit(grade) {
  detailsOpen.value = false
  editingGrade.value = grade
  formOpen.value = true
}

function openView(grade) {
  viewingGrade.value = grade
  detailsOpen.value = true
}

function askDelete(grade) {
  deleteTarget.value = grade
}

function closeDeleteDialog(open) {
  if (!open) deleteTarget.value = null
}

function confirmDelete() {
  if (!deleteTarget.value) return

  const target = deleteTarget.value
  const result = store.deleteGrade(target.uid)

  if (!result.ok) {
    toast({
      variant: 'danger',
      title: 'Could not delete grade',
      message: result.errors.form || 'The grade could not be deleted.',
    })
    deleteTarget.value = null
    return
  }

  if (viewingGrade.value?.uid === target.uid) {
    viewingGrade.value = null
    detailsOpen.value = false
  }

  const persisted = result.persisted !== false
  toast({
    variant: persisted ? 'success' : 'warning',
    title: persisted ? 'Grade deleted' : 'Grade removed for this session',
    message: persisted
      ? `${target.studentName} · ${target.subjectName} was removed from browser storage.`
      : 'Browser storage could not save this deletion. The grade will return if you refresh.',
  })
  deleteTarget.value = null
}

function handleSaved({ mode, grade, persisted }) {
  formOpen.value = false
  editingGrade.value = null

  if (mode === 'add') page.value = 1

  const saved = persisted !== false
  const action = mode === 'edit' ? 'updated' : 'added'

  toast({
    variant: saved ? 'success' : 'warning',
    title: saved
      ? mode === 'edit'
        ? 'Grade updated'
        : 'Grade added'
      : `Grade ${action} for this session`,
    message: saved
      ? `${grade.studentName} · ${grade.subjectName} was calculated and saved to browser storage.`
      : 'Browser storage could not save this change. It will be lost when you refresh.',
  })
}

async function handleDetailsEdit(grade) {
  detailsOpen.value = false
  await nextTick()
  editingGrade.value = grade
  formOpen.value = true
}

async function handleQueryAction() {
  if (route.query.action !== 'add') return

  formOpen.value = false
  editingGrade.value = null
  await nextTick()
  openAdd()
  await router.replace({ name: 'grades' })
}

onMounted(async () => {
  store.loadGrades()
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
      title="Grades & GPA"
      description="Record assessment scores, review weighted totals and letter grades, and track GPA using frontend-only grade data stored in this browser."
      eyebrow="Academic operations"
      eyebrow-icon="bi-mortarboard"
    >
      <template #actions>
        <span class="demo-flag">
          <i class="bi bi-hdd" aria-hidden="true"></i>
          Browser storage
        </span>
        <button type="button" class="btn-ch btn-ch-primary" @click="openAdd">
          <i class="bi bi-plus-lg" aria-hidden="true"></i>
          Add grade
        </button>
      </template>
    </PageHeader>

    <div v-if="store.loadState === 'loading'" class="ch-alert is-info" role="status">
      <i class="bi bi-arrow-repeat" aria-hidden="true"></i>
      <span>Loading grade records from browser storage…</span>
    </div>

    <div v-if="store.loadState === 'error'" class="ch-alert is-warning" role="alert">
      <i class="bi bi-exclamation-triangle" aria-hidden="true"></i>
      <span>{{ store.loadError }}</span>
      <button
        type="button"
        class="btn-ch btn-ch-soft btn-ch-sm api-retry"
        @click="store.loadGrades()"
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
      <button
        v-if="alert.retry"
        type="button"
        class="btn-ch btn-ch-soft btn-ch-sm api-retry"
        @click="store.retryPersist()"
      >
        <i class="bi bi-arrow-clockwise" aria-hidden="true"></i>
        Retry save
      </button>
    </div>

    <div v-if="demoFallbackAlert" class="ch-alert is-info" role="status">
      <i class="bi bi-info-circle" aria-hidden="true"></i>
      <span>{{ demoFallbackAlert }}</span>
    </div>

    <section class="row g-3 g-xl-4 mb-1" aria-label="Grade summary statistics">
      <div v-for="card in summaryCards" :key="card.label" class="col-sm-6 col-xl-3">
        <StatCard v-bind="card" />
      </div>
    </section>

    <section class="ch-card mt-3 mt-xl-4">
      <div class="ch-card-header has-border">
        <div>
          <h2 class="ch-card-title">Grade records</h2>
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

      <div class="data-toolbar grades-toolbar">
        <SearchField
          v-model="searchTerm"
          class="toolbar-search"
          label="Search"
          placeholder="Search by student, ID, section, subject, or grade…"
        />
        <FilterSelect v-model="semesterFilter" label="Semester" :options="semesterFilterOptions" />
        <FilterSelect v-model="sectionFilter" label="Section" :options="sectionFilterOptions" />
        <FilterSelect v-model="subjectFilter" label="Subject" :options="subjectFilterOptions" />
      </div>

      <div v-if="pagedGrades.length" class="ch-card-body is-flush">
        <GradeTable
          :grades="pagedGrades"
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
          :total="filteredGrades.length"
          item-label="grades"
          @update:page="page = $event"
          @update:page-size="pageSize = $event"
        />
      </div>

      <div v-else class="ch-card-body">
        <EmptyState
          v-if="store.loadState === 'error'"
          icon="bi-exclamation-triangle"
          title="Grade records unavailable"
          message="Browser storage could not be read. Try loading the grade list again."
        >
          <button type="button" class="btn-ch btn-ch-primary" @click="store.loadGrades()">
            <i class="bi bi-arrow-clockwise" aria-hidden="true"></i>
            Retry
          </button>
        </EmptyState>

        <EmptyState
          v-else-if="store.totalGrades === 0"
          icon="bi-mortarboard"
          title="No grades recorded yet"
          message="Add a grade to calculate a weighted total, letter grade, GPA, and pass status."
        >
          <button type="button" class="btn-ch btn-ch-primary" @click="openAdd">
            <i class="bi bi-plus-lg" aria-hidden="true"></i>
            Add grade
          </button>
        </EmptyState>

        <EmptyState
          v-else-if="filteredGrades.length === 0"
          icon="bi-search"
          title="No grades match your filters"
          message="Try another search term or reset the semester, section, and subject filters."
        >
          <button type="button" class="btn-ch btn-ch-soft" @click="resetFilters">
            <i class="bi bi-arrow-counterclockwise" aria-hidden="true"></i>
            Clear filters
          </button>
        </EmptyState>

        <EmptyState
          v-else
          icon="bi-arrow-left-right"
          title="No grades on this page"
          message="Return to the first page to keep browsing the grade records."
        >
          <button type="button" class="btn-ch btn-ch-soft" @click="page = 1">
            <i class="bi bi-arrow-counterclockwise" aria-hidden="true"></i>
            Go to first page
          </button>
        </EmptyState>

        <PaginationBar
          v-if="filteredGrades.length > 0"
          :page="page"
          :page-size="pageSize"
          :total="filteredGrades.length"
          item-label="grades"
          @update:page="page = $event"
          @update:page-size="pageSize = $event"
        />
      </div>
    </section>

    <section class="ch-card mt-3 mt-xl-4" aria-labelledby="grading-scale-heading">
      <div class="ch-card-header has-border">
        <div>
          <h2 id="grading-scale-heading" class="ch-card-title">Grading scale</h2>
          <p class="ch-card-subtitle">The same rules are used for every record and live preview.</p>
        </div>
      </div>
      <div class="ch-card-body grading-scale-body">
        <p class="form-note">
          <i class="bi bi-calculator" aria-hidden="true"></i>
          {{ GRADE_SCALE_SUMMARY }}
        </p>
        <div class="grading-scale-grid">
          <div>
            <h3 class="scale-heading">Assessment weights</h3>
            <ul class="scale-list">
              <li v-for="field in ASSESSMENT_FIELDS" :key="field.key">
                <span>{{ field.label }}</span>
                <strong>{{ Math.round(field.weight * 100) }}%</strong>
              </li>
            </ul>
          </div>
          <div>
            <h3 class="scale-heading">Letter grades</h3>
            <ul class="scale-list">
              <li v-for="(entry, index) in GRADE_SCALE" :key="entry.letter">
                <span>{{ scaleLabel(entry, index) }}</span>
                <strong>{{ entry.letter }} · {{ formatGpa(entry.gradePoints) }} · {{ entry.status }}</strong>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>

    <GradeFormModal
      v-model="formOpen"
      :grade="editingGrade"
      :students="formStudents"
      :sections="formSections"
      :subjects="formSubjects"
      :semesters="formSemesters"
      :enrollments="formEnrollments"
      :default-section-uid="sectionFilter"
      :default-subject-uid="subjectFilter"
      :default-semester-uid="semesterFilter"
      :student-directory-notice="demoFallbackAlert"
      @saved="handleSaved"
    />
    <GradeDetailsModal v-model="detailsOpen" :grade="viewingGrade" @edit="handleDetailsEdit" />

    <ConfirmDialog
      :model-value="Boolean(deleteTarget)"
      title="Delete grade?"
      confirm-label="Delete grade"
      variant="danger"
      @update:model-value="closeDeleteDialog"
      @confirm="confirmDelete"
      @cancel="closeDeleteDialog(false)"
    >
      <p v-if="deleteTarget">
        You are about to permanently delete the grade for
        <strong>{{ deleteTarget.studentName }}</strong>
        in {{ deleteTarget.subjectName }} from this browser.
      </p>
    </ConfirmDialog>
  </div>
</template>

<style scoped>
.grading-scale-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1.5rem;
}

.scale-heading {
  margin-bottom: 0.65rem;
  font-size: 1rem;
  font-weight: 700;
}

.scale-list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.scale-list li {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.55rem 0;
  border-bottom: 1px solid rgba(15, 23, 42, 0.08);
}

.scale-list strong {
  text-align: right;
}

@media (max-width: 767.98px) {
  .grading-scale-grid {
    grid-template-columns: 1fr;
    gap: 1rem;
  }
}
</style>

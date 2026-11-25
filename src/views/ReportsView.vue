<script setup>
import { computed, onMounted, ref } from 'vue'
import PageHeader from '../components/common/PageHeader.vue'
import StatCard from '../components/common/StatCard.vue'
import FilterSelect from '../components/common/FilterSelect.vue'
import EmptyState from '../components/common/EmptyState.vue'
import ChartCard from '../components/common/ChartCard.vue'
import AttendanceChart from '../components/dashboard/AttendanceChart.vue'
import ReportBarChart from '../components/reports/ReportBarChart.vue'
import { useGradesStore } from '../stores/grades'
import { useAttendanceStore } from '../stores/attendance'
import { useEnrollmentsStore } from '../stores/enrollments'
import { useSectionsStore } from '../stores/sections'
import { useSubjectsStore } from '../stores/subjects'
import { useSemestersStore } from '../stores/semesters'
import { useCoursesStore } from '../stores/courses'
import { useStudentsStore } from '../stores/students'
import { useTeachersStore } from '../stores/teachers'
import { useToast } from '../composables/useToast'
import { toLocalDateKey } from '../utils/attendance'
import { gradeSummary } from '../utils/grades'
import {
  REPORT_TYPES,
  attendanceRows,
  attendanceTotals,
  buildCsv,
  gradeBandCounts,
  gradeRows,
  isWithinDateRange,
  performanceRows,
  sectionEnrollmentRows,
  studentDepartmentRows,
} from '../utils/reports'

const gradesStore = useGradesStore()
const attendanceStore = useAttendanceStore()
const enrollmentsStore = useEnrollmentsStore()
const sectionsStore = useSectionsStore()
const subjectsStore = useSubjectsStore()
const semestersStore = useSemestersStore()
const coursesStore = useCoursesStore()
const studentsStore = useStudentsStore()
const teachersStore = useTeachersStore()
const { push: toast } = useToast()

const REPORT_STUDENT_QUERY = Object.freeze({ page: 0, size: 100 })

const studentTotal = computed(() => {
  if (studentsStore.isApiMode) {
    return (
      studentsStore.totalStudents || studentsStore.filteredTotal || studentsStore.students.length
    )
  }
  return studentsStore.students.length
})
const teacherTotal = computed(
  () =>
    teachersStore.totalTeachers ||
    teachersStore.teacherOptions.length ||
    teachersStore.teachers.length,
)

const reportType = ref('all')
const semesterFilter = ref('')
const sectionFilter = ref('')
const startDate = ref('')
const endDate = ref('')

const dateRangeError = computed(() => {
  if (startDate.value && endDate.value && startDate.value > endDate.value) {
    return 'Start date must be on or before end date.'
  }
  return ''
})

const rangeIsValid = computed(() => !dateRangeError.value)
const hasScopeFilter = computed(() => Boolean(semesterFilter.value || sectionFilter.value))

const sectionByUid = computed(
  () => new Map(sectionsStore.sections.map((section) => [section.uid, section])),
)

const semesterOptions = computed(() => {
  const options = new Map()
  semestersStore.semesters.forEach((semester) => {
    options.set(semester.uid, {
      value: semester.uid,
      label: semester.academicYear ? `${semester.name} · ${semester.academicYear}` : semester.name,
    })
  })
  sectionsStore.sections.forEach((section) => {
    if (!section.semesterUid || options.has(section.semesterUid)) return
    options.set(section.semesterUid, {
      value: section.semesterUid,
      label: `${section.code || 'Section'} semester`,
    })
  })
  return [
    { value: '', label: 'All semesters' },
    ...[...options.values()].sort((left, right) =>
      left.label.localeCompare(right.label, 'en', { sensitivity: 'base', numeric: true }),
    ),
  ]
})

const sectionOptions = computed(() => [
  { value: '', label: 'All sections' },
  ...[...sectionsStore.sections]
    .sort((left, right) =>
      String(left.code ?? '').localeCompare(String(right.code ?? ''), 'en', {
        sensitivity: 'base',
        numeric: true,
      }),
    )
    .map((section) => ({ value: section.uid, label: section.code || section.uid })),
])

const scopedEnrollments = computed(() => {
  if (!rangeIsValid.value) return []

  return enrollmentsStore.enrollments.filter((enrollment) => {
    if (sectionFilter.value && enrollment.sectionUid !== sectionFilter.value) return false
    if (semesterFilter.value) {
      const section = sectionByUid.value.get(enrollment.sectionUid)
      if (section?.semesterUid !== semesterFilter.value) return false
    }
    return true
  })
})

const scopedStudents = computed(() => {
  if (!rangeIsValid.value) return []

  const students = studentsStore.students.filter((student) =>
    isWithinDateRange(student.enrollmentDate, startDate.value, endDate.value),
  )

  if (!hasScopeFilter.value) return students
  const scopedUids = new Set(scopedEnrollments.value.map((enrollment) => enrollment.studentUid))
  return students.filter((student) => scopedUids.has(student.uid))
})

const scopedAttendance = computed(() => {
  if (!rangeIsValid.value) return []

  return attendanceStore.attendance.filter((record) => {
    if (!isWithinDateRange(record.date, startDate.value, endDate.value)) return false
    if (sectionFilter.value && record.sectionUid !== sectionFilter.value) return false
    if (semesterFilter.value) {
      const section = sectionByUid.value.get(record.sectionUid)
      if (section?.semesterUid !== semesterFilter.value) return false
    }
    return true
  })
})

const scopedSections = computed(() => {
  if (!rangeIsValid.value) return []

  return sectionsStore.sections.filter((section) => {
    if (sectionFilter.value && section.uid !== sectionFilter.value) return false
    if (semesterFilter.value && section.semesterUid !== semesterFilter.value) return false
    return true
  })
})

const scopedGrades = computed(() => {
  if (!rangeIsValid.value) return []

  return gradesStore.grades.filter((grade) => {
    if (!isWithinDateRange(grade.createdAt, startDate.value, endDate.value)) return false
    const section = sectionByUid.value.get(grade.sectionUid)
    const semesterUid = grade.semesterUid || section?.semesterUid || ''
    if (sectionFilter.value && grade.sectionUid !== sectionFilter.value) return false
    if (semesterFilter.value && semesterUid !== semesterFilter.value) return false
    return true
  })
})

const enrollmentRows = computed(() => studentDepartmentRows(scopedStudents.value))
const enrollmentSectionRows = computed(() =>
  sectionEnrollmentRows(scopedEnrollments.value, sectionsStore.sections),
)
const attendanceSummary = computed(() => attendanceTotals(scopedAttendance.value))
const attendanceReportRows = computed(() =>
  attendanceRows(scopedAttendance.value, sectionsStore.sections),
)
const performanceReportRows = computed(() =>
  performanceRows(coursesStore.courses, subjectsStore.subjects, scopedSections.value),
)
const gradeReportRows = computed(() =>
  gradeRows(scopedGrades.value, {
    students: studentsStore.students,
    sections: sectionsStore.sections,
    subjects: subjectsStore.subjects,
    semesters: semestersStore.semesters,
  }),
)
const gradeBands = computed(() => gradeBandCounts(scopedGrades.value))
const gradeReportSummary = computed(() => gradeSummary(scopedGrades.value))

const visibleReports = computed(() => {
  if (reportType.value === 'all') {
    return ['enrollment', 'attendance', 'performance', 'grades']
  }
  return [reportType.value]
})

const hasReportData = computed(() =>
  visibleReports.value.some((report) => {
    if (report === 'enrollment') {
      return enrollmentRows.value.length > 0 || enrollmentSectionRows.value.length > 0
    }
    if (report === 'attendance') return attendanceReportRows.value.length > 0
    if (report === 'performance') return performanceReportRows.value.length > 0
    return gradeReportRows.value.length > 0
  }),
)

const summaryCards = computed(() => {
  const studentCount = studentTotal.value
  const teacherCount = teacherTotal.value
  return [
    {
      label: 'Total students',
      value: studentCount ? studentCount.toLocaleString('en-US') : '0',
      icon: 'bi-people',
      tone: 'indigo',
      note: studentsStore.isApiMode
        ? 'Student records loaded in this session'
        : 'Student records available in this browser',
    },
    {
      label: 'Total teachers',
      value: teacherCount ? teacherCount.toLocaleString('en-US') : '—',
      icon: 'bi-person-video3',
      tone: 'blue',
      note: teacherCount
        ? 'Teacher records loaded in this session'
        : 'No teacher records available in frontend data',
    },
    {
      label: 'Total courses',
      value: coursesStore.courses.length.toLocaleString('en-US'),
      icon: 'bi-journal-bookmark',
      tone: 'green',
      note: 'Course records available in this browser',
    },
    {
      label: 'Total sections',
      value: sectionsStore.sections.length.toLocaleString('en-US'),
      icon: 'bi-diagram-3',
      tone: 'amber',
      note: 'Class sections available in this browser',
    },
    {
      label: 'Total enrollments',
      value: enrollmentsStore.enrollments.length.toLocaleString('en-US'),
      icon: 'bi-person-check',
      tone: 'rose',
      note: 'Enrollment records available in this browser',
    },
  ]
})

const sourcesLoading = computed(
  () =>
    studentsStore.apiState === 'loading' ||
    studentsStore.summaryState === 'loading' ||
    teachersStore.optionsState === 'loading',
)

const sourceErrors = computed(() => {
  const errors = []

  if (studentsStore.apiState === 'error') {
    errors.push(
      `Students: ${studentsStore.loadError || 'The student directory could not be loaded.'}`,
    )
  } else if (studentsStore.summaryState === 'error') {
    errors.push(
      `Student summary: ${studentsStore.summaryError || 'Student totals could not be loaded.'}`,
    )
  }

  if (teachersStore.optionsState === 'error') {
    errors.push(
      `Teachers: ${teachersStore.optionsError || 'The teacher directory could not be loaded.'}`,
    )
  }

  return errors
})

const filterNotice = computed(() => {
  const notices = []

  if (startDate.value || endDate.value) {
    notices.push(
      'Date range applies to student enrollment dates, attendance dates, and grade creation dates.',
    )
  }
  if (hasScopeFilter.value) {
    notices.push('Semester and section filters apply through section-linked records.')
  }
  if (!teacherTotal.value && !sourceErrors.value.length) {
    notices.push('Teacher totals are unavailable because no teacher records are loaded here.')
  }

  return notices
})

const emptyMessage = computed(() =>
  dateRangeError.value
    ? 'Fix the date range to calculate reports.'
    : 'No matching frontend records are available for the selected filters.',
)

const reportTypeLabel = computed(
  () => REPORT_TYPES.find((type) => type.value === reportType.value)?.label || 'All reports',
)

const csvRows = computed(() => {
  const rows = [['Report', 'Category', 'Item', 'Metric', 'Value']]

  if (!rangeIsValid.value) return rows

  if (visibleReports.value.includes('enrollment')) {
    enrollmentRows.value.forEach((row) => {
      rows.push(['Student enrollment', 'Department', row.department, 'Students', row.total])
      rows.push(['Student enrollment', 'Department', row.department, 'Active', row.active])
      rows.push(['Student enrollment', 'Department', row.department, 'Inactive', row.inactive])
    })
    enrollmentSectionRows.value.forEach((row) => {
      rows.push(['Student enrollment', 'Section', row.sectionCode, 'Enrolled', row.enrolled])
      rows.push(['Student enrollment', 'Section', row.sectionCode, 'Dropped', row.dropped])
      rows.push(['Student enrollment', 'Section', row.sectionCode, 'Completed', row.completed])
    })
  }

  if (visibleReports.value.includes('attendance')) {
    Object.entries(attendanceSummary.value).forEach(([metric, value]) => {
      if (metric === 'total') return
      rows.push(['Attendance', 'Overall', 'All sections', metric, value])
    })
    attendanceReportRows.value.forEach((row) => {
      rows.push(['Attendance', 'Section', row.sectionCode, 'Attendance rate', row.attendanceRate])
    })
  }

  if (visibleReports.value.includes('performance')) {
    performanceReportRows.value.forEach((row) => {
      rows.push(['Academic performance', 'Department', row.department, 'Courses', row.courses])
      rows.push(['Academic performance', 'Department', row.department, 'Subjects', row.subjects])
      rows.push(['Academic performance', 'Department', row.department, 'Sections', row.sections])
      rows.push([
        'Academic performance',
        'Department',
        row.department,
        'Credit hours',
        row.creditHours,
      ])
    })
  }

  if (visibleReports.value.includes('grades')) {
    rows.push([
      'Grades & GPA',
      'Overall',
      'All grades',
      'Average score',
      gradeReportSummary.value.averageScore,
    ])
    rows.push([
      'Grades & GPA',
      'Overall',
      'All grades',
      'Average GPA',
      gradeReportSummary.value.averageGpa,
    ])
    rows.push([
      'Grades & GPA',
      'Overall',
      'All grades',
      'Pass rate',
      gradeReportSummary.value.passRate,
    ])
    gradeReportRows.value.forEach((row) => {
      rows.push(['Grades & GPA', 'Student', row.studentName, 'Total score', row.totalScore])
      rows.push(['Grades & GPA', 'Student', row.studentName, 'GPA', row.gpa])
      rows.push(['Grades & GPA', 'Student', row.studentName, 'Letter grade', row.letterGrade])
    })
  }

  return rows
})

const canExport = computed(() => csvRows.value.length > 1)

function resetFilters() {
  reportType.value = 'all'
  semesterFilter.value = ''
  sectionFilter.value = ''
  startDate.value = ''
  endDate.value = ''
}

function exportCsv() {
  if (!canExport.value) {
    toast({
      variant: 'warning',
      title: 'Nothing to export',
      message: 'Adjust the filters or add frontend records before exporting a report.',
    })
    return
  }

  const blob = new Blob(['\uFEFF', buildCsv(csvRows.value)], {
    type: 'text/csv;charset=utf-8;',
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `campushub-report-${reportType.value}-${toLocalDateKey(new Date())}.csv`
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)

  toast({
    variant: 'success',
    title: 'Report exported',
    message: `${reportTypeLabel.value} was exported as CSV from frontend data.`,
  })
}

function printReport() {
  if (typeof window !== 'undefined') window.print()
}

async function loadReportSources({ force = false } = {}) {
  const tasks = []

  if (force || studentsStore.apiState === 'idle') {
    tasks.push(Promise.resolve().then(() => studentsStore.loadStudents(REPORT_STUDENT_QUERY)))
  }
  if (force || studentsStore.summaryState === 'idle') {
    tasks.push(Promise.resolve().then(() => studentsStore.loadSummary()))
  }
  if (force || teachersStore.optionsState === 'idle') {
    tasks.push(Promise.resolve().then(() => teachersStore.loadTeacherOptions(force)))
  }

  await Promise.allSettled(tasks)
}

function retryReportSources() {
  return loadReportSources({ force: true })
}

onMounted(() => {
  gradesStore.loadGrades()
  attendanceStore.loadAttendance()
  enrollmentsStore.loadEnrollments()
  sectionsStore.loadSections()
  subjectsStore.loadSubjects()
  semestersStore.loadSemesters()
  coursesStore.loadCourses()
  loadReportSources()
})
</script>

<template>
  <div>
    <PageHeader
      title="Reports"
      description="Generate enrollment, attendance, academic performance, and GPA summaries calculated only from frontend data already available in this browser. No server reports are generated."
      eyebrow="Insights"
      eyebrow-icon="bi-bar-chart-line"
    >
      <template #actions>
        <button type="button" class="btn-ch btn-ch-soft no-print" @click="printReport">
          <i class="bi bi-printer" aria-hidden="true"></i>
          Print
        </button>
        <button
          type="button"
          class="btn-ch btn-ch-primary no-print"
          :disabled="!canExport"
          @click="exportCsv"
        >
          <i class="bi bi-download" aria-hidden="true"></i>
          Export CSV
        </button>
      </template>
    </PageHeader>

    <div v-if="dateRangeError" class="ch-alert is-warning no-print" role="alert">
      <i class="bi bi-exclamation-triangle" aria-hidden="true"></i>
      <span>{{ dateRangeError }}</span>
    </div>

    <div v-if="sourcesLoading" class="ch-alert is-info no-print" role="status">
      <i class="bi bi-arrow-repeat" aria-hidden="true"></i>
      <span>Loading student and teacher records for this report…</span>
    </div>

    <div v-if="sourceErrors.length" class="ch-alert is-warning no-print" role="alert">
      <i class="bi bi-exclamation-triangle" aria-hidden="true"></i>
      <span>{{ sourceErrors.join(' ') }}</span>
      <button
        type="button"
        class="btn-ch btn-ch-soft btn-ch-sm api-retry"
        @click="retryReportSources"
      >
        <i class="bi bi-arrow-clockwise" aria-hidden="true"></i>
        Retry
      </button>
    </div>

    <section class="row g-3 g-xl-4 mb-1" aria-label="Report summary statistics">
      <div v-for="card in summaryCards" :key="card.label" class="col-sm-6 col-xl-2">
        <StatCard v-bind="card" />
      </div>
    </section>

    <section class="ch-card mt-3 mt-xl-4">
      <div class="ch-card-header has-border">
        <div>
          <h2 class="ch-card-title">Report filters</h2>
          <p class="ch-card-subtitle">Narrow the frontend records used in each report.</p>
        </div>
        <button type="button" class="btn-ch btn-ch-ghost btn-ch-sm no-print" @click="resetFilters">
          <i class="bi bi-arrow-counterclockwise" aria-hidden="true"></i>
          Reset filters
        </button>
      </div>

      <div class="data-toolbar reports-toolbar no-print">
        <FilterSelect v-model="reportType" label="Report type" :options="REPORT_TYPES" />
        <FilterSelect v-model="semesterFilter" label="Semester" :options="semesterOptions" />
        <FilterSelect v-model="sectionFilter" label="Section" :options="sectionOptions" />
        <div class="ch-field">
          <label class="ch-field-label" for="report-start-date">Start date</label>
          <input
            id="report-start-date"
            v-model="startDate"
            type="date"
            class="form-control"
            :max="endDate || undefined"
            :aria-invalid="dateRangeError ? 'true' : 'false'"
          />
        </div>
        <div class="ch-field">
          <label class="ch-field-label" for="report-end-date">End date</label>
          <input
            id="report-end-date"
            v-model="endDate"
            type="date"
            class="form-control"
            :min="startDate || undefined"
            :aria-invalid="dateRangeError ? 'true' : 'false'"
          />
        </div>
      </div>

      <div v-if="filterNotice.length" class="ch-card-body report-notices">
        <p v-for="notice in filterNotice" :key="notice" class="form-note mb-1">
          <i class="bi bi-info-circle" aria-hidden="true"></i>
          {{ notice }}
        </p>
      </div>

      <div v-if="!hasReportData && rangeIsValid" class="ch-card-body">
        <EmptyState
          icon="bi-search"
          title="No report data available"
          message="No matching frontend records are available. Adjust the filters or add records in the relevant module."
        />
      </div>
    </section>

    <section
      v-if="visibleReports.includes('enrollment')"
      class="row g-3 g-xl-4 mt-3 mt-xl-4"
      aria-label="Student enrollment report"
    >
      <div class="col-xl-5">
        <ChartCard title="Enrollment by department" subtitle="Scoped student records">
          <ReportBarChart
            v-if="enrollmentRows.length"
            :labels="enrollmentRows.map((row) => row.department)"
            :values="enrollmentRows.map((row) => row.total)"
            dataset-label="Students"
          />
          <EmptyState v-else icon="bi-people" title="No enrollment data" :message="emptyMessage" />
        </ChartCard>
      </div>
      <div class="col-xl-7">
        <div class="ch-card h-100">
          <div class="ch-card-header has-border">
            <h2 class="ch-card-title">Student enrollment by department</h2>
          </div>
          <div v-if="enrollmentRows.length" class="ch-card-body is-flush">
            <div class="table-responsive">
              <table class="ch-table">
                <caption class="visually-hidden">
                  Student enrollment by department
                </caption>
                <thead>
                  <tr>
                    <th scope="col">Department</th>
                    <th scope="col" class="text-end">Students</th>
                    <th scope="col" class="text-end">Active</th>
                    <th scope="col" class="text-end">Inactive</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in enrollmentRows" :key="row.department">
                    <td>{{ row.department }}</td>
                    <td class="text-end">{{ row.total }}</td>
                    <td class="text-end">{{ row.active }}</td>
                    <td class="text-end">{{ row.inactive }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          <div v-else class="ch-card-body">
            <EmptyState icon="bi-people" title="No enrollment data" :message="emptyMessage" />
          </div>
        </div>
      </div>
    </section>

    <section
      v-if="visibleReports.includes('enrollment') && enrollmentSectionRows.length"
      class="ch-card mt-3 mt-xl-4"
      aria-label="Section enrollment report"
    >
      <div class="ch-card-header has-border">
        <h2 class="ch-card-title">Enrollment by section</h2>
      </div>
      <div class="ch-card-body is-flush">
        <div class="table-responsive">
          <table class="ch-table">
            <caption class="visually-hidden">
              Enrollment counts by section
            </caption>
            <thead>
              <tr>
                <th scope="col">Section</th>
                <th scope="col" class="text-end">Enrolled</th>
                <th scope="col" class="text-end">Dropped</th>
                <th scope="col" class="text-end">Completed</th>
                <th scope="col" class="text-end">Total</th>
                <th scope="col" class="text-end">Capacity</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in enrollmentSectionRows" :key="row.sectionUid">
                <td>{{ row.sectionCode }}</td>
                <td class="text-end">{{ row.enrolled }}</td>
                <td class="text-end">{{ row.dropped }}</td>
                <td class="text-end">{{ row.completed }}</td>
                <td class="text-end">{{ row.total }}</td>
                <td class="text-end">{{ row.capacity ?? '—' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>

    <section
      v-if="visibleReports.includes('attendance')"
      class="row g-3 g-xl-4 mt-3 mt-xl-4"
      aria-label="Attendance report"
    >
      <div class="col-xl-4">
        <ChartCard title="Attendance breakdown" subtitle="Scoped attendance records">
          <AttendanceChart v-if="attendanceSummary.total" :summary="attendanceSummary" />
          <EmptyState
            v-else
            icon="bi-calendar-check"
            title="No attendance data"
            :message="emptyMessage"
          />
        </ChartCard>
      </div>
      <div class="col-xl-8">
        <div class="ch-card h-100">
          <div class="ch-card-header has-border">
            <div>
              <h2 class="ch-card-title">Attendance by section</h2>
              <p class="ch-card-subtitle">
                {{ attendanceSummary.total }} records · {{ attendanceSummary.attendanceRate }}%
                present or late
              </p>
            </div>
          </div>
          <div v-if="attendanceReportRows.length" class="ch-card-body is-flush">
            <div class="table-responsive">
              <table class="ch-table">
                <caption class="visually-hidden">
                  Attendance counts by section
                </caption>
                <thead>
                  <tr>
                    <th scope="col">Section</th>
                    <th scope="col" class="text-end">Present</th>
                    <th scope="col" class="text-end">Late</th>
                    <th scope="col" class="text-end">Absent</th>
                    <th scope="col" class="text-end">Excused</th>
                    <th scope="col" class="text-end">Rate</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in attendanceReportRows" :key="row.sectionUid">
                    <td>{{ row.sectionCode }}</td>
                    <td class="text-end">{{ row.present }}</td>
                    <td class="text-end">{{ row.late }}</td>
                    <td class="text-end">{{ row.absent }}</td>
                    <td class="text-end">{{ row.excused }}</td>
                    <td class="text-end">{{ row.attendanceRate }}%</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          <div v-else class="ch-card-body">
            <EmptyState
              icon="bi-calendar-check"
              title="No attendance data"
              :message="emptyMessage"
            />
          </div>
        </div>
      </div>
    </section>

    <section
      v-if="visibleReports.includes('performance')"
      class="row g-3 g-xl-4 mt-3 mt-xl-4"
      aria-label="Academic performance report"
    >
      <div class="col-xl-5">
        <ChartCard title="Course coverage by department" subtitle="Catalog records in this browser">
          <ReportBarChart
            v-if="performanceReportRows.length"
            :labels="performanceReportRows.map((row) => row.department)"
            :values="performanceReportRows.map((row) => row.courses)"
            dataset-label="Courses"
          />
          <EmptyState
            v-else
            icon="bi-journal-bookmark"
            title="No catalog data"
            :message="emptyMessage"
          />
        </ChartCard>
      </div>
      <div class="col-xl-7">
        <div class="ch-card h-100">
          <div class="ch-card-header has-border">
            <div>
              <h2 class="ch-card-title">Academic coverage by department</h2>
              <p class="ch-card-subtitle">
                Catalog coverage only; no external scores or backend results are inferred.
              </p>
            </div>
          </div>
          <div v-if="performanceReportRows.length" class="ch-card-body is-flush">
            <div class="table-responsive">
              <table class="ch-table">
                <caption class="visually-hidden">
                  Academic coverage by department
                </caption>
                <thead>
                  <tr>
                    <th scope="col">Department</th>
                    <th scope="col" class="text-end">Courses</th>
                    <th scope="col" class="text-end">Subjects</th>
                    <th scope="col" class="text-end">Sections</th>
                    <th scope="col" class="text-end">Credits</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in performanceReportRows" :key="row.department">
                    <td>{{ row.department }}</td>
                    <td class="text-end">{{ row.courses }}</td>
                    <td class="text-end">{{ row.subjects }}</td>
                    <td class="text-end">{{ row.sections }}</td>
                    <td class="text-end">{{ row.creditHours }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          <div v-else class="ch-card-body">
            <EmptyState
              icon="bi-journal-bookmark"
              title="No catalog data"
              :message="emptyMessage"
            />
          </div>
        </div>
      </div>
    </section>

    <section
      v-if="visibleReports.includes('grades')"
      class="row g-3 g-xl-4 mt-3 mt-xl-4"
      aria-label="Grades and GPA report"
    >
      <div class="col-xl-5">
        <ChartCard title="Grade distribution" subtitle="Scoped browser grade records">
          <ReportBarChart
            v-if="gradeReportRows.length"
            :labels="gradeBands.map((band) => band.letter)"
            :values="gradeBands.map((band) => band.count)"
            dataset-label="Grade records"
          />
          <EmptyState v-else icon="bi-mortarboard" title="No grade data" :message="emptyMessage" />
        </ChartCard>
      </div>
      <div class="col-xl-7">
        <div class="ch-card h-100">
          <div class="ch-card-header has-border">
            <div>
              <h2 class="ch-card-title">Grade and GPA records</h2>
              <p class="ch-card-subtitle">
                {{ gradeReportSummary.totalCount }} records · average GPA
                {{ gradeReportSummary.averageGpa.toFixed(2) }} · {{ gradeReportSummary.passRate }}%
                pass rate
              </p>
            </div>
          </div>
          <div v-if="gradeReportRows.length" class="ch-card-body is-flush">
            <div class="table-responsive">
              <table class="ch-table">
                <caption class="visually-hidden">
                  Grade and GPA records
                </caption>
                <thead>
                  <tr>
                    <th scope="col">Student</th>
                    <th scope="col">Subject</th>
                    <th scope="col">Section</th>
                    <th scope="col" class="text-end">Total</th>
                    <th scope="col">Grade</th>
                    <th scope="col" class="text-end">GPA</th>
                    <th scope="col">Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in gradeReportRows" :key="row.uid">
                    <td>
                      <div class="cell-primary-text">
                        <strong>{{ row.studentName }}</strong>
                        <span>{{ row.studentId }}</span>
                      </div>
                    </td>
                    <td>{{ row.subjectName }}</td>
                    <td>{{ row.sectionCode }}</td>
                    <td class="text-end">{{ row.totalScore.toFixed(1) }}</td>
                    <td>{{ row.letterGrade }}</td>
                    <td class="text-end">{{ row.gpa.toFixed(2) }}</td>
                    <td>{{ row.status }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          <div v-else class="ch-card-body">
            <EmptyState icon="bi-mortarboard" title="No grade data" :message="emptyMessage" />
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.reports-toolbar {
  align-items: end;
}

.report-notices {
  padding-top: 0;
}
</style>

<style>
@media print {
  .app-shell > :not(.app-main),
  .app-main > :not(.app-content),
  .no-print {
    display: none !important;
  }

  .app-shell,
  .app-main,
  .app-content {
    display: block !important;
    width: 100% !important;
    max-width: none !important;
    margin: 0 !important;
    padding: 0 !important;
    background: #fff !important;
  }

  .ch-card {
    break-inside: avoid;
    box-shadow: none !important;
    border: 1px solid #d7dce5 !important;
  }

  .ch-table {
    font-size: 11px;
  }
}
</style>

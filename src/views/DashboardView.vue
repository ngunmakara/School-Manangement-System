<script setup>
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import PageHeader from '../components/common/PageHeader.vue'
import StatCard from '../components/common/StatCard.vue'
import ChartCard from '../components/common/ChartCard.vue'
import EmptyState from '../components/common/EmptyState.vue'
import StatusBadge from '../components/common/StatusBadge.vue'
import EnrollmentTrendChart from '../components/dashboard/EnrollmentTrendChart.vue'
import AttendanceChart from '../components/dashboard/AttendanceChart.vue'
import DepartmentChart from '../components/dashboard/DepartmentChart.vue'
import {
  getDashboardStatistics,
  getEnrollmentTrend,
  mapDashboardStatistics,
  mapEnrollmentTrend,
} from '../api/dashboardService'
import { getAttendanceSummary, mapAttendanceSummary } from '../api/attendanceService'
import { fetchStudents, mapApiStudent } from '../api/studentService'
import { formatStudentDate, getAvatarTone, getInitials } from '../utils/students'
import { currentUser, recentActivities, upcomingSchedule } from '../data/demoData'
import { useCoursesStore } from '../stores/courses'
import { useSemestersStore } from '../stores/semesters'
import { useToast } from '../composables/useToast'

const RECENT_LIMIT = 5

const coursesStore = useCoursesStore()
const semestersStore = useSemestersStore()
const { push: toast } = useToast()

const apiState = ref('idle')
const loadError = ref('')
const statistics = ref(null)

const recentState = ref('idle')
const recentError = ref('')
const recentStudents = ref([])
const recentTotal = ref(0)
const recentIsLatest = ref(false)

const trendState = ref('idle')
const trendError = ref('')
const enrollmentTrend = ref(null)

const attendanceState = ref('idle')
const attendanceError = ref('')
const attendanceSummary = ref(null)

const numberFormatter = new Intl.NumberFormat('en-US')

function getRegistrationTime(student) {
  const value = String(student?.createdAt ?? '').trim()
  if (!value) return null

  const time = new Date(value).getTime()
  return Number.isNaN(time) ? null : time
}

function sortByRegistrationTime(records) {
  return [...records].sort((left, right) => {
    const leftTime = getRegistrationTime(left)
    const rightTime = getRegistrationTime(right)

    if (leftTime === null && rightTime === null) return 0
    if (leftTime === null) return 1
    if (rightTime === null) return -1
    return rightTime - leftTime
  })
}

function isNewestFirst(records) {
  const times = records.map(getRegistrationTime).filter((time) => time !== null)
  if (!times.length) return false

  return times.every((time, index) => index === 0 || times[index - 1] >= time)
}

const activeSemester = computed(() => semestersStore.activeSemester)
const semesterEyebrow = computed(() =>
  activeSemester.value
    ? `${activeSemester.value.name} · ${activeSemester.value.academicYear}`
    : 'No active semester',
)
const recentTitle = computed(() =>
  recentState.value === 'ready' && !recentIsLatest.value
    ? 'Student registrations'
    : 'Recent student registrations',
)

function showComingSoon(feature) {
  toast({
    variant: 'info',
    title: `${feature} is coming soon`,
    message: 'This dashboard shortcut is a preview; the module has not been implemented yet.',
  })
}

function retryCoursePersistence() {
  const result = coursesStore.retryPersist()

  toast(
    result.ok
      ? {
          variant: 'success',
          title: 'Course changes saved',
          message: 'All course changes in this session are now saved in browser storage.',
        }
      : {
          variant: 'danger',
          title: 'Could not save course changes',
          message:
            result.error ||
            coursesStore.persistenceError ||
            'Browser storage is still unavailable. Your changes are kept for this session.',
        },
  )
}

const departmentDistribution = computed(() => statistics.value?.studentsByDepartment ?? [])
const totalEnrolled = computed(() =>
  departmentDistribution.value.reduce((sum, item) => sum + item.count, 0),
)
const departmentCount = computed(() => departmentDistribution.value.length)
const activeShare = computed(() => {
  const total = statistics.value?.totalStudents ?? 0
  return total ? Math.round(((statistics.value?.activeStudents ?? 0) / total) * 100) : 0
})
const inactiveShare = computed(() => {
  const total = statistics.value?.totalStudents ?? 0
  return total ? Math.round(((statistics.value?.inactiveStudents ?? 0) / total) * 100) : 0
})
const isInitialLoading = computed(() => apiState.value === 'loading' && !statistics.value)

const statsNote = computed(() => {
  if (apiState.value === 'loading') {
    return statistics.value ? 'Refreshing from API…' : 'Loading from API…'
  }
  if (apiState.value === 'error') {
    return statistics.value ? 'Showing last loaded data' : 'API unavailable'
  }
  return 'Live from server API'
})

const courseStorageNotice = computed(() => {
  if (
    coursesStore.storageState === 'unavailable' ||
    coursesStore.persistenceState === 'unavailable'
  ) {
    return {
      role: 'alert',
      icon: 'bi-hdd-stack',
      text: 'Browser storage is unavailable. Course changes are kept for this session only. Review Courses to see what is stored here.',
      retry: true,
    }
  }

  if (coursesStore.persistenceState === 'failed') {
    return {
      role: 'alert',
      icon: 'bi-hdd-stack',
      text: `${coursesStore.persistenceError || 'Browser storage is not accepting course saves.'} Review Courses to retry saving your changes.`,
      retry: true,
    }
  }

  if (coursesStore.storageState === 'recovered') {
    const recovery = coursesStore.recovery

    if (recovery?.kind === 'invalid-json' || recovery?.kind === 'invalid-format') {
      return {
        role: 'status',
        icon: 'bi-exclamation-triangle',
        text: 'Saved course data could not be read, so the course catalog started empty. Review Courses before adding records.',
        retry: false,
      }
    }

    const changes = []
    if (recovery?.discarded > 0) {
      changes.push(
        `${recovery.discarded} invalid ${
          recovery.discarded === 1 ? 'record was' : 'records were'
        } removed`,
      )
    }
    if (recovery?.corrected > 0) {
      changes.push(
        `${recovery.corrected} ${recovery.corrected === 1 ? 'record was' : 'records were'} repaired`,
      )
    }

    return {
      role: 'status',
      icon: 'bi-exclamation-triangle',
      text: changes.length
        ? `Saved course records were recovered: ${changes.join('; ')}. Review Courses to confirm the catalog.`
        : 'Saved course records were recovered. Review Courses to confirm the catalog.',
      retry: false,
    }
  }

  return null
})

const courseStatNote = computed(() => {
  const active = `${numberFormatter.format(coursesStore.activeCourses)} active`
  if (courseStorageNotice.value?.retry) return `${active} · Session only`
  if (coursesStore.storageState === 'recovered') return `${active} · Recovered catalog`
  return `${active} · Browser catalog`
})

const dashboardStats = computed(() => {
  const data = statistics.value

  return [
    {
      label: 'Total students',
      value: data ? numberFormatter.format(data.totalStudents) : '—',
      icon: 'bi-people',
      tone: 'indigo',
      note: statsNote.value,
    },
    {
      label: 'Active students',
      value: data ? numberFormatter.format(data.activeStudents) : '—',
      icon: 'bi-person-check',
      tone: 'green',
      note: data ? `${activeShare.value}% of all students` : statsNote.value,
    },
    {
      label: 'Inactive students',
      value: data ? numberFormatter.format(data.inactiveStudents) : '—',
      icon: 'bi-person-dash',
      tone: 'amber',
      note: data ? `${inactiveShare.value}% of all students` : statsNote.value,
    },
    {
      label: 'Total teachers',
      value: data ? numberFormatter.format(data.totalTeachers) : '—',
      icon: 'bi-person-video3',
      tone: 'blue',
      note: data ? `${numberFormatter.format(data.activeTeachers)} active` : statsNote.value,
    },
    {
      label: 'Departments',
      value: data ? numberFormatter.format(data.totalDepartments) : '—',
      icon: 'bi-building',
      tone: 'rose',
      note: data ? 'Across the institution' : statsNote.value,
    },
    {
      label: 'Courses',
      value: numberFormatter.format(coursesStore.totalCourses),
      icon: 'bi-journal-bookmark',
      tone: 'indigo',
      note: courseStatNote.value,
    },
  ]
})

const apiBadge = computed(() => {
  if (apiState.value === 'ready') {
    return { icon: 'bi-cloud-check', label: 'Live API data', live: true }
  }
  if (apiState.value === 'error') {
    return { icon: 'bi-cloud-slash', label: 'API unavailable', live: false }
  }
  return { icon: 'bi-cloud', label: 'Connecting to API', live: false }
})

const departmentSubtitle = computed(() => {
  if (isInitialLoading.value) {
    return 'Loading department distribution from the CampusHub API'
  }
  if (apiState.value === 'error' && !statistics.value) {
    return 'Department distribution could not be loaded'
  }
  if (!departmentDistribution.value.length) {
    return 'No students are enrolled in any department yet'
  }

  const label = departmentCount.value === 1 ? 'department' : 'departments'
  return `${numberFormatter.format(totalEnrolled.value)} students across ${departmentCount.value} ${label}`
})

const recentSubtitle = computed(() => {
  if (recentState.value === 'loading') {
    return recentStudents.value.length
      ? 'Refreshing the latest registrations from the CampusHub API'
      : 'Loading the latest registrations from the CampusHub API'
  }
  if (recentState.value === 'error') {
    return recentStudents.value.length
      ? 'Showing the last successfully loaded registrations'
      : 'Recent registrations could not be loaded'
  }
  if (!recentStudents.value.length) {
    return 'No student registrations yet'
  }

  const total = numberFormatter.format(recentTotal.value)
  if (!recentIsLatest.value && recentTotal.value > RECENT_LIMIT) {
    return `Showing ${RECENT_LIMIT} of ${total} registrations returned by the API; newest-first ordering could not be confirmed`
  }

  if (recentTotal.value > RECENT_LIMIT) {
    return `Latest ${RECENT_LIMIT} of ${total} registrations, newest first by registration timestamp`
  }

  return `${total} ${
    recentTotal.value === 1 ? 'registration' : 'registrations'
  }, newest first by registration timestamp`
})

const hasEnrollmentTrend = computed(
  () =>
    Boolean(enrollmentTrend.value) &&
    (enrollmentTrend.value.currentTotal > 0 || enrollmentTrend.value.previousTotal > 0),
)

const enrollmentSubtitle = computed(() => {
  if (trendState.value === 'loading') {
    return enrollmentTrend.value
      ? 'Refreshing monthly enrollments from the CampusHub API'
      : 'Loading monthly enrollments from the CampusHub API'
  }
  if (trendState.value === 'error') {
    return enrollmentTrend.value
      ? 'Showing the last successfully loaded enrollment records'
      : 'Enrollment trend could not be loaded'
  }
  if (!hasEnrollmentTrend.value) {
    return 'No enrollment records found for the current or previous academic year'
  }

  return `Monthly enrollments for ${enrollmentTrend.value.currentAcademicYear} compared with ${enrollmentTrend.value.previousAcademicYear}`
})

const hasAttendance = computed(
  () => Boolean(attendanceSummary.value) && attendanceSummary.value.total > 0,
)

function formatSummaryDate(value) {
  if (!value) return 'today'

  const date = new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) return 'today'

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date)
}

const attendanceDateLabel = computed(() => formatSummaryDate(attendanceSummary.value?.date))

const attendanceSubtitle = computed(() => {
  if (attendanceState.value === 'loading') {
    return attendanceSummary.value
      ? 'Refreshing attendance records from the CampusHub API'
      : 'Loading attendance records from the CampusHub API'
  }
  if (attendanceState.value === 'error') {
    return attendanceSummary.value
      ? 'Showing the last successfully loaded attendance summary'
      : 'Attendance overview could not be loaded'
  }
  if (!hasAttendance.value) {
    return `No attendance recorded for ${attendanceDateLabel.value}`
  }

  return `${numberFormatter.format(
    attendanceSummary.value.total,
  )} attendance records on ${attendanceDateLabel.value}`
})

const greeting = computed(() => {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
})

const firstName = computed(() => currentUser.name.split(' ')[0])

const today = new Intl.DateTimeFormat('en-US', {
  weekday: 'long',
  month: 'long',
  day: 'numeric',
  year: 'numeric',
}).format(new Date())

async function loadStatistics() {
  apiState.value = 'loading'
  loadError.value = ''

  try {
    const payload = await getDashboardStatistics()
    statistics.value = mapDashboardStatistics(payload)
    apiState.value = 'ready'
  } catch (error) {
    apiState.value = 'error'
    loadError.value = error?.message || 'Could not load dashboard statistics.'
  }
}

async function loadRecentStudents() {
  recentState.value = 'loading'
  recentError.value = ''

  try {
    let page
    let sortedRequestSucceeded = false

    try {
      page = await fetchStudents({
        page: 0,
        size: RECENT_LIMIT,
        sortBy: 'createdAt',
        sortDir: 'desc',
      })
      sortedRequestSucceeded = true
    } catch {
      page = await fetchStudents({ page: 0, size: RECENT_LIMIT })
    }

    const rawRecords = (page?.content ?? []).map(mapApiStudent).filter(Boolean)
    const records = sortByRegistrationTime(rawRecords).slice(0, RECENT_LIMIT)
    const total = Number(page?.totalElements)
    const resolvedTotal = Number.isFinite(total) ? total : records.length

    recentStudents.value = records
    recentTotal.value = resolvedTotal
    recentIsLatest.value =
      resolvedTotal <= RECENT_LIMIT ||
      (sortedRequestSucceeded && isNewestFirst(rawRecords.slice(0, RECENT_LIMIT)))
    recentState.value = 'ready'
  } catch (error) {
    recentState.value = 'error'
    recentError.value = error?.message || 'Could not load recent student registrations.'
  }
}

async function loadEnrollmentTrend() {
  trendState.value = 'loading'
  trendError.value = ''

  try {
    const payload = await getEnrollmentTrend()
    enrollmentTrend.value = mapEnrollmentTrend(payload)
    trendState.value = 'ready'
  } catch (error) {
    trendState.value = 'error'
    trendError.value = error?.message || 'Could not load the enrollment trend.'
  }
}

async function loadAttendance() {
  attendanceState.value = 'loading'
  attendanceError.value = ''

  try {
    const payload = await getAttendanceSummary()
    attendanceSummary.value = mapAttendanceSummary(payload)
    attendanceState.value = 'ready'
  } catch (error) {
    attendanceState.value = 'error'
    attendanceError.value = error?.message || 'Could not load the attendance overview.'
  }
}

onMounted(() => {
  coursesStore.loadCourses()
  loadStatistics()
  loadRecentStudents()
  loadEnrollmentTrend()
  loadAttendance()
})
</script>

<template>
  <div>
    <PageHeader
      :title="`${greeting}, ${firstName}`"
      :eyebrow="semesterEyebrow"
      description="Student and teacher totals, department distribution, recent registrations, monthly enrollment trends, and attendance summaries are loaded live from the CampusHub API. Schedule and activity remain locally generated demo data."
    >
      <template #actions>
        <span class="dashboard-date">
          <i class="bi bi-calendar4" aria-hidden="true"></i>
          {{ today }}
        </span>
        <span class="demo-flag" :class="{ 'is-live': apiBadge.live }">
          <i class="bi" :class="apiBadge.icon" aria-hidden="true"></i>
          {{ apiBadge.label }}
        </span>
        <RouterLink to="/students?action=add" class="btn-ch btn-ch-soft">
          <i class="bi bi-person-plus" aria-hidden="true"></i>
          Add student
        </RouterLink>
        <RouterLink to="/teachers?action=add" class="btn-ch btn-ch-soft">
          <i class="bi bi-person-badge" aria-hidden="true"></i>
          Add teacher
        </RouterLink>
        <button type="button" class="btn-ch btn-ch-primary" @click="showComingSoon('Reports')">
          <i class="bi bi-bar-chart-line" aria-hidden="true"></i>
          Reports coming soon
        </button>
      </template>
    </PageHeader>

    <div v-if="isInitialLoading" class="ch-alert is-info" role="status">
      <i class="bi bi-arrow-repeat" aria-hidden="true"></i>
      <span>Loading dashboard statistics from the CampusHub API…</span>
    </div>

    <div v-else-if="apiState === 'error'" class="ch-alert is-warning" role="alert">
      <i class="bi bi-cloud-slash" aria-hidden="true"></i>
      <span>
        {{ loadError }}
        {{
          statistics
            ? 'Showing the last successfully loaded data.'
            : 'Student totals and the department chart are unavailable until the API can be reached.'
        }}
      </span>
      <button type="button" class="btn-ch btn-ch-soft btn-ch-sm api-retry" @click="loadStatistics">
        <i class="bi bi-arrow-clockwise" aria-hidden="true"></i>
        Retry
      </button>
    </div>

    <div
      v-if="courseStorageNotice"
      class="ch-alert"
      :class="courseStorageNotice.role === 'alert' ? 'is-warning' : 'is-info'"
      :role="courseStorageNotice.role"
      :aria-live="courseStorageNotice.role === 'alert' ? 'assertive' : 'polite'"
      aria-label="Course storage status"
    >
      <i class="bi" :class="courseStorageNotice.icon" aria-hidden="true"></i>
      <div>
        <span>{{ courseStorageNotice.text }}</span>
        <div class="d-flex flex-wrap gap-2 mt-2">
          <button
            v-if="courseStorageNotice.retry"
            type="button"
            class="btn-ch btn-ch-soft btn-ch-sm api-retry"
            @click="retryCoursePersistence"
          >
            <i class="bi bi-arrow-clockwise" aria-hidden="true"></i>
            Retry save
          </button>
          <RouterLink to="/courses" class="btn-ch btn-ch-soft btn-ch-sm">
            Review courses
          </RouterLink>
        </div>
      </div>
    </div>

    <section class="row g-3 g-xl-4 mb-1" aria-label="Key campus statistics">
      <div v-for="stat in dashboardStats" :key="stat.label" class="col-sm-6 col-xl">
        <StatCard v-bind="stat" />
      </div>
    </section>

    <div class="row g-3 g-xl-4 mt-1">
      <div class="col-xl-8">
        <ChartCard title="Student enrollment trend" :subtitle="enrollmentSubtitle">
          <template #actions>
            <span v-if="trendState === 'ready'" class="demo-flag is-live">
              <i class="bi bi-cloud-check" aria-hidden="true"></i>
              Live API
            </span>
          </template>

          <div
            v-if="trendState === 'loading' && !enrollmentTrend"
            class="chart-state"
            role="status"
          >
            <i class="bi bi-arrow-repeat" aria-hidden="true"></i>
            <span>Loading enrollment trend…</span>
          </div>

          <div
            v-else-if="trendState === 'error' && !enrollmentTrend"
            class="chart-state"
            role="alert"
          >
            <i class="bi bi-cloud-slash" aria-hidden="true"></i>
            <span>{{ trendError }}</span>
            <button type="button" class="btn-ch btn-ch-soft btn-ch-sm" @click="loadEnrollmentTrend">
              <i class="bi bi-arrow-clockwise" aria-hidden="true"></i>
              Retry
            </button>
          </div>

          <EmptyState
            v-else-if="!hasEnrollmentTrend"
            icon="bi-graph-up"
            title="No enrollment trend data"
            message="No student enrollment records were found for the current or previous academic year."
          />

          <EnrollmentTrendChart
            v-else
            :labels="enrollmentTrend.labels"
            :current="enrollmentTrend.current"
            :previous="enrollmentTrend.previous"
            :current-label="enrollmentTrend.currentAcademicYear"
            :previous-label="enrollmentTrend.previousAcademicYear"
          />
        </ChartCard>
      </div>

      <div class="col-xl-4">
        <ChartCard title="Attendance overview" :subtitle="attendanceSubtitle">
          <template #actions>
            <div class="card-actions">
              <span v-if="attendanceState === 'ready'" class="demo-flag is-live">
                <i class="bi bi-cloud-check" aria-hidden="true"></i>
                Live API
              </span>
              <button
                type="button"
                class="ch-card-link"
                @click="showComingSoon('Attendance management')"
              >
                Coming soon <i class="bi bi-hourglass-split" aria-hidden="true"></i>
              </button>
            </div>
          </template>

          <div
            v-if="attendanceState === 'loading' && !attendanceSummary"
            class="chart-state"
            role="status"
          >
            <i class="bi bi-arrow-repeat" aria-hidden="true"></i>
            <span>Loading attendance overview…</span>
          </div>

          <div
            v-else-if="attendanceState === 'error' && !attendanceSummary"
            class="chart-state"
            role="alert"
          >
            <i class="bi bi-cloud-slash" aria-hidden="true"></i>
            <span>{{ attendanceError }}</span>
            <button type="button" class="btn-ch btn-ch-soft btn-ch-sm" @click="loadAttendance">
              <i class="bi bi-arrow-clockwise" aria-hidden="true"></i>
              Retry
            </button>
          </div>

          <EmptyState
            v-else-if="!hasAttendance"
            icon="bi-clipboard-check"
            title="No attendance recorded"
            message="Attendance will appear here once records are added for the selected date."
          />

          <AttendanceChart v-else :summary="attendanceSummary" />
        </ChartCard>
      </div>
    </div>

    <div class="row g-3 g-xl-4 mt-1">
      <div class="col-xl-8">
        <section class="ch-card h-100">
          <div class="ch-card-header has-border">
            <div>
              <h2 class="ch-card-title">{{ recentTitle }}</h2>
              <p class="ch-card-subtitle">{{ recentSubtitle }}</p>
            </div>
            <div class="card-actions">
              <span v-if="recentState === 'ready'" class="demo-flag is-live">
                <i class="bi bi-cloud-check" aria-hidden="true"></i>
                Live API
              </span>
              <RouterLink to="/students" class="ch-card-link">
                View all <i class="bi bi-arrow-right" aria-hidden="true"></i>
              </RouterLink>
            </div>
          </div>

          <div v-if="recentState === 'loading' && recentStudents.length === 0" class="ch-card-body">
            <div class="ch-alert is-info mb-0" role="status">
              <i class="bi bi-arrow-repeat" aria-hidden="true"></i>
              <span>Loading recent student registrations from the CampusHub API…</span>
            </div>
          </div>

          <template v-else>
            <div v-if="recentState === 'error'" class="ch-card-body">
              <div class="ch-alert is-warning mb-0" role="alert">
                <i class="bi bi-cloud-slash" aria-hidden="true"></i>
                <span>{{ recentError }}</span>
                <button
                  type="button"
                  class="btn-ch btn-ch-soft btn-ch-sm api-retry"
                  @click="loadRecentStudents"
                >
                  <i class="bi bi-arrow-clockwise" aria-hidden="true"></i>
                  Retry
                </button>
              </div>
            </div>

            <div v-if="recentStudents.length === 0 && recentState !== 'error'" class="ch-card-body">
              <EmptyState
                icon="bi-person-plus"
                title="No student registrations yet"
                message="New students will appear here after they are added to the directory."
              />
            </div>

            <div v-else-if="recentStudents.length > 0" class="ch-card-body is-flush">
              <div class="table-responsive">
                <table class="ch-table table-wide">
                  <thead>
                    <tr>
                      <th scope="col">Student</th>
                      <th scope="col">Department</th>
                      <th scope="col">Program</th>
                      <th scope="col">Registered</th>
                      <th scope="col">Enrolled</th>
                      <th scope="col">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="student in recentStudents" :key="student.uid">
                      <td>
                        <div class="cell-primary">
                          <span
                            class="avatar avatar-sm"
                            :class="`avatar-tone-${getAvatarTone(student.uid)}`"
                          >
                            {{ getInitials(student.fullName) }}
                          </span>
                          <div class="cell-primary-text">
                            <strong>{{ student.fullName }}</strong>
                            <span>{{ student.studentId }}</span>
                          </div>
                        </div>
                      </td>
                      <td>{{ student.department || '—' }}</td>
                      <td>{{ student.program || '—' }}</td>
                      <td class="text-nowrap">
                        {{ formatStudentDate(student.createdAt) }}
                      </td>
                      <td class="text-nowrap">
                        {{ formatStudentDate(student.enrollmentDate) }}
                      </td>
                      <td>
                        <StatusBadge :status="student.status" />
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </template>
        </section>
      </div>

      <div class="col-xl-4">
        <section class="ch-card h-100">
          <div class="ch-card-header has-border">
            <div>
              <h2 class="ch-card-title">Upcoming classes &amp; events</h2>
              <p class="ch-card-subtitle">Today's demo timetable</p>
            </div>
            <div class="card-actions">
              <span class="demo-flag">
                <i class="bi bi-database" aria-hidden="true"></i>
                Demo data
              </span>
              <RouterLink to="/sections" class="ch-card-link">
                Class sections <i class="bi bi-arrow-right" aria-hidden="true"></i>
              </RouterLink>
              <RouterLink to="/courses" class="ch-card-link">
                Courses <i class="bi bi-arrow-right" aria-hidden="true"></i>
              </RouterLink>
            </div>
          </div>
          <ul class="dash-list">
            <li v-for="item in upcomingSchedule" :key="item.time" class="schedule-item">
              <span class="schedule-accent" :class="`tone-${item.tone}`" aria-hidden="true"></span>
              <div class="schedule-time">
                <strong>{{ item.time }}</strong>
                <span>{{ item.duration }}</span>
              </div>
              <div class="schedule-body">
                <strong>{{ item.title }}</strong>
                <div class="schedule-meta">
                  <span><i class="bi bi-person" aria-hidden="true"></i> {{ item.teacher }}</span>
                  <span><i class="bi bi-geo-alt" aria-hidden="true"></i> {{ item.room }}</span>
                  <span><i class="bi bi-people" aria-hidden="true"></i> {{ item.students }}</span>
                </div>
              </div>
            </li>
          </ul>
        </section>
      </div>
    </div>

    <div class="row g-3 g-xl-4 mt-1">
      <div class="col-xl-7">
        <section class="ch-card h-100">
          <div class="ch-card-header has-border">
            <div>
              <h2 class="ch-card-title">Recent activity</h2>
              <p class="ch-card-subtitle">Administrative actions from the demo session</p>
            </div>
            <div class="card-actions">
              <span class="demo-flag">
                <i class="bi bi-database" aria-hidden="true"></i>
                Demo data
              </span>
              <button type="button" class="ch-card-link" @click="showComingSoon('Notifications')">
                Coming soon <i class="bi bi-hourglass-split" aria-hidden="true"></i>
              </button>
            </div>
          </div>
          <ul class="activity-list">
            <li v-for="activity in recentActivities" :key="activity.text" class="activity-item">
              <span class="activity-icon" :class="`tone-${activity.tone}`" aria-hidden="true">
                <i class="bi" :class="activity.icon"></i>
              </span>
              <div class="activity-body">
                <p v-html="activity.text"></p>
                <span class="activity-time">{{ activity.time }}</span>
              </div>
            </li>
          </ul>
        </section>
      </div>

      <div class="col-xl-5">
        <ChartCard title="Department distribution" :subtitle="departmentSubtitle">
          <template #actions>
            <div class="card-actions">
              <span v-if="apiState === 'ready'" class="demo-flag is-live">
                <i class="bi bi-cloud-check" aria-hidden="true"></i>
                Live API
              </span>
              <RouterLink to="/departments" class="ch-card-link">
                Departments <i class="bi bi-arrow-right" aria-hidden="true"></i>
              </RouterLink>
            </div>
          </template>

          <div v-if="isInitialLoading" class="chart-state" role="status">
            <i class="bi bi-arrow-repeat" aria-hidden="true"></i>
            <span>Loading department distribution…</span>
          </div>

          <div v-else-if="apiState === 'error' && !statistics" class="chart-state" role="alert">
            <i class="bi bi-cloud-slash" aria-hidden="true"></i>
            <span>{{ loadError }}</span>
            <button type="button" class="btn-ch btn-ch-soft btn-ch-sm" @click="loadStatistics">
              <i class="bi bi-arrow-clockwise" aria-hidden="true"></i>
              Retry
            </button>
          </div>

          <EmptyState
            v-else-if="departmentDistribution.length === 0"
            icon="bi-building"
            title="No department data"
            message="The API returned no enrolled departments yet."
          />

          <DepartmentChart v-else :items="departmentDistribution" />
        </ChartCard>
      </div>
    </div>
  </div>
</template>

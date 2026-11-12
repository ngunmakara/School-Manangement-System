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
import { getDashboardStatistics, mapDashboardStatistics } from '../api/dashboardService'
import { fetchStudents, mapApiStudent } from '../api/studentService'
import { formatStudentDate, getAvatarTone, getInitials } from '../utils/students'
import {
  academicTerm,
  currentUser,
  recentActivities,
  upcomingSchedule,
} from '../data/demoData'

const RECENT_LIMIT = 5

const apiState = ref('idle')
const loadError = ref('')
const statistics = ref(null)

const recentState = ref('idle')
const recentError = ref('')
const recentStudents = ref([])
const recentTotal = ref(0)

const numberFormatter = new Intl.NumberFormat('en-US')

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
      label: 'Departments',
      value: data ? numberFormatter.format(departmentCount.value) : '—',
      icon: 'bi-building',
      tone: 'blue',
      note: data ? 'With enrolled students' : statsNote.value,
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
  if (recentTotal.value > RECENT_LIMIT) {
    return `Latest ${RECENT_LIMIT} of ${total} registrations from the CampusHub API`
  }

  return `${total} ${recentTotal.value === 1 ? 'registration' : 'registrations'} from the CampusHub API`
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
    const page = await fetchStudents({ page: 0, size: RECENT_LIMIT })
    const records = (page?.content ?? []).map(mapApiStudent).filter(Boolean)
    const total = Number(page?.totalElements)

    recentStudents.value = records
    recentTotal.value = Number.isFinite(total) ? total : records.length
    recentState.value = 'ready'
  } catch (error) {
    recentState.value = 'error'
    recentError.value = error?.message || 'Could not load recent student registrations.'
  }
}

onMounted(() => {
  loadStatistics()
  loadRecentStudents()
})
</script>

<template>
  <div>
    <PageHeader
      :title="`${greeting}, ${firstName}`"
      :eyebrow="`${academicTerm.term} · ${academicTerm.year}`"
      description="Student totals, the department distribution, and recent student registrations are loaded live from the CampusHub API. Enrollment trends, attendance, schedule, and activity remain locally generated demo data."
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
        <RouterLink to="/reports" class="btn-ch btn-ch-primary">
          <i class="bi bi-bar-chart-line" aria-hidden="true"></i>
          View reports
        </RouterLink>
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

    <section class="row g-3 g-xl-4 mb-1" aria-label="Key campus statistics">
      <div v-for="stat in dashboardStats" :key="stat.label" class="col-sm-6 col-xl-3">
        <StatCard v-bind="stat" />
      </div>
    </section>

    <div class="row g-3 g-xl-4 mt-1">
      <div class="col-xl-8">
        <ChartCard
          title="Student enrollment trend"
          subtitle="Monthly active enrollment across the current academic year"
        >
          <template #actions>
            <span class="demo-flag">
              <i class="bi bi-database" aria-hidden="true"></i>
              Demo data
            </span>
          </template>
          <EnrollmentTrendChart />
        </ChartCard>
      </div>

      <div class="col-xl-4">
        <ChartCard title="Attendance overview" subtitle="Campus-wide attendance recorded today">
          <template #actions>
            <div class="card-actions">
              <span class="demo-flag">
                <i class="bi bi-database" aria-hidden="true"></i>
                Demo data
              </span>
              <RouterLink to="/attendance" class="ch-card-link">
                Details <i class="bi bi-arrow-right" aria-hidden="true"></i>
              </RouterLink>
            </div>
          </template>
          <AttendanceChart />
        </ChartCard>
      </div>
    </div>

    <div class="row g-3 g-xl-4 mt-1">
      <div class="col-xl-8">
        <section class="ch-card h-100">
          <div class="ch-card-header has-border">
            <div>
              <h2 class="ch-card-title">Recent student registrations</h2>
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

          <div
            v-if="recentState === 'loading' && recentStudents.length === 0"
            class="ch-card-body"
          >
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

            <div
              v-if="recentStudents.length === 0 && recentState !== 'error'"
              class="ch-card-body"
            >
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
                Sections <i class="bi bi-arrow-right" aria-hidden="true"></i>
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
              <RouterLink to="/notifications" class="ch-card-link">
                Inbox <i class="bi bi-arrow-right" aria-hidden="true"></i>
              </RouterLink>
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

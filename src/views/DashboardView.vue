<script setup>
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import PageHeader from '../components/common/PageHeader.vue'
import StatCard from '../components/common/StatCard.vue'
import ChartCard from '../components/common/ChartCard.vue'
import StatusBadge from '../components/common/StatusBadge.vue'
import EnrollmentTrendChart from '../components/dashboard/EnrollmentTrendChart.vue'
import AttendanceChart from '../components/dashboard/AttendanceChart.vue'
import DepartmentChart from '../components/dashboard/DepartmentChart.vue'
import {
  academicTerm,
  currentUser,
  dashboardStats,
  departmentDistribution,
  recentActivities,
  recentStudents,
  upcomingSchedule,
} from '../data/demoData'

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

const totalEnrolled = departmentDistribution.reduce((sum, item) => sum + item.count, 0)
</script>

<template>
  <div>
    <PageHeader
      :title="`${greeting}, ${firstName}`"
      :eyebrow="`${academicTerm.term} · ${academicTerm.year}`"
      description="Here is a snapshot of campus activity. Every figure on this page is locally generated demonstration data, not a live server response."
    >
      <template #actions>
        <span class="dashboard-date">
          <i class="bi bi-calendar4" aria-hidden="true"></i>
          {{ today }}
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
            <RouterLink to="/attendance" class="ch-card-link">
              Details <i class="bi bi-arrow-right" aria-hidden="true"></i>
            </RouterLink>
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
              <p class="ch-card-subtitle">The latest admissions added to the demo directory</p>
            </div>
            <RouterLink to="/students" class="ch-card-link">
              View all <i class="bi bi-arrow-right" aria-hidden="true"></i>
            </RouterLink>
          </div>
          <div class="ch-card-body is-flush">
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
                  <tr v-for="student in recentStudents" :key="student.id">
                    <td>
                      <div class="cell-primary">
                        <span class="avatar avatar-sm" :class="`avatar-tone-${student.tone}`">
                          {{ student.initials }}
                        </span>
                        <div class="cell-primary-text">
                          <strong>{{ student.name }}</strong>
                          <span>{{ student.id }}</span>
                        </div>
                      </div>
                    </td>
                    <td>{{ student.department }}</td>
                    <td>{{ student.program }}</td>
                    <td class="text-nowrap">{{ student.date }}</td>
                    <td>
                      <StatusBadge :status="student.status" />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>

      <div class="col-xl-4">
        <section class="ch-card h-100">
          <div class="ch-card-header has-border">
            <div>
              <h2 class="ch-card-title">Upcoming classes &amp; events</h2>
              <p class="ch-card-subtitle">Today's demo timetable</p>
            </div>
            <RouterLink to="/sections" class="ch-card-link">
              Sections <i class="bi bi-arrow-right" aria-hidden="true"></i>
            </RouterLink>
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
            <RouterLink to="/notifications" class="ch-card-link">
              Inbox <i class="bi bi-arrow-right" aria-hidden="true"></i>
            </RouterLink>
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
        <ChartCard
          title="Department distribution"
          :subtitle="`${totalEnrolled.toLocaleString('en-US')} students across the largest departments`"
        >
          <template #actions>
            <RouterLink to="/departments" class="ch-card-link">
              Departments <i class="bi bi-arrow-right" aria-hidden="true"></i>
            </RouterLink>
          </template>
          <DepartmentChart />
        </ChartCard>
      </div>
    </div>
  </div>
</template>

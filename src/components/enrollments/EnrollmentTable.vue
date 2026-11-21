<script setup>
import StatusBadge from '../common/StatusBadge.vue'
import { formatStudentDate } from '../../utils/students'
import { enrollmentStatusLabel } from '../../utils/enrollments'

const props = defineProps({
  enrollments: {
    type: Array,
    default: () => [],
  },
  sortKey: {
    type: String,
    default: 'createdAt',
  },
  sortDir: {
    type: String,
    default: 'desc',
  },
})

const emit = defineEmits(['sort', 'view', 'edit', 'delete'])

const columns = [
  { key: 'studentName', label: 'Student' },
  { key: 'sectionCode', label: 'Class section' },
  { key: 'semesterName', label: 'Semester' },
  { key: 'status', label: 'Status' },
  { key: 'seatsUsed', label: 'Local seats' },
  { key: 'createdAt', label: 'Created' },
]

function sortAria(key) {
  if (props.sortKey !== key) return 'none'
  return props.sortDir === 'asc' ? 'ascending' : 'descending'
}

function sortIcon(key) {
  if (props.sortKey !== key) return 'bi-arrow-down-up'
  return props.sortDir === 'asc' ? 'bi-arrow-up' : 'bi-arrow-down'
}

function sortLabel(key, label) {
  const state = sortAria(key)
  if (state === 'none') return `Sort by ${label}`

  const nextState = state === 'ascending' ? 'descending' : 'ascending'
  return `Sort by ${label}, currently ${state}. Activate to sort ${nextState}.`
}

function statusText(enrollment) {
  return enrollment.statusLabel || enrollmentStatusLabel(enrollment.status)
}

function seatsText(enrollment) {
  const capacity = Number(enrollment.capacity)
  if (!Number.isFinite(capacity)) return '—'
  return `${Number(enrollment.seatsUsed) || 0}/${capacity} seats`
}
</script>

<template>
  <div class="table-responsive">
    <table class="ch-table student-table enrollment-table">
      <caption class="visually-hidden">
        Enrollment records
      </caption>
      <thead>
        <tr>
          <th
            v-for="column in columns"
            :key="column.key"
            scope="col"
            :aria-sort="sortAria(column.key)"
          >
            <button
              type="button"
              class="th-sort"
              :aria-label="sortLabel(column.key, column.label)"
              @click="emit('sort', column.key)"
            >
              {{ column.label }}
              <i class="bi" :class="sortIcon(column.key)" aria-hidden="true"></i>
            </button>
          </th>
          <th scope="col" class="text-end">Actions</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="enrollment in enrollments" :key="enrollment.uid">
          <td>
            <div class="cell-primary">
              <span class="department-mark" aria-hidden="true">
                <i class="bi bi-person-plus"></i>
              </span>
              <div class="cell-primary-text">
                <strong>{{ enrollment.studentName }}</strong>
                <span>{{ enrollment.studentId }}</span>
              </div>
            </div>
          </td>
          <td>
            <div class="cell-primary-text">
              <strong>{{ enrollment.sectionCode }}</strong>
              <span>{{ enrollment.subjectName }} · {{ enrollment.teacherName }}</span>
            </div>
          </td>
          <td>{{ enrollment.semesterName }}</td>
          <td>
            <StatusBadge :status="enrollment.status" :label="statusText(enrollment)" />
          </td>
          <td>
            <span class="code-badge">{{ seatsText(enrollment) }}</span>
          </td>
          <td class="text-nowrap">{{ formatStudentDate(enrollment.createdAt) }}</td>
          <td>
            <div class="row-actions">
              <button
                type="button"
                class="row-action-btn"
                :aria-label="`View enrollment for ${enrollment.studentName}`"
                title="View enrollment"
                @click="emit('view', enrollment)"
              >
                <i class="bi bi-eye" aria-hidden="true"></i>
              </button>
              <button
                type="button"
                class="row-action-btn"
                :aria-label="`Edit enrollment for ${enrollment.studentName}`"
                title="Edit enrollment"
                @click="emit('edit', enrollment)"
              >
                <i class="bi bi-pencil" aria-hidden="true"></i>
              </button>
              <button
                type="button"
                class="row-action-btn is-danger"
                :aria-label="`Delete enrollment for ${enrollment.studentName}`"
                title="Delete enrollment"
                @click="emit('delete', enrollment)"
              >
                <i class="bi bi-trash3" aria-hidden="true"></i>
              </button>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

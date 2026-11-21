<script setup>
import StatusBadge from '../common/StatusBadge.vue'
import { formatStudentDate } from '../../utils/students'
import { attendanceStatusLabel } from '../../utils/attendance'

const props = defineProps({
  attendance: {
    type: Array,
    default: () => [],
  },
  sortKey: {
    type: String,
    default: 'date',
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
  { key: 'date', label: 'Date' },
  { key: 'status', label: 'Status' },
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

function statusText(record) {
  return record.statusLabel || attendanceStatusLabel(record.status)
}
</script>

<template>
  <div class="table-responsive">
    <table class="ch-table student-table attendance-table">
      <caption class="visually-hidden">
        Attendance records
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
        <tr v-for="record in attendance" :key="record.uid">
          <td>
            <div class="cell-primary">
              <span class="department-mark" aria-hidden="true">
                <i class="bi bi-person-badge"></i>
              </span>
              <div class="cell-primary-text">
                <strong>{{ record.studentName }}</strong>
                <span>{{ record.studentId }}</span>
              </div>
            </div>
          </td>
          <td>
            <div class="cell-primary-text">
              <strong>{{ record.sectionCode }}</strong>
              <span>{{ record.subjectName }} · {{ record.teacherName }}</span>
            </div>
          </td>
          <td class="text-nowrap">{{ record.date }}</td>
          <td>
            <StatusBadge :status="record.status" :label="statusText(record)" />
          </td>
          <td class="text-nowrap">{{ formatStudentDate(record.createdAt) }}</td>
          <td>
            <div class="row-actions">
              <button
                type="button"
                class="row-action-btn"
                :aria-label="`View attendance for ${record.studentName}`"
                title="View attendance"
                @click="emit('view', record)"
              >
                <i class="bi bi-eye" aria-hidden="true"></i>
              </button>
              <button
                type="button"
                class="row-action-btn"
                :aria-label="`Edit attendance for ${record.studentName}`"
                title="Edit attendance"
                @click="emit('edit', record)"
              >
                <i class="bi bi-pencil" aria-hidden="true"></i>
              </button>
              <button
                type="button"
                class="row-action-btn is-danger"
                :aria-label="`Delete attendance for ${record.studentName}`"
                title="Delete attendance"
                @click="emit('delete', record)"
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

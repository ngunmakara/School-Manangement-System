<script setup>
import StatusBadge from '../common/StatusBadge.vue'
import {
  formatStudentDate,
  getAvatarTone,
  getInitials,
} from '../../utils/students'

const props = defineProps({
  students: {
    type: Array,
    default: () => [],
  },
  sortKey: {
    type: String,
    default: 'fullName',
  },
  sortDir: {
    type: String,
    default: 'asc',
  },
})

const emit = defineEmits(['sort', 'view', 'edit', 'delete'])

const columns = [
  { key: 'fullName', label: 'Student' },
  { key: 'email', label: 'Email' },
  { key: 'department', label: 'Department' },
  { key: 'program', label: 'Program' },
  { key: 'enrollmentDate', label: 'Enrolled' },
  { key: 'status', label: 'Status' },
]

function sortAria(key) {
  if (props.sortKey !== key) return 'none'
  return props.sortDir === 'asc' ? 'ascending' : 'descending'
}

function sortIcon(key) {
  if (props.sortKey !== key) return 'bi-arrow-down-up'
  return props.sortDir === 'asc' ? 'bi-arrow-up' : 'bi-arrow-down'
}
</script>

<template>
  <div class="table-responsive">
    <table class="ch-table student-table">
      <thead>
        <tr>
          <th
            v-for="column in columns"
            :key="column.key"
            scope="col"
            :aria-sort="sortAria(column.key)"
          >
            <button type="button" class="th-sort" @click="emit('sort', column.key)">
              {{ column.label }}
              <i class="bi" :class="sortIcon(column.key)" aria-hidden="true"></i>
            </button>
          </th>
          <th scope="col" class="text-end">Actions</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="student in students" :key="student.uid">
          <td>
            <div class="cell-primary">
              <span class="avatar avatar-sm" :class="`avatar-tone-${getAvatarTone(student.uid)}`">
                {{ getInitials(student.fullName) }}
              </span>
              <div class="cell-primary-text">
                <strong>{{ student.fullName }}</strong>
                <span>{{ student.studentId }}</span>
              </div>
            </div>
          </td>
          <td>
            <div class="cell-primary-text student-email">
              <strong>{{ student.email }}</strong>
              <span>{{ student.phone || 'No phone provided' }}</span>
            </div>
          </td>
          <td>{{ student.department }}</td>
          <td>{{ student.program }}</td>
          <td class="text-nowrap">{{ formatStudentDate(student.enrollmentDate) }}</td>
          <td>
            <StatusBadge :status="student.status" />
          </td>
          <td>
            <div class="row-actions">
              <button
                type="button"
                class="row-action-btn"
                :aria-label="`View ${student.fullName}`"
                title="View student"
                @click="emit('view', student)"
              >
                <i class="bi bi-eye" aria-hidden="true"></i>
              </button>
              <button
                type="button"
                class="row-action-btn"
                :aria-label="`Edit ${student.fullName}`"
                title="Edit student"
                @click="emit('edit', student)"
              >
                <i class="bi bi-pencil" aria-hidden="true"></i>
              </button>
              <button
                type="button"
                class="row-action-btn is-danger"
                :aria-label="`Delete ${student.fullName}`"
                title="Delete student"
                @click="emit('delete', student)"
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

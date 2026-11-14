<script setup>
import StatusBadge from '../common/StatusBadge.vue'
import { formatStudentDate } from '../../utils/students'

const props = defineProps({
  semesters: {
    type: Array,
    default: () => [],
  },
  sortKey: {
    type: String,
    default: 'startDate',
  },
  sortDir: {
    type: String,
    default: 'desc',
  },
})

const emit = defineEmits(['sort', 'view', 'edit', 'delete'])

const columns = [
  { key: 'name', label: 'Term' },
  { key: 'academicYear', label: 'Academic year' },
  { key: 'startDate', label: 'Start date' },
  { key: 'endDate', label: 'End date' },
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
</script>

<template>
  <div class="table-responsive">
    <table class="ch-table student-table semester-table">
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
        <tr v-for="semester in semesters" :key="semester.uid">
          <td>
            <div class="cell-primary">
              <span class="department-mark" aria-hidden="true">
                <i class="bi bi-calendar3"></i>
              </span>
              <div class="cell-primary-text">
                <strong>{{ semester.name }}</strong>
                <span>Record #{{ semester.uid }}</span>
              </div>
            </div>
          </td>
          <td>
            <span class="code-badge">{{ semester.academicYear }}</span>
          </td>
          <td class="text-nowrap">{{ formatStudentDate(semester.startDate) }}</td>
          <td class="text-nowrap">{{ formatStudentDate(semester.endDate) }}</td>
          <td>
            <StatusBadge :status="semester.status" />
          </td>
          <td class="text-nowrap">{{ formatStudentDate(semester.createdAt) }}</td>
          <td>
            <div class="row-actions">
              <button
                type="button"
                class="row-action-btn"
                :aria-label="`View ${semester.name}`"
                title="View semester"
                @click="emit('view', semester)"
              >
                <i class="bi bi-eye" aria-hidden="true"></i>
              </button>
              <button
                type="button"
                class="row-action-btn"
                :aria-label="`Edit ${semester.name}`"
                title="Edit semester"
                @click="emit('edit', semester)"
              >
                <i class="bi bi-pencil" aria-hidden="true"></i>
              </button>
              <button
                type="button"
                class="row-action-btn is-danger"
                :aria-label="`Delete ${semester.name}`"
                title="Delete semester"
                @click="emit('delete', semester)"
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

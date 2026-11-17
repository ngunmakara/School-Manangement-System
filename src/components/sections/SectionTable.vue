<script setup>
import StatusBadge from '../common/StatusBadge.vue'
import { formatStudentDate } from '../../utils/students'

const props = defineProps({
  sections: {
    type: Array,
    default: () => [],
  },
  sortKey: {
    type: String,
    default: 'code',
  },
  sortDir: {
    type: String,
    default: 'asc',
  },
})

const emit = defineEmits(['sort', 'view', 'edit', 'delete'])

const columns = [
  { key: 'code', label: 'Section' },
  { key: 'teacherName', label: 'Teacher' },
  { key: 'semesterName', label: 'Semester' },
  { key: 'schedule', label: 'Schedule' },
  { key: 'capacity', label: 'Capacity' },
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
    <table class="ch-table student-table section-table">
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
        <tr v-for="section in sections" :key="section.uid">
          <td>
            <div class="cell-primary">
              <span class="department-mark" aria-hidden="true">
                <i class="bi bi-diagram-3"></i>
              </span>
              <div class="cell-primary-text">
                <strong>{{ section.code }}</strong>
                <span>{{ section.subjectName }}</span>
              </div>
            </div>
          </td>
          <td>
            <div class="cell-primary-text">
              <strong>{{ section.teacherName || 'Unassigned' }}</strong>
              <span>{{ section.room }}</span>
            </div>
          </td>
          <td>{{ section.semesterName }}</td>
          <td>{{ section.schedule }}</td>
          <td>
            <span class="code-badge">{{ section.capacity }} seats</span>
          </td>
          <td>
            <StatusBadge :status="section.status" />
          </td>
          <td class="text-nowrap">{{ formatStudentDate(section.createdAt) }}</td>
          <td>
            <div class="row-actions">
              <button
                type="button"
                class="row-action-btn"
                :aria-label="`View ${section.code}`"
                title="View section"
                @click="emit('view', section)"
              >
                <i class="bi bi-eye" aria-hidden="true"></i>
              </button>
              <button
                type="button"
                class="row-action-btn"
                :aria-label="`Edit ${section.code}`"
                title="Edit section"
                @click="emit('edit', section)"
              >
                <i class="bi bi-pencil" aria-hidden="true"></i>
              </button>
              <button
                type="button"
                class="row-action-btn is-danger"
                :aria-label="`Delete ${section.code}`"
                title="Delete section"
                @click="emit('delete', section)"
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

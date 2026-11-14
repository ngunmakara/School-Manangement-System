<script setup>
import StatusBadge from '../common/StatusBadge.vue'
import { formatStudentDate } from '../../utils/students'

const props = defineProps({
  courses: {
    type: Array,
    default: () => [],
  },
  sortKey: {
    type: String,
    default: 'title',
  },
  sortDir: {
    type: String,
    default: 'asc',
  },
})

const emit = defineEmits(['sort', 'view', 'edit', 'delete'])

const columns = [
  { key: 'title', label: 'Course / subject' },
  { key: 'code', label: 'Code' },
  { key: 'department', label: 'Department' },
  { key: 'credits', label: 'Credits' },
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
</script>

<template>
  <div class="table-responsive">
    <table class="ch-table student-table course-table">
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
        <tr v-for="course in courses" :key="course.uid">
          <td>
            <div class="cell-primary">
              <span class="department-mark" aria-hidden="true">
                <i class="bi bi-journal-bookmark"></i>
              </span>
              <div class="cell-primary-text">
                <strong>{{ course.title }}</strong>
                <span>Record #{{ course.uid }}</span>
              </div>
            </div>
          </td>
          <td>
            <span class="code-badge">{{ course.code }}</span>
          </td>
          <td>{{ course.department }}</td>
          <td>
            <span class="code-badge">{{ course.credits }} cr</span>
          </td>
          <td>
            <StatusBadge :status="course.status" />
          </td>
          <td class="text-nowrap">{{ formatStudentDate(course.createdAt) }}</td>
          <td>
            <div class="row-actions">
              <button
                type="button"
                class="row-action-btn"
                :aria-label="`View ${course.title}`"
                title="View course"
                @click="emit('view', course)"
              >
                <i class="bi bi-eye" aria-hidden="true"></i>
              </button>
              <button
                type="button"
                class="row-action-btn"
                :aria-label="`Edit ${course.title}`"
                title="Edit course"
                @click="emit('edit', course)"
              >
                <i class="bi bi-pencil" aria-hidden="true"></i>
              </button>
              <button
                type="button"
                class="row-action-btn is-danger"
                :aria-label="`Delete ${course.title}`"
                title="Delete course"
                @click="emit('delete', course)"
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

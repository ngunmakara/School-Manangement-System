<script setup>
import { formatStudentDate } from '../../utils/students'

const props = defineProps({
  departments: {
    type: Array,
    default: () => [],
  },
  sortKey: {
    type: String,
    default: 'name',
  },
  sortDir: {
    type: String,
    default: 'asc',
  },
})

const emit = defineEmits(['sort', 'view', 'edit', 'delete'])

const columns = [
  { key: 'name', label: 'Department' },
  { key: 'code', label: 'Code' },
  { key: 'headOfDepartment', label: 'Head of department' },
  { key: 'description', label: 'Description' },
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
    <table class="ch-table student-table department-table">
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
        <tr v-for="department in departments" :key="department.uid">
          <td>
            <div class="cell-primary">
              <span class="department-mark" aria-hidden="true">
                <i class="bi bi-building"></i>
              </span>
              <div class="cell-primary-text">
                <strong>{{ department.name }}</strong>
                <span>Record #{{ department.uid }}</span>
              </div>
            </div>
          </td>
          <td>
            <span class="code-badge">{{ department.code }}</span>
          </td>
          <td>{{ department.headOfDepartment || 'Not assigned' }}</td>
          <td>
            <span class="department-description">
              {{ department.description || 'No description provided' }}
            </span>
          </td>
          <td class="text-nowrap">{{ formatStudentDate(department.createdAt) }}</td>
          <td>
            <div class="row-actions">
              <button
                type="button"
                class="row-action-btn"
                :aria-label="`View ${department.name}`"
                title="View department"
                @click="emit('view', department)"
              >
                <i class="bi bi-eye" aria-hidden="true"></i>
              </button>
              <button
                type="button"
                class="row-action-btn"
                :aria-label="`Edit ${department.name}`"
                title="Edit department"
                @click="emit('edit', department)"
              >
                <i class="bi bi-pencil" aria-hidden="true"></i>
              </button>
              <button
                type="button"
                class="row-action-btn is-danger"
                :aria-label="`Delete ${department.name}`"
                title="Delete department"
                @click="emit('delete', department)"
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

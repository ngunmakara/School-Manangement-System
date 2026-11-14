<script setup>
import StatusBadge from '../common/StatusBadge.vue'
import { formatStudentDate } from '../../utils/students'

const props = defineProps({
  subjects: {
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
  { key: 'name', label: 'Subject' },
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

function sortLabel(key, label) {
  const state = sortAria(key)
  if (state === 'none') return `Sort by ${label}`

  const nextState = state === 'ascending' ? 'descending' : 'ascending'
  return `Sort by ${label}, currently ${state}. Activate to sort ${nextState}.`
}
</script>

<template>
  <div class="table-responsive">
    <table class="ch-table student-table subject-table">
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
        <tr v-for="subject in subjects" :key="subject.uid">
          <td>
            <div class="cell-primary">
              <span class="department-mark" aria-hidden="true">
                <i class="bi bi-book"></i>
              </span>
              <div class="cell-primary-text">
                <strong>{{ subject.name }}</strong>
                <span>Record #{{ subject.uid }}</span>
              </div>
            </div>
          </td>
          <td>
            <span class="code-badge">{{ subject.code }}</span>
          </td>
          <td>{{ subject.department }}</td>
          <td>
            <span class="code-badge">{{ subject.credits }} cr</span>
          </td>
          <td>
            <StatusBadge :status="subject.status" />
          </td>
          <td class="text-nowrap">{{ formatStudentDate(subject.createdAt) }}</td>
          <td>
            <div class="row-actions">
              <button
                type="button"
                class="row-action-btn"
                :aria-label="`View ${subject.name}`"
                title="View subject"
                @click="emit('view', subject)"
              >
                <i class="bi bi-eye" aria-hidden="true"></i>
              </button>
              <button
                type="button"
                class="row-action-btn"
                :aria-label="`Edit ${subject.name}`"
                title="Edit subject"
                @click="emit('edit', subject)"
              >
                <i class="bi bi-pencil" aria-hidden="true"></i>
              </button>
              <button
                type="button"
                class="row-action-btn is-danger"
                :aria-label="`Delete ${subject.name}`"
                title="Delete subject"
                @click="emit('delete', subject)"
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

<script setup>
import StatusBadge from '../common/StatusBadge.vue'
import {
  formatStudentDate,
  getAvatarTone,
  getInitials,
} from '../../utils/students'

const props = defineProps({
  teachers: {
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
  { key: 'fullName', label: 'Teacher' },
  { key: 'email', label: 'Email' },
  { key: 'department', label: 'Department' },
  { key: 'specialization', label: 'Specialization' },
  { key: 'hireDate', label: 'Hired' },
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
        <tr v-for="teacher in teachers" :key="teacher.uid">
          <td>
            <div class="cell-primary">
              <span class="avatar avatar-sm" :class="`avatar-tone-${getAvatarTone(teacher.uid)}`">
                {{ getInitials(teacher.fullName) }}
              </span>
              <div class="cell-primary-text">
                <strong>{{ teacher.fullName }}</strong>
                <span>{{ teacher.teacherId }}</span>
              </div>
            </div>
          </td>
          <td>
            <div class="cell-primary-text student-email">
              <strong>{{ teacher.email }}</strong>
              <span>{{ teacher.phone || 'No phone provided' }}</span>
            </div>
          </td>
          <td>{{ teacher.department || '—' }}</td>
          <td>{{ teacher.specialization || '—' }}</td>
          <td class="text-nowrap">{{ formatStudentDate(teacher.hireDate) }}</td>
          <td>
            <StatusBadge :status="teacher.status" />
          </td>
          <td>
            <div class="row-actions">
              <button
                type="button"
                class="row-action-btn"
                :aria-label="`View ${teacher.fullName}`"
                title="View teacher"
                @click="emit('view', teacher)"
              >
                <i class="bi bi-eye" aria-hidden="true"></i>
              </button>
              <button
                type="button"
                class="row-action-btn"
                :aria-label="`Edit ${teacher.fullName}`"
                title="Edit teacher"
                @click="emit('edit', teacher)"
              >
                <i class="bi bi-pencil" aria-hidden="true"></i>
              </button>
              <button
                type="button"
                class="row-action-btn is-danger"
                :aria-label="`Delete ${teacher.fullName}`"
                title="Delete teacher"
                @click="emit('delete', teacher)"
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

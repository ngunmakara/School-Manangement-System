<script setup>
import StatusBadge from '../common/StatusBadge.vue'
import { formatUserDate } from '../../utils/users'
import { getAvatarTone, getInitials } from '../../utils/students'

const props = defineProps({
  users: { type: Array, default: () => [] },
  sortKey: { type: String, default: 'fullName' },
  sortDir: { type: String, default: 'asc' },
})

const emit = defineEmits(['sort', 'view', 'edit', 'toggle-status'])

const columns = [
  { key: 'fullName', label: 'User' },
  { key: 'email', label: 'Email' },
  { key: 'role', label: 'Role' },
  { key: 'department', label: 'Department' },
  { key: 'status', label: 'Status' },
  { key: 'updatedAt', label: 'Updated' },
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
          <th v-for="column in columns" :key="column.key" scope="col" :aria-sort="sortAria(column.key)">
            <button type="button" class="th-sort" @click="emit('sort', column.key)">
              {{ column.label }}
              <i class="bi" :class="sortIcon(column.key)" aria-hidden="true"></i>
            </button>
          </th>
          <th scope="col" class="text-end">Actions</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="user in users" :key="user.uid">
          <td>
            <div class="cell-primary">
              <span class="avatar avatar-sm" :class="`avatar-tone-${getAvatarTone(user.uid)}`">
                {{ getInitials(user.fullName) }}
              </span>
              <div class="cell-primary-text">
                <strong>{{ user.fullName }}</strong>
                <span>{{ user.userId }}</span>
              </div>
            </div>
          </td>
          <td>
            <div class="cell-primary-text student-email">
              <strong>{{ user.email }}</strong>
              <span>{{ user.department || 'No department' }}</span>
            </div>
          </td>
          <td><span class="role-badge">{{ user.role }}</span></td>
          <td>{{ user.department || '—' }}</td>
          <td><StatusBadge :status="user.status" /></td>
          <td class="text-nowrap">{{ formatUserDate(user.updatedAt) }}</td>
          <td>
            <div class="row-actions">
              <button type="button" class="row-action-btn" :aria-label="`View ${user.fullName}`" title="View user" @click="emit('view', user)">
                <i class="bi bi-eye" aria-hidden="true"></i>
              </button>
              <button type="button" class="row-action-btn" :aria-label="`Edit ${user.fullName}`" title="Edit user" @click="emit('edit', user)">
                <i class="bi bi-pencil" aria-hidden="true"></i>
              </button>
              <button
                type="button"
                class="row-action-btn"
                :class="user.status === 'Active' ? 'is-danger' : ''"
                :aria-label="`${user.status === 'Active' ? 'Deactivate' : 'Activate'} ${user.fullName}`"
                :title="user.status === 'Active' ? 'Deactivate user' : 'Activate user'"
                @click="emit('toggle-status', user)"
              >
                <i class="bi" :class="user.status === 'Active' ? 'bi-person-dash' : 'bi-person-check'" aria-hidden="true"></i>
              </button>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

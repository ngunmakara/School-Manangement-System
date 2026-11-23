<script setup>
import BaseModal from '../common/BaseModal.vue'
import StatusBadge from '../common/StatusBadge.vue'
import { formatUserDate } from '../../utils/users'
import { getAvatarTone, getInitials } from '../../utils/students'

defineProps({
  modelValue: { type: Boolean, default: false },
  user: { type: Object, default: null },
})

const emit = defineEmits(['update:modelValue', 'edit', 'toggle-status'])
</script>

<template>
  <BaseModal :model-value="modelValue" title="User profile" size="md" @update:model-value="emit('update:modelValue', $event)">
    <template #subtitle>
      <p v-if="user" class="ch-modal-subtitle">{{ user.userId }} · Demo account (frontend-only)</p>
    </template>

    <div v-if="user" class="student-details">
      <div class="student-profile-head">
        <span class="avatar avatar-lg" :class="`avatar-tone-${getAvatarTone(user.uid)}`">
          {{ getInitials(user.fullName) }}
        </span>
        <div class="student-profile-title">
          <h3>{{ user.fullName }}</h3>
          <p>{{ user.role }}<span v-if="user.department"> · {{ user.department }}</span></p>
          <StatusBadge :status="user.status" />
        </div>
      </div>

      <dl class="detail-grid">
        <div><dt>User ID</dt><dd>{{ user.userId }}</dd></div>
        <div><dt>Role</dt><dd><span class="role-badge">{{ user.role }}</span></dd></div>
        <div><dt>Email</dt><dd><a :href="`mailto:${user.email}`">{{ user.email }}</a></dd></div>
        <div><dt>Department</dt><dd>{{ user.department || 'Not assigned' }}</dd></div>
        <div><dt>Status</dt><dd><StatusBadge :status="user.status" /></dd></div>
        <div><dt>Last updated</dt><dd>{{ formatUserDate(user.updatedAt) }}</dd></div>
        <div><dt>Created</dt><dd>{{ formatUserDate(user.createdAt) }}</dd></div>
        <div><dt>Record ID</dt><dd class="detail-mono">{{ user.uid }}</dd></div>
      </dl>

      <p class="detail-note">
        <i class="bi bi-hdd" aria-hidden="true"></i>
        This is a local demo user record stored in browser storage. No authentication or backend access is enforced.
      </p>
    </div>

    <template #footer>
      <template v-if="user">
        <button type="button" class="btn-ch btn-ch-soft" @click="emit('update:modelValue', false)">Close</button>
        <button
          type="button"
          class="btn-ch"
          :class="user.status === 'Active' ? 'btn-ch-danger' : 'btn-ch-soft'"
          @click="emit('toggle-status', user)"
        >
          <i class="bi" :class="user.status === 'Active' ? 'bi-person-dash' : 'bi-person-check'" aria-hidden="true"></i>
          {{ user.status === 'Active' ? 'Deactivate user' : 'Activate user' }}
        </button>
        <button type="button" class="btn-ch btn-ch-primary" @click="emit('edit', user)">
          <i class="bi bi-pencil" aria-hidden="true"></i>
          Edit user
        </button>
      </template>
    </template>
  </BaseModal>
</template>

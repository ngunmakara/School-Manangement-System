<script setup>
import BaseModal from '../common/BaseModal.vue'
import StatusBadge from '../common/StatusBadge.vue'
import {
  formatStudentDate,
  getAvatarTone,
  getInitials,
} from '../../utils/students'

defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  teacher: {
    type: Object,
    default: null,
  },
})

const emit = defineEmits(['update:modelValue', 'edit'])
</script>

<template>
  <BaseModal
    :model-value="modelValue"
    title="Teacher profile"
    size="md"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <template #subtitle>
      <p v-if="teacher" class="ch-modal-subtitle">{{ teacher.teacherId }}</p>
    </template>

    <div v-if="teacher" class="student-details">
      <div class="student-profile-head">
        <span class="avatar avatar-lg" :class="`avatar-tone-${getAvatarTone(teacher.uid)}`">
          {{ getInitials(teacher.fullName) }}
        </span>
        <div class="student-profile-title">
          <h3>{{ teacher.fullName }}</h3>
          <p>{{ teacher.specialization }}</p>
          <StatusBadge :status="teacher.status" />
        </div>
      </div>

      <dl class="detail-grid">
        <div>
          <dt>Teacher ID</dt>
          <dd>{{ teacher.teacherId }}</dd>
        </div>
        <div>
          <dt>Hire date</dt>
          <dd>{{ formatStudentDate(teacher.hireDate) }}</dd>
        </div>
        <div>
          <dt>Email</dt>
          <dd>
            <a :href="`mailto:${teacher.email}`">{{ teacher.email }}</a>
          </dd>
        </div>
        <div>
          <dt>Phone</dt>
          <dd>{{ teacher.phone || 'Not provided' }}</dd>
        </div>
        <div>
          <dt>Department</dt>
          <dd>{{ teacher.department }}</dd>
        </div>
        <div>
          <dt>Specialization</dt>
          <dd>{{ teacher.specialization }}</dd>
        </div>
        <div>
          <dt>Status</dt>
          <dd><StatusBadge :status="teacher.status" /></dd>
        </div>
        <div>
          <dt>Record ID</dt>
          <dd class="detail-mono">{{ teacher.uid }}</dd>
        </div>
      </dl>

      <p class="detail-note">
        <i class="bi bi-cloud-check" aria-hidden="true"></i>
        This profile is served by the CampusHub REST API and stored in MySQL.
      </p>
    </div>

    <template #footer>
      <template v-if="teacher">
        <button type="button" class="btn-ch btn-ch-soft" @click="emit('update:modelValue', false)">
          Close
        </button>
        <button type="button" class="btn-ch btn-ch-primary" @click="emit('edit', teacher)">
          <i class="bi bi-pencil" aria-hidden="true"></i>
          Edit teacher
        </button>
      </template>
    </template>
  </BaseModal>
</template>

<script setup>
import BaseModal from '../common/BaseModal.vue'
import StatusBadge from '../common/StatusBadge.vue'
import { useStudentsStore } from '../../stores/students'
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
  student: {
    type: Object,
    default: null,
  },
})

const emit = defineEmits(['update:modelValue', 'edit'])

const store = useStudentsStore()
</script>

<template>
  <BaseModal
    :model-value="modelValue"
    title="Student profile"
    size="md"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <template #subtitle>
      <p v-if="student" class="ch-modal-subtitle">{{ student.studentId }}</p>
    </template>

    <div v-if="student" class="student-details">
      <div class="student-profile-head">
        <span class="avatar avatar-lg" :class="`avatar-tone-${getAvatarTone(student.uid)}`">
          {{ getInitials(student.fullName) }}
        </span>
        <div class="student-profile-title">
          <h3>{{ student.fullName }}</h3>
          <p>{{ student.program }}</p>
          <StatusBadge :status="student.status" />
        </div>
      </div>

      <dl class="detail-grid">
        <div>
          <dt>Student ID</dt>
          <dd>{{ student.studentId }}</dd>
        </div>
        <div>
          <dt>Enrollment date</dt>
          <dd>{{ formatStudentDate(student.enrollmentDate) }}</dd>
        </div>
        <div>
          <dt>Email</dt>
          <dd>
            <a :href="`mailto:${student.email}`">{{ student.email }}</a>
          </dd>
        </div>
        <div>
          <dt>Phone</dt>
          <dd>{{ student.phone || 'Not provided' }}</dd>
        </div>
        <div>
          <dt>Department</dt>
          <dd>{{ student.department }}</dd>
        </div>
        <div>
          <dt>Program</dt>
          <dd>{{ student.program }}</dd>
        </div>
        <div>
          <dt>Status</dt>
          <dd><StatusBadge :status="student.status" /></dd>
        </div>
        <div>
          <dt>Record ID</dt>
          <dd class="detail-mono">{{ student.uid }}</dd>
        </div>
      </dl>

      <p class="detail-note">
        <i class="bi" :class="store.isApiMode ? 'bi-cloud-check' : 'bi-database'" aria-hidden="true"></i>
        {{
          store.isApiMode
            ? 'This profile is served by the CampusHub REST API and stored in MySQL.'
            : "This profile is stored in this browser’s localStorage for the CampusHub demo."
        }}
      </p>
    </div>

    <template #footer>
      <template v-if="student">
        <button type="button" class="btn-ch btn-ch-soft" @click="emit('update:modelValue', false)">
          Close
        </button>
        <button type="button" class="btn-ch btn-ch-primary" @click="emit('edit', student)">
          <i class="bi bi-pencil" aria-hidden="true"></i>
          Edit student
        </button>
      </template>
    </template>
  </BaseModal>
</template>

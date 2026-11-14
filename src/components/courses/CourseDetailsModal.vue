<script setup>
import BaseModal from '../common/BaseModal.vue'
import StatusBadge from '../common/StatusBadge.vue'
import { formatStudentDate } from '../../utils/students'

defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  course: {
    type: Object,
    default: null,
  },
})

const emit = defineEmits(['update:modelValue', 'edit'])
</script>

<template>
  <BaseModal
    :model-value="modelValue"
    title="Course details"
    size="md"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <template #subtitle>
      <p v-if="course" class="ch-modal-subtitle">{{ course.code }}</p>
    </template>

    <div v-if="course" class="student-details">
      <div class="student-profile-head">
        <span class="department-mark department-mark-lg" aria-hidden="true">
          <i class="bi bi-journal-bookmark"></i>
        </span>
        <div class="student-profile-title">
          <h3>{{ course.title }}</h3>
          <p>{{ course.department }}</p>
          <StatusBadge :status="course.status" />
        </div>
      </div>

      <dl class="detail-grid">
        <div>
          <dt>Title</dt>
          <dd>{{ course.title }}</dd>
        </div>
        <div>
          <dt>Code</dt>
          <dd class="detail-mono">{{ course.code }}</dd>
        </div>
        <div>
          <dt>Department</dt>
          <dd>{{ course.department }}</dd>
        </div>
        <div>
          <dt>Credits</dt>
          <dd>{{ course.credits }}</dd>
        </div>
        <div>
          <dt>Status</dt>
          <dd><StatusBadge :status="course.status" /></dd>
        </div>
        <div>
          <dt>Created</dt>
          <dd>{{ formatStudentDate(course.createdAt) }}</dd>
        </div>
        <div>
          <dt>Last updated</dt>
          <dd>{{ formatStudentDate(course.updatedAt) }}</dd>
        </div>
        <div>
          <dt>Record ID</dt>
          <dd class="detail-mono">{{ course.uid }}</dd>
        </div>
      </dl>

      <div class="department-description-block">
        <h4>Description</h4>
        <p>{{ course.description || 'No description has been added for this course or subject.' }}</p>
      </div>

      <p class="detail-note">
        <i class="bi bi-hdd" aria-hidden="true"></i>
        This record is stored in this browser's localStorage and is not synced to the CampusHub
        server.
      </p>
    </div>

    <template #footer>
      <template v-if="course">
        <button type="button" class="btn-ch btn-ch-soft" @click="emit('update:modelValue', false)">
          Close
        </button>
        <button type="button" class="btn-ch btn-ch-primary" @click="emit('edit', course)">
          <i class="bi bi-pencil" aria-hidden="true"></i>
          Edit record
        </button>
      </template>
    </template>
  </BaseModal>
</template>

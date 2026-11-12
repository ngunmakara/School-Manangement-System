<script setup>
import BaseModal from '../common/BaseModal.vue'
import { formatStudentDate } from '../../utils/students'

defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  department: {
    type: Object,
    default: null,
  },
})

const emit = defineEmits(['update:modelValue', 'edit'])
</script>

<template>
  <BaseModal
    :model-value="modelValue"
    title="Department details"
    size="md"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <template #subtitle>
      <p v-if="department" class="ch-modal-subtitle">{{ department.code }}</p>
    </template>

    <div v-if="department" class="student-details">
      <div class="student-profile-head">
        <span class="department-mark department-mark-lg" aria-hidden="true">
          <i class="bi bi-building"></i>
        </span>
        <div class="student-profile-title">
          <h3>{{ department.name }}</h3>
          <p>{{ department.headOfDepartment || 'Head of department not assigned' }}</p>
          <span class="code-badge">{{ department.code }}</span>
        </div>
      </div>

      <dl class="detail-grid">
        <div>
          <dt>Department name</dt>
          <dd>{{ department.name }}</dd>
        </div>
        <div>
          <dt>Code</dt>
          <dd class="detail-mono">{{ department.code }}</dd>
        </div>
        <div>
          <dt>Head of department</dt>
          <dd>{{ department.headOfDepartment || 'Not assigned' }}</dd>
        </div>
        <div>
          <dt>Created</dt>
          <dd>{{ formatStudentDate(department.createdAt) }}</dd>
        </div>
        <div>
          <dt>Last updated</dt>
          <dd>{{ formatStudentDate(department.updatedAt) }}</dd>
        </div>
        <div>
          <dt>Record ID</dt>
          <dd class="detail-mono">{{ department.uid }}</dd>
        </div>
      </dl>

      <div class="department-description-block">
        <h4>Description</h4>
        <p>{{ department.description || 'No description has been added for this department.' }}</p>
      </div>

      <p class="detail-note">
        <i class="bi bi-shield-check" aria-hidden="true"></i>
        Departments assigned to students or teachers cannot be deleted.
      </p>
    </div>

    <template #footer>
      <template v-if="department">
        <button type="button" class="btn-ch btn-ch-soft" @click="emit('update:modelValue', false)">
          Close
        </button>
        <button type="button" class="btn-ch btn-ch-primary" @click="emit('edit', department)">
          <i class="bi bi-pencil" aria-hidden="true"></i>
          Edit department
        </button>
      </template>
    </template>
  </BaseModal>
</template>

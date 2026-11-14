<script setup>
import { computed } from 'vue'
import BaseModal from '../common/BaseModal.vue'
import StatusBadge from '../common/StatusBadge.vue'
import { useSubjectsStore } from '../../stores/subjects'
import { formatStudentDate } from '../../utils/students'

defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  subject: {
    type: Object,
    default: null,
  },
})

const emit = defineEmits(['update:modelValue', 'edit'])
const store = useSubjectsStore()

const storageNote = computed(() => {
  if (store.storageState === 'unavailable' || store.persistenceState === 'unavailable') {
    return {
      warning: true,
      icon: 'bi-exclamation-triangle',
      text: 'Browser storage is unavailable. Changes to this subject last for this session only.',
    }
  }

  if (store.persistenceState === 'failed') {
    return {
      warning: true,
      icon: 'bi-exclamation-triangle',
      text: 'Browser storage is not accepting saves. Changes to this subject last for this session only.',
    }
  }

  return {
    warning: false,
    icon: 'bi-hdd',
    text: "This record is stored in this browser's localStorage and is not synced to the CampusHub server.",
  }
})
</script>

<template>
  <BaseModal
    :model-value="modelValue"
    title="Subject details"
    size="md"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <template #subtitle>
      <p v-if="subject" class="ch-modal-subtitle">{{ subject.code }}</p>
    </template>

    <div v-if="subject" class="student-details">
      <div class="student-profile-head">
        <span class="department-mark department-mark-lg" aria-hidden="true">
          <i class="bi bi-book"></i>
        </span>
        <div class="student-profile-title">
          <h3>{{ subject.name }}</h3>
          <p>{{ subject.department }}</p>
          <StatusBadge :status="subject.status" />
        </div>
      </div>

      <dl class="detail-grid">
        <div>
          <dt>Subject name</dt>
          <dd>{{ subject.name }}</dd>
        </div>
        <div>
          <dt>Code</dt>
          <dd class="detail-mono">{{ subject.code }}</dd>
        </div>
        <div>
          <dt>Department</dt>
          <dd>{{ subject.department }}</dd>
        </div>
        <div>
          <dt>Credits</dt>
          <dd>{{ subject.credits }}</dd>
        </div>
        <div>
          <dt>Status</dt>
          <dd><StatusBadge :status="subject.status" /></dd>
        </div>
        <div>
          <dt>Created</dt>
          <dd>{{ formatStudentDate(subject.createdAt) }}</dd>
        </div>
        <div>
          <dt>Last updated</dt>
          <dd>{{ formatStudentDate(subject.updatedAt) }}</dd>
        </div>
        <div>
          <dt>Record ID</dt>
          <dd class="detail-mono">{{ subject.uid }}</dd>
        </div>
      </dl>

      <div class="department-description-block">
        <h4>Description</h4>
        <p>{{ subject.description || 'No description has been added for this subject.' }}</p>
      </div>

      <p class="detail-note" :class="{ 'is-warning': storageNote.warning }">
        <i class="bi" :class="storageNote.icon" aria-hidden="true"></i>
        {{ storageNote.text }}
      </p>
    </div>

    <template #footer>
      <template v-if="subject">
        <button type="button" class="btn-ch btn-ch-soft" @click="emit('update:modelValue', false)">
          Close
        </button>
        <button type="button" class="btn-ch btn-ch-primary" @click="emit('edit', subject)">
          <i class="bi bi-pencil" aria-hidden="true"></i>
          Edit subject
        </button>
      </template>
    </template>
  </BaseModal>
</template>

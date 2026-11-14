<script setup>
import { computed } from 'vue'
import BaseModal from '../common/BaseModal.vue'
import StatusBadge from '../common/StatusBadge.vue'
import { useSemestersStore } from '../../stores/semesters'
import { formatStudentDate } from '../../utils/students'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  semester: {
    type: Object,
    default: null,
  },
})

const emit = defineEmits(['update:modelValue', 'edit'])
const store = useSemestersStore()

const durationDays = computed(() => {
  if (!props.semester?.startDate || !props.semester?.endDate) return null

  const start = new Date(`${props.semester.startDate}T00:00:00`)
  const end = new Date(`${props.semester.endDate}T00:00:00`)

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null

  return Math.round((end.getTime() - start.getTime()) / 86400000) + 1
})

const storageNote = computed(() => {
  if (store.storageState === 'unavailable' || store.persistenceState === 'unavailable') {
    return {
      warning: true,
      icon: 'bi-exclamation-triangle',
      text: 'Browser storage is unavailable. Changes to this semester last for this session only.',
    }
  }

  if (store.persistenceState === 'failed') {
    return {
      warning: true,
      icon: 'bi-exclamation-triangle',
      text: 'Browser storage is not accepting saves. Changes to this semester last for this session only.',
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
    title="Semester details"
    size="md"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <template #subtitle>
      <p v-if="semester" class="ch-modal-subtitle">
        {{ semester.academicYear }} · {{ semester.name }}
      </p>
    </template>

    <div v-if="semester" class="student-details">
      <div class="student-profile-head">
        <span class="department-mark department-mark-lg" aria-hidden="true">
          <i class="bi bi-calendar3"></i>
        </span>
        <div class="student-profile-title">
          <h3>{{ semester.name }}</h3>
          <p>{{ semester.academicYear }}</p>
          <StatusBadge :status="semester.status" />
        </div>
      </div>

      <dl class="detail-grid">
        <div>
          <dt>Term name</dt>
          <dd>{{ semester.name }}</dd>
        </div>
        <div>
          <dt>Academic year</dt>
          <dd class="detail-mono">{{ semester.academicYear }}</dd>
        </div>
        <div>
          <dt>Start date</dt>
          <dd>{{ formatStudentDate(semester.startDate) }}</dd>
        </div>
        <div>
          <dt>End date</dt>
          <dd>{{ formatStudentDate(semester.endDate) }}</dd>
        </div>
        <div>
          <dt>Duration</dt>
          <dd>{{ durationDays ? `${durationDays} days` : '—' }}</dd>
        </div>
        <div>
          <dt>Status</dt>
          <dd><StatusBadge :status="semester.status" /></dd>
        </div>
        <div>
          <dt>Created</dt>
          <dd>{{ formatStudentDate(semester.createdAt) }}</dd>
        </div>
        <div>
          <dt>Last updated</dt>
          <dd>{{ formatStudentDate(semester.updatedAt) }}</dd>
        </div>
        <div>
          <dt>Record ID</dt>
          <dd class="detail-mono">{{ semester.uid }}</dd>
        </div>
      </dl>

      <div class="department-description-block">
        <h4>Description</h4>
        <p>{{ semester.description || 'No description has been added for this semester.' }}</p>
      </div>

      <p class="detail-note" :class="{ 'is-warning': storageNote.warning }">
        <i class="bi" :class="storageNote.icon" aria-hidden="true"></i>
        {{ storageNote.text }}
      </p>
    </div>

    <template #footer>
      <template v-if="semester">
        <button type="button" class="btn-ch btn-ch-soft" @click="emit('update:modelValue', false)">
          Close
        </button>
        <button type="button" class="btn-ch btn-ch-primary" @click="emit('edit', semester)">
          <i class="bi bi-pencil" aria-hidden="true"></i>
          Edit semester
        </button>
      </template>
    </template>
  </BaseModal>
</template>

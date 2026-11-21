<script setup>
import { computed } from 'vue'
import BaseModal from '../common/BaseModal.vue'
import StatusBadge from '../common/StatusBadge.vue'
import { useEnrollmentsStore } from '../../stores/enrollments'
import { enrollmentStatusLabel } from '../../utils/enrollments'
import { formatStudentDate } from '../../utils/students'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  enrollment: {
    type: Object,
    default: null,
  },
})

const emit = defineEmits(['update:modelValue', 'edit'])

const store = useEnrollmentsStore()

const statusText = computed(
  () => props.enrollment?.statusLabel || enrollmentStatusLabel(props.enrollment?.status),
)

const seatsText = computed(() => {
  const capacity = Number(props.enrollment?.capacity)
  if (!Number.isFinite(capacity)) return '—'
  return `${Number(props.enrollment?.seatsUsed) || 0}/${capacity} enrolled`
})

const storageNote = computed(() => {
  if (store.storageState === 'unavailable' || store.persistenceState === 'unavailable') {
    return {
      warning: true,
      icon: 'bi-exclamation-triangle',
      text: 'Browser storage is unavailable. Changes to this enrollment last for this session only.',
    }
  }

  if (store.persistenceState === 'failed') {
    return {
      warning: true,
      icon: 'bi-exclamation-triangle',
      text: 'Browser storage is not accepting saves. Changes to this enrollment last for this session only.',
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
    title="Enrollment details"
    size="md"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <template #subtitle>
      <p v-if="enrollment" class="ch-modal-subtitle">
        {{ enrollment.studentName }} · {{ enrollment.sectionCode }}
      </p>
    </template>

    <div v-if="enrollment" class="student-details">
      <div class="student-profile-head">
        <span class="department-mark department-mark-lg" aria-hidden="true">
          <i class="bi bi-person-plus"></i>
        </span>
        <div class="student-profile-title">
          <h3>{{ enrollment.studentName }}</h3>
          <p>{{ enrollment.studentId }} · {{ enrollment.sectionCode }}</p>
          <StatusBadge :status="enrollment.status" :label="statusText" />
        </div>
      </div>

      <dl class="detail-grid">
        <div>
          <dt>Student</dt>
          <dd>{{ enrollment.studentName }}</dd>
        </div>
        <div>
          <dt>Student ID</dt>
          <dd class="detail-mono">{{ enrollment.studentId }}</dd>
        </div>
        <div>
          <dt>Class section</dt>
          <dd>{{ enrollment.sectionCode }}</dd>
        </div>
        <div>
          <dt>Subject</dt>
          <dd>{{ enrollment.subjectName }}</dd>
        </div>
        <div>
          <dt>Teacher</dt>
          <dd>{{ enrollment.teacherName }}</dd>
        </div>
        <div>
          <dt>Semester</dt>
          <dd>{{ enrollment.semesterName }}</dd>
        </div>
        <div>
          <dt>Schedule</dt>
          <dd>{{ enrollment.schedule }}</dd>
        </div>
        <div>
          <dt>Local seats</dt>
          <dd>{{ seatsText }}</dd>
        </div>
        <div>
          <dt>Status</dt>
          <dd><StatusBadge :status="enrollment.status" :label="statusText" /></dd>
        </div>
        <div>
          <dt>Created</dt>
          <dd>{{ formatStudentDate(enrollment.createdAt) }}</dd>
        </div>
        <div>
          <dt>Last updated</dt>
          <dd>{{ formatStudentDate(enrollment.updatedAt) }}</dd>
        </div>
        <div>
          <dt>Record ID</dt>
          <dd class="detail-mono">{{ enrollment.uid }}</dd>
        </div>
      </dl>

      <p class="detail-note" :class="{ 'is-warning': storageNote.warning }">
        <i class="bi" :class="storageNote.icon" aria-hidden="true"></i>
        {{ storageNote.text }} Seat counts use locally saved enrollment records only.
      </p>
    </div>

    <template #footer>
      <template v-if="enrollment">
        <button type="button" class="btn-ch btn-ch-soft" @click="emit('update:modelValue', false)">
          Close
        </button>
        <button type="button" class="btn-ch btn-ch-primary" @click="emit('edit', enrollment)">
          <i class="bi bi-pencil" aria-hidden="true"></i>
          Edit enrollment
        </button>
      </template>
    </template>
  </BaseModal>
</template>

<script setup>
import { computed } from 'vue'
import BaseModal from '../common/BaseModal.vue'
import StatusBadge from '../common/StatusBadge.vue'
import { useAttendanceStore } from '../../stores/attendance'
import { attendanceStatusLabel } from '../../utils/attendance'
import { formatStudentDate } from '../../utils/students'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  attendance: {
    type: Object,
    default: null,
  },
})

const emit = defineEmits(['update:modelValue', 'edit'])

const store = useAttendanceStore()

const statusText = computed(
  () => props.attendance?.statusLabel || attendanceStatusLabel(props.attendance?.status),
)

const storageNote = computed(() => {
  if (store.storageState === 'unavailable' || store.persistenceState === 'unavailable') {
    return {
      warning: true,
      icon: 'bi-exclamation-triangle',
      text: 'Browser storage is unavailable. Changes to this attendance record last for this session only.',
    }
  }

  if (store.persistenceState === 'failed') {
    return {
      warning: true,
      icon: 'bi-exclamation-triangle',
      text: 'Browser storage is not accepting saves. Changes to this attendance record last for this session only.',
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
    title="Attendance details"
    size="md"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <template #subtitle>
      <p v-if="attendance" class="ch-modal-subtitle">
        {{ attendance.studentName }} · {{ attendance.sectionCode }} · {{ attendance.date }}
      </p>
    </template>

    <div v-if="attendance" class="student-details">
      <div class="student-profile-head">
        <span class="department-mark department-mark-lg" aria-hidden="true">
          <i class="bi bi-clipboard-check"></i>
        </span>
        <div class="student-profile-title">
          <h3>{{ attendance.studentName }}</h3>
          <p>{{ attendance.studentId }} · {{ attendance.date }}</p>
          <StatusBadge :status="attendance.status" :label="statusText" />
        </div>
      </div>

      <dl class="detail-grid">
        <div>
          <dt>Student</dt>
          <dd>{{ attendance.studentName }}</dd>
        </div>
        <div>
          <dt>Student ID</dt>
          <dd class="detail-mono">{{ attendance.studentId }}</dd>
        </div>
        <div>
          <dt>Class section</dt>
          <dd>{{ attendance.sectionCode }}</dd>
        </div>
        <div>
          <dt>Subject</dt>
          <dd>{{ attendance.subjectName }}</dd>
        </div>
        <div>
          <dt>Teacher</dt>
          <dd>{{ attendance.teacherName }}</dd>
        </div>
        <div>
          <dt>Semester</dt>
          <dd>{{ attendance.semesterName }}</dd>
        </div>
        <div>
          <dt>Date</dt>
          <dd>{{ attendance.date }}</dd>
        </div>
        <div>
          <dt>Status</dt>
          <dd><StatusBadge :status="attendance.status" :label="statusText" /></dd>
        </div>
        <div>
          <dt>Created</dt>
          <dd>{{ formatStudentDate(attendance.createdAt) }}</dd>
        </div>
        <div>
          <dt>Last updated</dt>
          <dd>{{ formatStudentDate(attendance.updatedAt) }}</dd>
        </div>
        <div>
          <dt>Record ID</dt>
          <dd class="detail-mono">{{ attendance.uid }}</dd>
        </div>
      </dl>

      <p class="detail-note" :class="{ 'is-warning': storageNote.warning }">
        <i class="bi" :class="storageNote.icon" aria-hidden="true"></i>
        {{ storageNote.text }} Attendance is recorded against active local enrollment records only.
      </p>
    </div>

    <template #footer>
      <template v-if="attendance">
        <button type="button" class="btn-ch btn-ch-soft" @click="emit('update:modelValue', false)">
          Close
        </button>
        <button type="button" class="btn-ch btn-ch-primary" @click="emit('edit', attendance)">
          <i class="bi bi-pencil" aria-hidden="true"></i>
          Edit attendance
        </button>
      </template>
    </template>
  </BaseModal>
</template>

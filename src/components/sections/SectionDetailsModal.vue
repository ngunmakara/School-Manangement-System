<script setup>
import { computed } from 'vue'
import BaseModal from '../common/BaseModal.vue'
import StatusBadge from '../common/StatusBadge.vue'
import { useSectionsStore } from '../../stores/sections'
import { useSubjectsStore } from '../../stores/subjects'
import { useSemestersStore } from '../../stores/semesters'
import { formatStudentDate } from '../../utils/students'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  section: {
    type: Object,
    default: null,
  },
})

const emit = defineEmits(['update:modelValue', 'edit'])
const store = useSectionsStore()
const subjectsStore = useSubjectsStore()
const semestersStore = useSemestersStore()

const subject = computed(() =>
  subjectsStore.subjects.find((record) => record.uid === props.section?.subjectUid),
)
const semester = computed(() =>
  semestersStore.semesters.find((record) => record.uid === props.section?.semesterUid),
)

const subjectLabel = computed(() =>
  subject.value ? `${subject.value.code} · ${subject.value.name}` : 'Unknown subject',
)

const semesterLabel = computed(() =>
  semester.value ? `${semester.value.name} · ${semester.value.academicYear}` : 'Unknown semester',
)

const storageNote = computed(() => {
  if (store.storageState === 'unavailable' || store.persistenceState === 'unavailable') {
    return {
      warning: true,
      icon: 'bi-exclamation-triangle',
      text: 'Browser storage is unavailable. Changes to this section last for this session only.',
    }
  }

  if (store.persistenceState === 'failed') {
    return {
      warning: true,
      icon: 'bi-exclamation-triangle',
      text: 'Browser storage is not accepting saves. Changes to this section last for this session only.',
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
    title="Section details"
    size="md"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <template #subtitle>
      <p v-if="section" class="ch-modal-subtitle">{{ subjectLabel }} · {{ section.room }}</p>
    </template>

    <div v-if="section" class="student-details">
      <div class="student-profile-head">
        <span class="department-mark department-mark-lg" aria-hidden="true">
          <i class="bi bi-diagram-3"></i>
        </span>
        <div class="student-profile-title">
          <h3>{{ section.code }}</h3>
          <p>{{ section.teacherName || 'Unassigned teacher' }}</p>
          <StatusBadge :status="section.status" />
        </div>
      </div>

      <dl class="detail-grid">
        <div>
          <dt>Section code</dt>
          <dd class="detail-mono">{{ section.code }}</dd>
        </div>
        <div>
          <dt>Subject</dt>
          <dd>{{ subjectLabel }}</dd>
        </div>
        <div>
          <dt>Teacher</dt>
          <dd>{{ section.teacherName || 'Unassigned' }}</dd>
        </div>
        <div>
          <dt>Semester</dt>
          <dd>{{ semesterLabel }}</dd>
        </div>
        <div>
          <dt>Room</dt>
          <dd>{{ section.room }}</dd>
        </div>
        <div>
          <dt>Schedule</dt>
          <dd>{{ section.schedule }}</dd>
        </div>
        <div>
          <dt>Capacity</dt>
          <dd>{{ section.capacity }} seats</dd>
        </div>
        <div>
          <dt>Status</dt>
          <dd><StatusBadge :status="section.status" /></dd>
        </div>
        <div>
          <dt>Created</dt>
          <dd>{{ formatStudentDate(section.createdAt) }}</dd>
        </div>
        <div>
          <dt>Last updated</dt>
          <dd>{{ formatStudentDate(section.updatedAt) }}</dd>
        </div>
        <div>
          <dt>Record ID</dt>
          <dd class="detail-mono">{{ section.uid }}</dd>
        </div>
      </dl>

      <div class="department-description-block">
        <h4>Description</h4>
        <p>{{ section.description || 'No description has been added for this section.' }}</p>
      </div>

      <p class="detail-note" :class="{ 'is-warning': storageNote.warning }">
        <i class="bi" :class="storageNote.icon" aria-hidden="true"></i>
        {{ storageNote.text }}
      </p>
    </div>

    <template #footer>
      <template v-if="section">
        <button type="button" class="btn-ch btn-ch-soft" @click="emit('update:modelValue', false)">
          Close
        </button>
        <button type="button" class="btn-ch btn-ch-primary" @click="emit('edit', section)">
          <i class="bi bi-pencil" aria-hidden="true"></i>
          Edit section
        </button>
      </template>
    </template>
  </BaseModal>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import BaseModal from '../common/BaseModal.vue'
import { useAttendanceStore } from '../../stores/attendance'
import {
  ATTENDANCE_STATUSES,
  attendanceStatusLabel,
  resolveSectionRoster,
  sanitizeAttendanceInput,
  toLocalDateKey,
} from '../../utils/attendance'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  attendance: {
    type: Object,
    default: null,
  },
  students: {
    type: Array,
    default: () => [],
  },
  sections: {
    type: Array,
    default: () => [],
  },
  enrollments: {
    type: Array,
    default: () => [],
  },
  defaultDate: {
    type: String,
    default: '',
  },
  defaultSectionUid: {
    type: String,
    default: '',
  },
  studentDirectoryNotice: {
    type: String,
    default: '',
  },
})

const emit = defineEmits(['update:modelValue', 'saved'])

const store = useAttendanceStore()
const formId = 'attendance-form'

const fieldIds = {
  studentUid: 'attendance-field-student',
  sectionUid: 'attendance-field-section',
  date: 'attendance-field-date',
  status: 'attendance-field-status',
}

function blankForm() {
  return {
    studentUid: '',
    sectionUid: String(props.defaultSectionUid ?? '').trim(),
    date: toLocalDateKey(props.defaultDate) || toLocalDateKey(new Date()),
    status: 'present',
  }
}

const form = reactive(blankForm())
const errors = reactive({})
const isSubmitting = ref(false)
const showDiscardWarning = ref(false)
const initialSnapshot = ref('')
const isEdit = computed(() => Boolean(props.attendance))
const modalTitle = computed(() => (isEdit.value ? 'Edit attendance' : 'Add attendance'))

function serializeForm() {
  return JSON.stringify({
    studentUid: form.studentUid,
    sectionUid: form.sectionUid,
    date: form.date,
    status: form.status,
  })
}

const isDirty = computed(
  () => initialSnapshot.value !== '' && serializeForm() !== initialSnapshot.value,
)

const statusChoices = ATTENDANCE_STATUSES.map((status) => ({
  value: status,
  label: attendanceStatusLabel(status),
}))

const sectionChoices = computed(() =>
  props.sections.map((section) => ({
    ...section,
    label: section.label || section.code || section.uid,
  })),
)

const rosterResult = computed(() =>
  resolveSectionRoster(props.enrollments, props.students, form.sectionUid),
)

const studentChoices = computed(() =>
  rosterResult.value.roster.map((student) => ({
    ...student,
    label:
      student.label ||
      `${student.fullName || 'Unknown student'}${student.studentId ? ` · ${student.studentId}` : ''}`,
  })),
)

const unresolvedNote = computed(() => {
  const count = rosterResult.value.unresolvedCount
  if (!form.sectionUid || !count) return ''
  return `${count} enrollment record${count === 1 ? '' : 's'} for this section could not be matched to a student and ${count === 1 ? 'was' : 'were'} excluded.`
})

const emptyRosterNote = computed(() => {
  if (!form.sectionUid || studentChoices.value.length) return ''
  return 'No enrolled students are available for this class section.'
})

const storageNote = computed(() => {
  if (store.storageState === 'unavailable' || store.persistenceState === 'unavailable') {
    return {
      warning: true,
      icon: 'bi-exclamation-triangle',
      text: 'Browser storage is unavailable. This attendance record will last for this session only.',
    }
  }

  if (store.persistenceState === 'failed') {
    return {
      warning: true,
      icon: 'bi-exclamation-triangle',
      text: 'Browser storage is not accepting saves. Attendance changes will last for this session only.',
    }
  }

  return {
    warning: false,
    icon: 'bi-hdd',
    text: "Attendance records are stored in this browser's localStorage and are not synced to the CampusHub server.",
  }
})

function clearErrors() {
  Object.keys(errors).forEach((key) => delete errors[key])
}

function clearError(field) {
  if (errors[field]) delete errors[field]
  if (errors.form) delete errors.form
}

function resetForm() {
  Object.assign(form, blankForm())

  if (props.attendance) {
    Object.assign(form, sanitizeAttendanceInput(props.attendance))
  }

  clearErrors()
  showDiscardWarning.value = false
  initialSnapshot.value = serializeForm()
}

watch(
  () => props.modelValue,
  (open) => {
    if (open) resetForm()
  },
)

watch(
  () => props.attendance,
  () => {
    if (props.modelValue) resetForm()
  },
)

watch(
  () => form.sectionUid,
  () => {
    const availableUids = new Set(studentChoices.value.map((student) => student.uid))
    if (form.studentUid && !availableUids.has(form.studentUid)) {
      form.studentUid = ''
    }
    clearError('studentUid')
  },
)

function close() {
  emit('update:modelValue', false)
}

function requestClose() {
  if (!isDirty.value) {
    close()
    return
  }

  showDiscardWarning.value = true
}

function cancelDiscard() {
  showDiscardWarning.value = false
}

function discardChanges() {
  showDiscardWarning.value = false
  close()
}

function handleModalUpdate(value) {
  if (value) {
    emit('update:modelValue', value)
    return
  }

  requestClose()
}

async function handleSubmit() {
  if (isSubmitting.value) return

  isSubmitting.value = true

  let result
  try {
    const context = {
      sections: props.sections,
      roster: rosterResult.value.roster,
    }
    result = isEdit.value
      ? await store.updateAttendance(props.attendance.uid, { ...form }, context)
      : await store.addAttendance({ ...form }, context)
  } catch {
    clearErrors()
    errors.form = 'The attendance record could not be saved. Please try again.'
    isSubmitting.value = false
    return
  }

  isSubmitting.value = false

  if (!result.ok) {
    clearErrors()
    Object.assign(errors, result.errors)

    const unmappedField = Object.keys(result.errors).find((key) => key !== 'form' && !fieldIds[key])
    if (unmappedField && !result.errors.form) {
      errors.form = result.errors[unmappedField]
    }

    const firstField = Object.keys(result.errors).find((key) => fieldIds[key])
    if (firstField) document.getElementById(fieldIds[firstField])?.focus()
    return
  }

  emit('saved', {
    mode: isEdit.value ? 'edit' : 'add',
    attendance: result.attendance,
    persisted: result.persisted,
  })
  showDiscardWarning.value = false
  emit('update:modelValue', false)
}
</script>

<template>
  <BaseModal
    :model-value="modelValue"
    :title="modalTitle"
    size="md"
    @update:model-value="handleModalUpdate"
  >
    <template #subtitle>
      <p class="ch-modal-subtitle">
        {{
          isEdit
            ? 'Update the student, section, date, or attendance status.'
            : 'Record attendance for an actively enrolled student.'
        }}
      </p>
    </template>

    <form :id="formId" class="student-form" novalidate @submit.prevent="handleSubmit">
      <div v-if="showDiscardWarning" class="ch-alert is-warning" role="alert">
        <i class="bi bi-exclamation-triangle" aria-hidden="true"></i>
        <div>
          <strong>Discard unsaved changes?</strong>
          <span class="d-block">Your edits to this attendance record have not been saved yet.</span>
          <div class="d-flex flex-wrap gap-2 mt-2">
            <button type="button" class="btn-ch btn-ch-soft btn-ch-sm" @click="cancelDiscard">
              Keep editing
            </button>
            <button type="button" class="btn-ch btn-ch-ghost btn-ch-sm" @click="discardChanges">
              Discard changes
            </button>
          </div>
        </div>
      </div>

      <div v-if="errors.form" class="form-alert" role="alert">
        <i class="bi bi-exclamation-circle" aria-hidden="true"></i>
        {{ errors.form }}
      </div>

      <div v-if="studentDirectoryNotice" class="form-alert" role="status">
        <i class="bi bi-info-circle" aria-hidden="true"></i>
        {{ studentDirectoryNotice }}
      </div>

      <div v-if="unresolvedNote" class="form-alert" role="status">
        <i class="bi bi-exclamation-triangle" aria-hidden="true"></i>
        {{ unresolvedNote }}
      </div>

      <div class="form-grid">
        <div class="form-field is-full">
          <label class="form-label" :for="fieldIds.sectionUid">
            Class section <span class="req" aria-hidden="true">*</span>
          </label>
          <select
            :id="fieldIds.sectionUid"
            v-model="form.sectionUid"
            class="form-select"
            :class="{ 'is-invalid': errors.sectionUid }"
            :disabled="isSubmitting"
            :aria-invalid="errors.sectionUid ? 'true' : 'false'"
            :aria-describedby="errors.sectionUid ? `${fieldIds.sectionUid}-error` : undefined"
            @change="clearError('sectionUid')"
          >
            <option value="" disabled>Select a class section</option>
            <option v-for="section in sectionChoices" :key="section.uid" :value="section.uid">
              {{ section.label }}
            </option>
          </select>
          <p v-if="errors.sectionUid" :id="`${fieldIds.sectionUid}-error`" class="field-error">
            {{ errors.sectionUid }}
          </p>
        </div>

        <div class="form-field is-full">
          <label class="form-label" :for="fieldIds.studentUid">
            Student <span class="req" aria-hidden="true">*</span>
          </label>
          <select
            :id="fieldIds.studentUid"
            v-model="form.studentUid"
            class="form-select"
            :class="{ 'is-invalid': errors.studentUid }"
            :disabled="isSubmitting || !studentChoices.length"
            :aria-invalid="errors.studentUid ? 'true' : 'false'"
            :aria-describedby="errors.studentUid ? `${fieldIds.studentUid}-error` : undefined"
            data-autofocus
            @change="clearError('studentUid')"
          >
            <option value="" disabled>Select an enrolled student</option>
            <option v-for="student in studentChoices" :key="student.uid" :value="student.uid">
              {{ student.label }}
            </option>
          </select>
          <p v-if="errors.studentUid" :id="`${fieldIds.studentUid}-error`" class="field-error">
            {{ errors.studentUid }}
          </p>
          <p v-if="emptyRosterNote" class="field-hint">{{ emptyRosterNote }}</p>
          <p v-else-if="form.sectionUid" class="field-hint">
            Only students actively enrolled in this section are available.
          </p>
        </div>

        <div class="form-field">
          <label class="form-label" :for="fieldIds.date">
            Date <span class="req" aria-hidden="true">*</span>
          </label>
          <input
            :id="fieldIds.date"
            v-model="form.date"
            type="date"
            class="form-control"
            :class="{ 'is-invalid': errors.date }"
            :disabled="isSubmitting"
            :aria-invalid="errors.date ? 'true' : 'false'"
            :aria-describedby="errors.date ? `${fieldIds.date}-error` : undefined"
            @change="clearError('date')"
          />
          <p v-if="errors.date" :id="`${fieldIds.date}-error`" class="field-error">
            {{ errors.date }}
          </p>
        </div>

        <div class="form-field">
          <label class="form-label" :for="fieldIds.status">Attendance status</label>
          <select
            :id="fieldIds.status"
            v-model="form.status"
            class="form-select"
            :class="{ 'is-invalid': errors.status }"
            :disabled="isSubmitting"
            :aria-invalid="errors.status ? 'true' : 'false'"
            :aria-describedby="errors.status ? `${fieldIds.status}-error` : undefined"
            @change="clearError('status')"
          >
            <option v-for="status in statusChoices" :key="status.value" :value="status.value">
              {{ status.label }}
            </option>
          </select>
          <p v-if="errors.status" :id="`${fieldIds.status}-error`" class="field-error">
            {{ errors.status }}
          </p>
        </div>
      </div>

      <p class="form-note" :class="{ 'is-warning': storageNote.warning }">
        <i class="bi" :class="storageNote.icon" aria-hidden="true"></i>
        {{ storageNote.text }}
      </p>
    </form>

    <template #footer>
      <button
        type="button"
        class="btn-ch btn-ch-soft"
        :disabled="isSubmitting"
        @click="requestClose"
      >
        Cancel
      </button>
      <button type="submit" :form="formId" class="btn-ch btn-ch-primary" :disabled="isSubmitting">
        <i
          class="bi"
          :class="isSubmitting ? 'bi-arrow-repeat' : 'bi-check2'"
          aria-hidden="true"
        ></i>
        {{ isSubmitting ? 'Saving…' : isEdit ? 'Save changes' : 'Add attendance' }}
      </button>
    </template>
  </BaseModal>
</template>

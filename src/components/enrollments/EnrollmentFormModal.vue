<script setup>
import { computed, reactive, ref, watch } from 'vue'
import BaseModal from '../common/BaseModal.vue'
import { useEnrollmentsStore } from '../../stores/enrollments'
import {
  ENROLLMENT_STATUSES,
  enrollmentStatusLabel,
  sanitizeEnrollmentInput,
} from '../../utils/enrollments'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  enrollment: {
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
  studentDirectoryNotice: {
    type: String,
    default: '',
  },
})

const emit = defineEmits(['update:modelValue', 'saved'])

const store = useEnrollmentsStore()
const formId = 'enrollment-form'

const fieldIds = {
  studentUid: 'enrollment-field-student',
  sectionUid: 'enrollment-field-section',
  status: 'enrollment-field-status',
}

function blankForm() {
  return {
    studentUid: '',
    sectionUid: '',
    status: 'enrolled',
  }
}

const form = reactive(blankForm())
const errors = reactive({})
const isSubmitting = ref(false)
const showDiscardWarning = ref(false)
const initialSnapshot = ref('')
const isEdit = computed(() => Boolean(props.enrollment))
const modalTitle = computed(() => (isEdit.value ? 'Edit enrollment' : 'Add enrollment'))

function serializeForm() {
  return JSON.stringify({
    studentUid: form.studentUid,
    sectionUid: form.sectionUid,
    status: form.status,
  })
}

const isDirty = computed(
  () => initialSnapshot.value !== '' && serializeForm() !== initialSnapshot.value,
)

const statusChoices = ENROLLMENT_STATUSES.map((status) => ({
  value: status,
  label: enrollmentStatusLabel(status),
}))

const sectionChoices = computed(() =>
  props.sections.map((section) => ({
    ...section,
    disabled: Boolean(section.full) && section.uid !== form.sectionUid,
  })),
)

const selectedSection = computed(() =>
  props.sections.find((section) => section.uid === form.sectionUid),
)

const capacityNote = computed(() => {
  const capacity = Number(selectedSection.value?.capacity)
  if (!Number.isFinite(capacity)) {
    return 'Capacity is not available for this section.'
  }

  const used = Number(selectedSection.value?.seatsUsed) || 0
  const remaining = Math.max(capacity - used, 0)
  return `Local seats: ${used}/${capacity} enrolled · ${remaining} remaining. Capacity is a local estimate, not server-confirmed availability.`
})

const storageNote = computed(() => {
  if (store.storageState === 'unavailable' || store.persistenceState === 'unavailable') {
    return {
      warning: true,
      icon: 'bi-exclamation-triangle',
      text: 'Browser storage is unavailable. This enrollment will last for this session only.',
    }
  }

  if (store.persistenceState === 'failed') {
    return {
      warning: true,
      icon: 'bi-exclamation-triangle',
      text: 'Browser storage is not accepting saves. Enrollment changes will last for this session only.',
    }
  }

  if (form.status === 'enrolled' && Number.isFinite(Number(selectedSection.value?.capacity))) {
    return {
      warning: false,
      icon: 'bi-info-circle',
      text: capacityNote.value,
    }
  }

  return {
    warning: false,
    icon: 'bi-hdd',
    text: "Enrollment records are stored in this browser's localStorage and are not synced to the CampusHub server.",
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

  if (props.enrollment) {
    Object.assign(form, sanitizeEnrollmentInput(props.enrollment))
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
  () => props.enrollment,
  () => {
    if (props.modelValue) resetForm()
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
    const context = { sections: props.sections, students: props.students }
    result = isEdit.value
      ? await store.updateEnrollment(props.enrollment.uid, form, context)
      : await store.addEnrollment(form, context)
  } catch {
    clearErrors()
    errors.form = 'The enrollment could not be saved. Please try again.'
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
    enrollment: result.enrollment,
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
            ? 'Update the student, section, or enrollment status.'
            : 'Connect a student to an existing class section.'
        }}
      </p>
    </template>

    <form :id="formId" class="student-form" novalidate @submit.prevent="handleSubmit">
      <div v-if="showDiscardWarning" class="ch-alert is-warning" role="alert">
        <i class="bi bi-exclamation-triangle" aria-hidden="true"></i>
        <div>
          <strong>Discard unsaved changes?</strong>
          <span class="d-block">Your edits to this enrollment have not been saved yet.</span>
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

      <div class="form-grid">
        <div class="form-field is-full">
          <label class="form-label" :for="fieldIds.studentUid">
            Student <span class="req" aria-hidden="true">*</span>
          </label>
          <select
            :id="fieldIds.studentUid"
            v-model="form.studentUid"
            class="form-select"
            :class="{ 'is-invalid': errors.studentUid }"
            :disabled="isSubmitting"
            :aria-invalid="errors.studentUid ? 'true' : 'false'"
            :aria-describedby="errors.studentUid ? `${fieldIds.studentUid}-error` : undefined"
            data-autofocus
            @change="clearError('studentUid')"
          >
            <option value="" disabled>Select a student</option>
            <option v-for="student in students" :key="student.uid" :value="student.uid">
              {{ student.label }}
            </option>
          </select>
          <p v-if="errors.studentUid" :id="`${fieldIds.studentUid}-error`" class="field-error">
            {{ errors.studentUid }}
          </p>
        </div>

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
            <option
              v-for="section in sectionChoices"
              :key="section.uid"
              :value="section.uid"
              :disabled="section.disabled"
            >
              {{ section.label }}{{ section.full ? ' (full)' : '' }}
            </option>
          </select>
          <p v-if="errors.sectionUid" :id="`${fieldIds.sectionUid}-error`" class="field-error">
            {{ errors.sectionUid }}
          </p>
          <p v-if="form.sectionUid" class="field-hint">{{ capacityNote }}</p>
        </div>

        <div class="form-field is-full">
          <label class="form-label" :for="fieldIds.status">Enrollment status</label>
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
        {{ isSubmitting ? 'Saving…' : isEdit ? 'Save changes' : 'Add enrollment' }}
      </button>
    </template>
  </BaseModal>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import BaseModal from '../common/BaseModal.vue'
import { useSemestersStore } from '../../stores/semesters'
import { SEMESTER_LIMITS, SEMESTER_STATUSES } from '../../utils/semesters'

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

const emit = defineEmits(['update:modelValue', 'saved'])

const store = useSemestersStore()
const formId = 'semester-form'

const fieldIds = {
  name: 'semester-field-name',
  academicYear: 'semester-field-year',
  startDate: 'semester-field-start',
  endDate: 'semester-field-end',
  status: 'semester-field-status',
  description: 'semester-field-description',
}

function blankForm() {
  return {
    name: '',
    academicYear: '',
    startDate: '',
    endDate: '',
    status: 'Upcoming',
    description: '',
  }
}

const form = reactive(blankForm())
const errors = reactive({})
const isSubmitting = ref(false)
const showDiscardWarning = ref(false)
const initialSnapshot = ref('')
const isEdit = computed(() => Boolean(props.semester))
const modalTitle = computed(() => (isEdit.value ? 'Edit semester' : 'Add semester'))

function serializeForm() {
  return JSON.stringify({
    name: form.name,
    academicYear: form.academicYear,
    startDate: form.startDate,
    endDate: form.endDate,
    status: form.status,
    description: form.description,
  })
}

const isDirty = computed(
  () => initialSnapshot.value !== '' && serializeForm() !== initialSnapshot.value,
)

const storageNote = computed(() => {
  if (store.storageState === 'unavailable' || store.persistenceState === 'unavailable') {
    return {
      warning: true,
      icon: 'bi-exclamation-triangle',
      text: 'Browser storage is unavailable. This semester will last for this session only.',
    }
  }

  if (store.persistenceState === 'failed') {
    return {
      warning: true,
      icon: 'bi-exclamation-triangle',
      text: 'Browser storage is not accepting saves. Semester changes will last for this session only.',
    }
  }

  return {
    warning: false,
    icon: 'bi-hdd',
    text: "Records are stored in this browser's localStorage. They are not sent to the CampusHub server.",
  }
})

function clearErrors() {
  Object.keys(errors).forEach((key) => delete errors[key])
}

function clearError(field) {
  if (errors[field]) delete errors[field]
  if (errors.form) delete errors.form
}

function handleDateInput(field) {
  clearError(field)
  if (field === 'startDate') clearError('endDate')
}

function resetForm() {
  Object.assign(form, blankForm())

  if (props.semester) {
    Object.assign(form, {
      name: props.semester.name,
      academicYear: props.semester.academicYear,
      startDate: props.semester.startDate,
      endDate: props.semester.endDate,
      status: props.semester.status,
      description: props.semester.description,
    })
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
  () => props.semester,
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
    result = isEdit.value
      ? await store.updateSemester(props.semester.uid, form)
      : await store.addSemester(form)
  } catch {
    isSubmitting.value = false
    return
  }

  isSubmitting.value = false

  if (!result.ok) {
    clearErrors()
    Object.assign(errors, result.errors)
    const firstField = Object.keys(result.errors).find((key) => fieldIds[key])
    if (firstField) document.getElementById(fieldIds[firstField])?.focus()
    return
  }

  emit('saved', {
    mode: isEdit.value ? 'edit' : 'add',
    semester: result.semester,
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
            ? 'Update the academic term, dates, and status.'
            : 'Create a new academic term for the semester calendar.'
        }}
      </p>
    </template>

    <form :id="formId" class="student-form" novalidate @submit.prevent="handleSubmit">
      <div v-if="showDiscardWarning" class="ch-alert is-warning" role="alert">
        <i class="bi bi-exclamation-triangle" aria-hidden="true"></i>
        <div>
          <strong>Discard unsaved changes?</strong>
          <span class="d-block">Your edits to this semester have not been saved yet.</span>
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

      <div class="form-grid">
        <div class="form-field">
          <label class="form-label" :for="fieldIds.name">
            Term name <span class="req" aria-hidden="true">*</span>
          </label>
          <input
            :id="fieldIds.name"
            v-model.trim="form.name"
            type="text"
            class="form-control"
            :class="{ 'is-invalid': errors.name }"
            placeholder="Fall 2026"
            autocomplete="off"
            :maxlength="SEMESTER_LIMITS.nameMaxLength"
            :aria-invalid="errors.name ? 'true' : 'false'"
            :aria-describedby="errors.name ? `${fieldIds.name}-error` : undefined"
            data-autofocus
            @input="clearError('name')"
          />
          <p v-if="errors.name" :id="`${fieldIds.name}-error`" class="field-error">
            {{ errors.name }}
          </p>
        </div>

        <div class="form-field">
          <label class="form-label" :for="fieldIds.academicYear">
            Academic year <span class="req" aria-hidden="true">*</span>
          </label>
          <input
            :id="fieldIds.academicYear"
            v-model.trim="form.academicYear"
            type="text"
            class="form-control"
            :class="{ 'is-invalid': errors.academicYear }"
            placeholder="2026-2027"
            autocomplete="off"
            :maxlength="SEMESTER_LIMITS.academicYearMaxLength"
            :aria-invalid="errors.academicYear ? 'true' : 'false'"
            :aria-describedby="
              errors.academicYear ? `${fieldIds.academicYear}-error` : undefined
            "
            @input="clearError('academicYear')"
          />
          <p
            v-if="errors.academicYear"
            :id="`${fieldIds.academicYear}-error`"
            class="field-error"
          >
            {{ errors.academicYear }}
          </p>
          <p class="field-hint">Use a range such as 2026-2027.</p>
        </div>

        <div class="form-field">
          <label class="form-label" :for="fieldIds.startDate">
            Start date <span class="req" aria-hidden="true">*</span>
          </label>
          <input
            :id="fieldIds.startDate"
            v-model="form.startDate"
            type="date"
            class="form-control"
            :class="{ 'is-invalid': errors.startDate }"
            :aria-invalid="errors.startDate ? 'true' : 'false'"
            :aria-describedby="errors.startDate ? `${fieldIds.startDate}-error` : undefined"
            @input="handleDateInput('startDate')"
          />
          <p v-if="errors.startDate" :id="`${fieldIds.startDate}-error`" class="field-error">
            {{ errors.startDate }}
          </p>
        </div>

        <div class="form-field">
          <label class="form-label" :for="fieldIds.endDate">
            End date <span class="req" aria-hidden="true">*</span>
          </label>
          <input
            :id="fieldIds.endDate"
            v-model="form.endDate"
            type="date"
            class="form-control"
            :class="{ 'is-invalid': errors.endDate }"
            :aria-invalid="errors.endDate ? 'true' : 'false'"
            :aria-describedby="errors.endDate ? `${fieldIds.endDate}-error` : undefined"
            @input="handleDateInput('endDate')"
          />
          <p v-if="errors.endDate" :id="`${fieldIds.endDate}-error`" class="field-error">
            {{ errors.endDate }}
          </p>
        </div>

        <div class="form-field">
          <label class="form-label" :for="fieldIds.status">Status</label>
          <select
            :id="fieldIds.status"
            v-model="form.status"
            class="form-select"
            :class="{ 'is-invalid': errors.status }"
            :aria-invalid="errors.status ? 'true' : 'false'"
            :aria-describedby="errors.status ? `${fieldIds.status}-error` : undefined"
            @change="clearError('status')"
          >
            <option v-for="status in SEMESTER_STATUSES" :key="status" :value="status">
              {{ status }}
            </option>
          </select>
          <p v-if="errors.status" :id="`${fieldIds.status}-error`" class="field-error">
            {{ errors.status }}
          </p>
        </div>

        <div class="form-field is-full">
          <label class="form-label" :for="fieldIds.description">
            Description <span class="field-optional">optional</span>
          </label>
          <textarea
            :id="fieldIds.description"
            v-model.trim="form.description"
            class="form-control"
            :class="{ 'is-invalid': errors.description }"
            rows="3"
            :maxlength="SEMESTER_LIMITS.descriptionMaxLength"
            placeholder="Add notes about registration, exams, or other term details."
            :aria-invalid="errors.description ? 'true' : 'false'"
            :aria-describedby="
              errors.description ? `${fieldIds.description}-error` : undefined
            "
            @input="clearError('description')"
          ></textarea>
          <p
            v-if="errors.description"
            :id="`${fieldIds.description}-error`"
            class="field-error"
          >
            {{ errors.description }}
          </p>
          <p class="field-hint">
            {{ form.description.length }}/{{ SEMESTER_LIMITS.descriptionMaxLength }}
            characters
          </p>
        </div>
      </div>

      <p class="form-note" :class="{ 'is-warning': storageNote.warning }">
        <i class="bi" :class="storageNote.icon" aria-hidden="true"></i>
        {{ storageNote.text }}
      </p>
    </form>

    <template #footer>
      <button type="button" class="btn-ch btn-ch-soft" @click="requestClose">Cancel</button>
      <button type="submit" :form="formId" class="btn-ch btn-ch-primary" :disabled="isSubmitting">
        <i class="bi" :class="isSubmitting ? 'bi-arrow-repeat' : 'bi-check2'" aria-hidden="true"></i>
        {{ isSubmitting ? 'Saving…' : isEdit ? 'Save changes' : 'Add semester' }}
      </button>
    </template>
  </BaseModal>
</template>

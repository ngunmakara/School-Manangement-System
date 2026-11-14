<script setup>
import { computed, reactive, ref, watch } from 'vue'
import BaseModal from '../common/BaseModal.vue'
import { useSubjectsStore } from '../../stores/subjects'
import { useDepartmentsStore } from '../../stores/departments'
import { STUDENT_DEPARTMENTS } from '../../utils/students'
import { SUBJECT_LIMITS, SUBJECT_STATUSES } from '../../utils/subjects'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  subject: {
    type: Object,
    default: null,
  },
})

const emit = defineEmits(['update:modelValue', 'saved'])

const store = useSubjectsStore()
const departmentsStore = useDepartmentsStore()
const formId = 'subject-form'

const fieldIds = {
  code: 'subject-field-code',
  name: 'subject-field-name',
  department: 'subject-field-department',
  credits: 'subject-field-credits',
  status: 'subject-field-status',
  description: 'subject-field-description',
}

function blankForm() {
  return {
    code: '',
    name: '',
    department: '',
    credits: '',
    status: 'Active',
    description: '',
  }
}

const form = reactive(blankForm())
const errors = reactive({})
const isSubmitting = ref(false)
const showDiscardWarning = ref(false)
const initialSnapshot = ref('')
const isEdit = computed(() => Boolean(props.subject))
const modalTitle = computed(() => (isEdit.value ? 'Edit subject' : 'Add subject'))

function serializeForm() {
  return JSON.stringify({
    code: form.code,
    name: form.name,
    department: form.department,
    credits: form.credits,
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
      text: 'Browser storage is unavailable. This subject will last for this session only.',
    }
  }

  if (store.persistenceState === 'failed') {
    return {
      warning: true,
      icon: 'bi-exclamation-triangle',
      text: 'Browser storage is not accepting saves. Subject changes will last for this session only.',
    }
  }

  return {
    warning: false,
    icon: 'bi-hdd',
    text: "Records are stored in this browser's localStorage. They are not sent to the CampusHub server.",
  }
})

const directoryDepartments = computed(() => departmentsStore.departmentOptions)

const departmentOptions = computed(() => {
  const options = new Set([...STUDENT_DEPARTMENTS, ...directoryDepartments.value])
  if (form.department) options.add(form.department)

  return [...options].sort((left, right) =>
    left.localeCompare(right, 'en', { sensitivity: 'base' }),
  )
})

const departmentSourceNote = computed(() =>
  directoryDepartments.value.length
    ? 'Departments include the currently loaded CampusHub directory.'
    : 'Using the built-in department list.',
)

function clearErrors() {
  Object.keys(errors).forEach((key) => delete errors[key])
}

function clearError(field) {
  if (errors[field]) delete errors[field]
  if (errors.form) delete errors.form
}

function resetForm() {
  Object.assign(form, blankForm())

  if (props.subject) {
    Object.assign(form, {
      code: props.subject.code,
      name: props.subject.name,
      department: props.subject.department,
      credits: props.subject.credits,
      status: props.subject.status,
      description: props.subject.description,
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
  () => props.subject,
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
      ? await store.updateSubject(props.subject.uid, form)
      : await store.addSubject(form)
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
    subject: result.subject,
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
            ? 'Update the subject details and save your changes.'
            : 'Create a new subject record for the catalog.'
        }}
      </p>
    </template>

    <form :id="formId" class="student-form" novalidate @submit.prevent="handleSubmit">
      <div v-if="showDiscardWarning" class="ch-alert is-warning" role="alert">
        <i class="bi bi-exclamation-triangle" aria-hidden="true"></i>
        <div>
          <strong>Discard unsaved changes?</strong>
          <span class="d-block">Your edits to this subject have not been saved yet.</span>
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
          <label class="form-label" :for="fieldIds.code">
            Subject code <span class="req" aria-hidden="true">*</span>
          </label>
          <input
            :id="fieldIds.code"
            v-model.trim="form.code"
            type="text"
            class="form-control text-uppercase"
            :class="{ 'is-invalid': errors.code }"
            placeholder="CS301"
            autocomplete="off"
            :maxlength="SUBJECT_LIMITS.codeMaxLength"
            :aria-invalid="errors.code ? 'true' : 'false'"
            :aria-describedby="errors.code ? `${fieldIds.code}-error` : undefined"
            data-autofocus
            @input="clearError('code')"
          />
          <p v-if="errors.code" :id="`${fieldIds.code}-error`" class="field-error">
            {{ errors.code }}
          </p>
        </div>

        <div class="form-field">
          <label class="form-label" :for="fieldIds.name">
            Subject name <span class="req" aria-hidden="true">*</span>
          </label>
          <input
            :id="fieldIds.name"
            v-model.trim="form.name"
            type="text"
            class="form-control"
            :class="{ 'is-invalid': errors.name }"
            placeholder="Database Systems"
            autocomplete="off"
            :maxlength="SUBJECT_LIMITS.nameMaxLength"
            :aria-invalid="errors.name ? 'true' : 'false'"
            :aria-describedby="errors.name ? `${fieldIds.name}-error` : undefined"
            @input="clearError('name')"
          />
          <p v-if="errors.name" :id="`${fieldIds.name}-error`" class="field-error">
            {{ errors.name }}
          </p>
        </div>

        <div class="form-field">
          <label class="form-label" :for="fieldIds.department">
            Department <span class="req" aria-hidden="true">*</span>
          </label>
          <select
            :id="fieldIds.department"
            v-model="form.department"
            class="form-select"
            :class="{ 'is-invalid': errors.department }"
            :aria-invalid="errors.department ? 'true' : 'false'"
            :aria-describedby="errors.department ? `${fieldIds.department}-error` : undefined"
            @change="clearError('department')"
          >
            <option value="" disabled>Select a department</option>
            <option v-for="department in departmentOptions" :key="department" :value="department">
              {{ department }}
            </option>
          </select>
          <p v-if="errors.department" :id="`${fieldIds.department}-error`" class="field-error">
            {{ errors.department }}
          </p>
          <p class="field-hint">{{ departmentSourceNote }}</p>
        </div>

        <div class="form-field">
          <label class="form-label" :for="fieldIds.credits">
            Credits <span class="req" aria-hidden="true">*</span>
          </label>
          <input
            :id="fieldIds.credits"
            v-model.number="form.credits"
            type="number"
            class="form-control"
            :class="{ 'is-invalid': errors.credits }"
            :min="SUBJECT_LIMITS.minCredits"
            :max="SUBJECT_LIMITS.maxCredits"
            step="1"
            placeholder="3"
            :aria-invalid="errors.credits ? 'true' : 'false'"
            :aria-describedby="errors.credits ? `${fieldIds.credits}-error` : undefined"
            @input="clearError('credits')"
          />
          <p v-if="errors.credits" :id="`${fieldIds.credits}-error`" class="field-error">
            {{ errors.credits }}
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
            <option v-for="status in SUBJECT_STATUSES" :key="status" :value="status">
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
            :maxlength="SUBJECT_LIMITS.descriptionMaxLength"
            placeholder="Briefly describe the subject and its academic focus."
            :aria-invalid="errors.description ? 'true' : 'false'"
            :aria-describedby="errors.description ? `${fieldIds.description}-error` : undefined"
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
            {{ form.description.length }}/{{ SUBJECT_LIMITS.descriptionMaxLength }} characters
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
        {{ isSubmitting ? 'Saving…' : isEdit ? 'Save changes' : 'Add subject' }}
      </button>
    </template>
  </BaseModal>
</template>

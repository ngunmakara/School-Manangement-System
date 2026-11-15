<script setup>
import { computed, nextTick, reactive, ref, watch } from 'vue'
import BaseModal from '../common/BaseModal.vue'
import { useDepartmentsStore } from '../../stores/departments'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  department: {
    type: Object,
    default: null,
  },
})

const emit = defineEmits(['update:modelValue', 'saved'])

const store = useDepartmentsStore()
const modalRef = ref(null)
const formId = 'department-form'

const fieldIds = {
  name: 'department-field-name',
  code: 'department-field-code',
  headOfDepartment: 'department-field-head',
  description: 'department-field-description',
}

function blankForm() {
  return {
    name: '',
    code: '',
    headOfDepartment: '',
    description: '',
  }
}

const form = reactive(blankForm())
const errors = reactive({})
const isSubmitting = ref(false)
const showDiscardWarning = ref(false)
const initialSnapshot = ref('')
const isEdit = computed(() => Boolean(props.department))
const modalTitle = computed(() => (isEdit.value ? 'Edit department' : 'Add department'))

function serializeForm() {
  return JSON.stringify({
    name: form.name,
    code: form.code,
    headOfDepartment: form.headOfDepartment,
    description: form.description,
  })
}

const isDirty = computed(
  () => initialSnapshot.value !== '' && serializeForm() !== initialSnapshot.value,
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

  if (props.department) {
    Object.assign(form, {
      name: props.department.name,
      code: props.department.code,
      headOfDepartment: props.department.headOfDepartment,
      description: props.department.description,
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
  () => props.department,
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

async function cancelDiscard() {
  showDiscardWarning.value = false
  await nextTick()
  modalRef.value?.focusFirst()
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
      ? await store.updateDepartment(props.department.uid, form)
      : await store.addDepartment(form)
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
    department: result.department,
  })
  showDiscardWarning.value = false
  emit('update:modelValue', false)
}
</script>

<template>
  <BaseModal
    ref="modalRef"
    :model-value="modelValue"
    :title="modalTitle"
    size="md"
    @update:model-value="handleModalUpdate"
  >
    <template #subtitle>
      <p class="ch-modal-subtitle">
        {{
          isEdit
            ? 'Update the department details and save your changes.'
            : 'Create a new academic department for the directory.'
        }}
      </p>
    </template>

    <form :id="formId" class="student-form" novalidate @submit.prevent="handleSubmit">
      <div v-if="showDiscardWarning" class="ch-alert is-warning" role="alert">
        <i class="bi bi-exclamation-triangle" aria-hidden="true"></i>
        <div>
          <strong>Discard unsaved changes?</strong>
          <span class="d-block">Your edits to this department have not been saved yet.</span>
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
            Department name <span class="req" aria-hidden="true">*</span>
          </label>
          <input
            :id="fieldIds.name"
            v-model.trim="form.name"
            type="text"
            class="form-control"
            :class="{ 'is-invalid': errors.name }"
            placeholder="Computer Science"
            autocomplete="off"
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
          <label class="form-label" :for="fieldIds.code">
            Department code <span class="req" aria-hidden="true">*</span>
          </label>
          <input
            :id="fieldIds.code"
            v-model.trim="form.code"
            type="text"
            class="form-control text-uppercase"
            :class="{ 'is-invalid': errors.code }"
            placeholder="CS"
            autocomplete="off"
            maxlength="20"
            :aria-invalid="errors.code ? 'true' : 'false'"
            :aria-describedby="errors.code ? `${fieldIds.code}-error` : undefined"
            @input="clearError('code')"
          />
          <p v-if="errors.code" :id="`${fieldIds.code}-error`" class="field-error">
            {{ errors.code }}
          </p>
        </div>

        <div class="form-field is-full">
          <label class="form-label" :for="fieldIds.headOfDepartment">
            Head of department <span class="field-optional">optional</span>
          </label>
          <input
            :id="fieldIds.headOfDepartment"
            v-model.trim="form.headOfDepartment"
            type="text"
            class="form-control"
            :class="{ 'is-invalid': errors.headOfDepartment }"
            placeholder="Dr. Elena Park"
            autocomplete="off"
            :aria-invalid="errors.headOfDepartment ? 'true' : 'false'"
            :aria-describedby="
              errors.headOfDepartment ? `${fieldIds.headOfDepartment}-error` : undefined
            "
            @input="clearError('headOfDepartment')"
          />
          <p
            v-if="errors.headOfDepartment"
            :id="`${fieldIds.headOfDepartment}-error`"
            class="field-error"
          >
            {{ errors.headOfDepartment }}
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
            maxlength="500"
            placeholder="Briefly describe the department and its academic focus."
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
          <p class="field-hint">{{ form.description.length }}/500 characters</p>
        </div>
      </div>

      <p class="form-note">
        <i class="bi bi-info-circle" aria-hidden="true"></i>
        Departments are stored in MySQL. A department cannot be deleted while students or teachers
        are assigned to it.
      </p>
    </form>

    <template #footer>
      <button type="button" class="btn-ch btn-ch-soft" @click="requestClose">Cancel</button>
      <button type="submit" :form="formId" class="btn-ch btn-ch-primary" :disabled="isSubmitting">
        <i class="bi" :class="isSubmitting ? 'bi-arrow-repeat' : 'bi-check2'" aria-hidden="true"></i>
        {{ isSubmitting ? 'Saving…' : isEdit ? 'Save changes' : 'Add department' }}
      </button>
    </template>
  </BaseModal>
</template>

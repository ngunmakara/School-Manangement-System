<script setup>
import { computed, reactive, ref, watch } from 'vue'
import BaseModal from '../common/BaseModal.vue'
import { useCoursesStore } from '../../stores/courses'
import { useDepartmentsStore } from '../../stores/departments'
import { STUDENT_DEPARTMENTS } from '../../utils/students'
import { COURSE_STATUSES } from '../../utils/courses'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  course: {
    type: Object,
    default: null,
  },
})

const emit = defineEmits(['update:modelValue', 'saved'])

const store = useCoursesStore()
const departmentsStore = useDepartmentsStore()
const formId = 'course-form'

const fieldIds = {
  code: 'course-field-code',
  title: 'course-field-title',
  department: 'course-field-department',
  credits: 'course-field-credits',
  status: 'course-field-status',
  description: 'course-field-description',
}

function blankForm() {
  return {
    code: '',
    title: '',
    department: '',
    credits: '',
    status: 'Active',
    description: '',
  }
}

const form = reactive(blankForm())
const errors = reactive({})
const isSubmitting = ref(false)
const isEdit = computed(() => Boolean(props.course))
const modalTitle = computed(() => (isEdit.value ? 'Edit course or subject' : 'Add course or subject'))

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

  if (props.course) {
    Object.assign(form, {
      code: props.course.code,
      title: props.course.title,
      department: props.course.department,
      credits: props.course.credits,
      status: props.course.status,
      description: props.course.description,
    })
  }

  clearErrors()
}

watch(
  () => props.modelValue,
  (open) => {
    if (open) resetForm()
  },
)

watch(
  () => props.course,
  () => {
    if (props.modelValue) resetForm()
  },
)

function close() {
  emit('update:modelValue', false)
}

async function handleSubmit() {
  if (isSubmitting.value) return

  isSubmitting.value = true

  let result
  try {
    result = isEdit.value
      ? await store.updateCourse(props.course.uid, form)
      : await store.addCourse(form)
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
    course: result.course,
  })
  emit('update:modelValue', false)
}
</script>

<template>
  <BaseModal
    :model-value="modelValue"
    :title="modalTitle"
    size="md"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <template #subtitle>
      <p class="ch-modal-subtitle">
        {{
          isEdit
            ? 'Update the catalog details and save your changes.'
            : 'Create a new course or subject record for the catalog.'
        }}
      </p>
    </template>

    <form :id="formId" class="student-form" novalidate @submit.prevent="handleSubmit">
      <div v-if="errors.form" class="form-alert" role="alert">
        <i class="bi bi-exclamation-circle" aria-hidden="true"></i>
        {{ errors.form }}
      </div>

      <div class="form-grid">
        <div class="form-field">
          <label class="form-label" :for="fieldIds.code">
            Course or subject code <span class="req" aria-hidden="true">*</span>
          </label>
          <input
            :id="fieldIds.code"
            v-model.trim="form.code"
            type="text"
            class="form-control text-uppercase"
            :class="{ 'is-invalid': errors.code }"
            placeholder="CS101"
            autocomplete="off"
            maxlength="20"
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
          <label class="form-label" :for="fieldIds.title">
            Title <span class="req" aria-hidden="true">*</span>
          </label>
          <input
            :id="fieldIds.title"
            v-model.trim="form.title"
            type="text"
            class="form-control"
            :class="{ 'is-invalid': errors.title }"
            placeholder="Introduction to Computer Science"
            autocomplete="off"
            maxlength="120"
            :aria-invalid="errors.title ? 'true' : 'false'"
            :aria-describedby="errors.title ? `${fieldIds.title}-error` : undefined"
            @input="clearError('title')"
          />
          <p v-if="errors.title" :id="`${fieldIds.title}-error`" class="field-error">
            {{ errors.title }}
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
            min="1"
            max="12"
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
            <option v-for="status in COURSE_STATUSES" :key="status" :value="status">
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
            maxlength="500"
            placeholder="Briefly describe the course or subject and its academic focus."
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
        <i class="bi bi-hdd" aria-hidden="true"></i>
        Records are stored in this browser's localStorage. They are not sent to the CampusHub
        server.
      </p>
    </form>

    <template #footer>
      <button type="button" class="btn-ch btn-ch-soft" @click="close">Cancel</button>
      <button type="submit" :form="formId" class="btn-ch btn-ch-primary" :disabled="isSubmitting">
        <i class="bi" :class="isSubmitting ? 'bi-arrow-repeat' : 'bi-check2'" aria-hidden="true"></i>
        {{ isSubmitting ? 'Saving…' : isEdit ? 'Save changes' : 'Add record' }}
      </button>
    </template>
  </BaseModal>
</template>

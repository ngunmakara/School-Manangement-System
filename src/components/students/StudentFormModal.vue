<script setup>
import { computed, reactive, watch } from 'vue'
import BaseModal from '../common/BaseModal.vue'
import { useStudentsStore } from '../../stores/students'
import {
  getProgramOptions,
  STUDENT_DEPARTMENTS,
  STUDENT_STATUSES,
} from '../../utils/students'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  student: {
    type: Object,
    default: null,
  },
})

const emit = defineEmits(['update:modelValue', 'saved'])

const store = useStudentsStore()
const formId = 'student-form'

const fieldIds = {
  studentId: 'student-field-id',
  fullName: 'student-field-name',
  email: 'student-field-email',
  phone: 'student-field-phone',
  department: 'student-field-department',
  program: 'student-field-program',
  enrollmentDate: 'student-field-date',
  status: 'student-field-status',
}

function blankForm() {
  return {
    studentId: '',
    fullName: '',
    email: '',
    phone: '',
    department: '',
    program: '',
    enrollmentDate: '',
    status: 'Active',
  }
}

const form = reactive(blankForm())
const errors = reactive({})
const isEdit = computed(() => Boolean(props.student))
const modalTitle = computed(() => (isEdit.value ? 'Edit student' : 'Add student'))

const departmentOptions = computed(() => {
  const options = [...STUDENT_DEPARTMENTS]
  if (form.department && !options.includes(form.department)) {
    options.push(form.department)
  }
  return options
})

const programOptions = computed(() => {
  const options = getProgramOptions(form.department)
  if (form.program && !options.includes(form.program)) {
    return [...options, form.program]
  }
  return options
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

  if (props.student) {
    Object.assign(form, {
      studentId: props.student.studentId,
      fullName: props.student.fullName,
      email: props.student.email,
      phone: props.student.phone,
      department: props.student.department,
      program: props.student.program,
      enrollmentDate: props.student.enrollmentDate,
      status: props.student.status,
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
  () => props.student,
  () => {
    if (props.modelValue) resetForm()
  },
)

watch(
  () => form.department,
  () => {
    if (form.program && !programOptions.value.includes(form.program)) {
      form.program = ''
    }
  },
)

function close() {
  emit('update:modelValue', false)
}

function handleSubmit() {
  const result = isEdit.value
    ? store.updateStudent(props.student.uid, form)
    : store.addStudent(form)

  if (!result.ok) {
    clearErrors()
    Object.assign(errors, result.errors)
    const firstField = Object.keys(result.errors).find((key) => fieldIds[key])
    if (firstField) document.getElementById(fieldIds[firstField])?.focus()
    return
  }

  emit('saved', {
    mode: isEdit.value ? 'edit' : 'add',
    student: result.student,
  })
  emit('update:modelValue', false)
}
</script>

<template>
  <BaseModal
    :model-value="modelValue"
    :title="modalTitle"
    size="lg"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <template #subtitle>
      <p class="ch-modal-subtitle">
        {{ isEdit ? 'Update the student record and save your changes.' : 'Create a new record in the local student directory.' }}
      </p>
    </template>

    <form :id="formId" class="student-form" novalidate @submit.prevent="handleSubmit">
      <div v-if="errors.form" class="form-alert" role="alert">
        <i class="bi bi-exclamation-circle" aria-hidden="true"></i>
        {{ errors.form }}
      </div>

      <div class="form-grid">
        <div class="form-field">
          <label class="form-label" :for="fieldIds.studentId">
            Student ID <span class="req" aria-hidden="true">*</span>
          </label>
          <input
            :id="fieldIds.studentId"
            v-model.trim="form.studentId"
            type="text"
            class="form-control"
            :class="{ 'is-invalid': errors.studentId }"
            placeholder="STU-2026-0149"
            autocomplete="off"
            :aria-invalid="errors.studentId ? 'true' : 'false'"
            :aria-describedby="errors.studentId ? `${fieldIds.studentId}-error` : undefined"
            data-autofocus
            @input="clearError('studentId')"
          />
          <p v-if="errors.studentId" :id="`${fieldIds.studentId}-error`" class="field-error">
            {{ errors.studentId }}
          </p>
        </div>

        <div class="form-field">
          <label class="form-label" :for="fieldIds.fullName">
            Full name <span class="req" aria-hidden="true">*</span>
          </label>
          <input
            :id="fieldIds.fullName"
            v-model.trim="form.fullName"
            type="text"
            class="form-control"
            :class="{ 'is-invalid': errors.fullName }"
            placeholder="Aisha Bello"
            autocomplete="name"
            :aria-invalid="errors.fullName ? 'true' : 'false'"
            :aria-describedby="errors.fullName ? `${fieldIds.fullName}-error` : undefined"
            @input="clearError('fullName')"
          />
          <p v-if="errors.fullName" :id="`${fieldIds.fullName}-error`" class="field-error">
            {{ errors.fullName }}
          </p>
        </div>

        <div class="form-field">
          <label class="form-label" :for="fieldIds.email">
            Email <span class="req" aria-hidden="true">*</span>
          </label>
          <input
            :id="fieldIds.email"
            v-model.trim="form.email"
            type="email"
            class="form-control"
            :class="{ 'is-invalid': errors.email }"
            placeholder="student@student.demo.edu"
            autocomplete="email"
            :aria-invalid="errors.email ? 'true' : 'false'"
            :aria-describedby="errors.email ? `${fieldIds.email}-error` : undefined"
            @input="clearError('email')"
          />
          <p v-if="errors.email" :id="`${fieldIds.email}-error`" class="field-error">
            {{ errors.email }}
          </p>
        </div>

        <div class="form-field">
          <label class="form-label" :for="fieldIds.phone">Phone <span class="field-optional">optional</span></label>
          <input
            :id="fieldIds.phone"
            v-model.trim="form.phone"
            type="tel"
            class="form-control"
            :class="{ 'is-invalid': errors.phone }"
            placeholder="+1 (555) 010-4821"
            autocomplete="tel"
            :aria-invalid="errors.phone ? 'true' : 'false'"
            :aria-describedby="errors.phone ? `${fieldIds.phone}-error` : undefined"
            @input="clearError('phone')"
          />
          <p v-if="errors.phone" :id="`${fieldIds.phone}-error`" class="field-error">
            {{ errors.phone }}
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
        </div>

        <div class="form-field">
          <label class="form-label" :for="fieldIds.program">
            Program <span class="req" aria-hidden="true">*</span>
          </label>
          <select
            :id="fieldIds.program"
            v-model="form.program"
            class="form-select"
            :class="{ 'is-invalid': errors.program }"
            :disabled="!form.department"
            :aria-invalid="errors.program ? 'true' : 'false'"
            :aria-describedby="errors.program ? `${fieldIds.program}-error` : undefined"
            @change="clearError('program')"
          >
            <option value="" disabled>
              {{ form.department ? 'Select a program' : 'Select a department first' }}
            </option>
            <option v-for="program in programOptions" :key="program" :value="program">
              {{ program }}
            </option>
          </select>
          <p v-if="errors.program" :id="`${fieldIds.program}-error`" class="field-error">
            {{ errors.program }}
          </p>
        </div>

        <div class="form-field">
          <label class="form-label" :for="fieldIds.enrollmentDate">
            Enrollment date <span class="req" aria-hidden="true">*</span>
          </label>
          <input
            :id="fieldIds.enrollmentDate"
            v-model="form.enrollmentDate"
            type="date"
            class="form-control"
            :class="{ 'is-invalid': errors.enrollmentDate }"
            :aria-invalid="errors.enrollmentDate ? 'true' : 'false'"
            :aria-describedby="errors.enrollmentDate ? `${fieldIds.enrollmentDate}-error` : undefined"
            @input="clearError('enrollmentDate')"
          />
          <p v-if="errors.enrollmentDate" :id="`${fieldIds.enrollmentDate}-error`" class="field-error">
            {{ errors.enrollmentDate }}
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
            <option v-for="status in STUDENT_STATUSES" :key="status" :value="status">
              {{ status }}
            </option>
          </select>
          <p v-if="errors.status" :id="`${fieldIds.status}-error`" class="field-error">
            {{ errors.status }}
          </p>
        </div>
      </div>

      <p class="form-note">
        <i class="bi bi-info-circle" aria-hidden="true"></i>
        Fields marked <span class="req">*</span> are required. Student records are saved locally in
        this browser for demonstration purposes.
      </p>
    </form>

    <template #footer>
      <button type="button" class="btn-ch btn-ch-soft" @click="close">Cancel</button>
      <button type="submit" :form="formId" class="btn-ch btn-ch-primary">
        <i class="bi bi-check2" aria-hidden="true"></i>
        {{ isEdit ? 'Save changes' : 'Add student' }}
      </button>
    </template>
  </BaseModal>
</template>

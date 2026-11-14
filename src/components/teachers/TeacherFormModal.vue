<script setup>
import { computed, reactive, ref, watch } from 'vue'
import BaseModal from '../common/BaseModal.vue'
import { useTeachersStore } from '../../stores/teachers'
import { useDepartmentsStore } from '../../stores/departments'
import { STUDENT_DEPARTMENTS } from '../../utils/students'
import { TEACHER_STATUSES } from '../../utils/teachers'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  teacher: {
    type: Object,
    default: null,
  },
})

const emit = defineEmits(['update:modelValue', 'saved'])

const store = useTeachersStore()
const departmentsStore = useDepartmentsStore()
const formId = 'teacher-form'

const fieldIds = {
  teacherId: 'teacher-field-id',
  fullName: 'teacher-field-name',
  email: 'teacher-field-email',
  phone: 'teacher-field-phone',
  department: 'teacher-field-department',
  specialization: 'teacher-field-specialization',
  hireDate: 'teacher-field-date',
  status: 'teacher-field-status',
}

function blankForm() {
  return {
    teacherId: '',
    fullName: '',
    email: '',
    phone: '',
    department: '',
    specialization: '',
    hireDate: '',
    status: 'Active',
  }
}

const form = reactive(blankForm())
const errors = reactive({})
const isSubmitting = ref(false)
const isEdit = computed(() => Boolean(props.teacher))
const modalTitle = computed(() => (isEdit.value ? 'Edit teacher' : 'Add teacher'))

const departmentOptions = computed(() => {
  const names = new Set()

  if (departmentsStore.departmentOptions.length) {
    departmentsStore.departmentOptions.forEach((department) => names.add(department))
  } else {
    STUDENT_DEPARTMENTS.forEach((department) => names.add(department))
  }

  if (form.department) names.add(form.department)

  return [...names].filter(Boolean).sort((left, right) =>
    left.localeCompare(right, 'en', { sensitivity: 'base' }),
  )
})

function ensureDepartmentsLoaded() {
  if (
    departmentsStore.optionsState === 'idle' ||
    departmentsStore.optionsState === 'error'
  ) {
    departmentsStore.loadDepartmentOptions()
  }
}

function clearErrors() {
  Object.keys(errors).forEach((key) => delete errors[key])
}

function clearError(field) {
  if (errors[field]) delete errors[field]
  if (errors.form) delete errors.form
}

function resetForm() {
  Object.assign(form, blankForm())

  if (props.teacher) {
    Object.assign(form, {
      teacherId: props.teacher.teacherId,
      fullName: props.teacher.fullName,
      email: props.teacher.email,
      phone: props.teacher.phone,
      department: props.teacher.department,
      specialization: props.teacher.specialization,
      hireDate: props.teacher.hireDate,
      status: props.teacher.status,
    })
  }

  clearErrors()
}

watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      resetForm()
      ensureDepartmentsLoaded()
    }
  },
)

watch(
  () => props.teacher,
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
      ? await store.updateTeacher(props.teacher.uid, form)
      : await store.addTeacher(form)
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
    teacher: result.teacher,
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
        {{
          isEdit
            ? 'Update the teacher record and save your changes.'
            : 'Create a new record in the teacher directory.'
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
          <label class="form-label" :for="fieldIds.teacherId">
            Teacher ID <span class="req" aria-hidden="true">*</span>
          </label>
          <input
            :id="fieldIds.teacherId"
            v-model.trim="form.teacherId"
            type="text"
            class="form-control"
            :class="{ 'is-invalid': errors.teacherId }"
            placeholder="TCH-2026-0149"
            autocomplete="off"
            :aria-invalid="errors.teacherId ? 'true' : 'false'"
            :aria-describedby="errors.teacherId ? `${fieldIds.teacherId}-error` : undefined"
            data-autofocus
            @input="clearError('teacherId')"
          />
          <p v-if="errors.teacherId" :id="`${fieldIds.teacherId}-error`" class="field-error">
            {{ errors.teacherId }}
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
            placeholder="Dr. Elena Park"
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
            placeholder="teacher@campushub.demo"
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
          <label class="form-label" :for="fieldIds.phone">
            Phone <span class="field-optional">optional</span>
          </label>
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
          <label class="form-label" :for="fieldIds.specialization">
            Specialization <span class="req" aria-hidden="true">*</span>
          </label>
          <input
            :id="fieldIds.specialization"
            v-model.trim="form.specialization"
            type="text"
            class="form-control"
            :class="{ 'is-invalid': errors.specialization }"
            placeholder="Data Structures & Algorithms"
            autocomplete="off"
            :aria-invalid="errors.specialization ? 'true' : 'false'"
            :aria-describedby="errors.specialization ? `${fieldIds.specialization}-error` : undefined"
            @input="clearError('specialization')"
          />
          <p
            v-if="errors.specialization"
            :id="`${fieldIds.specialization}-error`"
            class="field-error"
          >
            {{ errors.specialization }}
          </p>
        </div>

        <div class="form-field">
          <label class="form-label" :for="fieldIds.hireDate">
            Hire date <span class="req" aria-hidden="true">*</span>
          </label>
          <input
            :id="fieldIds.hireDate"
            v-model="form.hireDate"
            type="date"
            class="form-control"
            :class="{ 'is-invalid': errors.hireDate }"
            :aria-invalid="errors.hireDate ? 'true' : 'false'"
            :aria-describedby="errors.hireDate ? `${fieldIds.hireDate}-error` : undefined"
            @input="clearError('hireDate')"
          />
          <p v-if="errors.hireDate" :id="`${fieldIds.hireDate}-error`" class="field-error">
            {{ errors.hireDate }}
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
            <option v-for="status in TEACHER_STATUSES" :key="status" :value="status">
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
        Fields marked <span class="req">*</span> are required. Teacher records are saved to the
        CampusHub server (MySQL).
      </p>
    </form>

    <template #footer>
      <button type="button" class="btn-ch btn-ch-soft" @click="close">Cancel</button>
      <button type="submit" :form="formId" class="btn-ch btn-ch-primary" :disabled="isSubmitting">
        <i class="bi" :class="isSubmitting ? 'bi-arrow-repeat' : 'bi-check2'" aria-hidden="true"></i>
        {{ isSubmitting ? 'Saving…' : isEdit ? 'Save changes' : 'Add teacher' }}
      </button>
    </template>
  </BaseModal>
</template>

<script setup>
import { computed, nextTick, reactive, ref, watch } from 'vue'
import BaseModal from '../common/BaseModal.vue'
import { useUsersStore } from '../../stores/users'
import { USER_ROLES, USER_STATUSES } from '../../utils/users'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  user: { type: Object, default: null },
})

const emit = defineEmits(['update:modelValue', 'saved'])
const store = useUsersStore()
const modalRef = ref(null)
const formId = 'user-form'

const fieldIds = {
  userId: 'user-field-id',
  fullName: 'user-field-name',
  email: 'user-field-email',
  role: 'user-field-role',
  department: 'user-field-department',
  status: 'user-field-status',
}

function blankForm() {
  return {
    userId: '',
    fullName: '',
    email: '',
    role: '',
    department: '',
    status: 'Active',
  }
}

const form = reactive(blankForm())
const errors = reactive({})
const isSubmitting = ref(false)
const showDiscardWarning = ref(false)
const initialSnapshot = ref('')

const isEdit = computed(() => Boolean(props.user))
const modalTitle = computed(() => (isEdit.value ? 'Edit user' : 'Add user'))
const isDirty = computed(() => initialSnapshot.value !== '' && JSON.stringify(form) !== initialSnapshot.value)

function clearErrors() {
  Object.keys(errors).forEach((key) => delete errors[key])
}

function clearError(field) {
  if (errors[field]) delete errors[field]
  if (errors.form) delete errors.form
}

function resetForm() {
  Object.assign(form, blankForm())
  if (props.user) {
    Object.assign(form, {
      userId: props.user.userId,
      fullName: props.user.fullName,
      email: props.user.email,
      role: props.user.role,
      department: props.user.department || '',
      status: props.user.status,
    })
  }
  clearErrors()
  showDiscardWarning.value = false
  initialSnapshot.value = JSON.stringify(form)
}

watch(() => props.modelValue, (open) => {
  if (open) resetForm()
})

watch(() => props.user, () => {
  if (props.modelValue) resetForm()
})

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
  clearErrors()

  const result = isEdit.value ? store.updateUser(props.user.uid, form) : store.addUser(form)
  isSubmitting.value = false

  if (!result.ok) {
    Object.assign(errors, result.errors)
    const firstField = Object.keys(result.errors).find((key) => fieldIds[key])
    if (firstField) document.getElementById(fieldIds[firstField])?.focus()
    return
  }

  emit('saved', {
    mode: isEdit.value ? 'edit' : 'add',
    user: result.user,
    persisted: result.persisted,
  })
  showDiscardWarning.value = false
  emit('update:modelValue', false)
}
</script>

<template>
  <BaseModal ref="modalRef" :model-value="modelValue" :title="modalTitle" size="lg" @update:model-value="handleModalUpdate">
    <template #subtitle>
      <p class="ch-modal-subtitle">
        {{ isEdit ? 'Update this demo user account.' : 'Create a new demo user account for this browser.' }}
        Records are frontend-only and stored locally.
      </p>
    </template>

    <form :id="formId" class="student-form" novalidate @submit.prevent="handleSubmit">
      <div v-if="showDiscardWarning" class="ch-alert is-warning" role="alert">
        <i class="bi bi-exclamation-triangle" aria-hidden="true"></i>
        <div>
          <strong>Discard unsaved changes?</strong>
          <span class="d-block">Your edits to this user have not been saved yet.</span>
          <div class="d-flex flex-wrap gap-2 mt-2">
            <button type="button" class="btn-ch btn-ch-soft btn-ch-sm" @click="cancelDiscard">Keep editing</button>
            <button type="button" class="btn-ch btn-ch-ghost btn-ch-sm" @click="discardChanges">Discard changes</button>
          </div>
        </div>
      </div>

      <div v-if="errors.form" class="form-alert" role="alert">
        <i class="bi bi-exclamation-circle" aria-hidden="true"></i>
        {{ errors.form }}
      </div>

      <div class="form-grid">
        <div class="form-field">
          <label class="form-label" :for="fieldIds.userId">User ID <span class="req" aria-hidden="true">*</span></label>
          <input :id="fieldIds.userId" v-model.trim="form.userId" type="text" class="form-control" :class="{ 'is-invalid': errors.userId }" placeholder="USR-1005" autocomplete="off" :aria-invalid="errors.userId ? 'true' : 'false'" :aria-describedby="errors.userId ? `${fieldIds.userId}-error` : undefined" data-autofocus @input="clearError('userId')" />
          <p v-if="errors.userId" :id="`${fieldIds.userId}-error`" class="field-error">{{ errors.userId }}</p>
        </div>

        <div class="form-field">
          <label class="form-label" :for="fieldIds.fullName">Full name <span class="req" aria-hidden="true">*</span></label>
          <input :id="fieldIds.fullName" v-model.trim="form.fullName" type="text" class="form-control" :class="{ 'is-invalid': errors.fullName }" placeholder="Alex Morgan" autocomplete="name" :aria-invalid="errors.fullName ? 'true' : 'false'" :aria-describedby="errors.fullName ? `${fieldIds.fullName}-error` : undefined" @input="clearError('fullName')" />
          <p v-if="errors.fullName" :id="`${fieldIds.fullName}-error`" class="field-error">{{ errors.fullName }}</p>
        </div>

        <div class="form-field">
          <label class="form-label" :for="fieldIds.email">Email <span class="req" aria-hidden="true">*</span></label>
          <input :id="fieldIds.email" v-model.trim="form.email" type="email" class="form-control" :class="{ 'is-invalid': errors.email }" placeholder="user@campushub.demo" autocomplete="email" :aria-invalid="errors.email ? 'true' : 'false'" :aria-describedby="errors.email ? `${fieldIds.email}-error` : undefined" @input="clearError('email')" />
          <p v-if="errors.email" :id="`${fieldIds.email}-error`" class="field-error">{{ errors.email }}</p>
        </div>

        <div class="form-field">
          <label class="form-label" :for="fieldIds.role">Role <span class="req" aria-hidden="true">*</span></label>
          <select :id="fieldIds.role" v-model="form.role" class="form-select" :class="{ 'is-invalid': errors.role }" :aria-invalid="errors.role ? 'true' : 'false'" :aria-describedby="errors.role ? `${fieldIds.role}-error` : undefined" @change="clearError('role')">
            <option value="" disabled>Select a role</option>
            <option v-for="role in USER_ROLES" :key="role" :value="role">{{ role }}</option>
          </select>
          <p v-if="errors.role" :id="`${fieldIds.role}-error`" class="field-error">{{ errors.role }}</p>
        </div>

        <div class="form-field">
          <label class="form-label" :for="fieldIds.department">Department <span class="field-optional">optional</span></label>
          <input :id="fieldIds.department" v-model.trim="form.department" type="text" class="form-control" :class="{ 'is-invalid': errors.department }" placeholder="Administration" autocomplete="off" :aria-invalid="errors.department ? 'true' : 'false'" :aria-describedby="errors.department ? `${fieldIds.department}-error` : undefined" @input="clearError('department')" />
          <p v-if="errors.department" :id="`${fieldIds.department}-error`" class="field-error">{{ errors.department }}</p>
        </div>

        <div class="form-field">
          <label class="form-label" :for="fieldIds.status">Status</label>
          <select :id="fieldIds.status" v-model="form.status" class="form-select" :class="{ 'is-invalid': errors.status }" :aria-invalid="errors.status ? 'true' : 'false'" :aria-describedby="errors.status ? `${fieldIds.status}-error` : undefined" @change="clearError('status')">
            <option v-for="status in USER_STATUSES" :key="status" :value="status">{{ status }}</option>
          </select>
          <p v-if="errors.status" :id="`${fieldIds.status}-error`" class="field-error">{{ errors.status }}</p>
        </div>
      </div>

      <p class="form-note">
        <i class="bi bi-info-circle" aria-hidden="true"></i>
        Demo account only. No passwords, permissions, or backend authentication are managed here.
      </p>
    </form>

    <template #footer>
      <button type="button" class="btn-ch btn-ch-soft" @click="requestClose">Cancel</button>
      <button type="submit" :form="formId" class="btn-ch btn-ch-primary" :disabled="isSubmitting">
        <i class="bi" :class="isSubmitting ? 'bi-arrow-repeat' : 'bi-check2'" aria-hidden="true"></i>
        {{ isSubmitting ? 'Saving…' : isEdit ? 'Save changes' : 'Add user' }}
      </button>
    </template>
  </BaseModal>
</template>

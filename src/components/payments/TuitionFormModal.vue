<script setup>
import { computed, reactive, ref, watch } from 'vue'
import BaseModal from '../common/BaseModal.vue'
import { usePaymentsStore } from '../../stores/payments'
import {
  derivePaymentStatus,
  formatMoney,
  formatMoneyInput,
  parseMoneyCents,
  tuitionStatusLabel,
} from '../../utils/payments'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  tuition: {
    type: Object,
    default: null,
  },
  students: {
    type: Array,
    default: () => [],
  },
  semesters: {
    type: Array,
    default: () => [],
  },
  defaultStudentUid: {
    type: String,
    default: '',
  },
  defaultSemesterUid: {
    type: String,
    default: '',
  },
})

const emit = defineEmits(['update:modelValue', 'saved'])

const store = usePaymentsStore()
const formId = 'tuition-form'
const isSubmitting = ref(false)

const fieldIds = {
  studentUid: 'tuition-field-student',
  semesterUid: 'tuition-field-semester',
  amountAssessed: 'tuition-field-amount',
  dueDate: 'tuition-field-due-date',
  reference: 'tuition-field-reference',
  note: 'tuition-field-note',
}

function blankForm() {
  return {
    studentUid: String(props.defaultStudentUid ?? '').trim(),
    semesterUid: String(props.defaultSemesterUid ?? '').trim(),
    amountAssessed: '',
    dueDate: '',
    reference: '',
    note: '',
  }
}

const form = reactive(blankForm())
const errors = reactive({})
const isEdit = computed(() => Boolean(props.tuition))
const modalTitle = computed(() => (isEdit.value ? 'Edit tuition record' : 'Add tuition record'))

function byUid(list, uid) {
  return list.find((item) => String(item?.uid ?? '').trim() === String(uid ?? '').trim())
}

function semesterLabel(semester) {
  if (!semester) return ''
  return semester.academicYear
    ? `${semester.name} · ${semester.academicYear}`
    : semester.name
}

function sortedChoices(list) {
  return [...list].sort((left, right) =>
    String(left.label ?? '').localeCompare(String(right.label ?? ''), 'en', {
      sensitivity: 'base',
      numeric: true,
    }),
  )
}

const studentChoices = computed(() =>
  sortedChoices(
    props.students.map((student) => ({
      uid: student.uid,
      label: `${student.fullName || 'Unknown student'}${
        student.studentId ? ` · ${student.studentId}` : ''
      }`,
    })),
  ),
)

const semesterChoices = computed(() =>
  sortedChoices(
    props.semesters.map((semester) => ({
      uid: semester.uid,
      label: semesterLabel(semester),
    })),
  ),
)

const selectedStudent = computed(() => byUid(props.students, form.studentUid))
const selectedSemester = computed(() => byUid(props.semesters, form.semesterUid))
const assessedCents = computed(() => parseMoneyCents(form.amountAssessed))
const recordedCents = computed(() =>
  isEdit.value
    ? store.paymentsFor(props.tuition.uid).reduce((sum, payment) => sum + Number(payment.amountCents || 0), 0)
    : 0,
)
const remainingCents = computed(() => {
  const assessed = assessedCents.value
  return assessed === null ? null : Math.max(0, assessed - recordedCents.value)
})
const previewStatus = computed(() =>
  derivePaymentStatus(
    {
      amountAssessedCents: assessedCents.value,
      paidCents: recordedCents.value,
      dueDate: form.dueDate,
    },
  ),
)

const storageNote = computed(() => {
  if (store.storageState === 'unavailable' || store.persistenceState === 'unavailable') {
    return {
      warning: true,
      text: 'Browser storage is unavailable. This tuition record will last for this session only.',
    }
  }
  if (store.persistenceState === 'failed') {
    return {
      warning: true,
      text: 'Browser storage is not accepting saves. This tuition record will last for this session only.',
    }
  }
  return {
    warning: false,
    text: "Tuition records are stored in this browser's localStorage and are not synced to the CampusHub server.",
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

  if (props.tuition) {
    form.studentUid = String(props.tuition.studentUid ?? '')
    form.semesterUid = String(props.tuition.semesterUid ?? '')
    form.amountAssessed = formatMoneyInput(props.tuition.amountAssessedCents)
    form.dueDate = String(props.tuition.dueDate ?? '')
    form.reference = String(props.tuition.reference ?? '')
    form.note = String(props.tuition.note ?? '')
  }

  clearErrors()
  isSubmitting.value = false
}

watch(
  () => props.modelValue,
  (open) => {
    if (open) resetForm()
  },
)

watch(
  () => props.tuition,
  () => {
    if (props.modelValue) resetForm()
  },
)

function handleSubmit() {
  if (isSubmitting.value) return
  isSubmitting.value = true

  const payload = {
    studentUid: form.studentUid,
    semesterUid: form.semesterUid,
    amountAssessedCents: assessedCents.value,
    dueDate: form.dueDate,
    reference: form.reference,
    note: form.note,
    studentName: selectedStudent.value?.fullName || props.tuition?.studentName || '',
    studentId: selectedStudent.value?.studentId || props.tuition?.studentId || '',
    semesterName: selectedSemester.value ? semesterLabel(selectedSemester.value) : props.tuition?.semesterName || '',
  }

  let result
  try {
    result = isEdit.value
      ? store.updateTuition(props.tuition.uid, payload, {
          students: props.students,
          semesters: props.semesters,
        })
      : store.addTuition(payload, {
          students: props.students,
          semesters: props.semesters,
        })
  } catch {
    clearErrors()
    errors.form = 'The tuition record could not be saved. Please try again.'
    isSubmitting.value = false
    return
  }

  isSubmitting.value = false

  if (!result.ok) {
    clearErrors()
    Object.assign(errors, result.errors)

    const unmapped = Object.keys(result.errors).find((key) => key !== 'form' && !fieldIds[key])
    if (unmapped && !errors.form) errors.form = result.errors[unmapped]

    const firstField = Object.keys(result.errors).find((key) => fieldIds[key])
    if (firstField) document.getElementById(fieldIds[firstField])?.focus()
    return
  }

  emit('saved', {
    mode: isEdit.value ? 'edit' : 'add',
    tuition: result.tuition,
    persisted: result.persisted,
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
        Record the assessed tuition, due date, and optional semester. Students must already exist in
        the local directory.
      </p>
    </template>

    <form :id="formId" class="student-form" novalidate @submit.prevent="handleSubmit">
      <div v-if="errors.form" class="form-alert" role="alert">
        <i class="bi bi-exclamation-circle" aria-hidden="true"></i>
        {{ errors.form }}
      </div>

      <div v-if="!studentChoices.length" class="form-alert" role="status">
        <i class="bi bi-info-circle" aria-hidden="true"></i>
        No students are available. Add students before creating tuition records.
      </div>

      <div class="form-grid">
        <div class="form-field">
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
            @change="clearError('studentUid')"
          >
            <option value="" disabled>Select a student</option>
            <option v-for="student in studentChoices" :key="student.uid" :value="student.uid">
              {{ student.label }}
            </option>
          </select>
          <p v-if="errors.studentUid" :id="`${fieldIds.studentUid}-error`" class="field-error">
            {{ errors.studentUid }}
          </p>
        </div>

        <div class="form-field">
          <label class="form-label" :for="fieldIds.semesterUid">Semester</label>
          <select
            :id="fieldIds.semesterUid"
            v-model="form.semesterUid"
            class="form-select"
            :class="{ 'is-invalid': errors.semesterUid }"
            :disabled="isSubmitting"
            :aria-invalid="errors.semesterUid ? 'true' : 'false'"
            :aria-describedby="errors.semesterUid ? `${fieldIds.semesterUid}-error` : undefined"
            @change="clearError('semesterUid')"
          >
            <option value="">No semester recorded</option>
            <option v-for="semester in semesterChoices" :key="semester.uid" :value="semester.uid">
              {{ semester.label }}
            </option>
          </select>
          <p v-if="errors.semesterUid" :id="`${fieldIds.semesterUid}-error`" class="field-error">
            {{ errors.semesterUid }}
          </p>
          <p class="field-hint">Optional until semester records are added in this browser.</p>
        </div>

        <div class="form-field">
          <label class="form-label" :for="fieldIds.amountAssessed">
            Amount assessed <span class="req" aria-hidden="true">*</span>
          </label>
          <input
            :id="fieldIds.amountAssessed"
            v-model="form.amountAssessed"
            type="text"
            inputmode="decimal"
            class="form-control"
            :class="{ 'is-invalid': errors.amountAssessed }"
            placeholder="0.00"
            :disabled="isSubmitting"
            :aria-invalid="errors.amountAssessed ? 'true' : 'false'"
            :aria-describedby="errors.amountAssessed ? `${fieldIds.amountAssessed}-error` : undefined"
            @input="clearError('amountAssessed')"
          />
          <p
            v-if="errors.amountAssessed"
            :id="`${fieldIds.amountAssessed}-error`"
            class="field-error"
          >
            {{ errors.amountAssessed }}
          </p>
        </div>

        <div class="form-field">
          <label class="form-label" :for="fieldIds.dueDate">
            Due date <span class="req" aria-hidden="true">*</span>
          </label>
          <input
            :id="fieldIds.dueDate"
            v-model="form.dueDate"
            type="date"
            class="form-control"
            :class="{ 'is-invalid': errors.dueDate }"
            :disabled="isSubmitting"
            :aria-invalid="errors.dueDate ? 'true' : 'false'"
            :aria-describedby="errors.dueDate ? `${fieldIds.dueDate}-error` : undefined"
            @input="clearError('dueDate')"
          />
          <p v-if="errors.dueDate" :id="`${fieldIds.dueDate}-error`" class="field-error">
            {{ errors.dueDate }}
          </p>
        </div>

        <div class="form-field">
          <label class="form-label" :for="fieldIds.reference">Reference</label>
          <input
            :id="fieldIds.reference"
            v-model="form.reference"
            type="text"
            maxlength="40"
            class="form-control"
            placeholder="TUITION-2026-001"
            :disabled="isSubmitting"
          />
        </div>

        <div class="form-field">
          <label class="form-label" :for="fieldIds.note">Note</label>
          <input
            :id="fieldIds.note"
            v-model="form.note"
            type="text"
            maxlength="240"
            class="form-control"
            placeholder="Optional billing note"
            :disabled="isSubmitting"
          />
        </div>
      </div>

      <div class="tuition-preview" aria-live="polite">
        <div>
          <span>Assessed</span>
          <strong>{{ formatMoney(assessedCents) }}</strong>
        </div>
        <div>
          <span>Recorded payments</span>
          <strong>{{ formatMoney(recordedCents) }}</strong>
        </div>
        <div>
          <span>Remaining</span>
          <strong>{{ formatMoney(remainingCents) }}</strong>
        </div>
        <div>
          <span>Projected status</span>
          <strong>{{ tuitionStatusLabel(previewStatus) }}</strong>
        </div>
      </div>

      <p class="form-note" :class="{ 'is-warning': storageNote.warning }">
        <i class="bi bi-hdd" aria-hidden="true"></i>
        {{ storageNote.text }}
      </p>
    </form>

    <template #footer>
      <button
        type="button"
        class="btn-ch btn-ch-soft"
        :disabled="isSubmitting"
        @click="emit('update:modelValue', false)"
      >
        Cancel
      </button>
      <button
        type="submit"
        :form="formId"
        class="btn-ch btn-ch-primary"
        :disabled="isSubmitting || !studentChoices.length"
      >
        <i
          class="bi"
          :class="isSubmitting ? 'bi-arrow-repeat' : 'bi-check2'"
          aria-hidden="true"
        ></i>
        {{ isSubmitting ? 'Saving…' : isEdit ? 'Save changes' : 'Add tuition' }}
      </button>
    </template>
  </BaseModal>
</template>

<style scoped>
.tuition-preview {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.6rem;
  margin-top: 1.25rem;
  padding: 0.8rem;
  border-radius: 0.75rem;
  background: rgba(79, 70, 229, 0.08);
}

.tuition-preview span {
  display: block;
  color: var(--ch-muted, #64748b);
  font-size: 0.78rem;
}

.tuition-preview strong {
  display: block;
  margin-top: 0.15rem;
  font-size: 1.05rem;
}

@media (max-width: 767.98px) {
  .tuition-preview {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>

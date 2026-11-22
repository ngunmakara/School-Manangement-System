<script setup>
import { computed, reactive, ref, watch } from 'vue'
import BaseModal from '../common/BaseModal.vue'
import { usePaymentsStore } from '../../stores/payments'
import {
  PAYMENT_METHODS,
  formatMoney,
  formatMoneyInput,
  parseMoneyCents,
  todayDateKey,
} from '../../utils/payments'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  payment: {
    type: Object,
    default: null,
  },
  tuitionRows: {
    type: Array,
    default: () => [],
  },
  defaultTuitionUid: {
    type: String,
    default: '',
  },
})

const emit = defineEmits(['update:modelValue', 'saved'])

const store = usePaymentsStore()
const formId = 'payment-form'
const isSubmitting = ref(false)

const fieldIds = {
  tuitionUid: 'payment-field-tuition',
  amount: 'payment-field-amount',
  paidAt: 'payment-field-paid-at',
  method: 'payment-field-method',
  reference: 'payment-field-reference',
  note: 'payment-field-note',
}

function blankForm() {
  return {
    tuitionUid: String(props.defaultTuitionUid ?? '').trim(),
    amount: '',
    paidAt: todayDateKey(),
    method: 'Cash',
    reference: '',
    note: '',
  }
}

const form = reactive(blankForm())
const errors = reactive({})
const isEdit = computed(() => Boolean(props.payment))
const modalTitle = computed(() => (isEdit.value ? 'Edit payment record' : 'Record payment'))

const tuitionChoices = computed(() =>
  [...props.tuitionRows]
    .map((tuition) => ({
      uid: tuition.uid,
      label: `${tuition.studentName} · ${tuition.semesterName} · ${
        tuition.reference || 'Tuition'
      } · ${formatMoney(tuition.balanceCents)} due`,
    }))
    .sort((left, right) =>
      left.label.localeCompare(right.label, 'en', { sensitivity: 'base', numeric: true }),
    ),
)

const selectedTuition = computed(() =>
  props.tuitionRows.find(
    (tuition) =>
      String(tuition?.uid ?? '').trim() === String(form.tuitionUid ?? '').trim() &&
      Boolean(form.tuitionUid),
  ),
)

const amountCents = computed(() => parseMoneyCents(form.amount))
const remainingCents = computed(() => {
  const tuition = selectedTuition.value
  if (!tuition) return null

  const assessedCents = Number(tuition.amountAssessedCents)
  if (!Number.isSafeInteger(assessedCents) || assessedCents <= 0) return null

  const recordedCents = store
    .paymentsFor(tuition.uid)
    .filter((payment) => payment.uid !== props.payment?.uid)
    .reduce((sum, payment) => sum + Number(payment.amountCents || 0), 0)

  return Math.max(0, assessedCents - recordedCents)
})
const newBalanceCents = computed(() => {
  if (remainingCents.value === null || amountCents.value === null) return null
  return Math.max(0, remainingCents.value - amountCents.value)
})

const storageNote = computed(() => {
  if (store.storageState === 'unavailable' || store.persistenceState === 'unavailable') {
    return {
      warning: true,
      text: 'Browser storage is unavailable. This payment will last for this session only.',
    }
  }
  if (store.persistenceState === 'failed') {
    return {
      warning: true,
      text: 'Browser storage is not accepting saves. This payment will last for this session only.',
    }
  }
  return {
    warning: false,
    text: "Payment records are stored in this browser's localStorage and are not synced to the CampusHub server.",
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

  if (props.payment) {
    form.tuitionUid = String(props.payment.tuitionUid ?? '')
    form.amount = formatMoneyInput(props.payment.amountCents)
    form.paidAt = String(props.payment.paidAt ?? '')
    form.method = String(props.payment.method ?? 'Cash')
    form.reference = String(props.payment.reference ?? '')
    form.note = String(props.payment.note ?? '')
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
  () => props.payment,
  () => {
    if (props.modelValue) resetForm()
  },
)

watch(
  () => form.tuitionUid,
  () => clearError('tuitionUid'),
)

function handleSubmit() {
  if (isSubmitting.value) return
  isSubmitting.value = true

  const payload = {
    tuitionUid: form.tuitionUid,
    studentUid: selectedTuition.value?.studentUid || props.payment?.studentUid || '',
    amountCents: amountCents.value,
    paidAt: form.paidAt,
    method: form.method,
    reference: form.reference,
    note: form.note,
    studentName: selectedTuition.value?.studentName || props.payment?.studentName || '',
    studentId: selectedTuition.value?.studentId || props.payment?.studentId || '',
  }

  let result
  try {
    result = isEdit.value
      ? store.updatePayment(props.payment.uid, payload, { tuitions: props.tuitionRows })
      : store.addPayment(payload, { tuitions: props.tuitionRows })
  } catch {
    clearErrors()
    errors.form = 'The payment could not be saved. Please try again.'
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
    payment: result.payment,
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
        Attach a payment to an existing tuition record. Amounts are checked against the remaining
        balance before saving.
      </p>
    </template>

    <form :id="formId" class="student-form" novalidate @submit.prevent="handleSubmit">
      <div v-if="errors.form" class="form-alert" role="alert">
        <i class="bi bi-exclamation-circle" aria-hidden="true"></i>
        {{ errors.form }}
      </div>

      <div v-if="!tuitionChoices.length" class="form-alert" role="status">
        <i class="bi bi-info-circle" aria-hidden="true"></i>
        No tuition records are available. Add tuition before recording a payment.
      </div>

      <div class="form-grid">
        <div class="form-field form-field-wide">
          <label class="form-label" :for="fieldIds.tuitionUid">
            Tuition record <span class="req" aria-hidden="true">*</span>
          </label>
          <select
            :id="fieldIds.tuitionUid"
            v-model="form.tuitionUid"
            class="form-select"
            :class="{ 'is-invalid': errors.tuitionUid }"
            :disabled="isSubmitting || !tuitionChoices.length"
            :aria-invalid="errors.tuitionUid ? 'true' : 'false'"
            :aria-describedby="errors.tuitionUid ? `${fieldIds.tuitionUid}-error` : undefined"
            @change="clearError('tuitionUid')"
          >
            <option value="" disabled>Select a tuition record</option>
            <option v-for="tuition in tuitionChoices" :key="tuition.uid" :value="tuition.uid">
              {{ tuition.label }}
            </option>
          </select>
          <p v-if="errors.tuitionUid" :id="`${fieldIds.tuitionUid}-error`" class="field-error">
            {{ errors.tuitionUid }}
          </p>
        </div>

        <div class="form-field">
          <label class="form-label" :for="fieldIds.amount">
            Payment amount <span class="req" aria-hidden="true">*</span>
          </label>
          <input
            :id="fieldIds.amount"
            v-model="form.amount"
            type="text"
            inputmode="decimal"
            class="form-control"
            :class="{ 'is-invalid': errors.amount }"
            placeholder="0.00"
            :disabled="isSubmitting"
            :aria-invalid="errors.amount ? 'true' : 'false'"
            :aria-describedby="errors.amount ? `${fieldIds.amount}-error` : undefined"
            @input="clearError('amount')"
          />
          <p v-if="errors.amount" :id="`${fieldIds.amount}-error`" class="field-error">
            {{ errors.amount }}
          </p>
        </div>

        <div class="form-field">
          <label class="form-label" :for="fieldIds.paidAt">
            Payment date <span class="req" aria-hidden="true">*</span>
          </label>
          <input
            :id="fieldIds.paidAt"
            v-model="form.paidAt"
            type="date"
            class="form-control"
            :class="{ 'is-invalid': errors.paidAt }"
            :disabled="isSubmitting"
            :aria-invalid="errors.paidAt ? 'true' : 'false'"
            :aria-describedby="errors.paidAt ? `${fieldIds.paidAt}-error` : undefined"
            @input="clearError('paidAt')"
          />
          <p v-if="errors.paidAt" :id="`${fieldIds.paidAt}-error`" class="field-error">
            {{ errors.paidAt }}
          </p>
        </div>

        <div class="form-field">
          <label class="form-label" :for="fieldIds.method">
            Payment method <span class="req" aria-hidden="true">*</span>
          </label>
          <select
            :id="fieldIds.method"
            v-model="form.method"
            class="form-select"
            :class="{ 'is-invalid': errors.method }"
            :disabled="isSubmitting"
            :aria-invalid="errors.method ? 'true' : 'false'"
            :aria-describedby="errors.method ? `${fieldIds.method}-error` : undefined"
            @change="clearError('method')"
          >
            <option v-for="method in PAYMENT_METHODS" :key="method" :value="method">
              {{ method }}
            </option>
          </select>
          <p v-if="errors.method" :id="`${fieldIds.method}-error`" class="field-error">
            {{ errors.method }}
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
            placeholder="OR-2026-001"
            :disabled="isSubmitting"
          />
        </div>

        <div class="form-field form-field-wide">
          <label class="form-label" :for="fieldIds.note">Note</label>
          <input
            :id="fieldIds.note"
            v-model="form.note"
            type="text"
            maxlength="240"
            class="form-control"
            placeholder="Optional payment note"
            :disabled="isSubmitting"
          />
        </div>
      </div>

      <div class="payment-preview" aria-live="polite">
        <div>
          <span>Student</span>
          <strong>{{ selectedTuition?.studentName || 'Select tuition' }}</strong>
        </div>
        <div>
          <span>Remaining before payment</span>
          <strong>{{ formatMoney(remainingCents) }}</strong>
        </div>
        <div>
          <span>This payment</span>
          <strong>{{ formatMoney(amountCents) }}</strong>
        </div>
        <div>
          <span>Balance after payment</span>
          <strong>{{ formatMoney(newBalanceCents) }}</strong>
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
        :disabled="isSubmitting || !tuitionChoices.length"
      >
        <i
          class="bi"
          :class="isSubmitting ? 'bi-arrow-repeat' : 'bi-check2'"
          aria-hidden="true"
        ></i>
        {{ isSubmitting ? 'Saving…' : isEdit ? 'Save changes' : 'Record payment' }}
      </button>
    </template>
  </BaseModal>
</template>

<style scoped>
.form-field-wide {
  grid-column: 1 / -1;
}

.payment-preview {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.6rem;
  margin-top: 1.25rem;
  padding: 0.8rem;
  border-radius: 0.75rem;
  background: rgba(22, 163, 74, 0.08);
}

.payment-preview span {
  display: block;
  color: var(--ch-muted, #64748b);
  font-size: 0.78rem;
}

.payment-preview strong {
  display: block;
  margin-top: 0.15rem;
  font-size: 1.05rem;
}

@media (max-width: 767.98px) {
  .payment-preview {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>

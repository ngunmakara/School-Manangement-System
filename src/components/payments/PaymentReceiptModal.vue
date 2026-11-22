<script setup>
import { computed } from 'vue'
import BaseModal from '../common/BaseModal.vue'
import { formatMoney, tuitionStatusLabel } from '../../utils/payments'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  payment: {
    type: Object,
    default: null,
  },
  tuition: {
    type: Object,
    default: null,
  },
})

const emit = defineEmits(['update:modelValue'])

const receiptId = computed(() => {
  const uid = String(props.payment?.uid ?? '').trim()
  return uid ? `RCPT-${uid}`.toUpperCase() : 'RCPT—'
})

function dateLabel(value) {
  if (!value || typeof value !== 'string') return '—'
  const [year, month, day] = value.split('-')
  if (!year || !month || !day) return value
  return `${month}/${day}/${year}`
}

function printReceipt() {
  if (typeof window !== 'undefined' && typeof window.print === 'function') {
    window.print()
  }
}
</script>

<template>
  <BaseModal
    :model-value="modelValue"
    title="Payment receipt"
    size="md"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <template #subtitle>
      <p class="ch-modal-subtitle">
        Frontend-only receipt preview. Payment records are stored in this browser.
      </p>
    </template>

    <div v-if="payment" class="receipt">
      <div class="receipt-head">
        <div>
          <span class="receipt-brand">CampusHub</span>
          <span>Tuition payment receipt</span>
        </div>
        <strong>{{ receiptId }}</strong>
      </div>

      <div class="receipt-party">
        <div>
          <span>Received from</span>
          <strong>{{ payment.studentName }}</strong>
          <span>{{ payment.studentId }}</span>
        </div>
        <div>
          <span>Payment date</span>
          <strong>{{ dateLabel(payment.paidAt) }}</strong>
          <span>{{ payment.method }}</span>
        </div>
      </div>

      <div class="receipt-lines">
        <div>
          <span>Tuition reference</span>
          <strong>{{ payment.tuitionReference }}</strong>
        </div>
        <div>
          <span>Semester</span>
          <strong>{{ payment.semesterName }}</strong>
        </div>
        <div>
          <span>Payment reference</span>
          <strong>{{ payment.reference || '—' }}</strong>
        </div>
        <div v-if="tuition">
          <span>Tuition status</span>
          <strong>{{ tuitionStatusLabel(tuition.status) }}</strong>
        </div>
      </div>

      <div class="receipt-total">
        <span>Amount paid</span>
        <strong>{{ formatMoney(payment.amountCents) }}</strong>
      </div>

      <p v-if="payment.note" class="receipt-note">{{ payment.note }}</p>
    </div>

    <p v-else class="form-note">Select a payment to preview its receipt.</p>

    <template #footer>
      <button
        type="button"
        class="btn-ch btn-ch-soft"
        @click="emit('update:modelValue', false)"
      >
        Close
      </button>
      <button type="button" class="btn-ch btn-ch-primary" :disabled="!payment" @click="printReceipt">
        <i class="bi bi-printer" aria-hidden="true"></i>
        Print receipt
      </button>
    </template>
  </BaseModal>
</template>

<style scoped>
.receipt {
  border: 1px solid rgba(15, 23, 42, 0.12);
  border-radius: 0.85rem;
  overflow: hidden;
}

.receipt-head,
.receipt-party,
.receipt-lines,
.receipt-total {
  display: grid;
  gap: 0.75rem;
  padding: 1rem;
  border-bottom: 1px solid rgba(15, 23, 42, 0.08);
}

.receipt-head {
  grid-template-columns: 1fr auto;
  align-items: center;
  background: rgba(79, 70, 229, 0.08);
}

.receipt-head > div,
.receipt-party > div {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.receipt-brand {
  font-size: 1.1rem;
  font-weight: 800;
}

.receipt-party,
.receipt-lines {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.receipt-lines span,
.receipt-party span,
.receipt-total span {
  color: var(--ch-muted, #64748b);
  font-size: 0.78rem;
}

.receipt-total {
  grid-template-columns: 1fr auto;
  align-items: center;
  background: rgba(22, 163, 74, 0.08);
  font-size: 1.1rem;
}

.receipt-total strong {
  font-size: 1.35rem;
}

.receipt-note {
  margin: 0;
  padding: 1rem;
  color: var(--ch-muted, #64748b);
}

@media (max-width: 575.98px) {
  .receipt-party,
  .receipt-lines {
    grid-template-columns: 1fr;
  }
}
</style>

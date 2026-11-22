<script setup>
import { formatMoney } from '../../utils/payments'

defineProps({
  rows: {
    type: Array,
    default: () => [],
  },
})

const emit = defineEmits(['receipt', 'edit', 'delete'])

function dateLabel(value) {
  if (!value || typeof value !== 'string') return '—'
  const [year, month, day] = value.split('-')
  if (!year || !month || !day) return value
  return `${month}/${day}/${year}`
}
</script>

<template>
  <div class="table-responsive">
    <table class="ch-table payment-history-table">
      <caption class="visually-hidden">
        Student payment history with dates, methods, amounts, and references
      </caption>
      <thead>
        <tr>
          <th scope="col">Student</th>
          <th scope="col">Tuition</th>
          <th scope="col">Paid on</th>
          <th scope="col">Method</th>
          <th scope="col" class="text-end">Amount</th>
          <th scope="col">Reference</th>
          <th scope="col" class="text-end">Actions</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in rows" :key="row.uid">
          <td>
            <div class="cell-primary">
              <span class="payment-mark" aria-hidden="true">
                <i class="bi bi-cash-coin"></i>
              </span>
              <div class="cell-primary-text">
                <strong>{{ row.studentName }}</strong>
                <span>{{ row.studentId }}</span>
              </div>
            </div>
          </td>
          <td>
            <div class="cell-primary-text">
              <strong>{{ row.tuitionReference }}</strong>
              <span>{{ row.semesterName }}</span>
              <span v-if="row.tuitionMissing" class="missing-note">Tuition snapshot only</span>
            </div>
          </td>
          <td class="text-nowrap">{{ dateLabel(row.paidAt) }}</td>
          <td>
            <span class="method-chip">{{ row.method }}</span>
          </td>
          <td class="text-nowrap text-end fw-semibold">{{ formatMoney(row.amountCents) }}</td>
          <td>
            <span class="payment-reference">{{ row.reference || '—' }}</span>
          </td>
          <td>
            <div class="row-actions">
              <button
                type="button"
                class="row-action-btn"
                :aria-label="`View receipt for ${row.studentName}`"
                title="View receipt"
                @click="emit('receipt', row)"
              >
                <i class="bi bi-receipt" aria-hidden="true"></i>
              </button>
              <button
                type="button"
                class="row-action-btn"
                :aria-label="`Edit payment for ${row.studentName}`"
                title="Edit payment"
                @click="emit('edit', row)"
              >
                <i class="bi bi-pencil" aria-hidden="true"></i>
              </button>
              <button
                type="button"
                class="row-action-btn is-danger"
                :aria-label="`Delete payment for ${row.studentName}`"
                title="Delete payment"
                @click="emit('delete', row)"
              >
                <i class="bi bi-trash3" aria-hidden="true"></i>
              </button>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.payment-mark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.25rem;
  height: 2.25rem;
  border-radius: 0.7rem;
  background: var(--ch-soft-green, #ecfdf5);
  color: var(--ch-green, #16a34a);
}

.method-chip {
  display: inline-flex;
  padding: 0.2rem 0.55rem;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.06);
  font-size: 0.78rem;
  font-weight: 600;
  white-space: nowrap;
}

.payment-reference {
  font-family: var(--ch-font-mono, monospace);
  font-size: 0.78rem;
}

.missing-note {
  color: var(--ch-amber, #d97706);
}
</style>

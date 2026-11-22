<script setup>
import StatusBadge from '../common/StatusBadge.vue'
import { formatMoney, tuitionStatusLabel } from '../../utils/payments'

const props = defineProps({
  records: {
    type: Array,
    default: () => [],
  },
  sortKey: {
    type: String,
    default: 'studentName',
  },
  sortDir: {
    type: String,
    default: 'asc',
  },
})

const emit = defineEmits(['sort', 'history', 'pay', 'edit', 'delete'])

const columns = [
  { key: 'studentName', label: 'Student' },
  { key: 'semesterName', label: 'Semester' },
  { key: 'dueDate', label: 'Due date' },
  { key: 'amountAssessedCents', label: 'Assessed' },
  { key: 'paidCents', label: 'Paid' },
  { key: 'balanceCents', label: 'Balance' },
  { key: 'status', label: 'Status' },
]

function sortAria(key) {
  if (props.sortKey !== key) return 'none'
  return props.sortDir === 'asc' ? 'ascending' : 'descending'
}

function sortIcon(key) {
  if (props.sortKey !== key) return 'bi-arrow-down-up'
  return props.sortDir === 'asc' ? 'bi-arrow-up' : 'bi-arrow-down'
}

function sortLabel(key, label) {
  const state = sortAria(key)
  if (state === 'none') return `Sort by ${label}`

  const nextState = state === 'ascending' ? 'descending' : 'ascending'
  return `Sort by ${label}, currently ${state}. Activate to sort ${nextState}.`
}

function dateLabel(value) {
  if (!value || typeof value !== 'string') return '—'
  const [year, month, day] = value.split('-')
  if (!year || !month || !day) return value
  return `${month}/${day}/${year}`
}

</script>

<template>
  <div class="table-responsive">
    <table class="ch-table tuition-table">
      <caption class="visually-hidden">
        Tuition records with assessed amounts, payments, balances, and statuses
      </caption>
      <thead>
        <tr>
          <th
            v-for="column in columns"
            :key="column.key"
            scope="col"
            :aria-sort="sortAria(column.key)"
          >
            <button
              type="button"
              class="th-sort"
              :aria-label="sortLabel(column.key, column.label)"
              @click="emit('sort', column.key)"
            >
              {{ column.label }}
              <i class="bi" :class="sortIcon(column.key)" aria-hidden="true"></i>
            </button>
          </th>
          <th scope="col" class="text-end">Actions</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="record in records" :key="record.uid">
          <td>
            <div class="cell-primary">
              <span class="tuition-mark" aria-hidden="true">
                <i class="bi bi-person-badge"></i>
              </span>
              <div class="cell-primary-text">
                <strong>{{ record.studentName }}</strong>
                <span>{{ record.studentId }}</span>
                <span v-if="record.reference" class="reference-text">{{ record.reference }}</span>
              </div>
            </div>
          </td>
          <td>
            <div class="cell-primary-text">
              <strong>{{ record.semesterName }}</strong>
              <span v-if="record.semesterMissing">Snapshot only</span>
              <span v-else>Semester</span>
            </div>
          </td>
          <td class="text-nowrap">{{ dateLabel(record.dueDate) }}</td>
          <td class="text-nowrap fw-semibold">{{ formatMoney(record.amountAssessedCents) }}</td>
          <td class="text-nowrap">{{ formatMoney(record.paidCents) }}</td>
          <td class="text-nowrap fw-semibold">{{ formatMoney(record.balanceCents) }}</td>
          <td>
            <StatusBadge :status="record.status" :label="tuitionStatusLabel(record.status)" />
          </td>
          <td>
            <div class="row-actions">
              <button
                type="button"
                class="row-action-btn"
                :aria-label="`View payment history for ${record.studentName}`"
                title="Payment history"
                @click="emit('history', record)"
              >
                <i class="bi bi-clock-history" aria-hidden="true"></i>
              </button>
              <button
                type="button"
                class="row-action-btn"
                :aria-label="`Record payment for ${record.studentName}`"
                title="Record payment"
                @click="emit('pay', record)"
              >
                <i class="bi bi-cash-coin" aria-hidden="true"></i>
              </button>
              <button
                type="button"
                class="row-action-btn"
                :aria-label="`Edit tuition for ${record.studentName}`"
                title="Edit tuition"
                @click="emit('edit', record)"
              >
                <i class="bi bi-pencil" aria-hidden="true"></i>
              </button>
              <button
                type="button"
                class="row-action-btn is-danger"
                :aria-label="`Delete tuition for ${record.studentName}`"
                title="Delete tuition"
                @click="emit('delete', record)"
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
.tuition-mark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.25rem;
  height: 2.25rem;
  border-radius: 0.7rem;
  background: var(--ch-soft-indigo, #eef2ff);
  color: var(--ch-indigo, #4f46e5);
}

.reference-text {
  font-family: var(--ch-font-mono, monospace);
  font-size: 0.76rem;
}
</style>

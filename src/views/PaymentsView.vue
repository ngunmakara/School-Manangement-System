<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import PageHeader from '../components/common/PageHeader.vue'
import StatCard from '../components/common/StatCard.vue'
import SearchField from '../components/common/SearchField.vue'
import FilterSelect from '../components/common/FilterSelect.vue'
import EmptyState from '../components/common/EmptyState.vue'
import PaginationBar from '../components/common/PaginationBar.vue'
import ConfirmDialog from '../components/common/ConfirmDialog.vue'
import TuitionTable from '../components/payments/TuitionTable.vue'
import TuitionFormModal from '../components/payments/TuitionFormModal.vue'
import PaymentFormModal from '../components/payments/PaymentFormModal.vue'
import PaymentHistory from '../components/payments/PaymentHistory.vue'
import PaymentReceiptModal from '../components/payments/PaymentReceiptModal.vue'
import { usePaymentsStore } from '../stores/payments'
import { useStudentsStore } from '../stores/students'
import { useSemestersStore } from '../stores/semesters'
import { useToast } from '../composables/useToast'
import {
  PAYMENT_METHODS,
  TUITION_STATUSES,
  buildPaymentRows,
  filterPaymentRows,
  filterTuitionRows,
  formatMoney,
  sortRecords,
  summarizeTuition,
  todayDateKey,
  tuitionStatusLabel,
} from '../utils/payments'

const store = usePaymentsStore()
const studentsStore = useStudentsStore()
const semestersStore = useSemestersStore()
const { push: toast } = useToast()
const route = useRoute()
const router = useRouter()

const today = todayDateKey()
const searchTerm = ref('')
const statusFilter = ref('')
const semesterFilter = ref('')
const tuitionSortKey = ref('studentName')
const tuitionSortDir = ref('asc')
const tuitionPage = ref(1)
const tuitionPageSize = ref(10)

const paymentSearch = ref('')
const paymentMethodFilter = ref('')
const tuitionFilter = ref('')
const paymentPage = ref(1)
const paymentPageSize = ref(10)

const tuitionFormOpen = ref(false)
const editingTuition = ref(null)
const paymentFormOpen = ref(false)
const editingPayment = ref(null)
const defaultPaymentTuitionUid = ref('')
const receiptOpen = ref(false)
const receiptPayment = ref(null)
const tuitionDeleteTarget = ref(null)
const paymentDeleteTarget = ref(null)

const statusOptions = computed(() => [
  { value: '', label: 'All statuses' },
  ...TUITION_STATUSES.map((status) => ({
    value: status,
    label: tuitionStatusLabel(status),
  })),
])

const methodOptions = computed(() => [
  { value: '', label: 'All methods' },
  ...PAYMENT_METHODS.map((method) => ({ value: method, label: method })),
])

const semesterOptions = computed(() => {
  const options = new Map()
  options.set('', { value: '', label: 'All semesters' })

  semestersStore.semesters.forEach((semester) => {
    options.set(semester.uid, {
      value: semester.uid,
      label: semester.academicYear
        ? `${semester.name} · ${semester.academicYear}`
        : semester.name,
    })
  })

  tuitionRows.value.forEach((record) => {
    if (!record.semesterUid) return
    options.set(record.semesterUid, {
      value: record.semesterUid,
      label: record.semesterName,
    })
  })

  return [...options.values()].sort((left, right) =>
    left.label.localeCompare(right.label, 'en', { sensitivity: 'base', numeric: true }),
  )
})

const tuitionRows = computed(() => store.rowsFor(studentsStore.students, semestersStore.semesters, today))

const paymentRows = computed(() =>
  buildPaymentRows(store.payments, store.tuitions, studentsStore.students),
)

const filteredTuitionRows = computed(() =>
  sortRecords(
    filterTuitionRows(tuitionRows.value, {
      search: searchTerm.value,
      status: statusFilter.value,
      semesterUid: semesterFilter.value,
    }),
    tuitionSortKey.value,
    tuitionSortDir.value,
  ),
)

const filteredPaymentRows = computed(() =>
  sortRecords(
    filterPaymentRows(paymentRows.value, {
      search: paymentSearch.value,
      method: paymentMethodFilter.value,
      tuitionUid: tuitionFilter.value,
    }),
    'paidAt',
    'desc',
  ),
)

const totalTuitionPages = computed(() =>
  Math.max(1, Math.ceil(filteredTuitionRows.value.length / tuitionPageSize.value)),
)
const totalPaymentPages = computed(() =>
  Math.max(1, Math.ceil(filteredPaymentRows.value.length / paymentPageSize.value)),
)

const pagedTuitionRows = computed(() => {
  const start = (tuitionPage.value - 1) * tuitionPageSize.value
  return filteredTuitionRows.value.slice(start, start + tuitionPageSize.value)
})

const pagedPaymentRows = computed(() => {
  const start = (paymentPage.value - 1) * paymentPageSize.value
  return filteredPaymentRows.value.slice(start, start + paymentPageSize.value)
})

const currentSummary = computed(() => summarizeTuition(filteredTuitionRows.value))

const summaryCards = computed(() => [
  {
    label: 'Tuition records',
    value: currentSummary.value.recordCount.toLocaleString('en-US'),
    icon: 'bi-receipt',
    tone: 'indigo',
    note: `${currentSummary.value.counts.paid} paid · ${currentSummary.value.counts.partial} partial`,
  },
  {
    label: 'Outstanding balance',
    value: formatMoney(currentSummary.value.balanceCents),
    icon: 'bi-wallet2',
    tone: 'amber',
    note: 'Across the current tuition view',
  },
  {
    label: 'Overdue balance',
    value: formatMoney(currentSummary.value.overdueCents),
    icon: 'bi-exclamation-octagon',
    tone: 'red',
    note: `${currentSummary.value.counts.overdue} overdue records`,
  },
  {
    label: 'Payments recorded',
    value: store.totalPayments.toLocaleString('en-US'),
    icon: 'bi-cash-coin',
    tone: 'green',
    note: 'Stored in this browser',
  },
])

const hasTuitionFilters = computed(
  () =>
    Boolean(searchTerm.value.trim()) ||
    Boolean(statusFilter.value) ||
    Boolean(semesterFilter.value),
)
const hasPaymentFilters = computed(
  () =>
    Boolean(paymentSearch.value.trim()) ||
    Boolean(paymentMethodFilter.value) ||
    Boolean(tuitionFilter.value),
)

const selectedHistoryTuition = computed(() =>
  tuitionRows.value.find((record) => record.uid === tuitionFilter.value),
)

const setupNotice = computed(() => {
  if (!studentsStore.students?.length) {
    return 'No students are available in the local directory. Add students before creating tuition records.'
  }
  if (!semestersStore.semesters?.length) {
    return 'No semester records are available yet. Semester is optional on tuition records until semesters are added.'
  }
  return ''
})

const directorySubtitle = computed(() => {
  if (!store.totalTuitions) return 'No tuition records yet'
  if (hasTuitionFilters.value) {
    return `${filteredTuitionRows.value.length} of ${store.totalTuitions} records match your filters`
  }
  return `${store.totalTuitions} tuition records in this browser`
})

const paymentSubtitle = computed(() => {
  if (!store.totalPayments) return 'No payment records yet'
  if (selectedHistoryTuition.value) {
    return `Payment history for ${selectedHistoryTuition.value.studentName} · ${filteredPaymentRows.value.length} payment${
      filteredPaymentRows.value.length === 1 ? '' : 's'
    }`
  }
  if (hasPaymentFilters.value) {
    return `${filteredPaymentRows.value.length} of ${store.totalPayments} payments match your filters`
  }
  return `${store.totalPayments} payment records in this browser`
})

function recoveryText(recovery, label) {
  if (!recovery) return ''
  if (recovery.kind === 'invalid-json' || recovery.kind === 'invalid-format') {
    return `${label} data could not be read, so those records started empty.`
  }

  const changes = []
  if (recovery.discarded > 0) {
    changes.push(
      `${recovery.discarded} invalid or duplicate ${recovery.discarded === 1 ? 'entry' : 'entries'} removed`,
    )
  }
  if (recovery.corrected > 0) {
    changes.push(`${recovery.corrected} ${recovery.corrected === 1 ? 'entry' : 'entries'} repaired`)
  }
  if (recovery.orphaned > 0) {
    changes.push(`${recovery.orphaned} orphaned payment${recovery.orphaned === 1 ? '' : 's'} removed`)
  }

  return changes.length ? `${label}: ${changes.join('; ')}.` : ''
}

const storageAlerts = computed(() => {
  const alerts = []

  if (store.storageState === 'unavailable' || store.persistenceState === 'unavailable') {
    alerts.push({
      key: 'storage-unavailable',
      variant: 'danger',
      icon: 'bi-hdd-stack',
      text: 'Browser storage is unavailable. Tuition and payment changes will last for this session only.',
      retry: false,
    })
  } else if (store.persistenceState === 'failed') {
    alerts.push({
      key: 'storage-failed',
      variant: 'danger',
      icon: 'bi-exclamation-triangle',
      text: 'Browser storage is not accepting tuition and payment saves. Recent changes will be lost when you refresh.',
      retry: true,
    })
  }

  const recoveryMessage = [
    recoveryText(store.tuitionRecovery, 'Tuition records'),
    recoveryText(store.paymentRecovery, 'Payment records'),
  ]
    .filter(Boolean)
    .join(' ')

  if (recoveryMessage) {
    alerts.push({
      key: 'storage-recovery',
      variant: 'warning',
      icon: 'bi-shield-exclamation',
      text: `Some saved records needed attention: ${recoveryMessage} Recoverable records were kept.`,
      retry: false,
    })
  }

  return alerts
})

watch([searchTerm, statusFilter, semesterFilter], () => {
  tuitionPage.value = 1
})

watch([paymentSearch, paymentMethodFilter, tuitionFilter], () => {
  paymentPage.value = 1
})

watch(totalTuitionPages, (value) => {
  if (tuitionPage.value > value) tuitionPage.value = value
})

watch(totalPaymentPages, (value) => {
  if (paymentPage.value > value) paymentPage.value = value
})

function toggleTuitionSort(key) {
  if (tuitionSortKey.value === key) {
    tuitionSortDir.value = tuitionSortDir.value === 'asc' ? 'desc' : 'asc'
  } else {
    tuitionSortKey.value = key
    tuitionSortDir.value = 'asc'
  }
  tuitionPage.value = 1
}

function resetTuitionFilters() {
  searchTerm.value = ''
  statusFilter.value = ''
  semesterFilter.value = ''
  tuitionPage.value = 1
}

function resetPaymentFilters() {
  paymentSearch.value = ''
  paymentMethodFilter.value = ''
  tuitionFilter.value = ''
  paymentPage.value = 1
}

function openTuitionForm(tuition = null) {
  editingTuition.value = tuition
  tuitionFormOpen.value = true
}

function openPaymentForm(payment = null, tuitionUid = '') {
  editingPayment.value = payment
  defaultPaymentTuitionUid.value = tuitionUid
  paymentFormOpen.value = true
}

function openHistory(tuition) {
  paymentSearch.value = ''
  paymentMethodFilter.value = ''
  tuitionFilter.value = tuition.uid
  paymentPage.value = 1
}

function openReceipt(payment) {
  receiptPayment.value = payment
  receiptOpen.value = true
}

function askDeleteTuition(tuition) {
  tuitionDeleteTarget.value = tuition
}

function askDeletePayment(payment) {
  paymentDeleteTarget.value = payment
}

function closeTuitionDelete(open) {
  if (!open) tuitionDeleteTarget.value = null
}

function closePaymentDelete(open) {
  if (!open) paymentDeleteTarget.value = null
}

function handleTuitionSaved({ mode, tuition, persisted }) {
  tuitionFormOpen.value = false
  editingTuition.value = null
  if (mode === 'add') tuitionPage.value = 1

  const saved = persisted !== false
  const action = mode === 'edit' ? 'updated' : 'added'
  toast({
    variant: saved ? 'success' : 'warning',
    title: saved ? `Tuition ${action}` : `Tuition ${action} for this session`,
    message: saved
      ? `${tuition.studentName} now has a saved tuition record.`
      : 'Browser storage could not save this change. It will be lost when you refresh.',
  })
}

function handlePaymentSaved({ mode, payment, persisted }) {
  paymentFormOpen.value = false
  editingPayment.value = null
  if (mode === 'add') paymentPage.value = 1

  const saved = persisted !== false
  const action = mode === 'edit' ? 'updated' : 'recorded'
  toast({
    variant: saved ? 'success' : 'warning',
    title: saved ? `Payment ${action}` : `Payment ${action} for this session`,
    message: saved
      ? `${formatMoney(payment.amountCents)} for ${payment.studentName} was saved to browser storage.`
      : 'Browser storage could not save this change. It will be lost when you refresh.',
  })
}

function confirmDeleteTuition() {
  if (!tuitionDeleteTarget.value) return

  const target = tuitionDeleteTarget.value
  const result = store.deleteTuition(target.uid)

  if (!result.ok) {
    toast({
      variant: 'danger',
      title: 'Could not delete tuition',
      message: result.errors.form || 'The tuition record could not be deleted.',
    })
    tuitionDeleteTarget.value = null
    return
  }

  if (tuitionFilter.value === target.uid) resetPaymentFilters()
  if (receiptPayment.value?.tuitionUid === target.uid) receiptOpen.value = false

  const persisted = result.persisted !== false
  toast({
    variant: persisted ? 'success' : 'warning',
    title: persisted ? 'Tuition deleted' : 'Tuition removed for this session',
    message: persisted
      ? `${target.studentName}'s tuition record was removed from browser storage.`
      : 'Browser storage could not save this deletion. The tuition record will return if you refresh.',
  })
  tuitionDeleteTarget.value = null
}

function confirmDeletePayment() {
  if (!paymentDeleteTarget.value) return

  const target = paymentDeleteTarget.value
  const result = store.deletePayment(target.uid)

  if (!result.ok) {
    toast({
      variant: 'danger',
      title: 'Could not delete payment',
      message: result.errors.form || 'The payment record could not be deleted.',
    })
    paymentDeleteTarget.value = null
    return
  }

  if (receiptPayment.value?.uid === target.uid) receiptOpen.value = false

  const persisted = result.persisted !== false
  toast({
    variant: persisted ? 'success' : 'warning',
    title: persisted ? 'Payment deleted' : 'Payment removed for this session',
    message: persisted
      ? `${formatMoney(target.amountCents)} for ${target.studentName} was removed from browser storage.`
      : 'Browser storage could not save this deletion. The payment will return if you refresh.',
  })
  paymentDeleteTarget.value = null
}

async function handleQueryAction() {
  const action = String(route.query.action ?? '').trim().toLowerCase()
  if (!action) return

  if (action === 'payment') {
    openPaymentForm()
  } else if (action === 'tuition' || action === 'add') {
    openTuitionForm()
  } else {
    return
  }

  await router.replace({ name: 'payments' })
}

onMounted(async () => {
  store.loadTuitionData()
  semestersStore.loadSemesters()
  await nextTick()
  await handleQueryAction()
})

watch(() => route.query.action, handleQueryAction)
</script>

<template>
  <div>
    <PageHeader
      title="Tuition & Payments"
      description="Track tuition assessments, due dates, payment status, and payment history using records stored in this browser. No data is sent to the CampusHub server."
      eyebrow="Operations"
      eyebrow-icon="bi-credit-card"
    >
      <template #actions>
        <span class="demo-flag">
          <i class="bi bi-hdd" aria-hidden="true"></i>
          Browser storage
        </span>
        <button type="button" class="btn-ch btn-ch-soft" @click="openPaymentForm()">
          <i class="bi bi-cash-coin" aria-hidden="true"></i>
          Record payment
        </button>
        <button type="button" class="btn-ch btn-ch-primary" @click="openTuitionForm()">
          <i class="bi bi-plus-lg" aria-hidden="true"></i>
          Add tuition
        </button>
      </template>
    </PageHeader>

    <div v-if="store.loadState === 'loading'" class="ch-alert is-info" role="status">
      <i class="bi bi-arrow-repeat" aria-hidden="true"></i>
      <span>Loading tuition and payment records from browser storage…</span>
    </div>

    <div v-if="store.loadState === 'error'" class="ch-alert is-warning" role="alert">
      <i class="bi bi-exclamation-triangle" aria-hidden="true"></i>
      <span>{{ store.loadError }}</span>
      <button
        type="button"
        class="btn-ch btn-ch-soft btn-ch-sm api-retry"
        @click="store.loadTuitionData()"
      >
        <i class="bi bi-arrow-clockwise" aria-hidden="true"></i>
        Retry
      </button>
    </div>

    <div
      v-for="alert in storageAlerts"
      :key="alert.key"
      class="ch-alert"
      :class="`is-${alert.variant}`"
      role="alert"
    >
      <i class="bi" :class="alert.icon" aria-hidden="true"></i>
      <span>{{ alert.text }}</span>
      <button
        v-if="alert.retry"
        type="button"
        class="btn-ch btn-ch-soft btn-ch-sm api-retry"
        @click="store.retryPersist()"
      >
        <i class="bi bi-arrow-clockwise" aria-hidden="true"></i>
        Retry save
      </button>
    </div>

    <div v-if="setupNotice" class="ch-alert is-info" role="status">
      <i class="bi bi-info-circle" aria-hidden="true"></i>
      <span>{{ setupNotice }}</span>
    </div>

    <section class="row g-3 g-xl-4 mb-1" aria-label="Tuition summary statistics">
      <div v-for="card in summaryCards" :key="card.label" class="col-sm-6 col-xl-3">
        <StatCard v-bind="card" />
      </div>
    </section>

    <section class="ch-card mt-3 mt-xl-4" aria-labelledby="tuition-records-heading">
      <div class="ch-card-header has-border">
        <div>
          <h2 id="tuition-records-heading" class="ch-card-title">Tuition records</h2>
          <p class="ch-card-subtitle">{{ directorySubtitle }}</p>
        </div>
        <button
          v-if="hasTuitionFilters"
          type="button"
          class="btn-ch btn-ch-ghost btn-ch-sm"
          @click="resetTuitionFilters"
        >
          <i class="bi bi-arrow-counterclockwise" aria-hidden="true"></i>
          Reset filters
        </button>
      </div>

      <div class="data-toolbar payments-toolbar">
        <SearchField
          v-model="searchTerm"
          class="toolbar-search"
          label="Search tuition"
          placeholder="Search by student, ID, reference, semester, or status…"
        />
        <FilterSelect v-model="statusFilter" label="Status" :options="statusOptions" />
        <FilterSelect v-model="semesterFilter" label="Semester" :options="semesterOptions" />
      </div>

      <div v-if="pagedTuitionRows.length" class="ch-card-body is-flush">
        <TuitionTable
          :records="pagedTuitionRows"
          :sort-key="tuitionSortKey"
          :sort-dir="tuitionSortDir"
          @sort="toggleTuitionSort"
          @history="openHistory"
          @pay="openPaymentForm(null, $event.uid)"
          @edit="openTuitionForm"
          @delete="askDeleteTuition"
        />
        <PaginationBar
          :page="tuitionPage"
          :page-size="tuitionPageSize"
          :total="filteredTuitionRows.length"
          item-label="tuition records"
          @update:page="tuitionPage = $event"
          @update:page-size="tuitionPageSize = $event"
        />
      </div>

      <div v-else class="ch-card-body">
        <EmptyState
          v-if="store.loadState === 'error'"
          icon="bi-exclamation-triangle"
          title="Tuition records unavailable"
          message="Browser storage could not be read. Try loading the tuition list again."
        >
          <button type="button" class="btn-ch btn-ch-primary" @click="store.loadTuitionData()">
            <i class="bi bi-arrow-clockwise" aria-hidden="true"></i>
            Retry
          </button>
        </EmptyState>

        <EmptyState
          v-else-if="store.totalTuitions === 0"
          icon="bi-receipt"
          title="No tuition records yet"
          message="Add a tuition record to assess an amount, set a due date, and track payments."
        >
          <button type="button" class="btn-ch btn-ch-primary" @click="openTuitionForm()">
            <i class="bi bi-plus-lg" aria-hidden="true"></i>
            Add tuition
          </button>
        </EmptyState>

        <EmptyState
          v-else-if="filteredTuitionRows.length === 0"
          icon="bi-search"
          title="No tuition records match your filters"
          message="Try another search term or reset the status and semester filters."
        >
          <button type="button" class="btn-ch btn-ch-soft" @click="resetTuitionFilters">
            <i class="bi bi-arrow-counterclockwise" aria-hidden="true"></i>
            Clear filters
          </button>
        </EmptyState>

        <EmptyState
          v-else
          icon="bi-arrow-left-right"
          title="No tuition records on this page"
          message="Return to the first page to keep browsing the tuition records."
        >
          <button type="button" class="btn-ch btn-ch-soft" @click="tuitionPage = 1">
            <i class="bi bi-arrow-counterclockwise" aria-hidden="true"></i>
            Go to first page
          </button>
        </EmptyState>

        <PaginationBar
          v-if="filteredTuitionRows.length > 0"
          :page="tuitionPage"
          :page-size="tuitionPageSize"
          :total="filteredTuitionRows.length"
          item-label="tuition records"
          @update:page="tuitionPage = $event"
          @update:page-size="tuitionPageSize = $event"
        />
      </div>
    </section>

    <section class="ch-card mt-3 mt-xl-4" aria-labelledby="payment-history-heading">
      <div class="ch-card-header has-border">
        <div>
          <h2 id="payment-history-heading" class="ch-card-title">Payment history</h2>
          <p class="ch-card-subtitle">{{ paymentSubtitle }}</p>
        </div>
        <button
          v-if="hasPaymentFilters"
          type="button"
          class="btn-ch btn-ch-ghost btn-ch-sm"
          @click="resetPaymentFilters"
        >
          <i class="bi bi-arrow-counterclockwise" aria-hidden="true"></i>
          Clear history
        </button>
      </div>

      <div
        v-if="selectedHistoryTuition"
        class="history-banner"
        role="status"
      >
        <i class="bi bi-clock-history" aria-hidden="true"></i>
        <span>
          Showing payments for
          <strong>{{ selectedHistoryTuition.studentName }}</strong>
          · {{ selectedHistoryTuition.semesterName }}
        </span>
        <button type="button" class="btn-ch btn-ch-ghost btn-ch-sm" @click="resetPaymentFilters">
          Show all payments
        </button>
      </div>

      <div class="data-toolbar payments-toolbar">
        <SearchField
          v-model="paymentSearch"
          class="toolbar-search"
          label="Search payments"
          placeholder="Search by student, tuition, date, method, or reference…"
        />
        <FilterSelect v-model="paymentMethodFilter" label="Method" :options="methodOptions" />
      </div>

      <div v-if="pagedPaymentRows.length" class="ch-card-body is-flush">
        <PaymentHistory
          :rows="pagedPaymentRows"
          @receipt="openReceipt"
          @edit="openPaymentForm"
          @delete="askDeletePayment"
        />
        <PaginationBar
          :page="paymentPage"
          :page-size="paymentPageSize"
          :total="filteredPaymentRows.length"
          item-label="payments"
          @update:page="paymentPage = $event"
          @update:page-size="paymentPageSize = $event"
        />
      </div>

      <div v-else class="ch-card-body">
        <EmptyState
          v-if="store.totalPayments === 0"
          icon="bi-cash-coin"
          title="No payments recorded yet"
          message="Record a payment against a tuition record to build the payment history."
        >
          <button
            type="button"
            class="btn-ch btn-ch-primary"
            :disabled="!store.totalTuitions"
            @click="openPaymentForm()"
          >
            <i class="bi bi-cash-coin" aria-hidden="true"></i>
            Record payment
          </button>
        </EmptyState>

        <EmptyState
          v-else-if="filteredPaymentRows.length === 0"
          icon="bi-search"
          title="No payments match your filters"
          message="Try another search term or clear the payment history filters."
        >
          <button type="button" class="btn-ch btn-ch-soft" @click="resetPaymentFilters">
            <i class="bi bi-arrow-counterclockwise" aria-hidden="true"></i>
            Clear filters
          </button>
        </EmptyState>

        <EmptyState
          v-else
          icon="bi-arrow-left-right"
          title="No payments on this page"
          message="Return to the first page to keep browsing the payment history."
        >
          <button type="button" class="btn-ch btn-ch-soft" @click="paymentPage = 1">
            <i class="bi bi-arrow-counterclockwise" aria-hidden="true"></i>
            Go to first page
          </button>
        </EmptyState>

        <PaginationBar
          v-if="filteredPaymentRows.length > 0"
          :page="paymentPage"
          :page-size="paymentPageSize"
          :total="filteredPaymentRows.length"
          item-label="payments"
          @update:page="paymentPage = $event"
          @update:page-size="paymentPageSize = $event"
        />
      </div>
    </section>

    <TuitionFormModal
      v-model="tuitionFormOpen"
      :tuition="editingTuition"
      :students="studentsStore.students || []"
      :semesters="semestersStore.semesters || []"
      @saved="handleTuitionSaved"
    />

    <PaymentFormModal
      v-model="paymentFormOpen"
      :payment="editingPayment"
      :tuition-rows="tuitionRows"
      :default-tuition-uid="defaultPaymentTuitionUid"
      @saved="handlePaymentSaved"
    />

    <PaymentReceiptModal
      v-model="receiptOpen"
      :payment="receiptPayment"
      :tuition="tuitionRows.find((row) => row.uid === receiptPayment?.tuitionUid)"
      @update:model-value="receiptOpen = $event"
    />

    <ConfirmDialog
      :model-value="Boolean(tuitionDeleteTarget)"
      title="Delete tuition record?"
      confirm-label="Delete tuition"
      variant="danger"
      @update:model-value="closeTuitionDelete"
      @confirm="confirmDeleteTuition"
      @cancel="closeTuitionDelete(false)"
    >
      <p v-if="tuitionDeleteTarget">
        You are about to delete the tuition record for
        <strong>{{ tuitionDeleteTarget.studentName }}</strong>
        from this browser. Linked payments must be removed first.
      </p>
    </ConfirmDialog>

    <ConfirmDialog
      :model-value="Boolean(paymentDeleteTarget)"
      title="Delete payment record?"
      confirm-label="Delete payment"
      variant="danger"
      @update:model-value="closePaymentDelete"
      @confirm="confirmDeletePayment"
      @cancel="closePaymentDelete(false)"
    >
      <p v-if="paymentDeleteTarget">
        You are about to delete the {{ formatMoney(paymentDeleteTarget.amountCents) }} payment for
        <strong>{{ paymentDeleteTarget.studentName }}</strong> from this browser.
      </p>
    </ConfirmDialog>
  </div>
</template>

<style scoped>
.history-banner {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.85rem 1.1rem;
  border-bottom: 1px solid rgba(15, 23, 42, 0.08);
  background: rgba(79, 70, 229, 0.07);
}

.history-banner span {
  flex: 1;
}
</style>

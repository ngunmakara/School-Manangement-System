import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import PaymentsView from '../../src/views/PaymentsView.vue'
import { useStudentsStore } from '../../src/stores/students'
import { useToast } from '../../src/composables/useToast'

const componentStubs = {
  PageHeader: {
    props: ['title'],
    template:
      '<header class="stub-page-header" :data-title="title"><slot name="actions" /></header>',
  },
  StatCard: {
    props: ['label', 'value'],
    template: '<div class="stat-card-stub">{{ label }}: {{ value }}</div>',
  },
  SearchField: {
    props: ['modelValue', 'label'],
    template:
      '<input type="search" :aria-label="label" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
  },
  FilterSelect: {
    props: ['modelValue', 'label', 'options'],
    template:
      '<select :aria-label="label" :value="modelValue" @change="$emit(\'update:modelValue\', $event.target.value)"><option v-for="option in options" :key="option.value" :value="option.value">{{ option.label }}</option></select>',
  },
  EmptyState: {
    props: ['title', 'message'],
    template: '<div class="empty-state-stub"><h3>{{ title }}</h3><p>{{ message }}</p></div>',
  },
  PaginationBar: true,
  TuitionTable: {
    props: ['records'],
    template:
      '<div class="tuition-table-stub" :data-count="records.length"><template v-for="record in records" :key="record.uid">{{ record.studentName }} {{ record.status }} {{ record.balanceCents }}</template></div>',
  },
  TuitionFormModal: {
    props: ['modelValue'],
    template: '<div class="tuition-form-stub" :data-open="String(modelValue)"></div>',
  },
  PaymentFormModal: {
    props: ['modelValue'],
    template: '<div class="payment-form-stub" :data-open="String(modelValue)"></div>',
  },
  PaymentHistory: {
    props: ['rows'],
    template:
      '<div class="payment-history-stub" :data-count="rows.length"><template v-for="row in rows" :key="row.uid">{{ row.studentName }} {{ row.amountCents }}</template></div>',
  },
  PaymentReceiptModal: true,
  ConfirmDialog: true,
}

let pinia

function dateOffset(days) {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')}`
}

async function mountView({ query = {} } = {}) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<div />' } },
      {
        path: '/payments',
        name: 'payments',
        component: PaymentsView,
        meta: { title: 'Tuition & Payments', group: 'Operations', icon: 'bi-credit-card' },
      },
    ],
  })

  await router.push({ name: 'payments', query })
  await router.isReady()

  return mount(PaymentsView, {
    attachTo: document.body,
    global: {
      plugins: [pinia, router],
      stubs: { ...componentStubs, teleport: true },
    },
  })
}

function seedRecords() {
  window.localStorage.setItem(
    'campushub:tuition:v1',
    JSON.stringify([
      {
        uid: 'tuition_1',
        studentUid: 'student_1',
        semesterUid: 'semester_1',
        amountAssessedCents: 100000,
        dueDate: dateOffset(-10),
        reference: 'TUITION-001',
        note: '',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
      {
        uid: 'tuition_2',
        studentUid: 'student_2',
        semesterUid: 'semester_1',
        amountAssessedCents: 50000,
        dueDate: dateOffset(30),
        reference: 'TUITION-002',
        note: '',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ]),
  )
  window.localStorage.setItem(
    'campushub:payments:v1',
    JSON.stringify([
      {
        uid: 'payment_1',
        tuitionUid: 'tuition_1',
        amountCents: 40000,
        paidAt: dateOffset(-5),
        method: 'Cash',
        reference: 'OR-001',
        note: '',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ]),
  )
  window.localStorage.setItem(
    'campushub:semesters:v1',
    JSON.stringify([
      {
        uid: 'semester_1',
        name: 'Fall 2026',
        academicYear: '2026-2027',
        status: 'Active',
        startDate: '2026-08-01',
        endDate: '2026-12-15',
        description: '',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ]),
  )

  const studentsStore = useStudentsStore()
  studentsStore.students = [
    { uid: 'student_1', studentId: 'S1001', fullName: 'Ada Lovelace' },
    { uid: 'student_2', studentId: 'S1002', fullName: 'Grace Hopper' },
  ]
}

beforeEach(() => {
  window.localStorage.clear()
  pinia = createPinia()
  setActivePinia(pinia)
  useToast().state.toasts.splice(0)
})

afterEach(() => {
  vi.restoreAllMocks()
  document.body.innerHTML = ''
  document.body.classList.remove('ch-modal-open')
  window.localStorage.clear()
})

describe('PaymentsView', () => {
  it('renders tuition rows, calculated summaries, and payment history', async () => {
    seedRecords()

    const wrapper = await mountView()
    await flushPromises()

    expect(wrapper.get('.stub-page-header').attributes('data-title')).toBe('Tuition & Payments')
    expect(wrapper.get('.tuition-table-stub').attributes('data-count')).toBe('2')
    expect(wrapper.get('.tuition-table-stub').text()).toContain('Ada Lovelace overdue 60000')
    expect(wrapper.get('.tuition-table-stub').text()).toContain('Grace Hopper unpaid 50000')
    expect(wrapper.get('.payment-history-stub').attributes('data-count')).toBe('1')
    expect(wrapper.get('.payment-history-stub').text()).toContain('Ada Lovelace 40000')
    expect(wrapper.text()).toContain('Outstanding balance: $1,100.00')
    expect(wrapper.text()).toContain('Payments recorded: 1')

    wrapper.unmount()
  })

  it('filters tuition records by status', async () => {
    seedRecords()

    const wrapper = await mountView()
    await flushPromises()
    await wrapper.get('select[aria-label="Status"]').setValue('overdue')
    await flushPromises()

    expect(wrapper.get('.tuition-table-stub').attributes('data-count')).toBe('1')
    expect(wrapper.get('.tuition-table-stub').text()).toContain('Ada Lovelace')

    wrapper.unmount()
  })

  it('opens the tuition form from the add query action', async () => {
    seedRecords()

    const wrapper = await mountView({ query: { action: 'add' } })
    await flushPromises()

    expect(wrapper.get('.tuition-form-stub').attributes('data-open')).toBe('true')

    wrapper.unmount()
  })

  it('shows an empty state when no tuition records exist', async () => {
    const wrapper = await mountView()
    await flushPromises()

    expect(wrapper.text()).toContain('No tuition records yet')
    expect(wrapper.find('.tuition-table-stub').exists()).toBe(false)

    wrapper.unmount()
  })
})

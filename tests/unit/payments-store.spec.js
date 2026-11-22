import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { usePaymentsStore } from '../../src/stores/payments'

const TUITION_KEY = 'campushub:tuition:v1'
const PAYMENT_KEY = 'campushub:payments:v1'

const students = [
  { uid: 'student_1', studentId: 'S1001', fullName: 'Ada Lovelace' },
  { uid: 'student_2', studentId: 'S1002', fullName: 'Grace Hopper' },
]
const semesters = [{ uid: 'semester_1', name: 'Fall 2026', academicYear: '2026-2027' }]

function tuitionInput(overrides = {}) {
  return {
    studentUid: 'student_1',
    semesterUid: 'semester_1',
    amountAssessedCents: 100000,
    dueDate: '2026-12-15',
    reference: 'TUITION-001',
    note: '',
    studentName: 'Ada Lovelace',
    studentId: 'S1001',
    semesterName: 'Fall 2026 · 2026-2027',
    ...overrides,
  }
}

function paymentInput(overrides = {}) {
  return {
    tuitionUid: 'tuition_1',
    amountCents: 40000,
    paidAt: '2026-11-01',
    method: 'Bank Transfer',
    reference: 'OR-001',
    note: '',
    ...overrides,
  }
}

function context() {
  return { students, semesters }
}

beforeEach(() => {
  window.localStorage.clear()
  setActivePinia(createPinia())
})

afterEach(() => {
  vi.restoreAllMocks()
  window.localStorage.clear()
})

describe('payments store', () => {
  it('adds, updates, deletes, and persists tuition records', () => {
    const store = usePaymentsStore()

    const added = store.addTuition(tuitionInput(), context())
    expect(added.ok).toBe(true)
    expect(store.totalTuitions).toBe(1)
    expect(JSON.parse(window.localStorage.getItem(TUITION_KEY))).toHaveLength(1)

    const updated = store.updateTuition(
      added.tuition.uid,
      tuitionInput({ reference: 'TUITION-002' }),
      context(),
    )
    expect(updated.ok).toBe(true)
    expect(updated.tuition.createdAt).toBe(added.tuition.createdAt)
    expect(updated.tuition.reference).toBe('TUITION-002')

    const deleted = store.deleteTuition(updated.tuition.uid)
    expect(deleted.ok).toBe(true)
    expect(store.totalTuitions).toBe(0)
    expect(JSON.parse(window.localStorage.getItem(TUITION_KEY))).toEqual([])
  })

  it('rejects duplicate tuition records for the same student and semester', () => {
    const store = usePaymentsStore()
    expect(store.addTuition(tuitionInput(), context()).ok).toBe(true)

    const duplicate = store.addTuition(tuitionInput(), context())
    expect(duplicate.ok).toBe(false)
    expect(duplicate.errors.form).toContain('already exists')
  })

  it('adds, updates, and deletes payments with balance checks', () => {
    const store = usePaymentsStore()
    const tuition = store.addTuition(tuitionInput(), context())
    const tuitionUid = tuition.tuition.uid

    const added = store.addPayment(paymentInput({ tuitionUid }), {
      tuitions: store.tuitions,
    })
    expect(added.ok).toBe(true)
    expect(store.totalPayments).toBe(1)
    expect(JSON.parse(window.localStorage.getItem(PAYMENT_KEY))).toHaveLength(1)

    const [row] = store.rowsFor(students, semesters, '2026-11-22')
    expect(row).toMatchObject({
      paidCents: 40000,
      balanceCents: 60000,
      status: 'partial',
    })

    const overpayment = store.addPayment(paymentInput({ tuitionUid, amountCents: 70000 }), {
      tuitions: store.tuitions,
    })
    expect(overpayment.ok).toBe(false)
    expect(overpayment.errors.amount).toContain('remaining balance')

    const updated = store.updatePayment(
      added.payment.uid,
      paymentInput({ tuitionUid, amountCents: 50000 }),
      { tuitions: store.tuitions },
    )
    expect(updated.ok).toBe(true)
    expect(updated.payment.createdAt).toBe(added.payment.createdAt)

    const deleted = store.deletePayment(added.payment.uid)
    expect(deleted.ok).toBe(true)
    expect(store.totalPayments).toBe(0)
  })

  it('blocks tuition deletion while linked payments exist', () => {
    const store = usePaymentsStore()
    const tuition = store.addTuition(tuitionInput(), context())
    const added = store.addPayment(paymentInput({ tuitionUid: tuition.tuition.uid }), {
      tuitions: store.tuitions,
    })
    expect(added.ok).toBe(true)

    const blocked = store.deleteTuition(tuition.tuition.uid)
    expect(blocked.ok).toBe(false)
    expect(blocked.errors.form).toContain('Remove 1 linked payment')
    expect(store.totalTuitions).toBe(1)
  })

  it('reloads normalized records from browser storage', () => {
    window.localStorage.setItem(
      TUITION_KEY,
      JSON.stringify([
        {
          ...tuitionInput(),
          uid: 'tuition_1',
          createdAt: '2026-08-01T00:00:00.000Z',
          updatedAt: '2026-08-01T00:00:00.000Z',
        },
        { ...tuitionInput(), uid: 'tuition_2', studentUid: 'student_2' },
      ]),
    )
    window.localStorage.setItem(
      PAYMENT_KEY,
      JSON.stringify([
        {
          ...paymentInput(),
          uid: 'payment_1',
          createdAt: '2026-11-01T00:00:00.000Z',
          updatedAt: '2026-11-01T00:00:00.000Z',
        },
        { ...paymentInput(), uid: 'payment_orphan', tuitionUid: 'missing' },
      ]),
    )

    const store = usePaymentsStore()
    expect(store.loadTuitionData()).toBe(true)
    expect(store.totalTuitions).toBe(2)
    expect(store.totalPayments).toBe(1)
    expect(store.storageState).toBe('recovered')
    expect(store.paymentRecovery.orphaned).toBe(1)
  })

  it('keeps changes in memory when browser storage writes fail', () => {
    const store = usePaymentsStore()
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota')
    })

    const added = store.addTuition(tuitionInput(), context())
    expect(added.ok).toBe(true)
    expect(added.persisted).toBe(false)
    expect(store.persistenceState).toBe('failed')
    expect(store.totalTuitions).toBe(1)
  })
})

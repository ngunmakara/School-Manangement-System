import { describe, expect, it } from 'vitest'
import {
  buildPaymentRows,
  buildTuitionRows,
  derivePaymentStatus,
  filterPaymentRows,
  filterTuitionRows,
  formatMoney,
  formatMoneyInput,
  isDateOverdue,
  normalizeDateKey,
  normalizeStoredPayments,
  normalizeStoredTuitions,
  parseMoneyCents,
  sortRecords,
  summarizeTuition,
  validatePaymentRecord,
  validateTuitionRecord,
} from '../../src/utils/payments'

const students = [
  { uid: 'student_1', studentId: 'S1001', fullName: 'Ada Lovelace' },
  { uid: 'student_2', studentId: 'S1002', fullName: 'Grace Hopper' },
]

const semesters = [{ uid: 'semester_1', name: 'Fall 2026', academicYear: '2026-2027' }]

const tuition = {
  uid: 'tuition_1',
  studentUid: 'student_1',
  studentName: 'Ada Lovelace',
  studentId: 'S1001',
  semesterUid: 'semester_1',
  semesterName: 'Fall 2026',
  amountAssessedCents: 100000,
  dueDate: '2026-10-01',
  reference: 'TUITION-001',
  note: '',
  createdAt: '2026-08-01T00:00:00.000Z',
  updatedAt: '2026-08-01T00:00:00.000Z',
}

const payment = {
  uid: 'payment_1',
  tuitionUid: 'tuition_1',
  studentUid: 'student_1',
  studentName: 'Ada Lovelace',
  studentId: 'S1001',
  amountCents: 40000,
  paidAt: '2026-09-15',
  method: 'Cash',
  reference: 'OR-001',
  note: '',
  createdAt: '2026-09-15T00:00:00.000Z',
  updatedAt: '2026-09-15T00:00:00.000Z',
}

describe('payment money and date helpers', () => {
  it('parses and formats money without floating point drift', () => {
    expect(parseMoneyCents('1,234.50')).toBe(123450)
    expect(parseMoneyCents('0.07')).toBe(7)
    expect(parseMoneyCents('12.345')).toBeNull()
    expect(parseMoneyCents('-1')).toBeNull()
    expect(formatMoneyInput(123450)).toBe('1234.50')
    expect(formatMoney(123450)).toBe('$1,234.50')
    expect(formatMoney(null)).toBe('—')
  })

  it('normalizes date-only and timestamp values', () => {
    expect(normalizeDateKey('2026-03-12T08:00:00.000Z')).toBe('2026-03-12')
    expect(normalizeDateKey('2026-02-30')).toBe('')
    expect(isDateOverdue('2026-10-01', '2026-11-22')).toBe(true)
    expect(isDateOverdue('2026-12-01', '2026-11-22')).toBe(false)
    expect(isDateOverdue('', '2026-11-22')).toBe(false)
  })
})

describe('tuition status derivation', () => {
  const today = '2026-11-22'

  it('derives paid, overdue, partial, unpaid, and unavailable statuses', () => {
    expect(derivePaymentStatus({ amountAssessedCents: 100000, paidCents: 100000 }, today)).toBe(
      'paid',
    )
    expect(
      derivePaymentStatus(
        { amountAssessedCents: 100000, paidCents: 40000, dueDate: '2026-10-01' },
        today,
      ),
    ).toBe('overdue')
    expect(
      derivePaymentStatus(
        { amountAssessedCents: 100000, paidCents: 40000, dueDate: '2026-12-01' },
        today,
      ),
    ).toBe('partial')
    expect(
      derivePaymentStatus(
        { amountAssessedCents: 100000, paidCents: 0, dueDate: '2026-12-01' },
        today,
      ),
    ).toBe('unpaid')
    expect(derivePaymentStatus({ amountAssessedCents: null, paidCents: 100 }, today)).toBe(
      'unavailable',
    )
  })

  it('never marks an unassessed or zero-amount tuition as paid', () => {
    expect(derivePaymentStatus({ amountAssessedCents: 0, paidCents: 0 }, today)).toBe('unavailable')
    expect(derivePaymentStatus({ amountAssessedCents: null, paidCents: 500 }, today)).toBe(
      'unavailable',
    )
  })
})

describe('tuition and payment validation', () => {
  it('rejects duplicate student and semester tuition records but allows self-edits', () => {
    const errors = validateTuitionRecord(tuition, [tuition], { students, semesters })
    expect(errors.form).toContain('already exists')

    const selfEdit = validateTuitionRecord(tuition, [tuition], { students, semesters }, 'tuition_1')
    expect(selfEdit).toEqual({})
  })

  it('prevents lowering an assessed amount below recorded payments', () => {
    const errors = validateTuitionRecord(
      { ...tuition, amountAssessedCents: 30000 },
      [tuition],
      { students, semesters, payments: [payment] },
      'tuition_1',
    )
    expect(errors.amountAssessed).toContain('cannot be less than recorded payments')
  })

  it('prevents overpayment and excludes the current payment during edits', () => {
    const errors = validatePaymentRecord({ ...payment, amountCents: 70000 }, [payment], {
      tuitions: [tuition],
    })
    expect(errors.amount).toContain('remaining balance')

    const selfEdit = validatePaymentRecord(payment, [payment], { tuitions: [tuition] }, 'payment_1')
    expect(selfEdit).toEqual({})
  })

  it('rejects payments against a fully paid tuition', () => {
    const errors = validatePaymentRecord(payment, [{ ...payment, uid: 'payment_existing' }], {
      tuitions: [{ ...tuition, amountAssessedCents: 40000 }],
    })
    expect(errors.amount).toBe('This tuition record is already paid in full.')
  })
})

describe('tuition rows and summaries', () => {
  const rows = buildTuitionRows([tuition], [payment], students, semesters, '2026-11-22')

  it('builds enriched row data from linked records', () => {
    expect(rows[0]).toMatchObject({
      studentName: 'Ada Lovelace',
      semesterName: 'Fall 2026 · 2026-2027',
      amountAssessedCents: 100000,
      paidCents: 40000,
      balanceCents: 60000,
      status: 'overdue',
      paymentCount: 1,
    })
  })

  it('summarizes assessed, paid, balance, and overdue amounts', () => {
    expect(summarizeTuition(rows)).toMatchObject({
      recordCount: 1,
      assessedCents: 100000,
      paidCents: 40000,
      balanceCents: 60000,
      overdueCents: 60000,
      counts: { paid: 0, overdue: 1, partial: 0, unpaid: 0, unavailable: 0 },
    })
  })

  it('filters and sorts rows using local data', () => {
    expect(filterTuitionRows(rows, { search: 'ada' })).toHaveLength(1)
    expect(filterTuitionRows(rows, { status: 'paid' })).toHaveLength(0)
    expect(
      sortRecords([{ studentName: 'Grace' }, { studentName: 'Ada' }], 'studentName', 'asc')[0]
        .studentName,
    ).toBe('Ada')
  })

  it('builds payment rows with tuition and student snapshots', () => {
    const [row] = buildPaymentRows([payment], [tuition], students)
    expect(row).toMatchObject({
      studentName: 'Ada Lovelace',
      tuitionReference: 'TUITION-001',
      semesterName: 'Fall 2026',
    })
    expect(filterPaymentRows([row], { search: 'or-001' })).toHaveLength(1)
    expect(filterPaymentRows([row], { tuitionUid: 'tuition_2' })).toHaveLength(0)
  })
})

describe('storage normalization', () => {
  it('drops invalid, duplicate, and orphaned records during normalization', () => {
    const tuitionResult = normalizeStoredTuitions([
      { ...tuition, reference: '  TUITION-001  ' },
      { ...tuition, uid: 'tuition_2' },
      { ...tuition, uid: '', studentUid: '', dueDate: '' },
      'invalid',
    ])

    expect(tuitionResult.records).toHaveLength(1)
    expect(tuitionResult.discarded).toBe(3)
    expect(tuitionResult.duplicateIdentity).toBe(1)
    expect(tuitionResult.records[0].reference).toBe('TUITION-001')

    const paymentResult = normalizeStoredPayments(
      [payment, { ...payment, uid: 'payment_2', tuitionUid: 'missing' }, { ...payment, uid: '' }],
      ['tuition_1'],
    )

    expect(paymentResult.records).toHaveLength(2)
    expect(paymentResult.orphaned).toBe(1)
    expect(paymentResult.records.some((record) => !record.uid)).toBe(false)
  })
})

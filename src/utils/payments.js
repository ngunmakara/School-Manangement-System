export const PAYMENT_METHODS = Object.freeze([
  'Cash',
  'Bank Transfer',
  'Card',
  'Mobile Wallet',
  'Other',
])

export const TUITION_STATUSES = Object.freeze(['paid', 'overdue', 'partial', 'unpaid', 'unavailable'])

export const TUITION_STATUS_LABELS = Object.freeze({
  paid: 'Paid',
  overdue: 'Overdue',
  partial: 'Partial',
  unpaid: 'Unpaid',
  unavailable: 'Unavailable',
})

const MONEY_PATTERN = /^\d{1,12}(?:\.\d{1,2})?$/
const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})(?:[T ].*)?$/

let uidCounter = 0

function collapseWhitespace(value) {
  return String(value ?? '')
    .trim()
    .replace(/\s+/g, ' ')
}

function hasUid(list, uid) {
  const target = String(uid ?? '').trim()
  if (!target) return false
  return list.some((item) => String(item?.uid ?? '').trim() === target)
}

function normalizeTimestamp(value, fallback) {
  const text = String(value ?? '').trim()
  if (!text) return fallback
  return !Number.isNaN(new Date(text).getTime()) ? text : fallback
}

function normalizePaymentMethod(value, fallback = '') {
  const method = collapseWhitespace(value)
  return PAYMENT_METHODS.includes(method) ? method : fallback
}

function toStoredCents(input, centsKey, amountKey) {
  const centsValue = input?.[centsKey]
  if (centsValue !== undefined && centsValue !== null && String(centsValue).trim() !== '') {
    const cents = Number(centsValue)
    return Number.isSafeInteger(cents) && cents >= 0 ? cents : null
  }
  return parseMoneyCents(input?.[amountKey])
}

export function parseMoneyCents(value) {
  if (typeof value === 'number') {
    if (!Number.isFinite(value) || value < 0) return null
    const cents = Math.round((value + Number.EPSILON) * 100)
    return Number.isSafeInteger(cents) ? cents : null
  }

  const text = String(value ?? '')
    .trim()
    .replace(/[$,\s]/g, '')
  if (!MONEY_PATTERN.test(text)) return null

  const [whole, fraction = ''] = text.split('.')
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, '0'))
  return Number.isSafeInteger(cents) ? cents : null
}

export function formatMoneyInput(cents) {
  if (cents === null || cents === undefined || !Number.isSafeInteger(cents)) return ''
  return (cents / 100).toFixed(2)
}

export function formatMoney(cents) {
  if (cents === null || cents === undefined || !Number.isSafeInteger(cents)) return '—'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100)
}

export function normalizeDateKey(value) {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return ''
    return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(
      value.getDate(),
    ).padStart(2, '0')}`
  }

  const match = DATE_PATTERN.exec(String(value ?? '').trim())
  if (!match) return ''

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = new Date(year, month - 1, day)
  const valid =
    date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
  return valid ? `${match[1]}-${match[2]}-${match[3]}` : ''
}

export function todayDateKey() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
    now.getDate(),
  ).padStart(2, '0')}`
}

export function isDateOverdue(dueDate, today = todayDateKey()) {
  const due = normalizeDateKey(dueDate)
  const current = normalizeDateKey(today)
  return Boolean(due && current && due < current)
}

export function derivePaymentStatus(record = {}, today = todayDateKey()) {
  const assessedCents = Number(record?.amountAssessedCents)
  const paidCents = Number(record?.paidCents ?? 0)

  if (!Number.isSafeInteger(assessedCents) || assessedCents <= 0) return 'unavailable'

  const safePaid = Number.isFinite(paidCents) ? Math.max(0, Math.round(paidCents)) : 0
  const balanceCents = Math.max(0, assessedCents - safePaid)

  if (balanceCents === 0) return 'paid'
  if (isDateOverdue(record?.dueDate, today)) return 'overdue'
  return safePaid > 0 ? 'partial' : 'unpaid'
}

export function tuitionStatusLabel(status) {
  return TUITION_STATUS_LABELS[status] || 'Unavailable'
}

export function createPaymentEntityUid(prefix = 'record') {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}_${crypto.randomUUID()}`
  }

  uidCounter += 1
  return `${prefix}_${Date.now().toString(36)}_${uidCounter}`
}

export function createUniquePaymentEntityUid(usedUids = [], prefix = 'record') {
  const used = usedUids instanceof Set ? usedUids : new Set(usedUids)
  let uid = createPaymentEntityUid(prefix)

  while (used.has(uid)) {
    uid = createPaymentEntityUid(prefix)
  }

  return uid
}

export function sanitizeTuitionInput(input = {}) {
  return {
    studentUid: String(input?.studentUid ?? '').trim(),
    semesterUid: String(input?.semesterUid ?? '').trim(),
    amountAssessedCents: toStoredCents(input, 'amountAssessedCents', 'amountAssessed'),
    dueDate: normalizeDateKey(input?.dueDate),
    reference: collapseWhitespace(input?.reference).slice(0, 40),
    note: collapseWhitespace(input?.note).slice(0, 240),
    studentName: collapseWhitespace(input?.studentName).slice(0, 120),
    studentId: collapseWhitespace(input?.studentId).slice(0, 40),
    semesterName: collapseWhitespace(input?.semesterName).slice(0, 120),
  }
}

export function sanitizePaymentInput(input = {}) {
  return {
    tuitionUid: String(input?.tuitionUid ?? '').trim(),
    studentUid: String(input?.studentUid ?? '').trim(),
    amountCents: toStoredCents(input, 'amountCents', 'amount'),
    paidAt: normalizeDateKey(input?.paidAt),
    method: normalizePaymentMethod(input?.method, 'Other'),
    reference: collapseWhitespace(input?.reference).slice(0, 40),
    note: collapseWhitespace(input?.note).slice(0, 240),
    studentName: collapseWhitespace(input?.studentName).slice(0, 120),
    studentId: collapseWhitespace(input?.studentId).slice(0, 40),
  }
}

export function getTuitionIdentity(record = {}) {
  return [record.studentUid, record.semesterUid]
    .map((value) => String(value ?? '').trim().toLowerCase())
    .join('::')
}

export function hasDuplicateTuition(records = [], input = {}, editingUid = null) {
  const identity = getTuitionIdentity(input)
  if (!identity.replace(/::/g, '')) return false

  return records.some(
    (record) => record.uid !== editingUid && getTuitionIdentity(record) === identity,
  )
}

export function validateTuitionRecord(input = {}, tuitions = [], context = {}, editingUid = null) {
  const values = sanitizeTuitionInput(input)
  const errors = {}
  const students = Array.isArray(context.students) ? context.students : []
  const semesters = Array.isArray(context.semesters) ? context.semesters : []
  const payments = Array.isArray(context.payments) ? context.payments : []
  const paidCents = editingUid
    ? payments
        .filter((payment) => payment.tuitionUid === editingUid)
        .reduce((sum, payment) => sum + Number(payment.amountCents || 0), 0)
    : 0

  if (!values.studentUid) {
    errors.studentUid = 'Select a student.'
  } else if (students.length && !hasUid(students, values.studentUid)) {
    errors.studentUid = 'Select a student from the current directory.'
  }

  if (values.semesterUid && semesters.length && !hasUid(semesters, values.semesterUid)) {
    errors.semesterUid = 'Select an available semester.'
  }

  if (values.amountAssessedCents === null) {
    errors.amountAssessed = 'Enter a valid assessed amount.'
  } else if (values.amountAssessedCents <= 0) {
    errors.amountAssessed = 'Assessed amount must be greater than zero.'
  } else if (editingUid && values.amountAssessedCents < paidCents) {
    errors.amountAssessed = `Assessed amount cannot be less than recorded payments (${formatMoney(
      paidCents,
    )}).`
  }

  if (!values.dueDate) {
    errors.dueDate = 'Enter a valid due date.'
  }

  if (hasDuplicateTuition(tuitions, values, editingUid)) {
    errors.form = 'A tuition record already exists for this student and semester.'
  }

  return errors
}

export function validatePaymentRecord(input = {}, payments = [], context = {}, editingUid = null) {
  const values = sanitizePaymentInput(input)
  const errors = {}
  const tuitions = Array.isArray(context.tuitions) ? context.tuitions : []
  const tuition = tuitions.find(
    (record) => String(record?.uid ?? '').trim() === values.tuitionUid && Boolean(values.tuitionUid),
  )
  const rawMethod = String(input?.method ?? '').trim()

  if (!values.tuitionUid) {
    errors.tuitionUid = 'Select a tuition record.'
  } else if (!tuition) {
    errors.tuitionUid = 'Select an available tuition record.'
  }

  if (input?.studentUid && tuition && String(input.studentUid).trim() !== tuition.studentUid) {
    errors.studentUid = 'Student must match the selected tuition record.'
  }

  if (values.amountCents === null) {
    errors.amount = 'Enter a valid payment amount.'
  } else if (values.amountCents <= 0) {
    errors.amount = 'Payment amount must be greater than zero.'
  }

  if (!values.paidAt) {
    errors.paidAt = 'Enter a valid payment date.'
  }

  if (rawMethod && !PAYMENT_METHODS.includes(rawMethod)) {
    errors.method = 'Select a valid payment method.'
  }

  if (tuition && values.amountCents !== null && values.amountCents > 0) {
    const assessedCents = Number(tuition.amountAssessedCents)
    if (!Number.isSafeInteger(assessedCents) || assessedCents <= 0) {
      errors.tuitionUid = 'The selected tuition amount is unavailable.'
    } else {
      const alreadyPaidCents = payments
        .filter(
          (payment) =>
            payment.tuitionUid === values.tuitionUid && payment.uid !== editingUid,
        )
        .reduce((sum, payment) => sum + Number(payment.amountCents || 0), 0)
      const remainingCents = Math.max(0, assessedCents - alreadyPaidCents)

      if (values.amountCents > remainingCents) {
        errors.amount = remainingCents
          ? `Payment cannot exceed the remaining balance (${formatMoney(remainingCents)}).`
          : 'This tuition record is already paid in full.'
      }
    }
  }

  return errors
}

export function normalizeStoredTuition(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null

  const values = sanitizeTuitionInput(raw)
  if (!values.studentUid || !values.dueDate) return null
  if (values.amountAssessedCents === null || values.amountAssessedCents <= 0) return null

  const now = new Date().toISOString()
  const rawUid = String(raw.uid ?? '').trim()
  const createdAt = normalizeTimestamp(raw.createdAt, now)
  const updatedAt = normalizeTimestamp(raw.updatedAt, now)
  const corrected =
    !rawUid ||
    values.reference !== String(raw.reference ?? '') ||
    values.note !== String(raw.note ?? '') ||
    createdAt !== raw.createdAt ||
    updatedAt !== raw.updatedAt

  return {
    tuition: {
      uid: rawUid || createPaymentEntityUid('tuition'),
      ...values,
      createdAt,
      updatedAt,
    },
    corrected,
  }
}

export function normalizeStoredTuitions(rawRecords = []) {
  const input = Array.isArray(rawRecords) ? rawRecords : []
  const parsedEntries = []
  const usedIdentities = new Set()
  let discarded = 0
  let corrected = 0
  let duplicateUids = 0
  let duplicateIdentity = 0

  input.forEach((raw, index) => {
    let parsed
    try {
      parsed = normalizeStoredTuition(raw)
    } catch {
      parsed = null
    }

    if (!parsed) {
      discarded += 1
      return
    }

    const identity = getTuitionIdentity(parsed.tuition)
    if (usedIdentities.has(identity)) {
      duplicateIdentity += 1
      discarded += 1
      return
    }

    usedIdentities.add(identity)
    parsedEntries.push({ ...parsed, index })
  })

  const usedUids = new Set()
  parsedEntries.forEach((entry) => {
    const uid = entry.tuition.uid
    entry.uidValid = Boolean(uid) && !usedUids.has(uid)
    if (entry.uidValid) usedUids.add(uid)
    else if (uid) duplicateUids += 1
  })

  const records = parsedEntries.map((entry) => {
    let recordCorrected = entry.corrected

    if (!entry.uidValid) {
      let uid = `tuition_recovered_${entry.index + 1}`
      let suffix = 2
      while (usedUids.has(uid)) {
        uid = `tuition_recovered_${entry.index + 1}_${suffix}`
        suffix += 1
      }
      entry.tuition.uid = uid
      usedUids.add(uid)
      recordCorrected = true
    }

    if (recordCorrected) corrected += 1
    return entry.tuition
  })

  return {
    records,
    discarded,
    corrected,
    duplicateUids,
    duplicateIdentity,
  }
}

export function normalizeStoredPayment(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null

  const values = sanitizePaymentInput(raw)
  if (!values.tuitionUid || !values.paidAt) return null
  if (values.amountCents === null || values.amountCents <= 0) return null

  const now = new Date().toISOString()
  const rawUid = String(raw.uid ?? '').trim()
  const expectedMethod = normalizePaymentMethod(raw.method, 'Other')
  const createdAt = normalizeTimestamp(raw.createdAt, now)
  const updatedAt = normalizeTimestamp(raw.updatedAt, now)
  const corrected =
    !rawUid ||
    values.method !== expectedMethod ||
    values.reference !== String(raw.reference ?? '') ||
    values.note !== String(raw.note ?? '') ||
    createdAt !== raw.createdAt ||
    updatedAt !== raw.updatedAt

  return {
    payment: {
      uid: rawUid || createPaymentEntityUid('payment'),
      ...values,
      createdAt,
      updatedAt,
    },
    corrected,
  }
}

export function normalizeStoredPayments(rawRecords = [], tuitionUids = []) {
  const input = Array.isArray(rawRecords) ? rawRecords : []
  const validTuitionUids = new Set(tuitionUids)
  const parsedEntries = []
  let discarded = 0
  let corrected = 0
  let duplicateUids = 0
  let orphaned = 0

  input.forEach((raw, index) => {
    let parsed
    try {
      parsed = normalizeStoredPayment(raw)
    } catch {
      parsed = null
    }

    if (!parsed) {
      discarded += 1
      return
    }

    if (!validTuitionUids.has(parsed.payment.tuitionUid)) {
      orphaned += 1
      discarded += 1
      return
    }

    parsedEntries.push({ ...parsed, index })
  })

  const usedUids = new Set()
  parsedEntries.forEach((entry) => {
    const uid = entry.payment.uid
    entry.uidValid = Boolean(uid) && !usedUids.has(uid)
    if (entry.uidValid) usedUids.add(uid)
    else if (uid) duplicateUids += 1
  })

  const records = parsedEntries.map((entry) => {
    let recordCorrected = entry.corrected

    if (!entry.uidValid) {
      let uid = `payment_recovered_${entry.index + 1}`
      let suffix = 2
      while (usedUids.has(uid)) {
        uid = `payment_recovered_${entry.index + 1}_${suffix}`
        suffix += 1
      }
      entry.payment.uid = uid
      usedUids.add(uid)
      recordCorrected = true
    }

    if (recordCorrected) corrected += 1
    return entry.payment
  })

  return {
    records,
    discarded,
    corrected,
    duplicateUids,
    orphaned,
  }
}

export function buildTuitionRows(
  tuitions = [],
  payments = [],
  students = [],
  semesters = [],
  today = todayDateKey(),
) {
  const studentByUid = new Map(students.map((student) => [student.uid, student]))
  const semesterByUid = new Map(semesters.map((semester) => [semester.uid, semester]))
  const paymentsByTuition = new Map()

  payments.forEach((payment) => {
    const key = String(payment?.tuitionUid ?? '').trim()
    if (!key) return
    const list = paymentsByTuition.get(key) ?? []
    list.push(payment)
    paymentsByTuition.set(key, list)
  })

  return tuitions.map((tuition) => {
    const student = studentByUid.get(tuition.studentUid)
    const semester = semesterByUid.get(tuition.semesterUid)
    const linkedPayments = paymentsByTuition.get(tuition.uid) ?? []
    const paidCents = linkedPayments.reduce(
      (sum, payment) => sum + Number(payment.amountCents || 0),
      0,
    )
    const assessedCents = Number(tuition.amountAssessedCents)
    const amountAvailable = Number.isSafeInteger(assessedCents) && assessedCents > 0
    const balanceCents = amountAvailable ? Math.max(0, assessedCents - paidCents) : null
    const semesterName = semester
      ? semester.academicYear
        ? `${semester.name} · ${semester.academicYear}`
        : semester.name
      : tuition.semesterName || 'No semester recorded'
    const latestPaymentAt = linkedPayments.reduce(
      (latest, payment) => (String(payment.paidAt ?? '') > latest ? payment.paidAt : latest),
      '',
    )

    return {
      ...tuition,
      studentName: student?.fullName || tuition.studentName || 'Unavailable student',
      studentId: student?.studentId || tuition.studentId || '—',
      studentMissing: !student,
      semesterName,
      semesterMissing: !semester && !tuition.semesterName,
      amountAssessedCents: amountAvailable ? assessedCents : null,
      paidCents,
      balanceCents,
      status: amountAvailable
        ? derivePaymentStatus(
            { amountAssessedCents: assessedCents, paidCents, dueDate: tuition.dueDate },
            today,
          )
        : 'unavailable',
      paymentCount: linkedPayments.length,
      latestPaymentAt,
    }
  })
}

export function buildPaymentRows(payments = [], tuitions = [], students = []) {
  const tuitionByUid = new Map(tuitions.map((tuition) => [tuition.uid, tuition]))
  const studentByUid = new Map(students.map((student) => [student.uid, student]))

  return payments.map((payment) => {
    const tuition = tuitionByUid.get(payment.tuitionUid)
    const studentUid = tuition?.studentUid || payment.studentUid
    const student = studentByUid.get(studentUid)
    const semesterName = tuition?.semesterName || 'No semester recorded'

    return {
      ...payment,
      tuitionMissing: !tuition,
      tuitionReference: tuition?.reference || '—',
      studentUid,
      studentName: student?.fullName || payment.studentName || 'Unavailable student',
      studentId: student?.studentId || payment.studentId || '—',
      semesterName,
    }
  })
}

export function summarizeTuition(rows = []) {
  const list = Array.isArray(rows) ? rows : []
  const available = list.filter((row) => row.balanceCents !== null)
  const counts = {
    paid: 0,
    overdue: 0,
    partial: 0,
    unpaid: 0,
    unavailable: list.length - available.length,
  }

  available.forEach((row) => {
    if (Object.prototype.hasOwnProperty.call(counts, row.status)) counts[row.status] += 1
  })

  return {
    recordCount: list.length,
    availableCount: available.length,
    unavailableCount: counts.unavailable,
    assessedCents: available.reduce((sum, row) => sum + Number(row.amountAssessedCents || 0), 0),
    paidCents: available.reduce((sum, row) => sum + Number(row.paidCents || 0), 0),
    balanceCents: available.reduce((sum, row) => sum + Number(row.balanceCents || 0), 0),
    overdueCents: available.reduce(
      (sum, row) => sum + (row.status === 'overdue' ? Number(row.balanceCents || 0) : 0),
      0,
    ),
    counts,
  }
}

export function filterTuitionRows(rows = [], filters = {}) {
  const term = String(filters.search ?? '')
    .trim()
    .toLowerCase()
  const status = String(filters.status ?? '').trim()
  const semesterUid = String(filters.semesterUid ?? '').trim()

  return rows.filter((row) => {
    if (status && row.status !== status) return false
    if (semesterUid && row.semesterUid !== semesterUid) return false
    if (!term) return true

    return [
      row.studentName,
      row.studentId,
      row.reference,
      row.semesterName,
      row.dueDate,
      tuitionStatusLabel(row.status),
    ].some((value) => String(value ?? '').toLowerCase().includes(term))
  })
}

export function filterPaymentRows(rows = [], filters = {}) {
  const term = String(filters.search ?? '')
    .trim()
    .toLowerCase()
  const method = String(filters.method ?? '').trim()
  const tuitionUid = String(filters.tuitionUid ?? '').trim()

  return rows.filter((row) => {
    if (method && row.method !== method) return false
    if (tuitionUid && row.tuitionUid !== tuitionUid) return false
    if (!term) return true

    return [
      row.studentName,
      row.studentId,
      row.tuitionReference,
      row.semesterName,
      row.paidAt,
      row.method,
      row.reference,
    ].some((value) => String(value ?? '').toLowerCase().includes(term))
  })
}

const NUMERIC_SORT_KEYS = new Set([
  'amountAssessedCents',
  'amountCents',
  'paidCents',
  'balanceCents',
])
const DATE_SORT_KEYS = new Set(['dueDate', 'paidAt', 'createdAt', 'updatedAt'])

export function sortRecords(rows = [], sortKey = 'studentName', sortDir = 'asc') {
  const direction = sortDir === 'desc' ? -1 : 1
  const key = String(sortKey ?? 'studentName')

  return [...rows].sort((left, right) => {
    if (NUMERIC_SORT_KEYS.has(key)) {
      return (Number(left[key] ?? 0) - Number(right[key] ?? 0)) * direction
    }

    if (DATE_SORT_KEYS.has(key)) {
      return String(left[key] ?? '').localeCompare(String(right[key] ?? '')) * direction
    }

    return (
      String(left[key] ?? '').localeCompare(String(right[key] ?? ''), 'en', {
        sensitivity: 'base',
        numeric: true,
      }) * direction
    )
  })
}

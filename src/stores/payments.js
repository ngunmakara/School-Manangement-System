import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import {
  buildTuitionRows,
  createUniquePaymentEntityUid,
  normalizeStoredPayments,
  normalizeStoredTuitions,
  sanitizePaymentInput,
  sanitizeTuitionInput,
  validatePaymentRecord,
  validateTuitionRecord,
} from '../utils/payments'

const TUITION_STORAGE_KEY = 'campushub:tuition:v1'
const PAYMENT_STORAGE_KEY = 'campushub:payments:v1'
const LOAD_ERROR = 'Tuition and payment records could not be loaded from browser storage.'
const STORAGE_UNAVAILABLE =
  'Browser storage could not be accessed. Changes will last for this session only.'
const STORAGE_WRITE_FAILED =
  'Browser storage is not accepting tuition and payment saves. Changes will last for this session only.'

function getStorage() {
  try {
    if (typeof window === 'undefined') return null
    return window.localStorage || null
  } catch {
    return null
  }
}

function parseArray(raw, kind) {
  if (raw === null) return { records: null, recovery: null, storageState: 'ok' }

  let parsed
  try {
    parsed = JSON.parse(raw)
  } catch {
    return {
      records: null,
      recovery: { kind: 'invalid-json' },
      storageState: 'recovered',
    }
  }

  if (!Array.isArray(parsed)) {
    return {
      records: null,
      recovery: { kind: 'invalid-format' },
      storageState: 'recovered',
    }
  }

  return { records: parsed, recovery: null, storageState: 'ok', kind }
}

function readStoredTuitionData() {
  const storage = getStorage()
  if (!storage) {
    return {
      tuitions: null,
      payments: null,
      storageState: 'unavailable',
      tuitionRecovery: null,
      paymentRecovery: null,
      storageError: STORAGE_UNAVAILABLE,
    }
  }

  let tuitionRaw
  let paymentRaw
  try {
    tuitionRaw = storage.getItem(TUITION_STORAGE_KEY)
    paymentRaw = storage.getItem(PAYMENT_STORAGE_KEY)
  } catch {
    return {
      tuitions: null,
      payments: null,
      storageState: 'unavailable',
      tuitionRecovery: null,
      paymentRecovery: null,
      storageError: STORAGE_UNAVAILABLE,
    }
  }

  const tuitionParsed = parseArray(tuitionRaw, 'tuition')
  const tuitionNormalized =
    tuitionParsed.records === null ? null : normalizeStoredTuitions(tuitionParsed.records)
  const tuitionUids = (tuitionNormalized?.records ?? []).map((record) => record.uid)
  const paymentParsed = parseArray(paymentRaw, 'payment')
  const paymentNormalized =
    paymentParsed.records === null
      ? null
      : normalizeStoredPayments(paymentParsed.records, tuitionUids)

  const tuitionRecovery =
    tuitionParsed.recovery ??
    (tuitionNormalized &&
    (tuitionNormalized.discarded > 0 ||
      tuitionNormalized.corrected > 0 ||
      tuitionNormalized.duplicateUids > 0 ||
      tuitionNormalized.duplicateIdentity > 0)
      ? { kind: 'records', ...tuitionNormalized }
      : null)
  const paymentRecovery =
    paymentParsed.recovery ??
    (paymentNormalized &&
    (paymentNormalized.discarded > 0 ||
      paymentNormalized.corrected > 0 ||
      paymentNormalized.duplicateUids > 0 ||
      paymentNormalized.orphaned > 0)
      ? { kind: 'records', ...paymentNormalized }
      : null)

  const recovered = Boolean(tuitionRecovery || paymentRecovery)

  return {
    tuitions: tuitionNormalized?.records ?? [],
    payments: paymentNormalized?.records ?? [],
    storageState: recovered ? 'recovered' : 'ok',
    tuitionRecovery,
    paymentRecovery,
    storageError: '',
  }
}

export const usePaymentsStore = defineStore('payments', () => {
  const initial = readStoredTuitionData()
  const tuitions = ref(initial.tuitions ?? [])
  const payments = ref(initial.payments ?? [])
  const source = ref('local')
  const storageState = ref(initial.storageState)
  const tuitionRecovery = ref(initial.tuitionRecovery)
  const paymentRecovery = ref(initial.paymentRecovery)
  const persistenceState = ref(initial.storageState === 'unavailable' ? 'unavailable' : 'ok')
  const persistenceError = ref(initial.storageError || '')
  const loadState = ref('ready')
  const loadError = ref('')
  let hasUnpersistedTuitions = false
  let hasUnpersistedPayments = false

  function setPersistenceFailure() {
    storageState.value = 'unavailable'
    persistenceState.value = 'unavailable'
    persistenceError.value = STORAGE_UNAVAILABLE
    hasUnpersistedTuitions = true
    hasUnpersistedPayments = true
  }

  function persist(key, records, markPending) {
    const storage = getStorage()
    if (!storage) {
      setPersistenceFailure()
      return false
    }

    try {
      storage.setItem(key, JSON.stringify(records.value))
      persistenceState.value = 'ok'
      persistenceError.value = ''
      markPending(false)
      return true
    } catch {
      persistenceState.value = 'failed'
      persistenceError.value = STORAGE_WRITE_FAILED
      markPending(true)
      return false
    }
  }

  function persistTuitions() {
    return persist(
      TUITION_STORAGE_KEY,
      tuitions,
      (pending) => {
        hasUnpersistedTuitions = pending
      },
    )
  }

  function persistPayments() {
    return persist(
      PAYMENT_STORAGE_KEY,
      payments,
      (pending) => {
        hasUnpersistedPayments = pending
      },
    )
  }

  function persistAll() {
    const tuitionSaved = persistTuitions()
    const paymentSaved = persistPayments()
    return tuitionSaved && paymentSaved
  }

  const totalTuitions = computed(() => tuitions.value.length)
  const totalPayments = computed(() => payments.value.length)

  function loadTuitionData() {
    loadState.value = 'loading'
    loadError.value = ''

    try {
      const next = readStoredTuitionData()
      const preserveSessionChanges = hasUnpersistedTuitions || hasUnpersistedPayments

      if (!preserveSessionChanges) {
        if (next.storageState !== 'unavailable') {
          tuitions.value = next.tuitions ?? []
          payments.value = next.payments ?? []
        }
        tuitionRecovery.value = next.tuitionRecovery
        paymentRecovery.value = next.paymentRecovery
      }

      if (next.storageState === 'unavailable') {
        persistenceState.value = 'unavailable'
        persistenceError.value = next.storageError || STORAGE_UNAVAILABLE
      } else if (persistenceState.value === 'unavailable') {
        persistenceState.value = 'ok'
        persistenceError.value = ''
      }

      storageState.value = next.storageState
      loadState.value = 'ready'

      if (preserveSessionChanges) {
        if (next.storageState !== 'unavailable') persistAll()
      } else if (next.storageState === 'recovered') {
        persistAll()
      }

      return true
    } catch {
      loadState.value = 'error'
      loadError.value = LOAD_ERROR
      return false
    }
  }

  function retryPersist() {
    const persisted = persistAll()
    return {
      ok: persisted,
      persisted,
      state: persistenceState.value,
      error: persistenceError.value,
    }
  }

  function addTuition(input, context = {}) {
    const errors = validateTuitionRecord(input, tuitions.value, {
      ...context,
      payments: payments.value,
    })
    if (Object.keys(errors).length) return { ok: false, errors }

    const values = sanitizeTuitionInput(input)
    const now = new Date().toISOString()
    const tuition = {
      uid: createUniquePaymentEntityUid(
        new Set(tuitions.value.map((record) => record.uid)),
        'tuition',
      ),
      ...values,
      createdAt: now,
      updatedAt: now,
    }

    tuitions.value = [tuition, ...tuitions.value]
    const persisted = persistTuitions()
    return { ok: true, tuition, persisted }
  }

  function updateTuition(uid, input, context = {}) {
    const existing = tuitions.value.find((record) => record.uid === uid)
    if (!existing) {
      return { ok: false, errors: { form: 'This tuition record no longer exists.' } }
    }

    const values = sanitizeTuitionInput(input)
    const hasLinkedPayments = payments.value.some((payment) => payment.tuitionUid === uid)
    if (hasLinkedPayments && values.studentUid !== existing.studentUid) {
      return {
        ok: false,
        errors: { studentUid: 'Student cannot change while linked payments exist.' },
      }
    }

    const errors = validateTuitionRecord(input, tuitions.value, {
      ...context,
      payments: payments.value,
    }, uid)
    if (Object.keys(errors).length) return { ok: false, errors }

    const tuition = {
      ...existing,
      ...values,
      uid: existing.uid,
      createdAt: existing.createdAt,
      updatedAt: new Date().toISOString(),
    }

    tuitions.value = tuitions.value.map((record) => (record.uid === uid ? tuition : record))
    const persisted = persistTuitions()
    return { ok: true, tuition, persisted }
  }

  function deleteTuition(uid) {
    const existing = tuitions.value.find((record) => record.uid === uid)
    if (!existing) {
      return { ok: false, errors: { form: 'This tuition record no longer exists.' } }
    }

    const linkedPaymentCount = payments.value.filter((payment) => payment.tuitionUid === uid).length
    if (linkedPaymentCount) {
      return {
        ok: false,
        errors: {
          form: `Remove ${linkedPaymentCount} linked payment${
            linkedPaymentCount === 1 ? '' : 's'
          } before deleting this tuition record.`,
        },
      }
    }

    tuitions.value = tuitions.value.filter((record) => record.uid !== uid)
    const persisted = persistTuitions()
    return { ok: true, tuition: existing, persisted }
  }

  function addPayment(input, context = {}) {
    const errors = validatePaymentRecord(input, payments.value, {
      ...context,
      tuitions: tuitions.value,
    })
    if (Object.keys(errors).length) return { ok: false, errors }

    const values = sanitizePaymentInput(input)
    const tuition = tuitions.value.find((record) => record.uid === values.tuitionUid)
    if (!tuition) {
      return { ok: false, errors: { tuitionUid: 'Select an available tuition record.' } }
    }

    const now = new Date().toISOString()
    const payment = {
      uid: createUniquePaymentEntityUid(
        new Set(payments.value.map((record) => record.uid)),
        'payment',
      ),
      ...values,
      tuitionUid: tuition.uid,
      studentUid: tuition.studentUid,
      studentName: tuition.studentName,
      studentId: tuition.studentId,
      createdAt: now,
      updatedAt: now,
    }

    payments.value = [payment, ...payments.value]
    const persisted = persistPayments()
    return { ok: true, payment, persisted }
  }

  function updatePayment(uid, input, context = {}) {
    const existing = payments.value.find((record) => record.uid === uid)
    if (!existing) {
      return { ok: false, errors: { form: 'This payment record no longer exists.' } }
    }

    const errors = validatePaymentRecord(input, payments.value, {
      ...context,
      tuitions: tuitions.value,
    }, uid)
    if (Object.keys(errors).length) return { ok: false, errors }

    const values = sanitizePaymentInput(input)
    const tuition = tuitions.value.find((record) => record.uid === values.tuitionUid)
    if (!tuition) {
      return { ok: false, errors: { tuitionUid: 'Select an available tuition record.' } }
    }

    const payment = {
      ...existing,
      ...values,
      uid: existing.uid,
      tuitionUid: tuition.uid,
      studentUid: tuition.studentUid,
      studentName: tuition.studentName,
      studentId: tuition.studentId,
      createdAt: existing.createdAt,
      updatedAt: new Date().toISOString(),
    }

    payments.value = payments.value.map((record) => (record.uid === uid ? payment : record))
    const persisted = persistPayments()
    return { ok: true, payment, persisted }
  }

  function deletePayment(uid) {
    const existing = payments.value.find((record) => record.uid === uid)
    if (!existing) {
      return { ok: false, errors: { form: 'This payment record no longer exists.' } }
    }

    payments.value = payments.value.filter((record) => record.uid !== uid)
    const persisted = persistPayments()
    return { ok: true, payment: existing, persisted }
  }

  function paymentsFor(tuitionUid) {
    const target = String(tuitionUid ?? '').trim()
    if (!target) return []
    return payments.value.filter((payment) => payment.tuitionUid === target)
  }

  function rowsFor(students = [], semesters = [], today) {
    return buildTuitionRows(tuitions.value, payments.value, students, semesters, today)
  }

  return {
    tuitions,
    payments,
    source,
    storageState,
    tuitionRecovery,
    paymentRecovery,
    persistenceState,
    persistenceError,
    loadState,
    loadError,
    totalTuitions,
    totalPayments,
    loadTuitionData,
    retryPersist,
    addTuition,
    updateTuition,
    deleteTuition,
    addPayment,
    updatePayment,
    deletePayment,
    paymentsFor,
    rowsFor,
  }
})

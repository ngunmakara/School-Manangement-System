import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import TuitionFormModal from '../../src/components/payments/TuitionFormModal.vue'
import PaymentFormModal from '../../src/components/payments/PaymentFormModal.vue'
import { usePaymentsStore } from '../../src/stores/payments'

const students = [{ uid: 'student_1', studentId: 'S1001', fullName: 'Ada Lovelace' }]

function dateOffset(days) {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')}`
}

beforeEach(() => {
  window.localStorage.clear()
  setActivePinia(createPinia())
})

afterEach(() => {
  vi.restoreAllMocks()
  document.body.innerHTML = ''
  document.body.classList.remove('ch-modal-open')
  window.localStorage.clear()
})

describe('TuitionFormModal', () => {
  it('saves a validated tuition record', async () => {
    const wrapper = mount(TuitionFormModal, {
      props: { modelValue: true, students },
      attachTo: document.body,
      global: { stubs: { teleport: true } },
    })
    const store = usePaymentsStore()

    await wrapper.get('#tuition-field-student').setValue('student_1')
    await wrapper.get('#tuition-field-amount').setValue('1250.50')
    await wrapper.get('#tuition-field-due-date').setValue(dateOffset(30))
    await wrapper.get('#tuition-form').trigger('submit')
    await flushPromises()

    expect(store.totalTuitions).toBe(1)
    expect(store.tuitions[0].amountAssessedCents).toBe(125050)
    expect(wrapper.emitted('saved')).toHaveLength(1)
    expect(wrapper.emitted('update:modelValue')).toEqual([[false]])

    wrapper.unmount()
  })
})

describe('PaymentFormModal', () => {
  it('prevents overpayment and saves a valid payment', async () => {
    const store = usePaymentsStore()
    const added = store.addTuition({
      studentUid: 'student_1',
      amountAssessedCents: 50000,
      dueDate: dateOffset(30),
      studentName: 'Ada Lovelace',
      studentId: 'S1001',
    })
    expect(added.ok).toBe(true)
    const tuitionRows = store.rowsFor(students, [], dateOffset(0))

    const wrapper = mount(PaymentFormModal, {
      props: { modelValue: true, tuitionRows },
      attachTo: document.body,
      global: { stubs: { teleport: true } },
    })

    await wrapper.get('#payment-field-tuition').setValue(added.tuition.uid)
    await wrapper.get('#payment-field-amount').setValue('900.00')
    await wrapper.get('#payment-form').trigger('submit')
    await flushPromises()

    expect(store.totalPayments).toBe(0)
    expect(wrapper.text()).toContain('remaining balance')

    await wrapper.get('#payment-field-amount').setValue('250.00')
    await wrapper.get('#payment-form').trigger('submit')
    await flushPromises()

    expect(store.totalPayments).toBe(1)
    expect(store.payments[0].amountCents).toBe(25000)
    expect(wrapper.emitted('saved')).toHaveLength(1)

    wrapper.unmount()
  })
})

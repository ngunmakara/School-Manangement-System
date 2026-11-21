import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import EnrollmentFormModal from '../../src/components/enrollments/EnrollmentFormModal.vue'
import { useEnrollmentsStore } from '../../src/stores/enrollments'

const students = [
  { uid: 'student_1', label: 'Ada Lovelace · S1001' },
  { uid: 'student_2', label: 'Grace Hopper · S1002' },
]
const sections = [
  {
    uid: 'section_1',
    label: 'CS101-A · DBMS · Fall 2026',
    capacity: 30,
    seatsUsed: 1,
    full: false,
  },
  {
    uid: 'section_2',
    label: 'CS102-A · Networks · Fall 2026',
    capacity: 2,
    seatsUsed: 2,
    full: true,
  },
]

let pinia

beforeEach(() => {
  window.localStorage.clear()
  pinia = createPinia()
  setActivePinia(pinia)
})

afterEach(() => {
  vi.restoreAllMocks()
  document.body.innerHTML = ''
  document.body.classList.remove('ch-modal-open')
  window.localStorage.clear()
})

async function openForm(props = {}) {
  const wrapper = mount(EnrollmentFormModal, {
    attachTo: document.body,
    props: {
      modelValue: false,
      students,
      sections,
      ...props,
    },
    global: {
      plugins: [pinia],
      stubs: { teleport: true },
    },
  })

  await wrapper.setProps({ modelValue: true })
  await flushPromises()

  return wrapper
}

async function fillValidForm(wrapper) {
  await wrapper.get('#enrollment-field-student').setValue('student_1')
  await wrapper.get('#enrollment-field-section').setValue('section_1')
  await wrapper.get('#enrollment-field-status').setValue('enrolled')
}

describe('EnrollmentFormModal', () => {
  it('validates required student and section selections', async () => {
    const wrapper = await openForm()

    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(wrapper.text()).toContain('Select a student.')
    expect(wrapper.text()).toContain('Select a class section.')
    expect(wrapper.emitted('saved')).toBeUndefined()

    wrapper.unmount()
  })

  it('saves a valid enrollment and emits the saved record', async () => {
    const wrapper = await openForm()

    await fillValidForm(wrapper)
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(wrapper.emitted('saved')).toHaveLength(1)
    expect(wrapper.emitted('saved')[0][0]).toMatchObject({
      mode: 'add',
      enrollment: {
        studentUid: 'student_1',
        sectionUid: 'section_1',
        status: 'enrolled',
      },
    })

    wrapper.unmount()
  })

  it('shows the API student directory limitation notice', async () => {
    const wrapper = await openForm({
      studentDirectoryNotice: 'Student choices are limited to the currently loaded API page.',
    })

    expect(wrapper.text()).toContain(
      'Student choices are limited to the currently loaded API page.',
    )

    wrapper.unmount()
  })

  it('keeps the form open when the selected section is full', async () => {
    const wrapper = await openForm()
    const store = useEnrollmentsStore()

    vi.spyOn(store, 'addEnrollment').mockReturnValue({
      ok: false,
      errors: { sectionUid: 'This section is full (2/2 local enrollments).' },
    })

    await fillValidForm(wrapper)
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(wrapper.text()).toContain('This section is full (2/2 local enrollments).')
    expect(wrapper.emitted('saved')).toBeUndefined()
    expect(wrapper.get('#enrollment-field-student').element.value).toBe('student_1')

    wrapper.unmount()
  })
})

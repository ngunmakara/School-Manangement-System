import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import CourseFormModal from '../../src/components/courses/CourseFormModal.vue'
import { useCoursesStore } from '../../src/stores/courses'

let pinia

beforeEach(() => {
  window.localStorage.clear()
  pinia = createPinia()
  setActivePinia(pinia)
})

afterEach(() => {
  document.body.innerHTML = ''
  document.body.classList.remove('ch-modal-open')
  window.localStorage.clear()
})

async function openForm(course = null) {
  const wrapper = mount(CourseFormModal, {
    attachTo: document.body,
    props: { modelValue: false, course },
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
  await wrapper.get('#course-field-code').setValue('cs101')
  await wrapper.get('#course-field-title').setValue('Introduction to Computer Science')
  await wrapper.get('#course-field-department').setValue('Computer Science')
  await wrapper.get('#course-field-credits').setValue('3')
}

describe('CourseFormModal', () => {
  it('validates required course fields before saving', async () => {
    const wrapper = await openForm()

    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(wrapper.text()).toContain('Course code is required.')
    expect(wrapper.text()).toContain('Course title is required.')
    expect(wrapper.text()).toContain('Department is required.')
    expect(wrapper.emitted('saved')).toBeUndefined()
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()

    wrapper.unmount()
  })

  it('shows a form error when saving fails unexpectedly and keeps the input', async () => {
    const wrapper = await openForm()
    const store = useCoursesStore()

    vi.spyOn(store, 'addCourse').mockImplementation(() => {
      throw new Error('Unexpected failure')
    })

    await fillValidForm(wrapper)
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(wrapper.text()).toContain('The course could not be saved. Please try again.')
    expect(wrapper.get('#course-field-code').element.value).toBe('cs101')
    expect(wrapper.get('#course-field-title').element.value).toBe(
      'Introduction to Computer Science',
    )
    expect(wrapper.emitted('saved')).toBeUndefined()
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()

    wrapper.unmount()
  })

  it('clears the previous save error when a retry succeeds', async () => {
    const wrapper = await openForm()
    const store = useCoursesStore()

    vi.spyOn(store, 'addCourse')
      .mockImplementationOnce(() => {
        throw new Error('Unexpected failure')
      })
      .mockImplementationOnce(() => ({
        ok: true,
        course: {
          uid: 'course_1',
          code: 'CS101',
          title: 'Introduction to Computer Science',
        },
        persisted: true,
      }))

    await fillValidForm(wrapper)
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(wrapper.text()).toContain('The course could not be saved. Please try again.')

    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(wrapper.text()).not.toContain('The course could not be saved. Please try again.')
    expect(wrapper.emitted('saved')).toHaveLength(1)

    wrapper.unmount()
  })

  it('shows unmapped store errors without closing the form', async () => {
    const wrapper = await openForm()
    const store = useCoursesStore()

    vi.spyOn(store, 'addCourse').mockReturnValue({
      ok: false,
      errors: { unknownField: 'The catalog rejected this course.' },
    })

    await fillValidForm(wrapper)
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(wrapper.text()).toContain('The catalog rejected this course.')
    expect(wrapper.emitted('saved')).toBeUndefined()
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()

    wrapper.unmount()
  })

  it('keeps the form open and preserves input when a save is not persisted', async () => {
    const wrapper = await openForm()
    const store = useCoursesStore()

    store.persistenceError =
      'Browser storage is not accepting course saves. Changes will last for this session only.'
    vi.spyOn(store, 'addCourse').mockReturnValue({
      ok: true,
      course: {
        uid: 'course_1',
        code: 'CS101',
        title: 'Introduction to Computer Science',
      },
      persisted: false,
    })

    await fillValidForm(wrapper)
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(wrapper.text()).toContain(
      'Browser storage is not accepting course saves. Changes will last for this session only.',
    )
    expect(wrapper.get('#course-field-code').element.value).toBe('cs101')
    expect(wrapper.get('#course-field-title').element.value).toBe(
      'Introduction to Computer Science',
    )
    expect(wrapper.emitted('saved')).toBeUndefined()

    const closeEvents = wrapper.emitted('update:modelValue') || []
    expect(closeEvents.some((event) => event[0] === false)).toBe(false)

    wrapper.unmount()
  })

  it('allows retrying after a non-persisted save once persistence succeeds', async () => {
    const wrapper = await openForm()
    const store = useCoursesStore()

    store.persistenceError =
      'Browser storage is not accepting course saves. Changes will last for this session only.'
    vi.spyOn(store, 'addCourse')
      .mockReturnValueOnce({
        ok: true,
        course: { uid: 'course_1', code: 'CS101', title: 'Introduction to Computer Science' },
        persisted: false,
      })
      .mockReturnValueOnce({
        ok: true,
        course: { uid: 'course_1', code: 'CS101', title: 'Introduction to Computer Science' },
        persisted: true,
      })

    await fillValidForm(wrapper)
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(wrapper.text()).toContain('Browser storage is not accepting course saves.')

    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(wrapper.text()).not.toContain('Browser storage is not accepting course saves.')
    expect(wrapper.emitted('saved')).toHaveLength(1)
    expect(wrapper.emitted('saved')[0][0]).toMatchObject({ persisted: true })

    wrapper.unmount()
  })

  it('shows an empty credits field for recovered invalid credits and requires correction', async () => {
    const store = useCoursesStore()
    store.courses = [
      {
        uid: 'course_1',
        code: 'CS101',
        title: 'Introduction to Computer Science',
        department: 'Computer Science',
        credits: null,
        status: 'Active',
        description: '',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ]

    const wrapper = await openForm(store.courses[0])

    expect(wrapper.get('#course-field-credits').element.value).toBe('')

    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(wrapper.text()).toContain('Enter a whole number of credits between 1 and 12.')
    expect(wrapper.emitted('saved')).toBeUndefined()

    wrapper.unmount()
  })
})

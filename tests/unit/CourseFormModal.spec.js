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

  it('retries persistence without repeating the add mutation', async () => {
    const wrapper = await openForm()
    const store = useCoursesStore()
    const course = { uid: 'course_1', code: 'CS101', title: 'Introduction to Computer Science' }

    store.persistenceError =
      'Browser storage is not accepting course saves. Changes will last for this session only.'
    const addCourse = vi.spyOn(store, 'addCourse').mockReturnValue({
      ok: true,
      course,
      persisted: false,
    })
    const retryPersist = vi.spyOn(store, 'retryPersist').mockReturnValue({
      ok: true,
      persisted: true,
      state: 'ok',
      error: '',
    })

    await fillValidForm(wrapper)
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(addCourse).toHaveBeenCalledTimes(1)
    expect(wrapper.text()).toContain('Browser storage is not accepting course saves.')

    const alert = wrapper.get('.form-alert')
    expect(alert.attributes('role')).toBe('alert')
    expect(alert.attributes('tabindex')).toBe('-1')
    expect(document.activeElement).toBe(alert.element)

    await alert.get('button').trigger('click')
    await flushPromises()

    expect(retryPersist).toHaveBeenCalledTimes(1)
    expect(addCourse).toHaveBeenCalledTimes(1)
    expect(wrapper.emitted('saved')).toHaveLength(1)
    expect(wrapper.emitted('saved')[0][0]).toMatchObject({
      mode: 'add',
      course,
      persisted: true,
    })

    wrapper.unmount()
  })

  it('keeps the form open when a persistence retry still fails', async () => {
    const wrapper = await openForm()
    const store = useCoursesStore()

    store.persistenceError =
      'Browser storage is not accepting course saves. Changes will last for this session only.'
    vi.spyOn(store, 'addCourse').mockReturnValue({
      ok: true,
      course: { uid: 'course_1', code: 'CS101', title: 'Introduction to Computer Science' },
      persisted: false,
    })
    const retryPersist = vi.spyOn(store, 'retryPersist').mockReturnValue({
      ok: false,
      persisted: false,
      state: 'failed',
      error: 'Storage is still blocked.',
    })

    await fillValidForm(wrapper)
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    await wrapper.get('.form-alert button').trigger('click')
    await flushPromises()

    expect(retryPersist).toHaveBeenCalledTimes(1)
    expect(wrapper.text()).toContain('Browser storage is not accepting course saves.')
    expect(wrapper.get('#course-field-code').element.value).toBe('cs101')
    expect(wrapper.get('#course-field-title').element.value).toBe(
      'Introduction to Computer Science',
    )
    expect(wrapper.emitted('saved')).toBeUndefined()

    wrapper.unmount()
  })

  it('keeps the retry action available and ignores edits after a failed save', async () => {
    const wrapper = await openForm()
    const store = useCoursesStore()
    const course = { uid: 'course_1', code: 'CS101', title: 'Introduction to Computer Science' }

    store.persistenceError = 'Browser storage is not accepting course saves.'
    const addCourse = vi.spyOn(store, 'addCourse').mockReturnValue({
      ok: true,
      course,
      persisted: false,
    })
    const retryPersist = vi.spyOn(store, 'retryPersist').mockReturnValue({
      ok: true,
      persisted: true,
      state: 'ok',
      error: '',
    })

    await fillValidForm(wrapper)
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(wrapper.get('#course-field-title').element.disabled).toBe(true)
    await wrapper.get('#course-field-title').setValue('Edited after failed save')
    await flushPromises()

    expect(wrapper.get('.form-alert button').exists()).toBe(true)
    expect(wrapper.text()).toContain('Browser storage is not accepting course saves.')

    await wrapper.get('.form-alert button').trigger('click')
    await flushPromises()

    expect(addCourse).toHaveBeenCalledTimes(1)
    expect(retryPersist).toHaveBeenCalledTimes(1)
    expect(wrapper.emitted('saved')[0][0]).toMatchObject({
      mode: 'add',
      course,
      persisted: true,
    })

    wrapper.unmount()
  })

  it('uses the current stored record when a retry succeeds', async () => {
    const wrapper = await openForm()
    const store = useCoursesStore()
    const originalCourse = { uid: 'course_1', code: 'CS101', title: 'Original title' }
    const currentCourse = { uid: 'course_1', code: 'CS101', title: 'Current title' }

    vi.spyOn(store, 'addCourse').mockReturnValue({
      ok: true,
      course: originalCourse,
      persisted: false,
    })
    vi.spyOn(store, 'retryPersist').mockReturnValue({
      ok: true,
      persisted: true,
      state: 'ok',
      error: '',
    })

    await fillValidForm(wrapper)
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    store.courses = [currentCourse]
    await wrapper.get('.form-alert button').trigger('click')
    await flushPromises()

    expect(wrapper.emitted('saved')[0][0]).toMatchObject({
      mode: 'add',
      course: { title: 'Current title' },
      persisted: true,
    })

    wrapper.unmount()
  })

  it('retries an edit without repeating the update mutation', async () => {
    const existingCourse = {
      uid: 'course_1',
      code: 'CS101',
      title: 'Original title',
      department: 'Computer Science',
      credits: 3,
      status: 'Active',
      description: '',
    }
    const wrapper = await openForm(existingCourse)
    const store = useCoursesStore()
    const updatedCourse = { ...existingCourse, title: 'Updated title' }

    store.persistenceError = 'Browser storage is not accepting course saves.'
    const updateCourse = vi.spyOn(store, 'updateCourse').mockReturnValue({
      ok: true,
      course: updatedCourse,
      persisted: false,
    })
    const retryPersist = vi.spyOn(store, 'retryPersist').mockReturnValue({
      ok: true,
      persisted: true,
      state: 'ok',
      error: '',
    })

    await wrapper.get('#course-field-title').setValue('Updated title')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(updateCourse).toHaveBeenCalledTimes(1)
    await wrapper.get('.form-alert button').trigger('click')
    await flushPromises()

    expect(retryPersist).toHaveBeenCalledTimes(1)
    expect(updateCourse).toHaveBeenCalledTimes(1)
    expect(wrapper.emitted('saved')[0][0]).toMatchObject({
      mode: 'edit',
      course: { title: 'Updated title' },
      persisted: true,
    })

    wrapper.unmount()
  })

  it('discards an unsaved add from memory and storage', async () => {
    const wrapper = await openForm()
    const store = useCoursesStore()
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota exceeded')
    })

    await fillValidForm(wrapper)
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(store.courses).toHaveLength(1)
    expect(store.persistenceState).toBe('failed')

    setItemSpy.mockRestore()
    const cancelButton = wrapper.findAll('button').find((button) => button.text() === 'Cancel')
    await cancelButton.trigger('click')

    const discardButton = wrapper
      .findAll('button')
      .find((button) => button.text() === 'Discard changes')
    await discardButton.trigger('click')
    await flushPromises()

    expect(store.courses).toHaveLength(0)
    expect(store.persistenceState).toBe('ok')
    expect(window.localStorage.getItem('campushub:courses:v1')).toBe('[]')

    wrapper.unmount()
  })

  it('marks required fields and associates storage and field helper text', async () => {
    const wrapper = await openForm()

    for (const field of ['code', 'title', 'department', 'credits']) {
      expect(wrapper.get(`#course-field-${field}`).attributes('aria-required')).toBe('true')
    }

    expect(wrapper.get('#course-field-department').attributes('aria-describedby')).toBe(
      'course-field-department-hint',
    )
    expect(wrapper.get('#course-field-description').attributes('aria-describedby')).toBe(
      'course-field-description-hint',
    )
    expect(wrapper.get('#course-field-department-hint').text()).toContain('department list')
    expect(wrapper.get('#course-field-description-hint').text()).toBe('0/500 characters')

    const storageNote = wrapper.get('.form-note')
    expect(storageNote.attributes('role')).toBe('status')
    expect(storageNote.attributes('aria-live')).toBe('polite')

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

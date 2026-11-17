import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import SectionFormModal from '../../src/components/sections/SectionFormModal.vue'
import { useSectionsStore } from '../../src/stores/sections'
import { useSemestersStore } from '../../src/stores/semesters'
import { useSubjectsStore } from '../../src/stores/subjects'

vi.mock('../../src/api/teacherService', async (importOriginal) => {
  const actual = await importOriginal()

  return {
    ...actual,
    fetchTeachers: vi.fn().mockResolvedValue({
      content: [
        {
          id: 7,
          teacherId: 'T-007',
          fullName: 'Ada Lovelace',
          email: 'ada@example.com',
          phone: '',
          department: 'Computer Science',
          specialization: 'Algorithms',
          hireDate: '2025-01-10',
          status: 'ACTIVE',
        },
      ],
      size: 100,
      totalElements: 1,
    }),
  }
})

const STORAGE_KEY = 'campushub:sections:v1'

let pinia
let subjectUid
let semesterUid

beforeEach(() => {
  window.localStorage.clear()
  pinia = createPinia()
  setActivePinia(pinia)

  const subjectsStore = useSubjectsStore()
  const subject = subjectsStore.addSubject({
    code: 'CS101',
    name: 'Introduction to Computer Science',
    department: 'Computer Science',
    credits: 3,
    status: 'Active',
    description: '',
  })

  const semestersStore = useSemestersStore()
  const semester = semestersStore.addSemester({
    name: 'Fall 2026',
    academicYear: '2026-2027',
    startDate: '2026-09-01',
    endDate: '2026-12-20',
    status: 'Active',
    description: '',
  })

  subjectUid = subject.subject.uid
  semesterUid = semester.semester.uid
})

afterEach(() => {
  document.body.innerHTML = ''
  document.body.classList.remove('ch-modal-open')
  window.localStorage.clear()
})

async function openForm(section = null) {
  const wrapper = mount(SectionFormModal, {
    attachTo: document.body,
    props: { modelValue: false, section },
    global: {
      plugins: [pinia],
      stubs: { teleport: true },
    },
  })

  await wrapper.setProps({ modelValue: true })
  await flushPromises()

  return wrapper
}

function sectionInput(overrides = {}) {
  return {
    code: 'CS101-A',
    subjectUid,
    teacherUid: '7',
    teacherName: 'Ada Lovelace',
    semesterUid,
    room: 'Room 101',
    schedule: 'Mon 09:00 - 10:00',
    capacity: 30,
    status: 'Active',
    description: '',
    ...overrides,
  }
}

describe('SectionFormModal', () => {
  it('validates required section fields before saving', async () => {
    const wrapper = await openForm()

    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(wrapper.text()).toContain('Section code is required.')
    expect(wrapper.text()).toContain('Subject is required.')
    expect(wrapper.text()).toContain('Teacher is required.')
    expect(wrapper.text()).toContain('Semester is required.')
    expect(wrapper.text()).toContain('Room is required.')
    expect(wrapper.text()).toContain('Schedule is required.')
    expect(wrapper.emitted('saved')).toBeUndefined()
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull()

    wrapper.unmount()
  })

  it('saves a section with the selected teacher name from the Teachers API', async () => {
    const wrapper = await openForm()

    await wrapper.get('#section-field-code').setValue('cs101-a')
    await wrapper.get('#section-field-subject').setValue(subjectUid)
    await wrapper.get('#section-field-teacher').setValue('7')
    await wrapper.get('#section-field-semester').setValue(semesterUid)
    await wrapper.get('#section-field-room').setValue('Room 101')
    await wrapper.get('#section-field-schedule').setValue('Mon 09:00 - 10:00')
    await wrapper.get('#section-field-capacity').setValue('30')

    await wrapper.get('form').trigger('submit')
    await flushPromises()

    const savedEvents = wrapper.emitted('saved')

    expect(savedEvents).toHaveLength(1)
    expect(savedEvents[0][0].section).toMatchObject({
      code: 'CS101-A',
      subjectUid,
      teacherUid: '7',
      teacherName: 'Ada Lovelace',
      semesterUid,
      room: 'Room 101',
      schedule: 'Mon 09:00 - 10:00',
      capacity: 30,
    })
    expect(JSON.parse(window.localStorage.getItem(STORAGE_KEY))).toHaveLength(1)

    wrapper.unmount()
  })

  it('updates an existing section without creating a duplicate record', async () => {
    const store = useSectionsStore()
    const added = store.addSection(sectionInput())

    expect(added.ok).toBe(true)

    const wrapper = await openForm(added.section)

    await wrapper.get('#section-field-room').setValue('Lab 2')
    await wrapper.get('#section-field-capacity').setValue('24')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    const savedEvents = wrapper.emitted('saved')

    expect(savedEvents).toHaveLength(1)
    expect(savedEvents[0][0]).toMatchObject({
      mode: 'edit',
      persisted: true,
      section: {
        uid: added.section.uid,
        createdAt: added.section.createdAt,
        room: 'Lab 2',
        capacity: 24,
      },
    })

    const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY))

    expect(stored).toHaveLength(1)
    expect(stored[0]).toMatchObject({
      uid: added.section.uid,
      room: 'Lab 2',
      capacity: 24,
    })

    wrapper.unmount()
  })

  it('shows validation errors that are not attached to a form field', async () => {
    const wrapper = await openForm()
    const store = useSectionsStore()

    vi.spyOn(store, 'addSection').mockReturnValue({
      ok: false,
      errors: { teacherName: 'Teacher name is too long.' },
    })

    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(wrapper.text()).toContain('Teacher name is too long.')
    expect(wrapper.emitted('saved')).toBeUndefined()

    wrapper.unmount()
  })

  it('shows a form error when saving fails unexpectedly', async () => {
    const wrapper = await openForm()
    const store = useSectionsStore()

    vi.spyOn(store, 'addSection').mockImplementation(() => {
      throw new Error('Unexpected failure')
    })

    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(wrapper.text()).toContain('The section could not be saved. Please try again.')
    expect(wrapper.emitted('saved')).toBeUndefined()

    wrapper.unmount()
  })
})

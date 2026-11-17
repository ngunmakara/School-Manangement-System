import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import SectionFormModal from '../../src/components/sections/SectionFormModal.vue'
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

async function openForm() {
  const wrapper = mount(SectionFormModal, {
    attachTo: document.body,
    props: { modelValue: false },
    global: {
      plugins: [pinia],
      stubs: { teleport: true },
    },
  })

  await wrapper.setProps({ modelValue: true })
  await flushPromises()

  return wrapper
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
})

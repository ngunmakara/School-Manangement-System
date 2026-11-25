import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import SectionsView from '../../src/views/SectionsView.vue'
import { useSectionsStore } from '../../src/stores/sections'
import { useSubjectsStore } from '../../src/stores/subjects'
import { useSemestersStore } from '../../src/stores/semesters'
import { useTeachersStore } from '../../src/stores/teachers'
import { useToast } from '../../src/composables/useToast'

const componentStubs = {
  PageHeader: {
    props: ['title'],
    template:
      '<header class="page-header-stub" :data-title="title"><slot name="actions" /></header>',
  },
  StatCard: {
    props: ['label', 'value'],
    template: '<div class="stat-card-stub">{{ label }}: {{ value }}</div>',
  },
  SearchField: {
    props: ['modelValue', 'label'],
    template:
      '<input type="search" :aria-label="label" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
  },
  FilterSelect: {
    props: ['modelValue', 'label', 'options'],
    template:
      '<select :aria-label="label" :value="modelValue" @change="$emit(\'update:modelValue\', $event.target.value)"><option v-for="option in options" :key="option.value" :value="option.value">{{ option.label }}</option></select>',
  },
  EmptyState: {
    props: ['title', 'message'],
    template:
      '<div class="empty-state-stub"><h3>{{ title }}</h3><p>{{ message }}</p><slot /></div>',
  },
  PaginationBar: true,
  ConfirmDialog: {
    props: ['modelValue', 'title', 'confirmLabel'],
    template:
      '<div v-if="modelValue" class="confirm-dialog-stub"><h2>{{ title }}</h2><slot /><button type="button" class="confirm-action" @click="$emit(\'confirm\')">{{ confirmLabel }}</button></div>',
  },
  SectionTable: {
    props: ['sections'],
    template:
      '<div class="section-table-stub"><div v-for="s in sections" :key="s.uid" class="section-row">{{ s.code }} {{ s.subjectName }}<button type="button" class="edit-section" @click="$emit(\'edit\', s)">Edit</button><button type="button" class="delete-section" @click="$emit(\'delete\', s)">Delete</button></div></div>',
  },
  SectionFormModal: {
    props: ['modelValue', 'section'],
    template:
      '<div v-if="modelValue" class="section-form-stub" :data-mode="section ? \'edit\' : \'add\'"><button type="button" class="save-section" @click="$emit(\'saved\', { mode: section ? \'edit\' : \'add\', section: { code: \'SEC-9\' }, persisted: true })">Save</button></div>',
  },
  SectionDetailsModal: {
    props: ['modelValue'],
    template: '<div v-if="modelValue" class="section-details-stub"></div>',
  },
}

let pinia

function seed() {
  const sections = useSectionsStore()
  const subjects = useSubjectsStore()
  const semesters = useSemestersStore()
  const teachers = useTeachersStore()
  subjects.subjects = [{ uid: 'sub1', code: 'CS101', name: 'Intro CS' }]
  semesters.semesters = [{ uid: 'sem1', name: 'Fall 2026', academicYear: '2026-2027' }]
  teachers.teacherOptions = [{ uid: 't1', fullName: 'Alice Teacher' }]
  teachers.optionsState = 'ready'
  sections.sections = [
    {
      uid: 'sec1',
      code: 'CS101-A',
      subjectUid: 'sub1',
      semesterUid: 'sem1',
      teacherUid: 't1',
      teacherName: 'Alice Teacher',
      room: 'R1',
      schedule: 'Mon 9:00',
      capacity: 30,
      status: 'Active',
      description: '',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    },
    {
      uid: 'sec2',
      code: 'CS101-B',
      subjectUid: 'sub1',
      semesterUid: 'sem1',
      teacherUid: 't1',
      teacherName: 'Alice Teacher',
      room: 'R2',
      schedule: 'Tue 9:00',
      capacity: 25,
      status: 'Inactive',
      description: '',
      createdAt: '2026-01-02T00:00:00Z',
      updatedAt: '2026-01-02T00:00:00Z',
    },
  ]
  sections.loadState = 'ready'
}

async function mountView({ query = {} } = {}) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<div />' } },
      { path: '/sections', name: 'sections', component: SectionsView },
    ],
  })
  await router.push({ name: 'sections', query })
  await router.isReady()
  return {
    router,
    wrapper: mount(SectionsView, {
      attachTo: document.body,
      global: { plugins: [pinia, router], stubs: componentStubs },
    }),
  }
}

beforeEach(() => {
  window.localStorage.clear()
  pinia = createPinia()
  setActivePinia(pinia)
  useToast().state.toasts.splice(0)
})

afterEach(() => {
  vi.restoreAllMocks()
  document.body.innerHTML = ''
  window.localStorage.clear()
})

describe('SectionsView', () => {
  it('renders, filters, and opens add from query action', async () => {
    seed()
    const sections = useSectionsStore()
    const subjects = useSubjectsStore()
    const semesters = useSemestersStore()
    const teachers = useTeachersStore()
    vi.spyOn(sections, 'loadSections').mockImplementation(() => true)
    vi.spyOn(subjects, 'loadSubjects').mockImplementation(() => true)
    vi.spyOn(semesters, 'loadSemesters').mockImplementation(() => true)
    vi.spyOn(teachers, 'loadTeacherOptions').mockResolvedValue(true)

    const { wrapper, router } = await mountView({ query: { action: 'add' } })
    await flushPromises()

    expect(wrapper.get('.page-header-stub').attributes('data-title')).toBe('Class Sections')
    expect(wrapper.text()).toContain('CS101-A')
    expect(wrapper.find('.section-form-stub').attributes('data-mode')).toBe('add')
    expect(router.currentRoute.value.query.action).toBeUndefined()

    await wrapper.get('select[aria-label="Status"]').setValue('Active')
    await flushPromises()
    expect(wrapper.text()).toContain('CS101-A')
    expect(wrapper.text()).not.toContain('CS101-B')
    wrapper.unmount()
  })

  it('handles save and delete flow', async () => {
    seed()
    const sections = useSectionsStore()
    vi.spyOn(sections, 'loadSections').mockImplementation(() => true)
    vi.spyOn(useSubjectsStore(), 'loadSubjects').mockImplementation(() => true)
    vi.spyOn(useSemestersStore(), 'loadSemesters').mockImplementation(() => true)
    vi.spyOn(useTeachersStore(), 'loadTeacherOptions').mockResolvedValue(true)
    vi.spyOn(sections, 'deleteSection').mockReturnValue({ ok: true, persisted: true })

    const { wrapper } = await mountView()
    await flushPromises()

    await wrapper.findAll('.edit-section')[0].trigger('click')
    await flushPromises()
    await wrapper.get('.save-section').trigger('click')
    await flushPromises()
    expect(useToast().state.toasts.some((t) => t.title === 'Section updated')).toBe(true)

    await wrapper.findAll('.delete-section')[0].trigger('click')
    await flushPromises()
    await wrapper.get('.confirm-action').trigger('click')
    await flushPromises()
    expect(sections.deleteSection).toHaveBeenCalledWith('sec1')
    expect(useToast().state.toasts.some((t) => t.title === 'Section deleted')).toBe(true)
    wrapper.unmount()
  })

  it('shows load error and retries', async () => {
    const sections = useSectionsStore()
    sections.loadState = 'error'
    sections.loadError = 'Storage read failed'
    sections.sections = []
    const loadSections = vi.spyOn(sections, 'loadSections').mockImplementation(() => false)
    vi.spyOn(useSubjectsStore(), 'loadSubjects').mockImplementation(() => true)
    vi.spyOn(useSemestersStore(), 'loadSemesters').mockImplementation(() => true)
    vi.spyOn(useTeachersStore(), 'loadTeacherOptions').mockResolvedValue(true)

    const { wrapper } = await mountView()
    await flushPromises()
    expect(wrapper.text()).toContain('Storage read failed')
    const retry = wrapper.findAll('button').find((b) => b.text().includes('Retry'))
    await retry.trigger('click')
    expect(loadSections).toHaveBeenCalled()
    wrapper.unmount()
  })
})

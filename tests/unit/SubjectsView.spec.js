import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import SubjectsView from '../../src/views/SubjectsView.vue'
import { useSubjectsStore } from '../../src/stores/subjects'
import { useDepartmentsStore } from '../../src/stores/departments'
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
  SubjectTable: {
    props: ['subjects'],
    template:
      '<div class="subject-table-stub"><div v-for="s in subjects" :key="s.uid" class="subject-row">{{ s.name }}<button type="button" class="edit-subject" @click="$emit(\'edit\', s)">Edit</button><button type="button" class="delete-subject" @click="$emit(\'delete\', s)">Delete</button></div></div>',
  },
  SubjectFormModal: {
    props: ['modelValue', 'subject'],
    template:
      "<div v-if=\"modelValue\" class=\"subject-form-stub\" :data-mode=\"subject ? 'edit' : 'add'\"><button type=\"button\" class=\"save-subject\" @click=\"$emit('saved', { mode: subject ? 'edit' : 'add', subject: { name: 'Saved Subject', code: 'SUB' }, persisted: true })\">Save</button></div>",
  },
  SubjectDetailsModal: {
    props: ['modelValue'],
    template: '<div v-if="modelValue" class="subject-details-stub"></div>',
  },
}

let pinia

function seedSubjects() {
  const store = useSubjectsStore()
  store.subjects = [
    {
      uid: 'sub1',
      code: 'CS101',
      name: 'Intro CS',
      department: 'Computer Science',
      credits: 3,
      status: 'Active',
      description: '',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    },
    {
      uid: 'sub2',
      code: 'MATH101',
      name: 'Calculus',
      department: 'Mathematics',
      credits: 4,
      status: 'Inactive',
      description: '',
      createdAt: '2026-01-02T00:00:00Z',
      updatedAt: '2026-01-02T00:00:00Z',
    },
  ]
  store.loadState = 'ready'
}

async function mountView({ query = {} } = {}) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<div />' } },
      { path: '/subjects', name: 'subjects', component: SubjectsView },
    ],
  })
  await router.push({ name: 'subjects', query })
  await router.isReady()
  return {
    router,
    wrapper: mount(SubjectsView, {
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

describe('SubjectsView', () => {
  it('renders, filters, and opens add from query action', async () => {
    seedSubjects()
    const store = useSubjectsStore()
    const deptStore = useDepartmentsStore()
    vi.spyOn(store, 'loadSubjects').mockImplementation(() => true)
    vi.spyOn(deptStore, 'loadDepartmentOptions').mockResolvedValue(true)
    deptStore.departmentOptions = ['Computer Science', 'Mathematics']

    const { wrapper, router } = await mountView({ query: { action: 'add' } })
    await flushPromises()

    expect(wrapper.get('.page-header-stub').attributes('data-title')).toBe('Subjects')
    expect(wrapper.text()).toContain('Intro CS')
    expect(wrapper.find('.subject-form-stub').attributes('data-mode')).toBe('add')
    expect(router.currentRoute.value.query.action).toBeUndefined()

    await wrapper.get('select[aria-label="Status"]').setValue('Active')
    await flushPromises()
    expect(wrapper.text()).toContain('Intro CS')
    expect(wrapper.text()).not.toContain('Calculus')
    wrapper.unmount()
  })

  it('handles save and delete flow', async () => {
    seedSubjects()
    const store = useSubjectsStore()
    const deptStore = useDepartmentsStore()
    vi.spyOn(store, 'loadSubjects').mockImplementation(() => true)
    vi.spyOn(deptStore, 'loadDepartmentOptions').mockResolvedValue(true)
    vi.spyOn(store, 'deleteSubject').mockReturnValue({ ok: true, persisted: true })

    const { wrapper } = await mountView()
    await flushPromises()

    await wrapper.findAll('.edit-subject')[0].trigger('click')
    await flushPromises()
    await wrapper.get('.save-subject').trigger('click')
    await flushPromises()
    expect(useToast().state.toasts.some((t) => t.title === 'Subject updated')).toBe(true)

    await wrapper.findAll('.delete-subject')[0].trigger('click')
    await flushPromises()
    await wrapper.get('.confirm-action').trigger('click')
    await flushPromises()
    expect(store.deleteSubject).toHaveBeenCalledWith('sub2')
    expect(useToast().state.toasts.some((t) => t.title === 'Subject deleted')).toBe(true)
    wrapper.unmount()
  })

  it('shows load error and retries', async () => {
    const store = useSubjectsStore()
    const deptStore = useDepartmentsStore()
    store.loadState = 'error'
    store.loadError = 'Storage read failed'
    store.subjects = []
    const loadSubjects = vi.spyOn(store, 'loadSubjects').mockImplementation(() => false)
    vi.spyOn(deptStore, 'loadDepartmentOptions').mockResolvedValue(true)

    const { wrapper } = await mountView()
    await flushPromises()
    expect(wrapper.text()).toContain('Storage read failed')
    const retry = wrapper.findAll('button').find((b) => b.text().includes('Retry'))
    await retry.trigger('click')
    expect(loadSubjects).toHaveBeenCalled()
    wrapper.unmount()
  })
})

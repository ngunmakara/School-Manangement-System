import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import SemestersView from '../../src/views/SemestersView.vue'
import { useSemestersStore } from '../../src/stores/semesters'
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
  SemesterTable: {
    props: ['semesters'],
    template:
      '<div class="semester-table-stub"><div v-for="s in semesters" :key="s.uid" class="semester-row">{{ s.name }}<button type="button" class="edit-semester" @click="$emit(\'edit\', s)">Edit</button><button type="button" class="delete-semester" @click="$emit(\'delete\', s)">Delete</button></div></div>',
  },
  SemesterFormModal: {
    props: ['modelValue', 'semester'],
    template:
      "<div v-if=\"modelValue\" class=\"semester-form-stub\" :data-mode=\"semester ? 'edit' : 'add'\"><button type=\"button\" class=\"save-semester\" @click=\"$emit('saved', { mode: semester ? 'edit' : 'add', semester: { name: 'Spring 2027', academicYear: '2026-2027' }, persisted: true })\">Save</button></div>",
  },
  SemesterDetailsModal: {
    props: ['modelValue'],
    template: '<div v-if="modelValue" class="semester-details-stub"></div>',
  },
}

let pinia

function seedSemesters() {
  const store = useSemestersStore()
  store.semesters = [
    {
      uid: 'sem1',
      name: 'Fall 2026',
      academicYear: '2026-2027',
      startDate: '2026-08-01',
      endDate: '2026-12-15',
      status: 'Active',
      description: '',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    },
    {
      uid: 'sem2',
      name: 'Spring 2026',
      academicYear: '2025-2026',
      startDate: '2026-01-10',
      endDate: '2026-05-20',
      status: 'Completed',
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
      { path: '/semesters', name: 'semesters', component: SemestersView },
    ],
  })
  await router.push({ name: 'semesters', query })
  await router.isReady()
  return {
    router,
    wrapper: mount(SemestersView, {
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

describe('SemestersView', () => {
  it('renders, filters, and opens add from query action', async () => {
    seedSemesters()
    const store = useSemestersStore()
    vi.spyOn(store, 'loadSemesters').mockImplementation(() => true)

    const { wrapper, router } = await mountView({ query: { action: 'add' } })
    await flushPromises()

    expect(wrapper.get('.page-header-stub').attributes('data-title')).toBe('Semesters')
    expect(wrapper.text()).toContain('Fall 2026')
    expect(wrapper.find('.semester-form-stub').attributes('data-mode')).toBe('add')
    expect(router.currentRoute.value.query.action).toBeUndefined()

    await wrapper.get('select[aria-label="Status"]').setValue('Completed')
    await flushPromises()
    expect(wrapper.text()).toContain('Spring 2026')
    expect(wrapper.find('.semester-table-stub').text()).not.toContain('Fall 2026')
    wrapper.unmount()
  })

  it('handles save and delete flow', async () => {
    seedSemesters()
    const store = useSemestersStore()
    vi.spyOn(store, 'loadSemesters').mockImplementation(() => true)
    vi.spyOn(store, 'deleteSemester').mockReturnValue({ ok: true, persisted: true })

    const { wrapper } = await mountView()
    await flushPromises()

    await wrapper.findAll('.edit-semester')[0].trigger('click')
    await flushPromises()
    await wrapper.get('.save-semester').trigger('click')
    await flushPromises()
    expect(useToast().state.toasts.some((t) => t.title === 'Semester updated')).toBe(true)

    await wrapper.findAll('.delete-semester')[0].trigger('click')
    await flushPromises()
    await wrapper.get('.confirm-action').trigger('click')
    await flushPromises()
    expect(store.deleteSemester).toHaveBeenCalledWith('sem1')
    expect(useToast().state.toasts.some((t) => t.title === 'Semester deleted')).toBe(true)
    wrapper.unmount()
  })

  it('shows load error and retries', async () => {
    const store = useSemestersStore()
    store.loadState = 'error'
    store.loadError = 'Storage read failed'
    store.semesters = []
    const loadSemesters = vi.spyOn(store, 'loadSemesters').mockImplementation(() => false)

    const { wrapper } = await mountView()
    await flushPromises()
    expect(wrapper.text()).toContain('Storage read failed')
    const retry = wrapper.findAll('button').find((b) => b.text().includes('Retry'))
    await retry.trigger('click')
    expect(loadSemesters).toHaveBeenCalled()
    wrapper.unmount()
  })
})

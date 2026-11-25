import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import DepartmentsView from '../../src/views/DepartmentsView.vue'
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
  EmptyState: {
    props: ['title', 'message'],
    template:
      '<div class="empty-state-stub"><h3>{{ title }}</h3><p>{{ message }}</p><slot /></div>',
  },
  PaginationBar: {
    props: ['page', 'total'],
    template: '<div class="pagination-stub" :data-page="page" :data-total="total"></div>',
  },
  ConfirmDialog: {
    props: ['modelValue', 'title', 'confirmLabel'],
    template:
      '<div v-if="modelValue" class="confirm-dialog-stub"><h2>{{ title }}</h2><slot /><button type="button" class="confirm-action" @click="$emit(\'confirm\')">{{ confirmLabel }}</button></div>',
  },
  DepartmentTable: {
    props: ['departments'],
    template:
      '<div class="department-table-stub"><div v-for="d in departments" :key="d.uid" class="dept-row">{{ d.name }}<button type="button" class="edit-dept" @click="$emit(\'edit\', d)">Edit</button><button type="button" class="delete-dept" @click="$emit(\'delete\', d)">Delete</button></div></div>',
  },
  DepartmentFormModal: {
    props: ['modelValue', 'department'],
    template:
      "<div v-if=\"modelValue\" class=\"department-form-stub\" :data-mode=\"department ? 'edit' : 'add'\"><button type=\"button\" class=\"save-dept\" @click=\"$emit('saved', { mode: department ? 'edit' : 'add', department: { name: 'Saved Dept', code: 'SD' } })\">Save</button></div>",
  },
  DepartmentDetailsModal: {
    props: ['modelValue'],
    template: '<div v-if="modelValue" class="department-details-stub"></div>',
  },
}

let pinia

function seedDepartments() {
  const store = useDepartmentsStore()
  store.departments = [
    {
      uid: 'd1',
      name: 'Computer Science',
      code: 'CS',
      headOfDepartment: 'Ada',
      description: 'Desc',
      createdAt: '2025-01-01T00:00:00Z',
      updatedAt: '2025-01-01T00:00:00Z',
    },
    {
      uid: 'd2',
      name: 'Mathematics',
      code: 'MATH',
      headOfDepartment: '',
      description: '',
      createdAt: '2025-01-02T00:00:00Z',
      updatedAt: '2025-01-02T00:00:00Z',
    },
  ]
  store.totalDepartments = 2
  store.apiState = 'ready'
}

async function mountView({ query = {} } = {}) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<div />' } },
      { path: '/departments', name: 'departments', component: DepartmentsView },
    ],
  })
  await router.push({ name: 'departments', query })
  await router.isReady()
  return {
    router,
    wrapper: mount(DepartmentsView, {
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

describe('DepartmentsView', () => {
  it('renders, searches, and opens add from query action', async () => {
    seedDepartments()
    const store = useDepartmentsStore()
    vi.spyOn(store, 'loadDepartments').mockResolvedValue(true)

    const { wrapper, router } = await mountView({ query: { action: 'add' } })
    await flushPromises()

    expect(wrapper.get('.page-header-stub').attributes('data-title')).toBe('Departments')
    expect(wrapper.text()).toContain('Computer Science')
    expect(wrapper.find('.department-form-stub').attributes('data-mode')).toBe('add')
    expect(router.currentRoute.value.query.action).toBeUndefined()

    await wrapper.get('input[aria-label="Search"]').setValue('math')
    await flushPromises()
    expect(wrapper.text()).toContain('Mathematics')
    expect(wrapper.text()).not.toContain('Computer Science')
    wrapper.unmount()
  })

  it('handles save and delete flow', async () => {
    seedDepartments()
    const store = useDepartmentsStore()
    vi.spyOn(store, 'loadDepartments').mockResolvedValue(true)
    vi.spyOn(store, 'deleteDepartment').mockResolvedValue({ ok: true })

    const { wrapper } = await mountView()
    await flushPromises()

    await wrapper.findAll('.edit-dept')[0].trigger('click')
    await flushPromises()
    await wrapper.get('.save-dept').trigger('click')
    await flushPromises()
    expect(useToast().state.toasts.some((t) => t.title === 'Department updated')).toBe(true)

    await wrapper.findAll('.delete-dept')[0].trigger('click')
    await flushPromises()
    await wrapper.get('.confirm-action').trigger('click')
    await flushPromises()
    expect(store.deleteDepartment).toHaveBeenCalledWith('d1')
    expect(useToast().state.toasts.some((t) => t.title === 'Department deleted')).toBe(true)
    wrapper.unmount()
  })

  it('shows API error and retries', async () => {
    const store = useDepartmentsStore()
    store.apiState = 'error'
    store.loadError = 'Network down'
    store.departments = []
    store.totalDepartments = 0
    const loadDepartments = vi.spyOn(store, 'loadDepartments').mockResolvedValue(false)

    const { wrapper } = await mountView()
    await flushPromises()
    expect(wrapper.text()).toContain('Network down')
    const retry = wrapper.findAll('button').find((b) => b.text().includes('Retry'))
    await retry.trigger('click')
    expect(loadDepartments).toHaveBeenCalled()
    wrapper.unmount()
  })
})

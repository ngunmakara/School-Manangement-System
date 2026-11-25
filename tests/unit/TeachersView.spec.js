import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import TeachersView from '../../src/views/TeachersView.vue'
import { useTeachersStore } from '../../src/stores/teachers'
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
  PaginationBar: {
    props: ['page', 'total'],
    template:
      '<div class="pagination-stub" :data-page="page" :data-total="total"><button type="button" class="next-page" @click="$emit(\'update:page\', page + 1)">Next</button></div>',
  },
  ConfirmDialog: {
    props: ['modelValue', 'title', 'confirmLabel'],
    template:
      '<div v-if="modelValue" class="confirm-dialog-stub"><h2>{{ title }}</h2><slot /><button type="button" class="confirm-action" @click="$emit(\'confirm\')">{{ confirmLabel }}</button></div>',
  },
  TeacherTable: {
    props: ['teachers'],
    template:
      '<div class="teacher-table-stub"><div v-for="teacher in teachers" :key="teacher.uid" class="teacher-row">{{ teacher.fullName }}<button type="button" class="view-teacher" @click="$emit(\'view\', teacher)">View</button><button type="button" class="edit-teacher" @click="$emit(\'edit\', teacher)">Edit</button><button type="button" class="delete-teacher" @click="$emit(\'delete\', teacher)">Delete</button></div></div>',
  },
  TeacherFormModal: {
    props: ['modelValue', 'teacher'],
    template:
      "<div v-if=\"modelValue\" class=\"teacher-form-stub\" :data-mode=\"teacher ? 'edit' : 'add'\"><button type=\"button\" class=\"save-teacher\" @click=\"$emit('saved', { mode: teacher ? 'edit' : 'add', teacher: { fullName: 'Saved Teacher', teacherId: 'T-999' } })\">Save</button></div>",
  },
  TeacherDetailsModal: {
    props: ['modelValue', 'teacher'],
    template:
      '<div v-if="modelValue" class="teacher-details-stub">{{ teacher?.fullName }}<button type="button" class="edit-from-details" @click="$emit(\'edit\', teacher)">Edit</button></div>',
  },
}

let pinia

function seedTeachers() {
  const store = useTeachersStore()
  store.teachers = [
    {
      uid: 't1',
      teacherId: 'T-001',
      fullName: 'Alice Teacher',
      email: 'a@x.com',
      department: 'Science',
      status: 'Active',
      specialization: 'Physics',
      hireDate: '2025-01-01',
      createdAt: '2025-01-01T00:00:00Z',
    },
    {
      uid: 't2',
      teacherId: 'T-002',
      fullName: 'Bob Teacher',
      email: 'b@x.com',
      department: 'Math',
      status: 'Inactive',
      specialization: 'Algebra',
      hireDate: '2024-01-01',
      createdAt: '2024-01-01T00:00:00Z',
    },
  ]
  store.totalTeachers = 2
  store.apiState = 'ready'
}

async function mountView({ query = {} } = {}) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<div />' } },
      { path: '/teachers', name: 'teachers', component: TeachersView },
    ],
  })
  await router.push({ name: 'teachers', query })
  await router.isReady()
  return {
    router,
    wrapper: mount(TeachersView, {
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

describe('TeachersView', () => {
  it('renders, filters, and opens add from query action', async () => {
    seedTeachers()
    const store = useTeachersStore()
    const deptStore = useDepartmentsStore()
    vi.spyOn(store, 'loadTeachers').mockResolvedValue(true)
    vi.spyOn(deptStore, 'loadDepartmentOptions').mockResolvedValue(true)
    deptStore.departmentOptions = ['Science', 'Math']

    const { wrapper, router } = await mountView({ query: { action: 'add' } })
    await flushPromises()

    expect(wrapper.get('.page-header-stub').attributes('data-title')).toBe('Teachers')
    expect(wrapper.text()).toContain('Alice Teacher')
    expect(wrapper.find('.teacher-form-stub').attributes('data-mode')).toBe('add')
    expect(router.currentRoute.value.query.action).toBeUndefined()

    await wrapper.get('select[aria-label="Status"]').setValue('Active')
    await flushPromises()
    expect(wrapper.text()).toContain('Alice Teacher')
    expect(wrapper.text()).not.toContain('Bob Teacher')
    wrapper.unmount()
  })

  it('handles edit/save/delete flow', async () => {
    seedTeachers()
    const store = useTeachersStore()
    const deptStore = useDepartmentsStore()
    vi.spyOn(store, 'loadTeachers').mockResolvedValue(true)
    vi.spyOn(deptStore, 'loadDepartmentOptions').mockResolvedValue(true)
    vi.spyOn(store, 'deleteTeacher').mockResolvedValue({ ok: true })

    const { wrapper } = await mountView()
    await flushPromises()

    await wrapper.findAll('.edit-teacher')[0].trigger('click')
    await flushPromises()
    await wrapper.get('.save-teacher').trigger('click')
    await flushPromises()
    expect(useToast().state.toasts.some((t) => t.title === 'Teacher updated')).toBe(true)

    await wrapper.findAll('.delete-teacher')[0].trigger('click')
    await flushPromises()
    await wrapper.get('.confirm-action').trigger('click')
    await flushPromises()
    expect(store.deleteTeacher).toHaveBeenCalledWith('t1')
    expect(useToast().state.toasts.some((t) => t.title === 'Teacher deleted')).toBe(true)
    wrapper.unmount()
  })

  it('shows API error and retries', async () => {
    const store = useTeachersStore()
    const deptStore = useDepartmentsStore()
    store.apiState = 'error'
    store.loadError = 'Network down'
    store.teachers = []
    store.totalTeachers = 0
    const loadTeachers = vi.spyOn(store, 'loadTeachers').mockResolvedValue(false)
    vi.spyOn(deptStore, 'loadDepartmentOptions').mockResolvedValue(false)
    deptStore.optionsState = 'error'

    const { wrapper } = await mountView()
    await flushPromises()
    expect(wrapper.text()).toContain('Network down')
    const retry = wrapper.findAll('button').find((b) => b.text().includes('Retry'))
    await retry.trigger('click')
    expect(loadTeachers).toHaveBeenCalled()
    wrapper.unmount()
  })
})

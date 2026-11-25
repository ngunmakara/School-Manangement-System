import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import StudentsView from '../../src/views/StudentsView.vue'
import { useStudentsStore } from '../../src/stores/students'
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
    props: ['page', 'total', 'itemLabel'],
    template:
      '<div class="pagination-stub" :data-page="page" :data-total="total" :data-label="itemLabel"><button type="button" class="next-page" @click="$emit(\'update:page\', page + 1)">Next</button></div>',
  },
  ConfirmDialog: {
    props: ['modelValue', 'title', 'confirmLabel'],
    template:
      '<div v-if="modelValue" class="confirm-dialog-stub"><h2>{{ title }}</h2><slot /><button type="button" class="confirm-action" @click="$emit(\'confirm\')">{{ confirmLabel }}</button></div>',
  },
  StudentTable: {
    props: ['students'],
    template:
      '<div class="student-table-stub"><div v-for="student in students" :key="student.uid" class="student-row">{{ student.fullName }}<button type="button" class="view-student" @click="$emit(\'view\', student)">View</button><button type="button" class="edit-student" @click="$emit(\'edit\', student)">Edit</button><button type="button" class="delete-student" @click="$emit(\'delete\', student)">Delete</button></div></div>',
  },
  StudentFormModal: {
    props: ['modelValue', 'student'],
    template:
      "<div v-if=\"modelValue\" class=\"student-form-stub\" :data-mode=\"student ? 'edit' : 'add'\"><button type=\"button\" class=\"save-student\" @click=\"$emit('saved', { mode: student ? 'edit' : 'add', student: { fullName: 'Saved Student', studentId: 'S-999' } })\">Save</button></div>",
  },
  StudentDetailsModal: {
    props: ['modelValue', 'student'],
    template:
      '<div v-if="modelValue" class="student-details-stub">{{ student?.fullName }}<button type="button" class="edit-from-details" @click="$emit(\'edit\', student)">Edit</button></div>',
  },
}

let pinia

function seedStudents() {
  const store = useStudentsStore()
  store.source = 'local'
  store.students = [
    {
      uid: 's1',
      studentId: 'S-001',
      fullName: 'Alice Nguyen',
      email: 'alice@example.com',
      phone: '555-0001',
      department: 'Computer Science',
      status: 'Active',
      enrollmentDate: '2026-01-10',
    },
    {
      uid: 's2',
      studentId: 'S-002',
      fullName: 'Bob Tran',
      email: 'bob@example.com',
      phone: '555-0002',
      department: 'Mathematics',
      status: 'Inactive',
      enrollmentDate: '2026-02-10',
    },
  ]
}

async function mountView({ query = {} } = {}) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<div />' } },
      { path: '/students', name: 'students', component: StudentsView },
    ],
  })
  await router.push({ name: 'students', query })
  await router.isReady()

  return {
    router,
    wrapper: mount(StudentsView, {
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

describe('StudentsView', () => {
  it('renders local students, filters, and opens add from query action', async () => {
    seedStudents()
    const store = useStudentsStore()
    vi.spyOn(store, 'loadStudents').mockResolvedValue(true)
    vi.spyOn(store, 'loadSummary').mockResolvedValue(true)

    const { wrapper, router } = await mountView({ query: { action: 'add' } })
    await flushPromises()

    expect(wrapper.get('.page-header-stub').attributes('data-title')).toBe('Students')
    expect(wrapper.text()).toContain('Alice Nguyen')
    expect(wrapper.text()).toContain('Bob Tran')
    expect(wrapper.find('.student-form-stub').attributes('data-mode')).toBe('add')
    expect(router.currentRoute.value.query.action).toBeUndefined()

    await wrapper.get('select[aria-label="Status"]').setValue('Active')
    await flushPromises()
    expect(wrapper.text()).toContain('Alice Nguyen')
    expect(wrapper.text()).not.toContain('Bob Tran')
    wrapper.unmount()
  })

  it('handles view/edit/delete flow and toasts', async () => {
    seedStudents()
    const store = useStudentsStore()
    vi.spyOn(store, 'loadStudents').mockResolvedValue(true)
    vi.spyOn(store, 'loadSummary').mockResolvedValue(true)
    vi.spyOn(store, 'deleteStudent').mockResolvedValue({ ok: true })

    const { wrapper } = await mountView()
    await flushPromises()

    await wrapper.findAll('.view-student')[0].trigger('click')
    await flushPromises()
    expect(wrapper.find('.student-details-stub').text()).toContain('Alice Nguyen')

    await wrapper.get('.edit-from-details').trigger('click')
    await flushPromises()
    expect(wrapper.find('.student-form-stub').attributes('data-mode')).toBe('edit')

    await wrapper.get('.save-student').trigger('click')
    await flushPromises()
    expect(useToast().state.toasts.some((t) => t.title === 'Student updated')).toBe(true)

    await wrapper.findAll('.delete-student')[0].trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('Delete student?')

    await wrapper.get('.confirm-action').trigger('click')
    await flushPromises()
    expect(store.deleteStudent).toHaveBeenCalledWith('s1')
    expect(useToast().state.toasts.some((t) => t.title === 'Student deleted')).toBe(true)
    wrapper.unmount()
  })

  it('shows API error banner and retries load', async () => {
    const store = useStudentsStore()
    store.source = 'api'
    store.apiState = 'error'
    store.loadError = 'Network down'
    store.summaryState = 'ready'
    store.students = []
    store.filteredTotal = 0
    store.totalStudents = 0
    const loadStudents = vi.spyOn(store, 'loadStudents').mockResolvedValue(true)
    vi.spyOn(store, 'loadSummary').mockResolvedValue(true)

    const { wrapper } = await mountView()
    await flushPromises()

    expect(wrapper.text()).toContain('The CampusHub API could not be reached')
    const retry = wrapper.findAll('button').find((b) => b.text().includes('Retry'))
    await retry.trigger('click')
    expect(loadStudents).toHaveBeenCalled()
    wrapper.unmount()
  })
})

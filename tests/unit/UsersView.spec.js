import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import UsersView from '../../src/views/UsersView.vue'
import { useUsersStore } from '../../src/stores/users'
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
  BaseModal: {
    props: ['modelValue', 'title'],
    template:
      '<div v-if="modelValue" class="base-modal-stub"><h2>{{ title }}</h2><slot /><slot name="footer" /></div>',
  },
  ConfirmDialog: {
    props: ['modelValue', 'title', 'confirmLabel'],
    template:
      '<div v-if="modelValue" class="confirm-dialog-stub"><h2>{{ title }}</h2><slot /><button type="button" @click="$emit(\'confirm\')">{{ confirmLabel }}</button></div>',
  },
}

let pinia

function seedUsers() {
  window.localStorage.setItem(
    'campushub:users:v1',
    JSON.stringify([
      {
        uid: 'u1',
        userId: 'USR-1',
        fullName: 'Alice Admin',
        email: 'alice@campushub.demo',
        role: 'Administrator',
        department: 'Administration',
        status: 'Active',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
      {
        uid: 'u2',
        userId: 'USR-2',
        fullName: 'Bob Staff',
        email: 'bob@campushub.demo',
        role: 'Staff',
        department: 'Finance',
        status: 'Inactive',
        createdAt: '2026-01-02T00:00:00.000Z',
        updatedAt: '2026-01-02T00:00:00.000Z',
      },
    ]),
  )
}

async function mountView() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<div />' } },
      { path: '/users', name: 'users', component: UsersView },
    ],
  })
  await router.push({ name: 'users' })
  await router.isReady()
  const wrapper = mount(UsersView, {
    attachTo: document.body,
    global: { plugins: [pinia, router], stubs: componentStubs },
  })
  return { wrapper, router }
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

describe('UsersView', () => {
  it('renders, filters, and adds a user with validation', async () => {
    seedUsers()
    const { wrapper } = await mountView()
    await flushPromises()

    expect(wrapper.get('.page-header-stub').attributes('data-title')).toBe('User Management')
    expect(wrapper.text()).toContain('Alice Admin')
    expect(wrapper.text()).toContain('Bob Staff')

    await wrapper.get('select[aria-label="Role"]').setValue('Administrator')
    await flushPromises()
    expect(wrapper.text()).toContain('Alice Admin')
    expect(wrapper.text()).not.toContain('Bob Staff')

    await wrapper.get('select[aria-label="Role"]').setValue('all')
    await wrapper.get('input[aria-label="Search users"]').setValue('finance')
    await flushPromises()
    expect(wrapper.text()).toContain('Bob Staff')
    expect(wrapper.text()).not.toContain('Alice Admin')

    await wrapper.get('input[aria-label="Search users"]').setValue('')
    const addButton = wrapper.findAll('button').find((btn) => btn.text().includes('Add user'))
    await addButton.trigger('click')
    await flushPromises()

    await wrapper.get('form#user-form').trigger('submit.prevent')
    await flushPromises()
    expect(wrapper.text()).toContain('User ID is required.')

    await wrapper.get('#user-field-id').setValue('USR-3')
    await wrapper.get('#user-field-name').setValue('Carol Registrar')
    await wrapper.get('#user-field-email').setValue('carol@campushub.demo')
    await wrapper.get('#user-field-role').setValue('Registrar')
    await wrapper.get('form#user-form').trigger('submit.prevent')
    await flushPromises()

    expect(useUsersStore().users.some((user) => user.userId === 'USR-3')).toBe(true)
    expect(wrapper.text()).toContain('Carol Registrar')
    wrapper.unmount()
  })

  it('activates/deactivates with confirmation and shows storage retry', async () => {
    seedUsers()
    const { wrapper } = await mountView()
    await flushPromises()

    const deactivateButton = wrapper.find('button[aria-label="Deactivate Alice Admin"]')
    await deactivateButton.trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('Deactivate user?')

    const confirm = wrapper.find('.confirm-dialog-stub button')
    await confirm.trigger('click')
    await flushPromises()
    expect(useUsersStore().users.find((user) => user.uid === 'u1').status).toBe('Inactive')

    const store = useUsersStore()
    store.persistenceState = 'failed'
    store.persistenceError = 'Browser storage is not accepting user saves.'
    await flushPromises()
    expect(wrapper.text()).toContain('Browser storage is not accepting user saves')
    expect(wrapper.findAll('button').some((btn) => btn.text().includes('Retry save'))).toBe(true)
    wrapper.unmount()
  })
})

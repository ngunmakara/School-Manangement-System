import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import NotificationsView from '../../src/views/NotificationsView.vue'
import { useNotificationsStore } from '../../src/stores/notifications'
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
    template: '<div class="empty-state-stub"><h3>{{ title }}</h3><p>{{ message }}</p></div>',
  },
  PaginationBar: true,
}

let pinia

function seedNotifications() {
  window.localStorage.setItem(
    'campushub:notifications:v1',
    JSON.stringify([
      {
        uid: 'n1',
        title: 'Unread payment',
        body: 'Payment received',
        icon: 'bi-cash-coin',
        tone: 'success',
        category: 'Finance',
        route: '/payments',
        read: false,
        createdAt: '2026-01-02T00:00:00.000Z',
        updatedAt: '2026-01-02T00:00:00.000Z',
      },
      {
        uid: 'n2',
        title: 'Read schedule',
        body: 'Room changed',
        icon: 'bi-geo-alt',
        tone: 'info',
        category: 'Schedule',
        route: '/sections',
        read: true,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ]),
  )
}

async function mountView() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<div />' } },
      { path: '/notifications', name: 'notifications', component: NotificationsView },
      { path: '/payments', name: 'payments', component: { template: '<div>Payments</div>' } },
      { path: '/sections', name: 'sections', component: { template: '<div>Sections</div>' } },
    ],
  })
  await router.push({ name: 'notifications' })
  await router.isReady()

  const wrapper = mount(NotificationsView, {
    attachTo: document.body,
    global: {
      plugins: [pinia, router],
      stubs: componentStubs,
    },
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

describe('NotificationsView', () => {
  it('renders inbox, filters by read status and search, and marks all read', async () => {
    seedNotifications()
    const { wrapper } = await mountView()
    await flushPromises()

    expect(wrapper.get('.page-header-stub').attributes('data-title')).toBe('Notifications')
    expect(wrapper.text()).toContain('Unread payment')
    expect(wrapper.text()).toContain('Read schedule')
    expect(wrapper.text()).toContain('Unread: 1')

    await wrapper.get('select[aria-label="Status"]').setValue('unread')
    await flushPromises()
    expect(wrapper.text()).toContain('Unread payment')
    expect(wrapper.text()).not.toContain('Read schedule')

    await wrapper.get('select[aria-label="Status"]').setValue('all')
    await wrapper.get('input[aria-label="Search notifications"]').setValue('room')
    await flushPromises()
    expect(wrapper.text()).toContain('Read schedule')
    expect(wrapper.text()).not.toContain('Unread payment')

    await wrapper.get('input[aria-label="Search notifications"]').setValue('')
    await flushPromises()
    const markAllButton = wrapper
      .findAll('button')
      .find((btn) => btn.text().includes('Mark all read'))
    await markAllButton.trigger('click')
    await flushPromises()

    expect(useNotificationsStore().unreadCount).toBe(0)
    expect(wrapper.text()).toContain('Unread: 0')
    wrapper.unmount()
  })

  it('marks a notification read and navigates to its related route', async () => {
    seedNotifications()
    const { wrapper, router } = await mountView()
    await flushPromises()

    const openButton = wrapper
      .findAll('button')
      .find((btn) => btn.text().includes('Open related page'))
    await openButton.trigger('click')
    await flushPromises()

    expect(useNotificationsStore().notifications.find((item) => item.uid === 'n1').read).toBe(true)
    expect(router.currentRoute.value.name).toBe('payments')
    wrapper.unmount()
  })

  it('shows filter empty state and storage retry alert', async () => {
    seedNotifications()
    const { wrapper } = await mountView()
    await flushPromises()

    await wrapper.get('input[aria-label="Search notifications"]').setValue('no-match')
    await flushPromises()
    expect(wrapper.text()).toContain('No notifications match your filters')

    const store = useNotificationsStore()
    store.persistenceState = 'failed'
    store.persistenceError = 'Browser storage is not accepting notification saves.'
    await flushPromises()

    expect(wrapper.text()).toContain('Browser storage is not accepting notification saves')
    const retry = wrapper.findAll('button').find((btn) => btn.text().includes('Retry save'))
    expect(retry).toBeTruthy()
    wrapper.unmount()
  })
})

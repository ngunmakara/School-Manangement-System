import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import AppTopbar from '../../src/components/layout/AppTopbar.vue'
import { useNotificationsStore } from '../../src/stores/notifications'
import { useToast } from '../../src/composables/useToast'

let pinia

async function mountTopbar() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<div />' } },
      {
        path: '/dashboard',
        name: 'dashboard',
        component: { template: '<div />' },
        meta: { title: 'Dashboard', group: 'Overview' },
      },
      {
        path: '/notifications',
        name: 'notifications',
        component: { template: '<div />' },
        meta: { title: 'Notifications', group: 'Insights' },
      },
      {
        path: '/payments',
        name: 'payments',
        component: { template: '<div />' },
        meta: { title: 'Tuition & Payments', group: 'Operations' },
      },
      {
        path: '/settings',
        name: 'settings',
        component: { template: '<div />' },
        meta: { title: 'Settings', group: 'Administration' },
      },
    ],
  })
  await router.push('/dashboard')
  await router.isReady()

  const wrapper = mount(AppTopbar, {
    attachTo: document.body,
    global: {
      plugins: [pinia, router],
      stubs: {
        RouterLink: {
          props: ['to'],
          template: "<a :href=\"typeof to === 'string' ? to : '#'\"><slot /></a>",
        },
      },
    },
  })

  return { wrapper, router }
}

beforeEach(() => {
  window.localStorage.clear()
  pinia = createPinia()
  setActivePinia(pinia)
  useToast().state.toasts.splice(0)
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
        title: 'Read alert',
        body: 'Done',
        icon: 'bi-bell',
        tone: '',
        category: 'System',
        route: '/notifications',
        read: true,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ]),
  )
})

afterEach(() => {
  vi.restoreAllMocks()
  document.body.innerHTML = ''
  window.localStorage.clear()
})

describe('AppTopbar notifications', () => {
  it('shows unread count from store and marks all read', async () => {
    const { wrapper } = await mountTopbar()
    await flushPromises()

    const notifButton = wrapper.get('button[aria-label="Notifications"]')
    expect(notifButton.text()).toBeDefined()
    expect(wrapper.find('.notification-dot').exists()).toBe(true)

    await notifButton.trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('Unread payment')
    expect(wrapper.text()).toContain('1 unread')

    const markAll = wrapper.findAll('button').find((btn) => btn.text().includes('Mark all read'))
    await markAll.trigger('click')
    await flushPromises()

    expect(useNotificationsStore().unreadCount).toBe(0)
    expect(wrapper.find('.notification-dot').exists()).toBe(false)
    wrapper.unmount()
  })

  it('opens a notification, marks it read, and routes to its target', async () => {
    const { wrapper, router } = await mountTopbar()
    await flushPromises()

    await wrapper.get('button[aria-label="Notifications"]').trigger('click')
    await flushPromises()

    const item = wrapper
      .findAll('button.notification-item')
      .find((btn) => btn.text().includes('Unread payment'))
    await item.trigger('click')
    await flushPromises()

    expect(useNotificationsStore().notifications.find((n) => n.uid === 'n1').read).toBe(true)
    expect(router.currentRoute.value.name).toBe('payments')
    wrapper.unmount()
  })
})

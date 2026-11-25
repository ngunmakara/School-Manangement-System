import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick, reactive } from 'vue'

const settingsState = reactive({
  sidebarDefaultCollapsed: false,
  tableDensity: 'comfortable',
})

const pushMock = vi.fn()
const loadSettingsMock = vi.fn()
const updateSettingsMock = vi.fn()

vi.mock('vue-router', () => ({
  RouterView: { render: () => h('div', { class: 'router-view-stub' }) },
  RouterLink: defineComponent({
    name: 'RouterLink',
    props: { to: { type: [String, Object], required: true } },
    emits: ['click'],
    setup(props, { emit, slots, attrs }) {
      return () =>
        h(
          'a',
          {
            ...attrs,
            href: typeof props.to === 'string' ? props.to : props.to?.path || '#',
            onClick: (event) => emit('click', event),
          },
          slots.default?.(),
        )
    },
  }),
  useRoute: () =>
    reactive({ fullPath: '/dashboard', meta: { title: 'Dashboard', group: 'Overview' } }),
  useRouter: () => ({ push: pushMock }),
}))

vi.mock('../../src/stores/settings', () => ({
  useSettingsStore: () => ({
    get sidebarDefaultCollapsed() {
      return settingsState.sidebarDefaultCollapsed
    },
    get tableDensity() {
      return settingsState.tableDensity
    },
    loadSettings: loadSettingsMock,
    updateSettings: updateSettingsMock,
  }),
}))

vi.mock('../../src/stores/notifications', () => ({
  useNotificationsStore: () => ({
    recentNotifications: [],
    unreadCount: 0,
    loadNotifications: vi.fn(),
  }),
}))

vi.mock('../../src/stores/semesters', () => ({
  useSemestersStore: () => ({
    activeSemester: null,
  }),
}))

vi.mock('../../src/composables/useToast', () => ({
  useToast: () => ({ push: vi.fn() }),
}))

import AppLayout from '../../src/layouts/AppLayout.vue'

const DesktopStub = defineComponent({
  template: '<div>Desktop content <button type="button">Outside action</button></div>',
})

function mountLayout() {
  return mount(AppLayout, {
    attachTo: document.body,
    global: {
      stubs: {
        ToastStack: true,
        RouterView: DesktopStub,
      },
    },
  })
}

function setMobileViewport(isMobile) {
  window.matchMedia = vi.fn().mockImplementation((query) => ({
    matches: query === '(max-width: 991.98px)' ? isMobile : false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }))
}

describe('AppLayout mobile drawer accessibility', () => {
  beforeEach(() => {
    settingsState.sidebarDefaultCollapsed = false
    settingsState.tableDensity = 'comfortable'
    loadSettingsMock.mockReset()
    updateSettingsMock.mockReset()
    setMobileViewport(true)
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('hides closed drawer navigation from keyboard/accessibility tree on mobile', async () => {
    const wrapper = mountLayout()
    await flushPromises()

    const sidebar = wrapper.get('#app-sidebar')
    expect(sidebar.attributes('aria-hidden')).toBe('true')
    expect(sidebar.element.inert === true || sidebar.attributes('inert') !== undefined).toBe(true)
    expect(sidebar.attributes('tabindex')).toBe('-1')

    wrapper.unmount()
  })

  it('updates accessibility state when opening and closing, and restores focus to trigger', async () => {
    const wrapper = mountLayout()
    await flushPromises()

    const trigger = wrapper.get('button[aria-controls="app-sidebar"]')
    trigger.element.focus()
    await trigger.trigger('click')
    await flushPromises()
    await nextTick()

    expect(trigger.attributes('aria-expanded')).toBe('true')
    const sidebar = wrapper.get('#app-sidebar')
    expect(sidebar.attributes('aria-hidden')).toBeUndefined()
    expect(sidebar.element.inert === false || sidebar.attributes('inert') === undefined).toBe(true)

    await trigger.trigger('click')
    await flushPromises()
    await nextTick()

    expect(trigger.attributes('aria-expanded')).toBe('false')
    expect(sidebar.attributes('aria-hidden')).toBe('true')
    expect(document.activeElement).toBe(trigger.element)

    wrapper.unmount()
  })

  it('closes on Escape and restores focus to the mobile trigger', async () => {
    const wrapper = mountLayout()
    await flushPromises()

    const trigger = wrapper.get('button[aria-controls="app-sidebar"]')
    trigger.element.focus()
    await trigger.trigger('click')
    await flushPromises()
    await nextTick()

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    await flushPromises()
    await nextTick()

    expect(wrapper.get('#app-sidebar').attributes('aria-hidden')).toBe('true')
    expect(document.activeElement).toBe(trigger.element)

    wrapper.unmount()
  })

  it('closes on route navigation from drawer and moves focus to trigger', async () => {
    const wrapper = mountLayout()
    await flushPromises()

    const trigger = wrapper.get('button[aria-controls="app-sidebar"]')
    await trigger.trigger('click')
    await flushPromises()

    const studentsLink = wrapper.get('a[href="/students"]')
    studentsLink.element.focus()
    await studentsLink.trigger('click')
    await flushPromises()
    await nextTick()

    expect(wrapper.get('#app-sidebar').attributes('aria-hidden')).toBe('true')
    expect(document.activeElement).toBe(trigger.element)

    wrapper.unmount()
  })
})

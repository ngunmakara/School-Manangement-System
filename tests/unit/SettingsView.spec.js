import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import SettingsView from '../../src/views/SettingsView.vue'
import { useSettingsStore } from '../../src/stores/settings'
import { useToast } from '../../src/composables/useToast'

const componentStubs = {
  PageHeader: {
    props: ['title'],
    template:
      '<header class="page-header-stub" :data-title="title"><slot name="actions" /></header>',
  },
  ConfirmDialog: {
    props: ['modelValue', 'title', 'confirmLabel'],
    template:
      '<div v-if="modelValue" class="confirm-dialog-stub"><h2>{{ title }}</h2><slot /><button type="button" @click="$emit(\'confirm\')">{{ confirmLabel }}</button></div>',
  },
}

let pinia

function mountView() {
  return mount(SettingsView, {
    attachTo: document.body,
    global: { plugins: [pinia], stubs: componentStubs },
  })
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

describe('SettingsView', () => {
  it('renders and updates interface preferences', async () => {
    const wrapper = mountView()
    await flushPromises()

    expect(wrapper.get('.page-header-stub').attributes('data-title')).toBe('Settings')
    expect(wrapper.text()).toContain('Interface preferences')

    const checkbox = wrapper.get('#setting-sidebar-collapsed')
    await checkbox.setValue(true)
    await flushPromises()

    const store = useSettingsStore()
    expect(store.sidebarDefaultCollapsed).toBe(true)
    expect(wrapper.text()).toContain('Collapsed')

    const compact = wrapper.get('input[type="radio"][value="compact"]')
    await compact.setValue()
    await flushPromises()
    expect(store.tableDensity).toBe('compact')
    wrapper.unmount()
  })

  it('resets defaults and shows storage retry alert', async () => {
    window.localStorage.setItem(
      'campushub:settings:v1',
      JSON.stringify({ sidebarDefaultCollapsed: true, tableDensity: 'compact' }),
    )
    const wrapper = mountView()
    await flushPromises()

    const resetButton = wrapper
      .findAll('button')
      .find((btn) => btn.text().includes('Reset to defaults'))
    await resetButton.trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('Reset settings to defaults?')

    const confirm = wrapper.get('.confirm-dialog-stub button')
    await confirm.trigger('click')
    await flushPromises()

    const store = useSettingsStore()
    expect(store.settings).toEqual({ sidebarDefaultCollapsed: false, tableDensity: 'comfortable' })

    store.persistenceState = 'failed'
    store.persistenceError = 'Browser storage is not accepting settings saves.'
    await flushPromises()
    expect(wrapper.text()).toContain('Browser storage is not accepting settings saves')
    expect(wrapper.findAll('button').some((btn) => btn.text().includes('Retry save'))).toBe(true)
    wrapper.unmount()
  })
})

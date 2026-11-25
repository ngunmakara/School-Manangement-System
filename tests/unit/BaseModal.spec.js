import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import { defineComponent, nextTick, ref } from 'vue'
import BaseModal, { resetBodyScrollLock } from '../../src/components/common/BaseModal.vue'

const TestHost = defineComponent({
  components: { BaseModal },
  template: `
    <div>
      <BaseModal :model-value="firstOpen" title="First modal" @update:model-value="firstOpen = $event">
        <button type="button">First action</button>
      </BaseModal>
      <BaseModal :model-value="secondOpen" title="Second modal" @update:model-value="secondOpen = $event">
        <button type="button">Second action</button>
      </BaseModal>
    </div>
  `,
  setup() {
    return {
      firstOpen: ref(true),
      secondOpen: ref(true),
    }
  },
})

afterEach(() => {
  document.body.innerHTML = ''
  resetBodyScrollLock()
})

describe('BaseModal', () => {
  it('keeps body scroll locked until the last modal closes', async () => {
    const wrapper = mount(TestHost, {
      attachTo: document.body,
      global: {
        stubs: { teleport: true },
      },
    })

    await flushPromises()

    const dialogs = wrapper.findAll('[role="dialog"]')
    expect(dialogs).toHaveLength(2)
    expect(document.body.classList.contains('ch-modal-open')).toBe(true)

    await dialogs[1].find('.ch-modal-close').trigger('click')
    await flushPromises()
    expect(document.body.classList.contains('ch-modal-open')).toBe(true)

    await dialogs[0].find('.ch-modal-close').trigger('click')
    await flushPromises()
    expect(document.body.classList.contains('ch-modal-open')).toBe(false)

    wrapper.unmount()
  })

  it('removes body scroll lock on unmount cleanup', async () => {
    const wrapper = mount(BaseModal, {
      attachTo: document.body,
      props: {
        modelValue: true,
        title: 'Cleanup modal',
      },
      slots: {
        default: '<button type="button">Action</button>',
      },
      global: {
        stubs: { teleport: true },
      },
    })

    await flushPromises()
    expect(document.body.classList.contains('ch-modal-open')).toBe(true)

    wrapper.unmount()
    await nextTick()

    expect(document.body.classList.contains('ch-modal-open')).toBe(false)
  })

  it('focuses the dialog itself as a keyboard fallback when no focusable child exists', async () => {
    const wrapper = mount(BaseModal, {
      attachTo: document.body,
      props: {
        modelValue: true,
        title: 'Fallback focus',
        hideClose: true,
      },
      global: {
        stubs: { teleport: true },
      },
    })

    await flushPromises()
    await nextTick()

    const dialog = wrapper.get('[role="dialog"]')
    expect(dialog.attributes('tabindex')).toBe('-1')
    expect(document.activeElement).toBe(dialog.element)

    wrapper.unmount()
  })

  it('dismisses on Escape by default', async () => {
    const wrapper = mount(BaseModal, {
      attachTo: document.body,
      props: {
        modelValue: true,
        title: 'Escapable modal',
      },
      slots: {
        default: '<button type="button">Action</button>',
      },
      global: {
        stubs: { teleport: true },
      },
    })

    await flushPromises()
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    await flushPromises()

    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([false])
    expect(wrapper.emitted('close')).toHaveLength(1)

    wrapper.unmount()
  })

  it('does not dismiss on Escape when closeOnBackdrop is false', async () => {
    const wrapper = mount(BaseModal, {
      attachTo: document.body,
      props: {
        modelValue: true,
        title: 'Locked modal',
        closeOnBackdrop: false,
      },
      slots: {
        default: '<button type="button">Action</button>',
      },
      global: {
        stubs: { teleport: true },
      },
    })

    await flushPromises()
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    await wrapper.get('[role="dialog"]').trigger('keydown', { key: 'Escape' })
    await flushPromises()

    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    expect(wrapper.emitted('close')).toBeUndefined()
    expect(document.body.classList.contains('ch-modal-open')).toBe(true)

    wrapper.unmount()
  })

  it('keeps backdrop dismissal behavior intact', async () => {
    const dismissible = mount(BaseModal, {
      attachTo: document.body,
      props: {
        modelValue: true,
        title: 'Dismissible',
      },
      slots: {
        default: '<button type="button">Action</button>',
      },
      global: {
        stubs: { teleport: true },
      },
    })
    const locked = mount(BaseModal, {
      attachTo: document.body,
      props: {
        modelValue: true,
        title: 'Locked',
        closeOnBackdrop: false,
      },
      slots: {
        default: '<button type="button">Action</button>',
      },
      global: {
        stubs: { teleport: true },
      },
    })

    await flushPromises()
    await locked.get('.ch-modal-backdrop').trigger('mousedown')
    await flushPromises()
    expect(locked.emitted('update:modelValue')).toBeUndefined()

    await dismissible.get('.ch-modal-backdrop').trigger('mousedown')
    await flushPromises()
    expect(dismissible.emitted('update:modelValue')?.[0]).toEqual([false])

    locked.unmount()
    dismissible.unmount()
  })
})

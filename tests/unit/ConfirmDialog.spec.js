import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import ConfirmDialog from '../../src/components/common/ConfirmDialog.vue'

afterEach(() => {
  document.body.innerHTML = ''
  document.body.classList.remove('ch-modal-open')
})

describe('ConfirmDialog', () => {
  it('associates the dialog with its descriptive content', async () => {
    const wrapper = mount(ConfirmDialog, {
      attachTo: document.body,
      props: {
        modelValue: true,
        title: 'Delete course?',
        confirmLabel: 'Delete course',
      },
      slots: {
        default: '<p>You are about to delete a course from this browser.</p>',
      },
      global: {
        stubs: { teleport: true },
      },
    })

    await flushPromises()

    const dialog = wrapper.get('[role="dialog"]')
    const describedBy = dialog.attributes('aria-describedby')

    expect(describedBy).toBeTruthy()
    expect(wrapper.get(`[id="${describedBy}"]`).text()).toContain(
      'You are about to delete a course',
    )

    wrapper.unmount()
  })

  it('does not close while a busy action is running', async () => {
    const wrapper = mount(ConfirmDialog, {
      attachTo: document.body,
      props: {
        modelValue: true,
        busy: true,
        title: 'Delete course?',
        confirmLabel: 'Delete course',
      },
      global: {
        stubs: { teleport: true },
      },
    })

    await flushPromises()

    const dialog = wrapper.get('[role="dialog"]')
    expect(
      wrapper.findAll('button').every((button) => button.attributes('disabled') !== undefined),
    ).toBe(true)

    await dialog.trigger('keydown', { key: 'Escape' })
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    await wrapper.get('.ch-modal-backdrop').trigger('mousedown')
    await flushPromises()

    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    expect(wrapper.emitted('cancel')).toBeUndefined()
    expect(wrapper.emitted('confirm')).toBeUndefined()
    expect(document.body.classList.contains('ch-modal-open')).toBe(true)

    wrapper.unmount()
  })
})

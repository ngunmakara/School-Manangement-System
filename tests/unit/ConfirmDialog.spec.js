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
})

import { flushPromises, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { afterEach, describe, expect, it } from 'vitest'
import DepartmentFormModal from '../../src/components/departments/DepartmentFormModal.vue'

function findButton(wrapper, label) {
  return wrapper.findAll('button').find((button) => button.text() === label)
}

afterEach(() => {
  document.body.innerHTML = ''
  document.body.classList.remove('ch-modal-open')
})

describe('DepartmentFormModal', () => {
  it('returns focus to the first field after choosing to keep editing', async () => {
    const wrapper = mount(DepartmentFormModal, {
      attachTo: document.body,
      props: { modelValue: false },
      global: {
        plugins: [createPinia()],
        stubs: { teleport: true },
      },
    })

    await wrapper.setProps({ modelValue: true })
    await flushPromises()

    const nameInput = wrapper.get('#department-field-name')
    await nameInput.setValue('Engineering')

    await findButton(wrapper, 'Cancel').trigger('click')

    expect(wrapper.text()).toContain('Discard unsaved changes?')

    const keepEditing = findButton(wrapper, 'Keep editing')
    keepEditing.element.focus()
    await keepEditing.trigger('click')
    await flushPromises()

    expect(document.activeElement).toBe(nameInput.element)

    wrapper.unmount()
  })
})

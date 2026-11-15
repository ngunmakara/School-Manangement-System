import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import PaginationBar from '../../src/components/common/PaginationBar.vue'

describe('PaginationBar', () => {
  it('renders the default global summary when no override is provided', () => {
    const wrapper = mount(PaginationBar, {
      props: {
        page: 2,
        pageSize: 10,
        total: 25,
        itemLabel: 'teachers',
      },
    })

    expect(wrapper.get('.pagination-summary').text()).toBe('Showing 11–20 of 25 teachers')
  })

  it('uses a summary override while preserving page navigation', async () => {
    const wrapper = mount(PaginationBar, {
      props: {
        page: 1,
        pageSize: 10,
        total: 25,
        itemLabel: 'teachers',
        summary: 'Showing 2 of 10 teachers on this page. Page 1 of 3.',
      },
    })

    expect(wrapper.get('.pagination-summary').text()).toBe(
      'Showing 2 of 10 teachers on this page. Page 1 of 3.',
    )

    await wrapper.get('[aria-label="Next page"]').trigger('click')

    expect(wrapper.emitted('update:page')).toEqual([[2]])
  })
})

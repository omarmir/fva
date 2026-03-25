import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import RatioResultsPanel from './RatioResultsPanel.vue'

describe('RatioResultsPanel', () => {
  it('renders formatted ratios', () => {
    const wrapper = mount(RatioResultsPanel, {
      props: {
        ratios: [
          {
            key: 'current_ratio',
            label: 'Current ratio',
            value: 1.55,
            formulaText: 'assets / liabilities',
            warnings: [],
          },
        ],
      },
    })

    expect(wrapper.text()).toContain('1.55')
    expect(wrapper.text()).toContain('Current ratio')
  })
})

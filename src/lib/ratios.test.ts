import { describe, expect, it } from 'vitest'
import { buildDefaultFields, computeRatios } from './ratios'

describe('computeRatios', () => {
  it('computes all liquidity ratios when fields are present', () => {
    const fields = buildDefaultFields()
    fields.find((field) => field.key === 'cash_and_cash_equivalents')!.value = 100
    fields.find((field) => field.key === 'marketable_securities')!.value = 50
    fields.find((field) => field.key === 'accounts_receivable')!.value = 75
    fields.find((field) => field.key === 'total_current_assets')!.value = 400
    fields.find((field) => field.key === 'total_current_liabilities')!.value = 200

    const ratios = computeRatios(fields, false)

    expect(ratios[0].value).toBe(2)
    expect(ratios[1].value).toBe(1.125)
    expect(ratios[2].value).toBe(0.75)
  })

  it('returns null when denominator is missing', () => {
    const fields = buildDefaultFields()
    fields.find((field) => field.key === 'total_current_assets')!.value = 100
    const ratios = computeRatios(fields, false)

    expect(ratios.every((ratio) => ratio.value === null)).toBe(true)
  })
})

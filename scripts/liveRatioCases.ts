import type { LiquidityFieldKey } from '../src/types/finance'

type RatioKey = 'current_ratio' | 'quick_ratio' | 'cash_ratio'

export type LiveRatioCase = {
  sampleId: string
  expectedFields: Partial<Record<LiquidityFieldKey, number | null>>
  expectedRatios: Partial<Record<RatioKey, number | null>>
}

export const liveRatioCases: LiveRatioCase[] = [
  {
    sampleId: 'capacity-canada-2024',
    expectedFields: {
      cash_and_cash_equivalents: 1298119,
      marketable_securities: 500000,
      accounts_receivable: 59827,
      total_current_assets: 2071608,
      total_current_liabilities: 1444409,
    },
    expectedRatios: {
      current_ratio: 1.4342253475296818,
      quick_ratio: 1.28630187156131,
      cash_ratio: 1.2448821628776892,
    },
  },
]

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
  {
    sampleId: 'growing-chefs-ontario-2025',
    expectedFields: {
      cash_and_cash_equivalents: 290421,
      marketable_securities: null,
      accounts_receivable: 162996,
      inventory: 18528,
      total_current_assets: 525280,
      total_current_liabilities: 296566,
    },
    expectedRatios: {
      current_ratio: 1.7712077581381547,
      quick_ratio: 1.5288907022382876,
      cash_ratio: 0.9792794858480068,
    },
  },
  {
    sampleId: 'huntington-society-2025',
    expectedFields: {
      cash_and_cash_equivalents: 802313,
      marketable_securities: 2687643,
      accounts_receivable: 137008,
      total_current_assets: 3771654,
      total_current_liabilities: 261613,
    },
    expectedRatios: {
      current_ratio: 14.416921177464422,
      quick_ratio: 13.863852331497288,
      cash_ratio: 13.34014746973583,
    },
  },
]

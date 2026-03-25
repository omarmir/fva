import type { ExtractedField, LiquidityFieldKey, RatioResult } from '../types/finance'

const FIELD_LABELS: Record<LiquidityFieldKey, string> = {
  cash_and_cash_equivalents: 'Cash & cash equivalents',
  marketable_securities: 'Marketable securities',
  accounts_receivable: 'Accounts receivable',
  inventory: 'Inventory',
  total_current_assets: 'Total current assets',
  total_current_liabilities: 'Total current liabilities',
}

export function getFieldLabel(key: LiquidityFieldKey) {
  return FIELD_LABELS[key]
}

export function buildDefaultFields(): ExtractedField[] {
  return (Object.keys(FIELD_LABELS) as LiquidityFieldKey[]).map((key) => ({
    key,
    label: FIELD_LABELS[key],
    value: null,
    confidence: 0,
    citations: [],
    status: 'missing',
  }))
}

function safeNumber(input: number | null | undefined) {
  return typeof input === 'number' && Number.isFinite(input) ? input : null
}

function computeDivision(
  numerator: number | null,
  denominator: number | null,
  warnings: string[],
): number | null {
  if (numerator === null || denominator === null) return null
  if (denominator === 0) {
    warnings.push('Current liabilities are 0, so the ratio is undefined.')
    return null
  }

  return numerator / denominator
}

export function getFieldValue(fields: ExtractedField[], key: LiquidityFieldKey) {
  return safeNumber(fields.find((field) => field.key === key)?.value)
}

export function computeRatios(fields: ExtractedField[], isFinancialInstitution = false): RatioResult[] {
  const liabilities = getFieldValue(fields, 'total_current_liabilities')
  const currentAssets = getFieldValue(fields, 'total_current_assets')
  const cash = getFieldValue(fields, 'cash_and_cash_equivalents')
  const marketableSecurities = getFieldValue(fields, 'marketable_securities')
  const receivables = getFieldValue(fields, 'accounts_receivable')

  const commonWarnings = isFinancialInstitution
    ? ['Interpret with caution for financial institutions because balance-sheet structure differs materially.']
    : []

  const currentWarnings = [...commonWarnings]
  const quickWarnings = [...commonWarnings]
  const cashWarnings = [...commonWarnings]

  if (currentAssets === null) currentWarnings.push('Total current assets are missing.')
  if (liabilities === null) {
    currentWarnings.push('Total current liabilities are missing.')
    quickWarnings.push('Total current liabilities are missing.')
    cashWarnings.push('Total current liabilities are missing.')
  }
  if (cash === null) {
    quickWarnings.push('Cash and cash equivalents are missing.')
    cashWarnings.push('Cash and cash equivalents are missing.')
  }
  if (receivables === null) quickWarnings.push('Accounts receivable are missing.')

  const quickSecurities = marketableSecurities ?? 0
  if (marketableSecurities === null) {
    quickWarnings.push('Marketable securities were treated as 0 because no separate value was extracted.')
    cashWarnings.push('Marketable securities were treated as 0 because no separate value was extracted.')
  }

  return [
    {
      key: 'current_ratio',
      label: 'Current ratio',
      value: computeDivision(currentAssets, liabilities, currentWarnings),
      formulaText: 'total current assets / total current liabilities',
      warnings: currentWarnings,
    },
    {
      key: 'quick_ratio',
      label: 'Quick ratio',
      value: computeDivision(
        cash === null || receivables === null ? null : cash + quickSecurities + receivables,
        liabilities,
        quickWarnings,
      ),
      formulaText:
        '(cash and cash equivalents + marketable securities + accounts receivable) / total current liabilities',
      warnings: quickWarnings,
    },
    {
      key: 'cash_ratio',
      label: 'Cash ratio',
      value: computeDivision(cash === null ? null : cash + quickSecurities, liabilities, cashWarnings),
      formulaText: '(cash and cash equivalents + marketable securities) / total current liabilities',
      warnings: cashWarnings,
    },
  ]
}

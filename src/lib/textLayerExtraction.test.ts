import { describe, expect, it } from 'vitest'
import type { ExtractionResult, RenderedPdfPage } from '../types/finance'
import { buildDefaultFields } from './ratios'
import { extractFieldsFromTextPages, reconcileExtractionWithTextPages } from './textLayerExtraction'

function buildResult(): ExtractionResult {
  return {
    companyName: 'Test Org',
    fiscalPeriodLabel: 'FY 2025',
    currency: 'CAD',
    isFinancialInstitution: false,
    source: {
      kind: 'upload',
      fileName: 'test.pdf',
      fileSize: 1,
      lastModified: 1,
    },
    modelId: 'Qwen/Qwen3.5-2B',
    fields: buildDefaultFields(),
    extractionWarnings: [],
  }
}

function buildPage(pageNumber: number, textLines: string[]): RenderedPdfPage {
  return {
    pageNumber,
    textPreview: textLines.join(' '),
    textLines,
    thumbnailDataUrl: 'thumb',
    extractionDataUrl: 'image',
    width: 100,
    height: 100,
  }
}

describe('reconcileExtractionWithTextPages', () => {
  it('fills current-section values from a statement page with implied subtotals', () => {
    const result = buildResult()
    const page = buildPage(4, [
      'CanadaHelps CanaDon',
      'Statement of Financial Position',
      'Assets',
      'Current',
      'Cash $ 3,776,686 $ 2,735,724',
      'Restricted cash 1,104,738 2,651,952',
      'Restricted short-term deposits (Note 3) 2,456,627 3,348,048',
      'Harmonized sales tax receivable 98,994 103,801',
      'Prepaid expenses and other current assets 503,653 580,281',
      'Designated cash (Notes 7 and 10) 11,019,785 10,028,476',
      '$ 18,960,483 19,448,282',
      'Capital assets (Note 5) 11,750 17,797',
      'Liabilities',
      'Current',
      'Accounts payable and accrued liabilities $ 917,836 $ 818,323',
      'Deferred revenue 650,467 610,673',
      'Current portion of long-term debt (Note 8) 33,075 33,075',
      'Contributions due to designated charities (Notes 7 and 10) 11,019,785 10,028,476',
      '12,621,163 11,490,547',
      'Long-term debt (Note 8) 65,220 98,295',
    ])

    const reconciled = reconcileExtractionWithTextPages(result, [page])

    expect(reconciled.fields.find((field) => field.key === 'cash_and_cash_equivalents')?.value).toBe(3776686)
    expect(reconciled.fields.find((field) => field.key === 'marketable_securities')?.value).toBe(2456627)
    expect(reconciled.fields.find((field) => field.key === 'accounts_receivable')?.value).toBe(98994)
    expect(reconciled.fields.find((field) => field.key === 'total_current_assets')?.value).toBe(18960483)
    expect(reconciled.fields.find((field) => field.key === 'total_current_liabilities')?.value).toBe(12621163)
  })

  it('keeps parsing current assets after an assets-held-for-sale row', () => {
    const matches = extractFieldsFromTextPages([
      buildPage(97, [
        'Consolidated Balance Sheets',
        'Assets',
        'Current assets',
        'Cash and cash equivalents (note 8) $ 1,462 $ 1,488',
        'Short term investments 648 464',
        'Accounts receivable (note 9) 1,455 1,298',
        'Credit card receivables (note 10) 4,230 4,132',
        'Inventories (note 11) 6,330 5,820',
        'Prepaid expenses and other assets 376 324',
        'Assets held for sale (note 12) 47 52',
        'Total current assets $ 14,548 $ 13,578',
        'Liabilities',
        'Current liabilities',
        'Total current liabilities $ 11,768 $ 10,847',
      ]),
    ])

    expect(matches.total_current_assets?.value).toBe(14548)
    expect(matches.total_current_liabilities?.value).toBe(11768)
  })

  it('treats liabilities and net assets as a liabilities section header', () => {
    const matches = extractFieldsFromTextPages([
      buildPage(6, [
        'Non-Consolidated Statement of Financial Position',
        'Assets',
        'Current:',
        'Cash and cash equivalents (note 2) $ 15,393 $ 13,159',
        'Accounts receivable (note 3) 1,656 5,706',
        'Short term investments (note 4) 12,683 10,951',
        '30,521 30,431',
        'Liabilities and Net Assets',
        'Current:',
        'Accounts payable and accrued liabilities (note 12) $ 1,893 $ 3,067',
        'Current portion of magazine publications obligations 169 199',
        'Deferred program revenue 1,318 1,282',
        '3,380 4,548',
      ]),
    ])

    expect(matches.total_current_assets?.value).toBe(30521)
    expect(matches.total_current_liabilities?.value).toBe(3380)
  })

  it('supports alternate subtotal labels and liabilities-plus-equity headers', () => {
    const matches = extractFieldsFromTextPages([
      buildPage(8, [
        'Statement of Financial Position',
        'Assets',
        'Current:',
        'Cash and cash equivalents 120',
        'Trade receivables 45',
        'Current assets total 200',
        'Liabilities and Shareholders equity',
        'Current:',
        'Accounts payable and accrued liabilities 80',
        'Current liabilities total 100',
      ]),
    ])

    expect(matches.total_current_assets?.value).toBe(200)
    expect(matches.total_current_liabilities?.value).toBe(100)
  })

  it('treats guaranteed investment certificates as marketable securities when they are current', () => {
    const matches = extractFieldsFromTextPages([
      buildPage(9, [
        'Statement of Financial Position',
        'Assets',
        'Current',
        'Cash - unrestricted 120',
        'Guaranteed investment certificate - due January 25, 2025 50',
        'Accounts receivable 30',
        '200',
        'Liabilities and Fund Balances',
        'Current',
        'Accounts payable 100',
        '100',
      ]),
    ])

    expect(matches.marketable_securities?.value).toBe(50)
    expect(matches.total_current_assets?.value).toBe(200)
    expect(matches.total_current_liabilities?.value).toBe(100)
  })

  it('replaces a grand-total OCR mistake with the current-assets subtotal from page text', () => {
    const result = buildResult()
    result.fields.find((field) => field.key === 'total_current_assets')!.value = 13299787
    result.fields.find((field) => field.key === 'total_current_liabilities')!.value = 1632844

    const page = buildPage(3, [
      'Alongside Hope',
      'Statement of Financial Position',
      'ASSETS',
      'Current',
      'Cash $ 1,402,421 $ 1,101,467',
      'Canadian Foodgrains Bank Association Inc. (Note 3) 1,147,963 829,554',
      'Investments (Note 2) 10,232,393 10,884,701',
      'Grants receivable 75,000 67,500',
      'HST recoverable 18,366 15,310',
      'Other receivable 147,642 4,486',
      'Prepaid expenses 39,400 10,338',
      '$ 13,063,185 $ 12,913,356',
      'Long-Term Investments (Note 2) 236,602 243,132',
      '$ 13,299,787 $ 13,156,488',
      'LIABILITIES',
      'Current',
      'Accounts payable and accrued liabilities $ 54,844 $ 118,039',
      'Deferred contributions (Note 4) 1,578,000 1,437,665',
      '$ 1,632,844 $ 1,555,704',
    ])

    const reconciled = reconcileExtractionWithTextPages(result, [page])

    expect(reconciled.fields.find((field) => field.key === 'cash_and_cash_equivalents')?.value).toBe(1402421)
    expect(reconciled.fields.find((field) => field.key === 'marketable_securities')?.value).toBe(10232393)
    expect(reconciled.fields.find((field) => field.key === 'accounts_receivable')?.value).toBe(147642)
    expect(reconciled.fields.find((field) => field.key === 'total_current_assets')?.value).toBe(13063185)
    expect(reconciled.fields.find((field) => field.key === 'total_current_liabilities')?.value).toBe(1632844)
    expect(reconciled.extractionWarnings).toContain(
      'Replaced OCR value for total current assets with PDF text-layer value from page 3.',
    )
  })

  it('does not treat prose mentions of short-term investments as a marketable-securities row', () => {
    const page = buildPage(86, [
      'The Policy was: 2% cash and short-term investments, 41% bonds and mortgages, 2% emerging market debt.',
    ])

    const matches = extractFieldsFromTextPages([page])

    expect(matches.marketable_securities).toBeUndefined()
  })

  it('clears an OCR-only marketable-securities value when the citation is prose with percentages', () => {
    const result = buildResult()
    const field = result.fields.find((item) => item.key === 'marketable_securities')!
    field.value = 47
    field.rawModelLabel = 'short-term investments, 47% in bonds and mortgages'
    field.citations = [
      {
        fieldKey: 'marketable_securities',
        pageNumber: 87,
        snippet: 'short-term investments, 47% in bonds and mortgages',
      },
    ]
    field.status = 'extracted'
    field.confidence = 0.72

    const reconciled = reconcileExtractionWithTextPages(result, [
      buildPage(87, ['Plan asset allocation', 'No statement row for marketable securities is present here.']),
    ])

    expect(reconciled.fields.find((item) => item.key === 'marketable_securities')?.value).toBeNull()
    expect(reconciled.extractionWarnings).toContain(
      'Cleared OCR value for marketable securities because the PDF text layer did not confirm a statement row.',
    )
  })
})

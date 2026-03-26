import { describe, expect, it } from 'vitest'
import type { ExtractionResult, PositionedTextItem, RenderedPdfPage } from '../types/finance'
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

function buildPage(pageNumber: number, textLines: string[], textItems?: PositionedTextItem[]): RenderedPdfPage {
  return {
    pageNumber,
    textPreview: textLines.join(' '),
    textLines,
    textItems,
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

  it('combines asset and liability sections across separate statement pages', () => {
    const matches = extractFieldsFromTextPages([
      buildPage(5, [
        'Statement of Financial Position',
        'As Assets',
        'Current',
        'Cash 552,628 853,814',
        'Accounts receivable 23,225 98,917',
        'Term deposits (Note 3) 221,266 214,432',
        '815,080 1,185,349',
      ]),
      buildPage(6, [
        'Statement of Financial Position',
        'Liabilities',
        'Current',
        'Accounts payable and accruals 140,587 132,766',
        'Deferred revenue 123,567 280,270',
        '264,154 413,036',
      ]),
    ])

    expect(matches.cash_and_cash_equivalents?.value).toBe(552628)
    expect(matches.accounts_receivable?.value).toBe(23225)
    expect(matches.marketable_securities?.value).toBe(221266)
    expect(matches.total_current_assets?.value).toBe(815080)
    expect(matches.total_current_liabilities?.value).toBe(264154)
  })

  it('treats guaranteed investment certificates as marketable securities when they are current', () => {
    const matches = extractFieldsFromTextPages([
      buildPage(9, [
        'Statement of Financial Position',
        'Assets',
        'Current',
        'Cash - unrestricted 120',
        'Guaranteed investment certificate - due January 25, 2025 50 45',
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

  it('keeps OCR current totals and receivables when the statement page is present but the text layer is too garbled to isolate rows', () => {
    const result = buildResult()
    result.fields.find((item) => item.key === 'accounts_receivable')!.value = 137008
    result.fields.find((item) => item.key === 'accounts_receivable')!.status = 'extracted'
    result.fields.find((item) => item.key === 'marketable_securities')!.value = 2687643
    result.fields.find((item) => item.key === 'marketable_securities')!.status = 'extracted'
    result.fields.find((item) => item.key === 'total_current_assets')!.value = 3771654
    result.fields.find((item) => item.key === 'total_current_assets')!.status = 'extracted'
    result.fields.find((item) => item.key === 'total_current_liabilities')!.value = 261613
    result.fields.find((item) => item.key === 'total_current_liabilities')!.status = 'extracted'

    const reconciled = reconcileExtractionWithTextPages(result, [
      buildPage(2, [
        "INDEPENDENT AUDITOR'S REPORT",
        'We audited the statement of financial position as at March 31, 2025.',
      ]),
      buildPage(5, [
        'HUNTINGTON SOCIETY OF CANADA Statement of Financial Position March 31, 2025 Assets Current assets: Liabilities and Fund Balances Current liabilities:',
      ]),
      buildPage(8, [
        'Statement of Cash Flows',
        'Accounts receivable 93,767 (65,164)',
        'Cash, end of year 802,313 572,499',
      ]),
    ])

    expect(reconciled.fields.find((item) => item.key === 'accounts_receivable')?.value).toBe(137008)
    expect(reconciled.fields.find((item) => item.key === 'marketable_securities')?.value).toBe(2687643)
    expect(reconciled.fields.find((item) => item.key === 'total_current_assets')?.value).toBe(3771654)
    expect(reconciled.fields.find((item) => item.key === 'total_current_liabilities')?.value).toBe(261613)
  })

  it('parses current-period column values from x-aligned statement text items when text lines collapse a fund table', () => {
    const matches = extractFieldsFromTextPages([
      buildPage(
        5,
        ['Statement of Financial Position'],
        [
          { str: 'Assets', x: 10, y: 100 },
          { str: 'Current assets:', x: 20, y: 100 },
          { str: 'Capital assets', x: 80, y: 100 },
          { str: 'Liabilities and Fund Balances', x: 120, y: 100 },
          { str: 'Current liabilities:', x: 130, y: 100 },
          { str: 'Fund balances:', x: 170, y: 100 },
          { str: 'Cash', x: 20, y: 112 },
          { str: 'Investments', x: 30, y: 112 },
          { str: 'Accounts receivable', x: 40, y: 112 },
          { str: 'Accounts payable', x: 130, y: 112 },
          { str: 'Deferred revenue', x: 140, y: 112 },
          { str: '2025', x: 0, y: 200 },
          { str: '100', x: 20, y: 190 },
          { str: '250', x: 30, y: 190 },
          { str: '50', x: 40, y: 190 },
          { str: '450', x: 60, y: 188 },
          { str: '80', x: 130, y: 190 },
          { str: '20', x: 140, y: 190 },
          { str: '100', x: 150, y: 188 },
          { str: '2024', x: 0, y: 260 },
          { str: '90', x: 20, y: 250 },
          { str: '200', x: 30, y: 250 },
          { str: '40', x: 40, y: 250 },
          { str: '330', x: 60, y: 248 },
          { str: '70', x: 130, y: 250 },
          { str: '15', x: 140, y: 250 },
          { str: '85', x: 150, y: 248 },
        ],
      ),
    ])

    expect(matches.cash_and_cash_equivalents?.value).toBe(100)
    expect(matches.marketable_securities?.value).toBe(250)
    expect(matches.accounts_receivable?.value).toBe(50)
    expect(matches.total_current_assets?.value).toBe(450)
    expect(matches.total_current_liabilities?.value).toBe(100)
  })

  it('handles split current headers, portfolio investments, and implied liability subtotals', () => {
    const matches = extractFieldsFromTextPages([
      buildPage(4, [
        'statement of',
        'financial position',
        'assets',
        'cu rren t',
        'Cash 16,081 14,947',
        'Portfolio investments 237,322 265,756',
        'Government remittances recoverable 4,301 2,809',
        'Prepaid expenses 388 387',
        '258,092 283,899',
        'liabilities',
        'cu rren t',
        'Accounts payable and accrued liabilities 12,461 10,927',
        'net assets',
      ]),
    ])

    expect(matches.cash_and_cash_equivalents?.value).toBe(16081)
    expect(matches.marketable_securities?.value).toBe(237322)
    expect(matches.accounts_receivable?.value).toBe(4301)
    expect(matches.total_current_assets?.value).toBe(258092)
    expect(matches.total_current_liabilities?.value).toBe(12461)
  })

  it('uses the current-year total column instead of note numbers or leftmost fund columns', () => {
    const matches = extractFieldsFromTextPages([
      buildPage(4, [
        'Statement of Financial Position',
        'Assets',
        'Current assets',
        'Cash and cash equivalents 3 211,182 277,945',
        'Accounts receivable 4 7,241,551 7,667,001',
        '20,816,420 0 0 20,816,420 18,813,895',
        'Liabilities and Net Assets',
        'Current liabilities',
        '5,952 4,773',
      ]),
    ])

    expect(matches.cash_and_cash_equivalents?.value).toBe(211182)
    expect(matches.accounts_receivable?.value).toBe(7241551)
    expect(matches.total_current_assets?.value).toBe(20816420)
    expect(matches.total_current_liabilities?.value).toBe(5952)
  })

  it('sums multiple current cash and investment rows while recognizing broader receivable labels', () => {
    const matches = extractFieldsFromTextPages([
      buildPage(3, [
        'Statement of Financial Position',
        'Assets',
        'Current',
        'Cash - unrestricted 951,009 2,381,408',
        'Cash - restricted 6,603,002 -',
        'Cash - to fund deferred income - general operations 415,240 207,746',
        'Investments - unrestricted (note 2) - 54,325',
        'Investments - restricted net assets (note 2) 12,438,874 15,041,876',
        'Donations receivable 74,738 39,819',
        '20,999,214 18,389,503',
        'Liabilities',
        'Current',
        'Accounts payable 382,571 411,670',
        'Deferred income - general operations 415,240 207,746',
        '797,811 619,416',
      ]),
    ])

    expect(matches.cash_and_cash_equivalents?.value).toBe(7969251)
    expect(matches.marketable_securities?.value).toBe(12438874)
    expect(matches.accounts_receivable?.value).toBe(74738)
    expect(matches.total_current_assets?.value).toBe(20999214)
    expect(matches.total_current_liabilities?.value).toBe(797811)
  })

  it('does not let year headers override implied liability totals from statement rows', () => {
    const matches = extractFieldsFromTextPages([
      buildPage(
        4,
        [
          'Non-consolidated Statement of Financial Position',
          'Assets',
          'Current assets',
          'Cash $ 2,167,067 $ 6,735,135',
          'Investments (Note 5) 3,083,151 2,778,963',
          'Accounts receivable (Note 8) 356,138 561,716',
          '5,997,637 10,287,518',
          'Liabilities and Accumulated Surplus',
          'Current liabilities',
          'Accounts payable and accrued liabilities $ 1,096,327 $ 419,986',
          'Deferred contributions (Note 6) 1,750,482 7,202,009',
          '2,846,809 7,621,995',
        ],
        [
          { str: 'Current assets', x: 20, y: 100 },
          { str: 'Current liabilities', x: 120, y: 100 },
          { str: 'Cash', x: 20, y: 112 },
          { str: 'Investments', x: 32, y: 112 },
          { str: 'Accounts payable', x: 120, y: 112 },
          { str: 'Deferred contributions', x: 132, y: 112 },
          { str: '2025', x: 146, y: 200 },
          { str: '2,167,067', x: 20, y: 190 },
          { str: '3,083,151', x: 32, y: 190 },
          { str: '1,096,327', x: 120, y: 190 },
          { str: '2,846,809', x: 132, y: 188 },
        ],
      ),
    ])

    expect(matches.total_current_assets?.value).toBe(5997637)
    expect(matches.total_current_liabilities?.value).toBe(2846809)
  })
})

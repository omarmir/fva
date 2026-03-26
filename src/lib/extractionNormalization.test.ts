import { describe, expect, it } from 'vitest'
import { normalizeModelContent } from './extractionNormalization'

describe('normalizeModelContent', () => {
  it('maps HTML table rows into liquidity fields', () => {
    const result = normalizeModelContent(
      `<table>
        <tr><td>Consolidated Balance Sheets</td><td>As at December 28, 2024</td></tr>
        <tr><td>(millions of Canadian dollars)</td><td></td></tr>
        <tr><td>Cash and cash equivalents (note 8)</td><td>$1,462</td></tr>
        <tr><td>Short term investments</td><td>$648</td></tr>
        <tr><td>Accounts receivable (note 9)</td><td>$1,455</td></tr>
        <tr><td>Inventories (note 11)</td><td>$4,230</td></tr>
        <tr><td>Total current assets</td><td>$14,548</td></tr>
        <tr><td>Total current liabilities</td><td>$11,768</td></tr>
      </table>`,
      {
        modelId: 'vision-html-model',
        source: {
          kind: 'sample',
          sampleId: 'loblaw-2024',
          label: 'Loblaw 2024 Annual Report',
          pdfPath: '/reports/loblaw-2024-annual-report.pdf',
        },
        fallbackPageNumber: 97,
        sampleMetadata: null,
      },
    )

    expect(result.fields.find((field) => field.key === 'cash_and_cash_equivalents')?.value).toBe(1462)
    expect(result.fields.find((field) => field.key === 'total_current_liabilities')?.value).toBe(11768)
    expect(result.currency).toBe('CAD')
    expect(result.extractionWarnings[0]).toContain('HTML table')
  })

  it('parses fenced Qwen JSON and uses its top-level metadata', () => {
    const result = normalizeModelContent(
      '```json\n{\n  "companyName": "Loblaw Companies Limited",\n  "fiscalPeriodLabel": "As at December 28, 2024",\n  "currency": "millions of Canadian dollars",\n  "fields": [\n    {\n      "key": "cash_and_cash_equivalents",\n      "value": 1462,\n      "rawModelLabel": "Cash and cash equivalents (note 8)",\n      "snippet": "Cash and cash equivalents (note 8) | 1,462",\n      "pageNumber": 97\n    },\n    {\n      "key": "total_current_liabilities",\n      "value": 11768,\n      "rawModelLabel": "Total current liabilities",\n      "snippet": "Total current liabilities | 11,768",\n      "pageNumber": 97\n    }\n  ]\n}\n```',
      {
        modelId: 'Qwen/Qwen3.5-2B',
        source: {
          kind: 'upload',
          fileName: 'loblaw.pdf',
          fileSize: 1,
          lastModified: 1,
        },
        fallbackPageNumber: 97,
        sampleMetadata: null,
      },
    )

    expect(result.companyName).toBe('Loblaw Companies Limited')
    expect(result.fiscalPeriodLabel).toBe('As at December 28, 2024')
    expect(result.currency).toBe('CAD')
    expect(result.fields.find((field) => field.key === 'cash_and_cash_equivalents')?.citations[0]?.pageNumber).toBe(
      97,
    )
    expect(result.extractionWarnings[0]).toContain('fenced JSON')
  })

  it('uses model keys when labels are generic or omitted', () => {
    const result = normalizeModelContent(
      JSON.stringify({
        companyName: 'CanadaHelps CanaDon',
        fiscalPeriodLabel: 'As at June 30, 2025',
        currency: 'USD',
        fields: [
          {
            key: 'cash_and_cash_equivalents',
            value: 3776686,
            rawModelLabel: 'Cash',
            snippet: 'Cash $ 3,776,686',
            pageNumber: 4,
          },
          {
            key: 'short_term_investments',
            value: 2456627,
            rawModelLabel: 'Restricted short-term deposits (Note 3)',
            snippet: 'Restricted short-term deposits (Note 3) 2,456,627',
            pageNumber: 4,
          },
          {
            key: 'accounts_receivable',
            value: 98994,
            rawModelLabel: 'Harmonized sales tax receivable',
            snippet: 'Harmonized sales tax receivable 98,994',
            pageNumber: 4,
          },
          {
            key: 'total_current_assets',
            value: 24407946,
            rawModelLabel: null,
            snippet: 'Total: $ 24,407,946',
            pageNumber: 4,
          },
          {
            key: 'total_current_liabilities',
            value: 12686383,
            rawModelLabel: null,
            snippet: 'Total: $ 12,686,383',
            pageNumber: 4,
          },
        ],
      }),
      {
        modelId: 'Qwen/Qwen3.5-2B',
        source: {
          kind: 'upload',
          fileName: 'canadahelps.pdf',
          fileSize: 1,
          lastModified: 1,
        },
        fallbackPageNumber: 4,
        sampleMetadata: null,
      },
    )

    expect(result.fields.find((field) => field.key === 'cash_and_cash_equivalents')?.value).toBe(3776686)
    expect(result.fields.find((field) => field.key === 'marketable_securities')?.value).toBe(2456627)
    expect(result.fields.find((field) => field.key === 'accounts_receivable')?.value).toBe(98994)
    expect(result.fields.find((field) => field.key === 'total_current_assets')?.value).toBe(24407946)
    expect(result.fields.find((field) => field.key === 'total_current_liabilities')?.value).toBe(12686383)
  })

  it('matches common statement label variants without relying on sample metadata', () => {
    const result = normalizeModelContent(
      `<table>
        <tr><td>Statement of Financial Position</td><td>As at March 31, 2025</td></tr>
        <tr><td>Cash</td><td>120</td></tr>
        <tr><td>Short-term deposits</td><td>35</td></tr>
        <tr><td>Trade receivables</td><td>45</td></tr>
        <tr><td>Materials and supplies</td><td>18</td></tr>
        <tr><td>Current assets total</td><td>250</td></tr>
        <tr><td>Current liabilities total</td><td>100</td></tr>
      </table>`,
      {
        modelId: 'vision-html-model',
        source: {
          kind: 'upload',
          fileName: 'generic.pdf',
          fileSize: 1,
          lastModified: 1,
        },
        fallbackPageNumber: 8,
        sampleMetadata: null,
      },
    )

    expect(result.fields.find((field) => field.key === 'cash_and_cash_equivalents')?.value).toBe(120)
    expect(result.fields.find((field) => field.key === 'marketable_securities')?.value).toBe(35)
    expect(result.fields.find((field) => field.key === 'accounts_receivable')?.value).toBe(45)
    expect(result.fields.find((field) => field.key === 'inventory')?.value).toBe(18)
    expect(result.fields.find((field) => field.key === 'total_current_assets')?.value).toBe(250)
    expect(result.fields.find((field) => field.key === 'total_current_liabilities')?.value).toBe(100)
  })

  it('treats guaranteed investment certificates as marketable securities', () => {
    const result = normalizeModelContent(
      `<table>
        <tr><td>Statement of Financial Position</td><td>As at December 31, 2024</td></tr>
        <tr><td>Guaranteed investment certificate - due January 25, 2025</td><td>500,000</td></tr>
      </table>`,
      {
        modelId: 'vision-html-model',
        source: {
          kind: 'upload',
          fileName: 'gic.pdf',
          fileSize: 1,
          lastModified: 1,
        },
        fallbackPageNumber: 3,
        sampleMetadata: null,
      },
    )

    expect(result.fields.find((field) => field.key === 'marketable_securities')?.value).toBe(500000)
  })

  it('matches broader receivable labels from nonprofit statements', () => {
    const result = normalizeModelContent(
      `<table>
        <tr><td>Statement of Financial Position</td><td>As at December 31, 2024</td></tr>
        <tr><td>Donations receivable</td><td>74,738</td></tr>
        <tr><td>Amounts receivable</td><td>31,249</td></tr>
      </table>`,
      {
        modelId: 'vision-html-model',
        source: {
          kind: 'upload',
          fileName: 'receivables.pdf',
          fileSize: 1,
          lastModified: 1,
        },
        fallbackPageNumber: 3,
        sampleMetadata: null,
      },
    )

    expect(result.fields.find((field) => field.key === 'accounts_receivable')?.value).toBe(74738)
  })
})

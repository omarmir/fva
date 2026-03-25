import { describe, expect, it } from 'vitest'
import { rankCandidatePages } from './pageRanking'

describe('rankCandidatePages', () => {
  it('prioritizes pages with statement keywords and numeric density', () => {
    const ranked = rankCandidatePages([
      {
        pageNumber: 5,
        textPreview: 'Marketing overview and photos',
        textLines: ['Marketing overview and photos'],
        thumbnailDataUrl: 'a',
        extractionDataUrl: 'a',
        width: 100,
        height: 100,
      },
      {
        pageNumber: 42,
        textPreview:
          'Consolidated balance sheets current assets current liabilities cash and cash equivalents 100 200 300',
        textLines: [
          'Consolidated Balance Sheets',
          'Assets',
          'Current assets',
          'Cash and cash equivalents 100',
          'Total current liabilities 300',
        ],
        thumbnailDataUrl: 'b',
        extractionDataUrl: 'b',
        width: 100,
        height: 100,
      },
    ])

    expect(ranked[0].pageNumber).toBe(42)
    expect(ranked[0].score).toBeGreaterThan(ranked[1].score)
  })

  it('prefers a structured statement page over a note page with overlapping keywords', () => {
    const ranked = rankCandidatePages([
      {
        pageNumber: 50,
        textPreview:
          'Notes to the financial statements trade receivables short-term investments 45% 35% 20% 100 200 300',
        textLines: [
          'Notes to the financial statements',
          'Portfolio allocation',
          'Trade receivables and short-term investments are discussed in note 8.',
          '45% 35% 20%',
          '100 200 300',
        ],
        thumbnailDataUrl: 'a',
        extractionDataUrl: 'a',
        width: 100,
        height: 100,
      },
      {
        pageNumber: 62,
        textPreview:
          'Statement of Financial Position Assets Current Cash and cash equivalents 120 Accounts receivable 45 Liabilities and Fund Balances Current Accounts payable 60',
        textLines: [
          'Statement of Financial Position',
          'Assets',
          'Current',
          'Cash and cash equivalents 120',
          'Accounts receivable 45',
          'Liabilities and Fund Balances',
          'Current',
          'Accounts payable 60',
        ],
        thumbnailDataUrl: 'b',
        extractionDataUrl: 'b',
        width: 100,
        height: 100,
      },
    ])

    expect(ranked[0].pageNumber).toBe(62)
    expect(ranked[0].reasons).toContain('Statement title match.')
    expect(ranked[1].reasons).toContain('Looks like a note or non-balance-sheet statement.')
  })
})

import type { RankedPdfPage } from '../types/finance'

type ModelInfoResponse = {
  data?: Array<{ id?: string }>
}

export function normalizeVllmBaseUrl(baseUrl: string) {
  const trimmed = baseUrl.trim().replace(/\/+$/g, '')

  return trimmed
    .replace(/\/v1\/chat\/completions$/i, '')
    .replace(/\/v1\/models$/i, '')
    .replace(/\/v1$/i, '')
}

export function buildVllmUrl(baseUrl: string, path: `/v1/${string}`) {
  return `${normalizeVllmBaseUrl(baseUrl)}${path}`
}

export function buildPrompt(pages: RankedPdfPage[]) {
  return [
    {
      type: 'text',
      text: `You are doing OCR on financial statement page images and extracting liquidity inputs.
Rules:
- Focus on the consolidated balance sheet or statement of financial position.
- Use the current/latest period shown on the statement page.
- Extract these line items when visible: cash and cash equivalents, short term investments or marketable securities, accounts receivable, inventory, total current assets, total current liabilities.
- Prefer consolidated statements over notes.
- Only use rows or subtotals that appear on the face of the statement itself.
- Do not extract values from note disclosures, portfolio allocations, percentages, cash flow statements, or prose paragraphs.
- If total current assets or total current liabilities are not shown as a row or clear current-section subtotal, return null for that field.
Preferred output:
Return a strict JSON object with this shape and no markdown fences:
{
  "companyName": string | null,
  "fiscalPeriodLabel": string | null,
  "periodEndDate": string | null,
  "currency": string | null,
  "extractionWarnings": string[],
  "fields": [
    {
      "key": "cash_and_cash_equivalents" | "marketable_securities" | "accounts_receivable" | "inventory" | "total_current_assets" | "total_current_liabilities",
      "value": number | null,
      "rawModelLabel": string | null,
      "snippet": string | null,
      "pageNumber": number | null
    }
  ]
}
If you cannot produce valid JSON, return only an HTML table containing the OCR'd balance sheet rows.
Do not add prose before or after the JSON or table.`,
    },
    ...pages.flatMap((page) => [
      {
        type: 'text',
        text: `Page ${page.pageNumber}. Candidate reasons: ${page.reasons?.join('; ') || 'none'}`,
      },
      {
        type: 'image_url',
        image_url: {
          url: page.extractionDataUrl,
        },
      },
    ]),
  ]
}

export async function fetchAvailableModel(baseUrl: string) {
  const modelsUrl = buildVllmUrl(baseUrl, '/v1/models')
  const response = await fetch(modelsUrl)
  if (!response.ok) {
    throw new Error(`Failed to load models from ${modelsUrl}.`)
  }

  const payload = (await response.json()) as ModelInfoResponse
  const modelId = payload.data?.[0]?.id
  if (!modelId) {
    throw new Error('No model was reported by the vLLM endpoint.')
  }

  return modelId
}

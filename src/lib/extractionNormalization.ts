import type {
  ExtractionResult,
  LiquidityFieldKey,
  ReportSource,
  SampleReport,
  SourceCitation,
} from '../types/finance'
import { buildDefaultFields } from './ratios'

const FIELD_MATCHERS: Array<{
  key: LiquidityFieldKey
  patterns: RegExp[]
}> = [
  { key: 'cash_and_cash_equivalents', patterns: [/cash and cash equivalents/i, /^cash\b/i] },
  {
    key: 'marketable_securities',
    patterns: [
      /short term investments?/i,
      /short-term investments?/i,
      /marketable securities/i,
      /short-term deposits?/i,
      /term deposits?/i,
      /guaranteed investment certificates?/i,
      /\bgics?\b/i,
    ],
  },
  { key: 'accounts_receivable', patterns: [/accounts receivable/i, /trade receivables?/i, /grants? receivable/i] },
  { key: 'inventory', patterns: [/inventor/i, /materials? and supplies/i] },
  { key: 'total_current_assets', patterns: [/total current assets?/i, /current assets? total/i] },
  { key: 'total_current_liabilities', patterns: [/total current liabilities?/i, /current liabilities? total/i] },
]

type NormalizationOptions = {
  modelId: string
  source: ReportSource
  fallbackPageNumber: number
  sampleMetadata: SampleReport | null
}

type RowRecord = {
  label: string
  rawLabel?: string
  value: number | null
  snippet: string
  pageNumber?: number | null
  normalizedKey?: LiquidityFieldKey | null
}

type ParsedJsonField = {
  key?: string | null
  value?: number | string | null
  rawModelLabel?: string | null
  snippet?: string | null
  pageNumber?: number | null
}

type ParsedJsonExtraction = {
  companyName?: string | null
  fiscalPeriodLabel?: string | null
  periodEndDate?: string | null
  currency?: string | null
  sector?: string | null
  isFinancialInstitution?: boolean | null
  extractionWarnings?: string[]
  fields?: ParsedJsonField[]
}

function normalizeParsedFieldKey(key: string | null | undefined): LiquidityFieldKey | null {
  if (!key) return null

  switch (key) {
    case 'cash_and_cash_equivalents':
      return 'cash_and_cash_equivalents'
    case 'marketable_securities':
    case 'short_term_investments':
    case 'short_term_investment':
      return 'marketable_securities'
    case 'accounts_receivable':
    case 'receivables':
    case 'other_receivables':
      return 'accounts_receivable'
    case 'inventory':
    case 'inventories':
    case 'materials_and_supplies':
      return 'inventory'
    case 'total_current_assets':
    case 'current_assets_total':
      return 'total_current_assets'
    case 'total_current_liabilities':
    case 'current_liabilities_total':
      return 'total_current_liabilities'
    default:
      return null
  }
}

function decodeEntities(value: string) {
  return value
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
}

function stripTags(value: string) {
  return decodeEntities(value)
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function parseNumber(value: string) {
  const cleaned = value.replace(/\$/g, '').replace(/,/g, '').replace(/\s+/g, '')
  if (cleaned === '' || cleaned === '-' || cleaned === '—') return null

  const negativeMatch = cleaned.match(/^\((.+)\)$/)
  const normalized = negativeMatch ? `-${negativeMatch[1]}` : cleaned
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

function extractValueFromCells(cells: string[]) {
  for (let index = cells.length - 1; index >= 0; index -= 1) {
    const matches = cells[index].match(/\(?\$?[\d,]+(?:\.\d+)?\)?|—|-/g)
    if (!matches) continue

    for (let matchIndex = matches.length - 1; matchIndex >= 0; matchIndex -= 1) {
      const value = parseNumber(matches[matchIndex])
      if (value !== null) return value
    }
  }

  return null
}

function parseHtmlRows(content: string): RowRecord[] {
  const rows = Array.from(content.matchAll(/<tr[\s\S]*?>([\s\S]*?)<\/tr>/gi))
  return rows
    .map<RowRecord | null>((row) => {
      const cells = Array.from(row[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)).map((cell) =>
        stripTags(cell[1]),
      )

      if (cells.length === 0) return null

      return {
        label: cells[0],
        value: extractValueFromCells(cells),
        snippet: cells.join(' | '),
        pageNumber: null,
      } satisfies RowRecord
    })
    .filter((row): row is RowRecord => row !== null)
}

function extractJsonObject(content: string) {
  const trimmed = content.trim()
  const fencedMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i)
  if (fencedMatch) return fencedMatch[1].trim()

  if (trimmed.startsWith('{') && trimmed.endsWith('}')) return trimmed

  const firstBrace = trimmed.indexOf('{')
  const lastBrace = trimmed.lastIndexOf('}')
  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) return null

  return trimmed.slice(firstBrace, lastBrace + 1)
}

function parseJsonExtraction(content: string): ParsedJsonExtraction | null {
  try {
    const jsonText = extractJsonObject(content)
    if (!jsonText) return null

    const parsed = JSON.parse(jsonText)
    if (!parsed || typeof parsed !== 'object') return null

    return parsed as ParsedJsonExtraction
  } catch {
    return null
  }
}

function parseJsonRows(content: string): RowRecord[] | null {
  const parsed = parseJsonExtraction(content)
  if (!parsed || !Array.isArray(parsed.fields)) return null

  return parsed.fields.map((field) => ({
    label: String(field.rawModelLabel ?? field.key ?? ''),
    rawLabel: typeof field.rawModelLabel === 'string' ? field.rawModelLabel : undefined,
    value:
      typeof field.value === 'number'
        ? field.value
        : typeof field.value === 'string'
          ? parseNumber(field.value)
          : null,
    snippet: String(field.snippet ?? field.rawModelLabel ?? field.key ?? ''),
    pageNumber: typeof field.pageNumber === 'number' ? field.pageNumber : null,
    normalizedKey: normalizeParsedFieldKey(field.key),
  }))
}

function normalizeCurrency(value: string | null | undefined) {
  if (!value) return null
  const lower = value.toLowerCase()
  if (lower.includes('canadian dollar') || lower === 'cad') return 'CAD'
  if (lower.includes('u.s. dollar') || lower.includes('us dollar') || lower === 'usd') return 'USD'
  return value
}

function deriveCompanyName(
  rows: RowRecord[],
  source: ReportSource,
  sampleMetadata: SampleReport | null,
  parsedJson: ParsedJsonExtraction | null,
) {
  if (sampleMetadata) return sampleMetadata.companyName
  if (parsedJson?.companyName) return parsedJson.companyName

  const footerRow = rows.find((row) => /limited|inc\.|corporation|company/i.test(row.snippet))
  if (footerRow) {
    const matched = footerRow.snippet.match(
      /([A-Z][A-Za-z&.,' -]+(?:Limited|Inc\.|Corporation|Company))/,
    )
    if (matched) return matched[1].trim()
  }

  return source.kind === 'upload' ? source.fileName.replace(/\.pdf$/i, '') : source.label
}

function deriveCurrency(rows: RowRecord[]) {
  const currencyRow = rows.find((row) => /canadian dollars|us dollars|usd|cad/i.test(row.snippet))
  if (!currencyRow) return 'CAD'
  if (/canadian dollars|cad/i.test(currencyRow.snippet)) return 'CAD'
  if (/us dollars|usd/i.test(currencyRow.snippet)) return 'USD'
  return 'CAD'
}

function deriveFiscalPeriod(
  rows: RowRecord[],
  sampleMetadata: SampleReport | null,
  parsedJson: ParsedJsonExtraction | null,
) {
  if (sampleMetadata) return sampleMetadata.fiscalPeriodLabel
  if (parsedJson?.fiscalPeriodLabel) return parsedJson.fiscalPeriodLabel

  const headerRow = rows.find((row) => /as at .*20\d\d/i.test(row.snippet))
  if (!headerRow) return 'Current period'
  const matched = headerRow.snippet.match(/As at [A-Za-z]+ \d{1,2}, \d{4}/i)
  return matched?.[0] ?? 'Current period'
}

function buildCitations(key: LiquidityFieldKey, fallbackPageNumber: number, row: RowRecord | undefined): SourceCitation[] {
  if (!row) return []

  return [
    {
      pageNumber: row.pageNumber ?? fallbackPageNumber,
      snippet: row.snippet,
      fieldKey: key,
    },
  ]
}

export function normalizeModelContent(content: string, options: NormalizationOptions): ExtractionResult {
  const { modelId, source, fallbackPageNumber, sampleMetadata } = options
  const parsedJson = parseJsonExtraction(content)
  const rows = parseJsonRows(content) ?? parseHtmlRows(content)
  const fields = buildDefaultFields()
  const warnings: string[] = [...(parsedJson?.extractionWarnings ?? [])]

  if (content.includes('<table')) {
    warnings.push(`${modelId} returned an OCR HTML table, so the app normalized the rows client-side.`)
  } else if (content.includes('```')) {
    warnings.push(`${modelId} returned fenced JSON, so the app stripped the markdown wrapper before parsing.`)
  }

  for (const field of fields) {
    const matchedRow = rows.find((row) =>
      row.normalizedKey === field.key ||
      FIELD_MATCHERS.find((matcher) => matcher.key === field.key)?.patterns.some((pattern) => pattern.test(row.label)),
    )

    field.value = matchedRow?.value ?? null
    field.rawModelLabel =
      matchedRow?.rawLabel ?? (matchedRow?.normalizedKey === field.key ? undefined : matchedRow?.label)
    field.confidence = matchedRow?.value === null || matchedRow === undefined ? 0.2 : 0.72
    field.citations = buildCitations(field.key, fallbackPageNumber, matchedRow)
    field.status = matchedRow?.value === null || matchedRow === undefined ? 'missing' : 'extracted'
  }

  return {
    companyName: deriveCompanyName(rows, source, sampleMetadata, parsedJson),
    fiscalPeriodLabel: deriveFiscalPeriod(rows, sampleMetadata, parsedJson),
    periodEndDate: sampleMetadata?.periodEndDate ?? parsedJson?.periodEndDate ?? undefined,
    currency: normalizeCurrency(parsedJson?.currency) ?? deriveCurrency(rows),
    sector: sampleMetadata?.sector ?? parsedJson?.sector ?? undefined,
    isFinancialInstitution:
      sampleMetadata?.isFinancialInstitution ??
      parsedJson?.isFinancialInstitution ??
      /bank|insurance/i.test(rows.map((row) => row.snippet).join(' ')),
    source,
    modelId,
    fields,
    extractionWarnings: warnings,
  }
}

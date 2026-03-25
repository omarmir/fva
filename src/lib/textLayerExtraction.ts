import type { ExtractionResult, LiquidityFieldKey, RenderedPdfPage, SourceCitation } from '../types/finance'

type TextItemLike = {
  str: string
  transform: number[]
}

type FieldMatch = {
  fieldKey: LiquidityFieldKey
  label: string
  value: number
  citation: SourceCitation
  priority: number
}

const NUMBER_PATTERN = /\(?\$?[\d,]+(?:\.\d+)?\)?|(?:^|\s)(?:—|-)(?=$|\s)/g
const NOTE_REFERENCE_PATTERN = /\((?:note|notes)[^)]+\)|\b(?:note|notes)\s+\d+[a-z]?\b/gi
const MONTH_DATE_PATTERN =
  /\b(?:january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2},\s+\d{4}\b/gi
const PERCENTAGE_PATTERN = /\b\d+(?:\.\d+)?%/g
const Y_TOLERANCE = 2
const STATEMENT_TITLE_PATTERNS = [
  /balance sheets?/i,
  /statements? of financial position/i,
  /statement of net assets/i,
  /statement of financial condition/i,
]
const ASSET_SECTION_PATTERNS = [/^assets?:?$/i]
const LIABILITY_SECTION_PATTERNS = [
  /^liabilities:?$/i,
  /^liabilities and (?:equity|net assets|fund balances?|shareholders?'? equity|stockholders?'? equity|members?'? equity|partners?'? capital)s?:?$/i,
]
const CURRENT_ASSET_SECTION_PATTERNS = [/^current assets?:?$/i]
const CURRENT_LIABILITY_SECTION_PATTERNS = [/^current liabilities?:?$/i]
const CURRENT_ASSET_TOTAL_PATTERNS = [/^total current assets?\b/i, /^current assets? total\b/i]
const CURRENT_LIABILITY_TOTAL_PATTERNS = [/^total current liabilities?\b/i, /^current liabilities? total\b/i]

export function buildTextLines(items: TextItemLike[]) {
  const groups: Array<{
    y: number
    items: Array<TextItemLike & { x: number; y: number }>
  }> = []

  const positioned = items
    .filter((item) => item.str.trim().length > 0)
    .map((item) => ({
      ...item,
      x: item.transform[4] ?? 0,
      y: item.transform[5] ?? 0,
    }))
    .sort((left, right) => (Math.abs(right.y - left.y) > Y_TOLERANCE ? right.y - left.y : left.x - right.x))

  for (const item of positioned) {
    const group = groups.find((candidate) => Math.abs(candidate.y - item.y) <= Y_TOLERANCE)
    if (group) {
      group.items.push(item)
      continue
    }

    groups.push({
      y: item.y,
      items: [item],
    })
  }

  return groups
    .sort((left, right) => right.y - left.y)
    .map((group) =>
      group.items
        .sort((left, right) => left.x - right.x)
        .map((item) => item.str)
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim(),
    )
    .filter(Boolean)
}

function parseNumberToken(token: string) {
  const cleaned = token.trim().replace(/\$/g, '').replace(/,/g, '').replace(/\s+/g, '')
  if (cleaned === '' || cleaned === '-' || cleaned === '—') return null

  const negativeMatch = cleaned.match(/^\((.+)\)$/)
  const normalized = negativeMatch ? `-${negativeMatch[1]}` : cleaned
  const value = Number(normalized)
  return Number.isFinite(value) ? value : null
}

function extractNumbers(line: string) {
  const sanitized = line
    .replace(NOTE_REFERENCE_PATTERN, ' ')
    .replace(MONTH_DATE_PATTERN, ' ')
    .replace(PERCENTAGE_PATTERN, ' ')
  const matches = sanitized.match(NUMBER_PATTERN) ?? []
  return matches.map(parseNumberToken).filter((value): value is number => value !== null)
}

function lineEndsWithAmount(line: string) {
  const sanitized = line
    .replace(NOTE_REFERENCE_PATTERN, ' ')
    .replace(MONTH_DATE_PATTERN, ' ')
    .replace(PERCENTAGE_PATTERN, ' ')
    .trim()
  return /(?:\(?\$?[\d,]+(?:\.\d+)?\)?|—|-)\s*$/.test(sanitized)
}

function shouldRejectFieldLine(line: string, normalized: string) {
  if (/cash flows|beginning of year|end of year|consist of/i.test(normalized)) return true
  if (line.includes('%') && !lineEndsWithAmount(line)) return true
  return false
}

function isNumericOnlyLine(line: string) {
  const numbers = extractNumbers(line)
  if (numbers.length === 0) return false

  const stripped = line.replace(NUMBER_PATTERN, '').replace(/[$\s]/g, '').trim()
  return stripped === ''
}

function normalizeLine(line: string) {
  return line.toLowerCase().replace(/\s+/g, ' ').trim()
}

function matchesAnyPattern(line: string, patterns: RegExp[]) {
  return patterns.some((pattern) => pattern.test(line))
}

function scoreStatementPage(lines: string[]) {
  let score = 0

  if (lines.some((line) => matchesAnyPattern(line, STATEMENT_TITLE_PATTERNS))) score += 20
  if (lines.some((line) => matchesAnyPattern(line, ASSET_SECTION_PATTERNS))) score += 6
  if (lines.some((line) => matchesAnyPattern(line, LIABILITY_SECTION_PATTERNS))) score += 6
  if (lines.some((line) => /^current\b/i.test(line))) score += 4
  if (
    lines.some(
      (line) =>
        matchesAnyPattern(line, CURRENT_ASSET_TOTAL_PATTERNS) ||
        matchesAnyPattern(line, CURRENT_LIABILITY_TOTAL_PATTERNS),
    )
  ) {
    score += 6
  }

  return score
}

function pageLines(page: Pick<RenderedPdfPage, 'textLines' | 'textPreview'>) {
  if (page.textLines && page.textLines.length > 0) return page.textLines
  return page.textPreview ? page.textPreview.split(/\n+/) : []
}

function chooseBetterFieldMatch(current: FieldMatch | undefined, candidate: FieldMatch) {
  if (!current) return candidate
  if (candidate.priority > current.priority) return candidate
  if (candidate.priority === current.priority && candidate.citation.pageNumber < current.citation.pageNumber) {
    return candidate
  }
  return current
}

function buildFieldMatch(
  fieldKey: LiquidityFieldKey,
  label: string,
  value: number,
  pageNumber: number,
  snippet: string,
  priority: number,
): FieldMatch {
  return {
    fieldKey,
    label,
    value,
    citation: {
      fieldKey,
      pageNumber,
      snippet,
    },
    priority,
  }
}

function currentSectionFieldMatch(pageNumber: number, line: string): FieldMatch | null {
  const value = extractNumbers(line)[0]
  if (value === undefined) return null

  const normalized = normalizeLine(line)
  if (shouldRejectFieldLine(line, normalized)) return null

  if (/cash and cash equivalents/.test(normalized)) {
    return buildFieldMatch('cash_and_cash_equivalents', line, value, pageNumber, line, 120)
  }

  if (/^cash\b/.test(normalized)) {
    return buildFieldMatch('cash_and_cash_equivalents', line, value, pageNumber, line, 110)
  }

  if (/short[ -]term investments?|marketable securities/.test(normalized)) {
    return buildFieldMatch('marketable_securities', line, value, pageNumber, line, 110)
  }

  if (/guaranteed investment certificates?\b|\bgics?\b/.test(normalized)) {
    return buildFieldMatch('marketable_securities', line, value, pageNumber, line, 105)
  }

  if (/short[ -]term deposits?/.test(normalized)) {
    return buildFieldMatch('marketable_securities', line, value, pageNumber, line, 100)
  }

  if (/term deposits?/.test(normalized)) {
    return buildFieldMatch('marketable_securities', line, value, pageNumber, line, 95)
  }

  if (/^investments?\b/.test(normalized) && !/long[- ]term/.test(normalized)) {
    return buildFieldMatch('marketable_securities', line, value, pageNumber, line, 90)
  }

  if (/accounts receivable/.test(normalized)) {
    return buildFieldMatch('accounts_receivable', line, value, pageNumber, line, 110)
  }

  if (/other receivable/.test(normalized)) {
    return buildFieldMatch('accounts_receivable', line, value, pageNumber, line, 100)
  }

  if (/grants? receivable/.test(normalized)) {
    return buildFieldMatch('accounts_receivable', line, value, pageNumber, line, 95)
  }

  if (
    /(gst|hst|sales tax|charity rebate).*(receivable|recoverable)/.test(normalized) ||
    /(receivable|recoverable).*(gst|hst|sales tax|charity rebate)/.test(normalized)
  ) {
    return buildFieldMatch('accounts_receivable', line, value, pageNumber, line, 90)
  }

  if (/inventor|materials? and supplies/.test(normalized)) {
    return buildFieldMatch('inventory', line, value, pageNumber, line, 90)
  }

  return null
}

function generalFieldMatch(
  fieldKey: LiquidityFieldKey,
  pageNumber: number,
  line: string,
  pageScore: number,
): FieldMatch | null {
  const value = extractNumbers(line)[0]
  if (value === undefined) return null

  const normalized = normalizeLine(line)
  if (shouldRejectFieldLine(line, normalized)) return null

  const bonus = Math.round(pageScore / 2)

  switch (fieldKey) {
    case 'cash_and_cash_equivalents':
      if (/cash and cash equivalents/.test(normalized)) {
        return buildFieldMatch(fieldKey, line, value, pageNumber, line, 100 + bonus)
      }
      if (/^cash\b/.test(normalized)) {
        return buildFieldMatch(fieldKey, line, value, pageNumber, line, 90 + bonus)
      }
      return null
    case 'marketable_securities':
      if (/^(short[ -]term investments?|marketable securities)\b/.test(normalized)) {
        return buildFieldMatch(fieldKey, line, value, pageNumber, line, 100 + bonus)
      }
      if (/^(guaranteed investment certificates?\b|\bgics?\b)/.test(normalized)) {
        return buildFieldMatch(fieldKey, line, value, pageNumber, line, 98 + bonus)
      }
      if (/^(restricted )?short[ -]term deposits?\b/.test(normalized)) {
        return buildFieldMatch(fieldKey, line, value, pageNumber, line, 95 + bonus)
      }
      if (/^(restricted )?term deposits?\b/.test(normalized)) {
        return buildFieldMatch(fieldKey, line, value, pageNumber, line, 90 + bonus)
      }
      return null
    case 'accounts_receivable':
      if (/accounts receivable/.test(normalized)) {
        return buildFieldMatch(fieldKey, line, value, pageNumber, line, 100 + bonus)
      }
      if (/other receivable/.test(normalized)) {
        return buildFieldMatch(fieldKey, line, value, pageNumber, line, 90 + bonus)
      }
      if (/grants? receivable/.test(normalized)) {
        return buildFieldMatch(fieldKey, line, value, pageNumber, line, 85 + bonus)
      }
      if (
        /(gst|hst|sales tax|charity rebate).*(receivable|recoverable)/.test(normalized) ||
        /(receivable|recoverable).*(gst|hst|sales tax|charity rebate)/.test(normalized)
      ) {
        return buildFieldMatch(fieldKey, line, value, pageNumber, line, 80 + bonus)
      }
      return null
    case 'inventory':
      if (/inventor|materials? and supplies/.test(normalized)) {
        return buildFieldMatch(fieldKey, line, value, pageNumber, line, 80 + bonus)
      }
      return null
    default:
      return null
  }
}

function extractStatementPageFields(page: Pick<RenderedPdfPage, 'pageNumber' | 'textLines' | 'textPreview'>) {
  const lines = pageLines(page)
  const matches: Partial<Record<LiquidityFieldKey, FieldMatch>> = {}
  let section: 'none' | 'assets' | 'current_assets' | 'liabilities' | 'current_liabilities' = 'none'

  for (const line of lines) {
    const normalized = normalizeLine(line)
    if (!normalized) continue

    if (matchesAnyPattern(normalized, CURRENT_ASSET_SECTION_PATTERNS)) {
      section = 'current_assets'
      continue
    }

    if (matchesAnyPattern(normalized, CURRENT_LIABILITY_SECTION_PATTERNS)) {
      section = 'current_liabilities'
      continue
    }

    if (matchesAnyPattern(normalized, ASSET_SECTION_PATTERNS)) {
      section = 'assets'
      continue
    }

    if (matchesAnyPattern(normalized, LIABILITY_SECTION_PATTERNS)) {
      section = 'liabilities'
      continue
    }

    if (/^current:?$/.test(normalized)) {
      if (section === 'assets') {
        section = 'current_assets'
      } else if (section === 'liabilities') {
        section = 'current_liabilities'
      }
      continue
    }

    if (section === 'current_assets') {
      if (matchesAnyPattern(normalized, CURRENT_ASSET_TOTAL_PATTERNS)) {
        const value = extractNumbers(line)[0]
        if (value !== undefined) {
          matches.total_current_assets = buildFieldMatch(
            'total_current_assets',
            line,
            value,
            page.pageNumber,
            line,
            140,
          )
        }
        section = 'assets'
        continue
      }

      if (isNumericOnlyLine(line)) {
        const value = extractNumbers(line)[0]
        if (value !== undefined) {
          matches.total_current_assets = buildFieldMatch(
            'total_current_assets',
            'Implied current assets total',
            value,
            page.pageNumber,
            line,
            130,
          )
        }
        section = 'assets'
        continue
      }

      const candidate = currentSectionFieldMatch(page.pageNumber, line)
      if (!candidate) continue

      matches[candidate.fieldKey] = chooseBetterFieldMatch(matches[candidate.fieldKey], candidate)
      continue
    }

    if (section === 'current_liabilities') {
      if (matchesAnyPattern(normalized, CURRENT_LIABILITY_TOTAL_PATTERNS)) {
        const value = extractNumbers(line)[0]
        if (value !== undefined) {
          matches.total_current_liabilities = buildFieldMatch(
            'total_current_liabilities',
            line,
            value,
            page.pageNumber,
            line,
            140,
          )
        }
        section = 'liabilities'
        continue
      }

      if (isNumericOnlyLine(line)) {
        const value = extractNumbers(line)[0]
        if (value !== undefined) {
          matches.total_current_liabilities = buildFieldMatch(
            'total_current_liabilities',
            'Implied current liabilities total',
            value,
            page.pageNumber,
            line,
            130,
          )
        }
        section = 'liabilities'
      }
    }
  }

  return matches
}

export function extractFieldsFromTextPages(pages: Pick<RenderedPdfPage, 'pageNumber' | 'textLines' | 'textPreview'>[]) {
  const scoredPages = pages
    .map((page) => ({
      page,
      lines: pageLines(page),
      score: scoreStatementPage(pageLines(page)),
    }))
    .filter(({ lines }) => lines.length > 0)
    .sort((left, right) => right.score - left.score || left.page.pageNumber - right.page.pageNumber)

  if (scoredPages.length === 0) return {}

  const matches: Partial<Record<LiquidityFieldKey, FieldMatch>> = {}
  const bestStatementPage = scoredPages[0]

  Object.assign(matches, extractStatementPageFields(bestStatementPage.page))

  const searchableFieldKeys: LiquidityFieldKey[] = [
    'cash_and_cash_equivalents',
    'marketable_securities',
    'accounts_receivable',
    'inventory',
  ]

  for (const fieldKey of searchableFieldKeys) {
    if (matches[fieldKey]) continue

    let bestCandidate: FieldMatch | null = null
    for (const { page, lines, score } of scoredPages) {
      for (const line of lines) {
        const candidate = generalFieldMatch(fieldKey, page.pageNumber, line, score)
        if (!candidate) continue
        bestCandidate = chooseBetterFieldMatch(bestCandidate ?? undefined, candidate)
      }
    }

    if (bestCandidate) {
      matches[fieldKey] = bestCandidate
    }
  }

  return matches
}

function uniqueWarnings(values: string[]) {
  return [...new Set(values)]
}

function fieldReferenceText(field: ExtractionResult['fields'][number]) {
  return [field.rawModelLabel, ...field.citations.map((citation) => citation.snippet)]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}

function shouldClearUnconfirmedField(field: ExtractionResult['fields'][number]) {
  if (field.value === null) return false

  const referenceText = fieldReferenceText(field)
  if (referenceText.includes('%')) return true

  if (field.key === 'total_current_assets') {
    return !/current assets\b/.test(referenceText)
  }

  if (field.key === 'total_current_liabilities') {
    return !/current liabilities\b/.test(referenceText)
  }

  return false
}

export function reconcileExtractionWithTextPages(
  result: ExtractionResult,
  pages: Pick<RenderedPdfPage, 'pageNumber' | 'textLines' | 'textPreview'>[],
) {
  const hasTextLayer = pages.some((page) => pageLines(page).length > 0)
  if (!hasTextLayer) return result

  const textMatches = extractFieldsFromTextPages(pages)

  const warnings = [...result.extractionWarnings]
  const fields = result.fields.map((field) => {
    const match = textMatches[field.key]
    if (!match) {
      if (!shouldClearUnconfirmedField(field)) return field

      warnings.push(`Cleared OCR value for ${field.label.toLowerCase()} because the PDF text layer did not confirm a statement row.`)

      return {
        ...field,
        value: null,
        confidence: 0.2,
        citations: [],
        status: 'missing' as const,
      }
    }

    if (field.value !== null && field.value !== match.value) {
      warnings.push(
        `Replaced OCR value for ${field.label.toLowerCase()} with PDF text-layer value from page ${match.citation.pageNumber}.`,
      )
    }

    return {
      ...field,
      value: match.value,
      confidence: Math.max(field.confidence, 0.95),
      citations: [match.citation],
      rawModelLabel: match.label,
      status: 'extracted' as const,
    }
  })

  return {
    ...result,
    fields,
    extractionWarnings: uniqueWarnings(warnings),
  }
}

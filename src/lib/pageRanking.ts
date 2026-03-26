import type { RankedPdfPage, RenderedPdfPage } from '../types/finance'

const EXACT_STATEMENT_TITLE_PATTERNS = [
  /^(?:consolidated|combined|comparative|condensed|non[- ]consolidated)\s+balance sheets?$/i,
  /^(?:consolidated|combined|comparative|condensed|non[- ]consolidated)\s+statements? of financial position$/i,
  /^balance sheets?$/i,
  /^statements? of financial position$/i,
  /^statement of net assets$/i,
  /^statement of financial condition$/i,
]
const NON_TARGET_PAGE_PATTERNS = [
  /^notes? to\b/i,
  /^statement of cash flows?$/i,
  /cash flows?/i,
  /^statement of operations$/i,
  /income statement/i,
  /independent auditor'?s report/i,
  /auditor'?s report/i,
]
const ASSET_SECTION_PATTERNS = [/^assets?:?$/i]
const LIABILITY_SECTION_PATTERNS = [
  /^liabilities:?$/i,
  /^liabilities and (?:equity|net assets|fund balances?|shareholders?'? equity|stockholders?'? equity|members?'? equity|partners?'? capital)s?:?$/i,
]
const CURRENT_SECTION_PATTERNS = [/^current:?$/i, /^current assets?:?$/i, /^current liabilities?:?$/i]
const TARGET_ROW_HINTS: Array<{ pattern: RegExp; weight: number; reason: string }> = [
  { pattern: /cash and cash equivalents/i, weight: 9, reason: 'Keyword match: cash and cash equivalents' },
  { pattern: /accounts receivable|trade receivables/i, weight: 8, reason: 'Keyword match: accounts receivable' },
  { pattern: /inventor|materials? and supplies/i, weight: 6, reason: 'Keyword match: inventory' },
  {
    pattern: /short[ -]term investments?|marketable securities|short[ -]term deposits?/i,
    weight: 7,
    reason: 'Keyword match: marketable securities',
  },
]

function pageLines(page: RenderedPdfPage) {
  if (page.textLines && page.textLines.length > 0) return page.textLines
  return page.textPreview.split(/\n+/).filter((line) => line.trim().length > 0)
}

function matchesAnyPattern(line: string, patterns: RegExp[]) {
  return patterns.some((pattern) => pattern.test(line))
}

function normalizeLine(line: string) {
  return line.toLowerCase().replace(/\s+/g, ' ').trim()
}

function isStatementTitleLine(line: string) {
  const normalized = normalizeLine(line)
  if (matchesAnyPattern(normalized, EXACT_STATEMENT_TITLE_PATTERNS)) return true

  return (
    /\b(?:balance sheets?|statements? of financial position|statement of net assets|statement of financial condition)\b/.test(
      normalized,
    ) && /\bassets?\b/.test(normalized) && /\bliabilities?\b/.test(normalized)
  )
}

function isTrailingAssetsSectionLabel(line: string) {
  return /(?:^|\s)assets:?$/.test(line) && !/\bnet assets?:?$/.test(line)
}

function isTrailingLiabilitiesSectionLabel(line: string) {
  return /(?:^|\s)liabilities:?$/.test(line)
}

function hasAssetSectionLine(line: string) {
  const normalized = normalizeLine(line)
  return (
    matchesAnyPattern(normalized, ASSET_SECTION_PATTERNS) ||
    isTrailingAssetsSectionLabel(normalized) ||
    /\bassets?\b.*\bcurrent assets?\b/.test(normalized)
  )
}

function hasLiabilitySectionLine(line: string) {
  const normalized = normalizeLine(line)
  return (
    matchesAnyPattern(normalized, LIABILITY_SECTION_PATTERNS) ||
    isTrailingLiabilitiesSectionLabel(normalized) ||
    /\bliabilities\b.*\bcurrent liabilities\b/.test(normalized)
  )
}

function hasCurrentSectionLine(line: string) {
  const normalized = normalizeLine(line)
  return matchesAnyPattern(normalized, CURRENT_SECTION_PATTERNS) || /\bcurrent (?:assets|liabilities)\b/.test(normalized)
}

function isNonTargetPageLine(line: string) {
  return matchesAnyPattern(normalizeLine(line), NON_TARGET_PAGE_PATTERNS)
}

function estimateTableDensity(lines: string[]) {
  const numericMatches = lines.flatMap((line) => line.match(/\b\d[\d,().-]*\b/g) ?? [])

  if (lines.length === 0) return 0

  return numericMatches.length / lines.length
}

function scorePage(page: RenderedPdfPage) {
  const reasons: string[] = []
  const lines = pageLines(page)
  const text = lines.join(' ')
  const normalizedLines = lines.map((line) => line.trim())
  const hasStatementTitle = normalizedLines.some((line) => isStatementTitleLine(line))
  const hasNonTargetLine = normalizedLines.some((line) => isNonTargetPageLine(line))
  let score = 0

  if (hasStatementTitle) {
    score += 20
    reasons.push('Statement title match.')
  }

  if (normalizedLines.some((line) => hasAssetSectionLine(line))) {
    score += 6
    reasons.push('Found assets section header.')
  }

  if (normalizedLines.some((line) => hasLiabilitySectionLine(line))) {
    score += 6
    reasons.push('Found liabilities section header.')
  }

  if (normalizedLines.some((line) => hasCurrentSectionLine(line))) {
    score += 4
    reasons.push('Found current-section header.')
  }

  for (const hint of TARGET_ROW_HINTS) {
    if (hint.pattern.test(text)) {
      score += hint.weight
      reasons.push(hint.reason)
    }
  }

  if (hasNonTargetLine) {
    score -= 35
    reasons.push('Looks like a note or non-balance-sheet statement.')
  }

  const density = estimateTableDensity(normalizedLines)
  if (density > 0.8) {
    score += 10
    reasons.push('High numeric density suggests a table page.')
  } else if (density > 0.45) {
    score += 5
    reasons.push('Moderate numeric density suggests a financial table.')
  }

  if (page.pageNumber > 10 && page.pageNumber < 80) {
    score += 2
    reasons.push('Page position aligns with typical statement placement.')
  }

  return { score, reasons }
}

export function rankCandidatePages(pages: RenderedPdfPage[], maxPages = 4): RankedPdfPage[] {
  const ranked = pages
    .map((page) => {
      const { score, reasons } = scorePage(page)
      return { ...page, score, reasons }
    })
    .sort((left, right) => right.score - left.score || left.pageNumber - right.pageNumber)

  const positiveOnly = ranked.filter((page) => page.score > 0)
  return (positiveOnly.length > 0 ? positiveOnly : ranked).slice(0, maxPages)
}

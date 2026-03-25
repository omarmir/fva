export type LiquidityFieldKey =
  | 'cash_and_cash_equivalents'
  | 'marketable_securities'
  | 'accounts_receivable'
  | 'inventory'
  | 'total_current_assets'
  | 'total_current_liabilities'

export type ReportSource =
  | {
      kind: 'upload'
      fileName: string
      fileSize: number
      lastModified: number
    }
  | {
      kind: 'sample'
      sampleId: string
      label: string
      pdfPath: string
    }

export type SourceCitation = {
  pageNumber: number
  snippet: string
  fieldKey: LiquidityFieldKey
}

export type PositionedTextItem = {
  str: string
  x: number
  y: number
}

export type ExtractedField = {
  key: LiquidityFieldKey
  label: string
  value: number | null
  confidence: number
  citations: SourceCitation[]
  rawModelLabel?: string
  status: 'extracted' | 'edited' | 'missing'
}

export type ExtractionResult = {
  companyName: string
  fiscalPeriodLabel: string
  periodEndDate?: string
  currency: string
  sector?: string
  isFinancialInstitution: boolean
  source: ReportSource
  modelId: string
  fields: ExtractedField[]
  extractionWarnings: string[]
}

export type ProgressState = {
  phase: string
  percent: number
  message: string
  detail?: string
}

export type RatioResult = {
  key: 'current_ratio' | 'quick_ratio' | 'cash_ratio'
  label: string
  value: number | null
  formulaText: string
  warnings: string[]
}

export type RenderedPdfPage = {
  pageNumber: number
  textPreview: string
  textLines?: string[]
  textItems?: PositionedTextItem[]
  thumbnailDataUrl: string
  extractionDataUrl: string
  width: number
  height: number
}

export type RankedPdfPage = RenderedPdfPage & {
  score: number
  reasons: string[]
}

export type PreviewPage = RenderedPdfPage & {
  score?: number
  reasons?: string[]
}

export type SampleReport = {
  id: string
  label: string
  companyName: string
  sector: string
  isFinancialInstitution: boolean
  fiscalPeriodLabel: string
  periodEndDate: string
  pdfPath: string
}

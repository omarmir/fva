import type {
  ExtractionResult,
  ProgressState,
  RankedPdfPage,
  RenderedPdfPage,
  ReportSource,
  SampleReport,
} from '../types/finance'

type RankMessage =
  | { type: 'done'; pages: RankedPdfPage[] }
  | { type: 'error'; error: string }

type ExtractMessage =
  | { type: 'progress'; progress: ProgressState }
  | { type: 'done'; result: ExtractionResult }
  | { type: 'error'; error: string }

function clonePages(pages: RenderedPdfPage[]) {
  return pages.map((page) => ({
    pageNumber: page.pageNumber,
    textPreview: page.textPreview,
    ...(page.textLines ? { textLines: [...page.textLines] } : {}),
    thumbnailDataUrl: page.thumbnailDataUrl,
    extractionDataUrl: page.extractionDataUrl,
    width: page.width,
    height: page.height,
    ...('score' in page && typeof page.score === 'number' ? { score: page.score } : {}),
    ...('reasons' in page && Array.isArray(page.reasons) ? { reasons: [...page.reasons] } : {}),
  }))
}

function cloneSource(source: ReportSource) {
  return source.kind === 'upload'
    ? {
        kind: 'upload' as const,
        fileName: source.fileName,
        fileSize: source.fileSize,
        lastModified: source.lastModified,
      }
    : {
        kind: 'sample' as const,
        sampleId: source.sampleId,
        label: source.label,
        pdfPath: source.pdfPath,
      }
}

function cloneSample(sample: SampleReport | null) {
  if (!sample) return null

  return {
    id: sample.id,
    label: sample.label,
    companyName: sample.companyName,
    sector: sample.sector,
    isFinancialInstitution: sample.isFinancialInstitution,
    fiscalPeriodLabel: sample.fiscalPeriodLabel,
    periodEndDate: sample.periodEndDate,
    pdfPath: sample.pdfPath,
  }
}

export function rankPagesInWorker(pages: RenderedPdfPage[]) {
  return new Promise<RankedPdfPage[]>((resolve, reject) => {
    const worker = new Worker(new URL('../workers/ranking.worker.ts', import.meta.url), {
      type: 'module',
    })

    worker.onmessage = (event: MessageEvent<RankMessage>) => {
      if (event.data.type === 'done') {
        worker.terminate()
        resolve(event.data.pages)
      } else if (event.data.type === 'error') {
        worker.terminate()
        reject(new Error(event.data.error))
      }
    }

    worker.onerror = (event) => {
      worker.terminate()
      reject(event.error ?? new Error('Ranking worker failed.'))
    }

    worker.postMessage({ pages: clonePages(pages) })
  })
}

export function extractInWorker(
  options: {
    baseUrl: string
    modelId: string
    pages: RankedPdfPage[]
    source: ReportSource
    sampleMetadata: SampleReport | null
  },
  onProgress: (progress: ProgressState) => void,
) {
  return new Promise<ExtractionResult>((resolve, reject) => {
    const worker = new Worker(new URL('../workers/extraction.worker.ts', import.meta.url), {
      type: 'module',
    })

    worker.onmessage = (event: MessageEvent<ExtractMessage>) => {
      if (event.data.type === 'progress') {
        onProgress(event.data.progress)
        return
      }

      if (event.data.type === 'done') {
        worker.terminate()
        resolve(event.data.result)
        return
      }

      if (event.data.type === 'error') {
        worker.terminate()
        reject(new Error(event.data.error))
      }
    }

    worker.onerror = (event) => {
      worker.terminate()
      reject(event.error ?? new Error('Extraction worker failed.'))
    }

    worker.postMessage({
      baseUrl: options.baseUrl,
      modelId: options.modelId,
      pages: clonePages(options.pages),
      source: cloneSource(options.source),
      sampleMetadata: cloneSample(options.sampleMetadata),
    })
  })
}

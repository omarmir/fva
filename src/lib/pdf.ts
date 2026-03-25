import type { RenderedPdfPage } from '../types/finance'
import { rankCandidatePages } from './pageRanking'
import { buildTextLines } from './textLayerExtraction'

let pdfJsReady = false

async function loadPdfJs() {
  const [{ getDocument, GlobalWorkerOptions }, workerModule] = await Promise.all([
    import('pdfjs-dist'),
    import('pdfjs-dist/build/pdf.worker.mjs?url'),
  ])

  if (!pdfJsReady) {
    GlobalWorkerOptions.workerSrc = workerModule.default
    pdfJsReady = true
  }

  return { getDocument }
}

export async function renderPdfPages(fileData: Uint8Array): Promise<RenderedPdfPage[]> {
  return renderPdfPagesWithCallbacks(fileData)
}

async function yieldToBrowser() {
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => resolve())
  })
}

export async function renderPdfPagesWithCallbacks(
  fileData: Uint8Array,
  callbacks?: {
    onPageRendered?: (page: RenderedPdfPage, pageNumber: number, totalPages: number) => void
  },
): Promise<RenderedPdfPage[]> {
  const { getDocument } = await loadPdfJs()
  const loadingTask = getDocument({ data: fileData })
  const pdf = await loadingTask.promise
  const pages: RenderedPdfPage[] = []

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber)
    const extractionViewport = page.getViewport({ scale: 1.8 })
    const thumbnailViewport = page.getViewport({ scale: 0.42 })

    const extractionCanvas = document.createElement('canvas')
    extractionCanvas.width = Math.ceil(extractionViewport.width)
    extractionCanvas.height = Math.ceil(extractionViewport.height)
    const extractionContext = extractionCanvas.getContext('2d')

    if (!extractionContext) {
      throw new Error(`Failed to get extraction canvas context for page ${pageNumber}.`)
    }

    await page.render({
      canvas: extractionCanvas,
      canvasContext: extractionContext,
      viewport: extractionViewport,
    }).promise

    const thumbnailCanvas = document.createElement('canvas')
    thumbnailCanvas.width = Math.ceil(thumbnailViewport.width)
    thumbnailCanvas.height = Math.ceil(thumbnailViewport.height)
    const thumbnailContext = thumbnailCanvas.getContext('2d')

    if (!thumbnailContext) {
      throw new Error(`Failed to get thumbnail canvas context for page ${pageNumber}.`)
    }

    await page.render({
      canvas: thumbnailCanvas,
      canvasContext: thumbnailContext,
      viewport: thumbnailViewport,
    }).promise

    const text = await page.getTextContent()
    const textItems = text.items.flatMap((item) =>
      'str' in item && 'transform' in item
        ? [
            {
              str: item.str,
              transform: Array.from(item.transform),
            },
          ]
        : [],
    )
    const textLines = buildTextLines(textItems)
    const textPreview = textLines.join(' ').replace(/\s+/g, ' ').trim()

    pages.push({
      pageNumber,
      textPreview,
      textLines,
      thumbnailDataUrl: thumbnailCanvas.toDataURL('image/jpeg', 0.82),
      extractionDataUrl: extractionCanvas.toDataURL('image/jpeg', 0.9),
      width: extractionCanvas.width,
      height: extractionCanvas.height,
    })

    callbacks?.onPageRendered?.(pages[pages.length - 1], pageNumber, pdf.numPages)
    await yieldToBrowser()
  }

  return pages
}

export { rankCandidatePages }

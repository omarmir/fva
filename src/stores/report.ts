import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { ProgressState, RankedPdfPage, RenderedPdfPage, ReportSource, SampleReport } from '../types/finance'
import { renderPdfPagesWithCallbacks } from '../lib/pdf'
import { rankPagesInWorker } from '../lib/workers'

export const useReportStore = defineStore('report', () => {
  const source = ref<ReportSource | null>(null)
  const sampleMetadata = ref<SampleReport | null>(null)
  const pdfBytes = ref<Uint8Array | null>(null)
  const renderedPages = ref<RenderedPdfPage[]>([])
  const candidatePages = ref<RankedPdfPage[]>([])
  const status = ref<'idle' | 'loading' | 'ready' | 'error'>('idle')
  const error = ref('')
  const progress = ref<ProgressState>({
    phase: 'idle',
    percent: 0,
    message: 'Choose a report to begin OCR.',
  })

  const hasDocument = computed(() => renderedPages.value.length > 0)

  async function loadFromArrayBuffer(arrayBuffer: ArrayBuffer, nextSource: ReportSource) {
    status.value = 'loading'
    error.value = ''
    source.value = nextSource
    pdfBytes.value = new Uint8Array(arrayBuffer)
    renderedPages.value = []
    candidatePages.value = []
    progress.value = {
      phase: 'loading',
      percent: 5,
      message: 'Opening PDF and preparing page renders.',
    }

    try {
      const pages = await renderPdfPagesWithCallbacks(pdfBytes.value, {
        onPageRendered: (page, pageNumber, totalPages) => {
          renderedPages.value.push(page)
          progress.value = {
            phase: 'rendering',
            percent: 10 + Math.round((pageNumber / totalPages) * 68),
            message: `Rendering statement page images ${pageNumber}/${totalPages}.`,
          }
        },
      })

      progress.value = {
        phase: 'ranking',
        percent: 82,
        message: 'Ranking likely balance-sheet pages in a worker.',
      }
      candidatePages.value = await rankPagesInWorker(pages)
      status.value = 'ready'
      progress.value = {
        phase: 'ready',
        percent: 100,
        message: 'Document pages are ready. OCR is starting.',
      }
    } catch (caught) {
      status.value = 'error'
      error.value = caught instanceof Error ? caught.message : 'Failed to render PDF.'
      progress.value = {
        phase: 'error',
        percent: 100,
        message: error.value,
      }
      throw caught
    }
  }

  async function loadUpload(file: File) {
    sampleMetadata.value = null
    progress.value = {
      phase: 'loading',
      percent: 2,
      message: `Loading ${file.name}.`,
    }
    await loadFromArrayBuffer(await file.arrayBuffer(), {
      kind: 'upload',
      fileName: file.name,
      fileSize: file.size,
      lastModified: file.lastModified,
    })
  }

  async function loadSample(sample: SampleReport) {
    sampleMetadata.value = sample
    progress.value = {
      phase: 'loading',
      percent: 2,
      message: `Loading sample report ${sample.label}.`,
    }
    const response = await fetch(sample.pdfPath)
    if (!response.ok) {
      throw new Error(`Failed to load sample report ${sample.label}.`)
    }

    await loadFromArrayBuffer(await response.arrayBuffer(), {
      kind: 'sample',
      sampleId: sample.id,
      label: sample.label,
      pdfPath: sample.pdfPath,
    })
  }

  function expandCandidatePages() {
    if (renderedPages.value.length <= candidatePages.value.length) return
    rankPagesInWorker(renderedPages.value)
      .then((rankedPages) => {
        candidatePages.value = rankedPages.slice(0, Math.min(candidatePages.value.length + 2, 6))
      })
      .catch((caught) => {
        error.value = caught instanceof Error ? caught.message : 'Failed to expand candidate pages.'
      })
  }

  function reset() {
    source.value = null
    sampleMetadata.value = null
    pdfBytes.value = null
    renderedPages.value = []
    candidatePages.value = []
    status.value = 'idle'
    error.value = ''
    progress.value = {
      phase: 'idle',
      percent: 0,
      message: 'Choose a report to begin OCR.',
    }
  }

  return {
    source,
    sampleMetadata,
    pdfBytes,
    renderedPages,
    candidatePages,
    status,
    error,
    progress,
    hasDocument,
    loadUpload,
    loadSample,
    expandCandidatePages,
    reset,
  }
})
